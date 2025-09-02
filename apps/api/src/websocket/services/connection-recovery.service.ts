import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../websocket.gateway';
import { RoomManagementService } from './room-management.service';
import { MessagingService } from './messaging.service';
import { PresenceService } from './presence.service';

interface ConnectionSession {
  userId: string;
  socketId: string;
  connectedAt: Date;
  lastActivity: Date;
  rooms: string[];
  messageQueue: Array<{
    id: string;
    chatId: string;
    content: string;
    type: string;
    timestamp: Date;
  }>;
  recoveryToken?: string;
}

@Injectable()
export class ConnectionRecoveryService {
  private readonly logger = new Logger(ConnectionRecoveryService.name);
  private readonly connectionSessions = new Map<string, ConnectionSession>();
  private readonly recoveryTokens = new Map<string, string>(); // token -> userId

  constructor(
    private readonly roomManagementService: RoomManagementService,
    private readonly messagingService: MessagingService,
    private readonly presenceService: PresenceService,
  ) {}

  /**
   * Create a connection session for recovery
   */
  createConnectionSession(
    server: Server,
    client: AuthenticatedSocket,
  ): string {
    try {
      if (!client.user) {
        throw new Error('User not authenticated');
      }

      const userId = client.user.id;
      const socketId = client.id;
      const now = new Date();

      // Generate recovery token
      const recoveryToken = this.generateRecoveryToken();

      // Create session
      const session: ConnectionSession = {
        userId,
        socketId,
        connectedAt: now,
        lastActivity: now,
        rooms: [],
        messageQueue: [],
        recoveryToken,
      };

      this.connectionSessions.set(socketId, session);
      this.recoveryTokens.set(recoveryToken, userId);

      this.logger.log(`Created connection session for user ${client.user.username} (${userId})`);

      // Send recovery token to client
      client.emit('connection:recovery-token', {
        token: recoveryToken,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      });

      return recoveryToken;
    } catch (error) {
      this.logger.error(`Error creating connection session: ${error}`);
      throw error;
    }
  }

  /**
   * Recover connection using token
   */
  async recoverConnection(
    server: Server,
    client: AuthenticatedSocket,
    recoveryToken: string,
  ): Promise<{ success: boolean; message: string; session?: ConnectionSession }> {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const userId = this.recoveryTokens.get(recoveryToken);
      if (!userId || userId !== client.user.id) {
        return { success: false, message: 'Invalid recovery token' };
      }

      // Find existing session
      let existingSession: ConnectionSession | null = null;
      for (const session of this.connectionSessions.values()) {
        if (session.userId === userId && session.recoveryToken === recoveryToken) {
          existingSession = session;
          break;
        }
      }

      if (!existingSession) {
        return { success: false, message: 'No session found for recovery' };
      }

      // Update session with new socket ID
      existingSession.socketId = client.id;
      existingSession.lastActivity = new Date();
      this.connectionSessions.set(client.id, existingSession);

      // Remove old session
      this.connectionSessions.delete(existingSession.socketId);

      this.logger.log(`Recovered connection for user ${client.user.username} (${userId})`);

      // Rejoin rooms
      for (const roomId of existingSession.rooms) {
        await client.join(`chat:${roomId}`);
        // Note: Room management will be handled by the join:chat endpoint
      }

      // Send queued messages
      if (existingSession.messageQueue.length > 0) {
        client.emit('connection:queued-messages', {
          messages: existingSession.messageQueue,
          count: existingSession.messageQueue.length,
        });
        existingSession.messageQueue = [];
      }

      // Notify about successful recovery
      client.emit('connection:recovered', {
        message: 'Connection recovered successfully',
        rooms: existingSession.rooms,
        queuedMessages: existingSession.messageQueue.length,
      });

      return {
        success: true,
        message: 'Connection recovered successfully',
        session: existingSession,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error recovering connection: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Update session activity
   */
  updateSessionActivity(socketId: string): void {
    const session = this.connectionSessions.get(socketId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * Add room to session
   */
  addRoomToSession(socketId: string, roomId: string): void {
    const session = this.connectionSessions.get(socketId);
    if (session && !session.rooms.includes(roomId)) {
      session.rooms.push(roomId);
    }
  }

  /**
   * Remove room from session
   */
  removeRoomFromSession(socketId: string, roomId: string): void {
    const session = this.connectionSessions.get(socketId);
    if (session) {
      session.rooms = session.rooms.filter(id => id !== roomId);
    }
  }

  /**
   * Queue message for recovery
   */
  queueMessage(
    userId: string,
    message: {
      id: string;
      chatId: string;
      content: string;
      type: string;
    },
  ): void {
    for (const session of this.connectionSessions.values()) {
      if (session.userId === userId) {
        session.messageQueue.push({
          ...message,
          timestamp: new Date(),
        });
        break;
      }
    }
  }

  /**
   * Clean up old sessions
   */
  cleanupOldSessions(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [socketId, session] of this.connectionSessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > maxAge) {
        this.connectionSessions.delete(socketId);
        if (session.recoveryToken) {
          this.recoveryTokens.delete(session.recoveryToken);
        }
        this.logger.log(`Cleaned up old session for user: ${session.userId}`);
      }
    }
  }

  /**
   * Get session info
   */
  getSessionInfo(socketId: string): ConnectionSession | null {
    return this.connectionSessions.get(socketId) || null;
  }

  /**
   * Get user sessions
   */
  getUserSessions(userId: string): ConnectionSession[] {
    return Array.from(this.connectionSessions.values())
      .filter(session => session.userId === userId);
  }

  /**
   * Force disconnect user sessions
   */
  forceDisconnectUser(server: Server, userId: string): void {
    const userSessions = this.getUserSessions(userId);
    
    for (const session of userSessions) {
      const socket = server.sockets.sockets.get(session.socketId);
      if (socket) {
        socket.disconnect(true);
      }
      this.connectionSessions.delete(session.socketId);
      if (session.recoveryToken) {
        this.recoveryTokens.delete(session.recoveryToken);
      }
    }

    this.logger.log(`Force disconnected all sessions for user: ${userId}`);
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats(): {
    activeSessions: number;
    recoveryTokens: number;
    queuedMessages: number;
    averageSessionAge: number;
  } {
    const now = new Date();
    let totalAge = 0;
    let queuedMessages = 0;

    for (const session of this.connectionSessions.values()) {
      totalAge += now.getTime() - session.connectedAt.getTime();
      queuedMessages += session.messageQueue.length;
    }

    const averageSessionAge = this.connectionSessions.size > 0 
      ? totalAge / this.connectionSessions.size 
      : 0;

    return {
      activeSessions: this.connectionSessions.size,
      recoveryTokens: this.recoveryTokens.size,
      queuedMessages,
      averageSessionAge: Math.round(averageSessionAge / (60 * 1000)), // minutes
    };
  }

  /**
   * Private helper methods
   */
  private generateRecoveryToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
