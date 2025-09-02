import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../websocket.gateway';
import { PrismaService } from '../../database/prisma.service';

interface UserPresence {
  userId: string;
  username: string;
  email: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  connectedAt: Date;
  socketId: string;
  userAgent?: string;
  ipAddress?: string;
}

interface PresenceStats {
  totalUsers: number;
  onlineUsers: number;
  awayUsers: number;
  busyUsers: number;
  offlineUsers: number;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private readonly userPresence = new Map<string, UserPresence>();
  private readonly userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private readonly socketUsers = new Map<string, string>(); // socketId -> userId

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle user connection and set online status
   */
  handleUserConnection(
    server: Server,
    client: AuthenticatedSocket,
  ): void {
    try {
      if (!client.user) {
        return;
      }

      const userId = client.user.id;
      const socketId = client.id;
      const now = new Date();

      // Add socket to user mapping
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socketId);
      this.socketUsers.set(socketId, userId);

      // Check if user was previously offline
      const wasOffline = !this.userPresence.has(userId) || 
                        this.userPresence.get(userId)!.status === 'offline';

      // Update user presence
      const presence: UserPresence = {
        userId,
        username: client.user.username,
        email: client.user.email,
        status: 'online',
        lastSeen: now,
        connectedAt: now,
        socketId,
        userAgent: client.handshake.headers['user-agent'],
        ipAddress: client.handshake.address,
      };

      this.userPresence.set(userId, presence);

      this.logger.log(`User ${client.user.username} (${userId}) came online`);

      // Broadcast user online status to all connected users
      if (wasOffline) {
        server.emit('user:online', {
          userId,
          username: client.user.username,
          status: 'online',
          lastSeen: now.toISOString(),
          timestamp: now.toISOString(),
        });
      }

      // Send current online users to the newly connected user
      const onlineUsers = this.getOnlineUsers();
      client.emit('users:online', {
        users: onlineUsers,
        count: onlineUsers.length,
        timestamp: now.toISOString(),
      });

    } catch (error) {
      this.logger.error(`Error handling user connection: ${error}`);
    }
  }

  /**
   * Handle user disconnection and set offline status
   */
  handleUserDisconnection(
    server: Server,
    client: AuthenticatedSocket,
  ): void {
    try {
      if (!client.user) {
        return;
      }

      const userId = client.user.id;
      const socketId = client.id;
      const now = new Date();

      // Remove socket from user mapping
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socketId);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
          
          // Update user presence to offline
          const presence = this.userPresence.get(userId);
          if (presence) {
            presence.status = 'offline';
            presence.lastSeen = now;
            this.userPresence.set(userId, presence);

            this.logger.log(`User ${client.user.username} (${userId}) went offline`);

            // Broadcast user offline status to all connected users
            server.emit('user:offline', {
              userId,
              username: client.user.username,
              status: 'offline',
              lastSeen: now.toISOString(),
              timestamp: now.toISOString(),
            });
          }
        }
      }

      this.socketUsers.delete(socketId);

    } catch (error) {
      this.logger.error(`Error handling user disconnection: ${error}`);
    }
  }

  /**
   * Update user status
   */
  updateUserStatus(
    server: Server,
    client: AuthenticatedSocket,
    status: 'online' | 'away' | 'busy',
  ): void {
    try {
      if (!client.user) {
        return;
      }

      const userId = client.user.id;
      const presence = this.userPresence.get(userId);

      if (!presence) {
        return;
      }

      const oldStatus = presence.status;
      presence.status = status;
      presence.lastSeen = new Date();

      this.userPresence.set(userId, presence);

      this.logger.log(`User ${client.user.username} (${userId}) status changed from ${oldStatus} to ${status}`);

      // Broadcast status change to all connected users
      server.emit('user:status-changed', {
        userId,
        username: client.user.username,
        oldStatus,
        newStatus: status,
        lastSeen: presence.lastSeen.toISOString(),
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Error updating user status: ${error}`);
    }
  }

  /**
   * Get online users
   */
  getOnlineUsers(): Array<{
    userId: string;
    username: string;
    status: string;
    lastSeen: Date;
    connectedAt: Date;
  }> {
    return Array.from(this.userPresence.values())
      .filter(presence => presence.status === 'online')
      .map(presence => ({
        userId: presence.userId,
        username: presence.username,
        status: presence.status,
        lastSeen: presence.lastSeen,
        connectedAt: presence.connectedAt,
      }));
  }

  /**
   * Get user presence
   */
  getUserPresence(userId: string): UserPresence | null {
    return this.userPresence.get(userId) || null;
  }

  /**
   * Get all users presence
   */
  getAllUsersPresence(): UserPresence[] {
    return Array.from(this.userPresence.values());
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    const presence = this.userPresence.get(userId);
    return presence ? presence.status === 'online' : false;
  }

  /**
   * Get presence statistics
   */
  getPresenceStats(): PresenceStats {
    const allPresence = Array.from(this.userPresence.values());
    
    return {
      totalUsers: allPresence.length,
      onlineUsers: allPresence.filter(p => p.status === 'online').length,
      awayUsers: allPresence.filter(p => p.status === 'away').length,
      busyUsers: allPresence.filter(p => p.status === 'busy').length,
      offlineUsers: allPresence.filter(p => p.status === 'offline').length,
    };
  }

  /**
   * Get users by status
   */
  getUsersByStatus(status: 'online' | 'away' | 'busy' | 'offline'): UserPresence[] {
    return Array.from(this.userPresence.values())
      .filter(presence => presence.status === status);
  }

  /**
   * Clean up old presence data
   */
  cleanupOldPresence(): void {
    const now = new Date();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const [userId, presence] of this.userPresence.entries()) {
      if (presence.status === 'offline' && 
          now.getTime() - presence.lastSeen.getTime() > maxAge) {
        this.userPresence.delete(userId);
        this.logger.log(`Cleaned up old presence data for user: ${userId}`);
      }
    }
  }

  /**
   * Get connection info for a user
   */
  getUserConnectionInfo(userId: string): {
    socketCount: number;
    socketIds: string[];
    isOnline: boolean;
    status: string;
    lastSeen: Date | null;
  } {
    const socketSet = this.userSockets.get(userId);
    const presence = this.userPresence.get(userId);

    return {
      socketCount: socketSet ? socketSet.size : 0,
      socketIds: socketSet ? Array.from(socketSet) : [],
      isOnline: presence ? presence.status === 'online' : false,
      status: presence ? presence.status : 'offline',
      lastSeen: presence ? presence.lastSeen : null,
    };
  }

  /**
   * Force disconnect user from all sockets
   */
  forceDisconnectUser(server: Server, userId: string): void {
    const socketSet = this.userSockets.get(userId);
    if (!socketSet) {
      return;
    }

    for (const socketId of socketSet) {
      const socket = server.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    }

    this.logger.log(`Force disconnected user: ${userId}`);
  }
}
