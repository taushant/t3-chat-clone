import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtAuthGuard } from './guards/ws-jwt-auth.guard';
import { ChatsService } from '../chats/chats.service';
import { MessagesService } from '../messages/messages.service';
import { WebSocketRateLimitService } from './services/websocket-rate-limit.service';
import { RoomManagementService } from './services/room-management.service';
import { MessagingService } from './services/messaging.service';
import { PresenceService } from './services/presence.service';
import { ConnectionRecoveryService } from './services/connection-recovery.service';
import { ConnectionMonitoringService } from './services/connection-monitoring.service';

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private connectedUsers = new Map<string, AuthenticatedSocket>();

  constructor(
    private readonly chatService: ChatsService,
    private readonly messageService: MessagesService,
    private readonly rateLimitService: WebSocketRateLimitService,
    private readonly roomManagementService: RoomManagementService,
    private readonly messagingService: MessagingService,
    private readonly presenceService: PresenceService,
    private readonly connectionRecoveryService: ConnectionRecoveryService,
    private readonly connectionMonitoringService: ConnectionMonitoringService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    
    // Set up periodic cleanup of rate limiting data
    setInterval(() => {
      this.rateLimitService.cleanup();
    }, 5 * 60 * 1000); // Clean up every 5 minutes

    // Set up periodic cleanup of messaging data
    setInterval(() => {
      this.messagingService.cleanupOldMessageStatuses();
    }, 60 * 60 * 1000); // Clean up every hour
  }

    async handleConnection(client: AuthenticatedSocket) {
    const clientIP = client.handshake.address;
    const userAgent = client.handshake.headers['user-agent'] || 'Unknown';

    this.logger.log(`Client connection attempt: ${client.id} from IP: ${clientIP}`);

    // Record connection attempt
    this.connectionMonitoringService.recordConnectionEvent('connect', client.id, clientIP, userAgent);

    // Validate connection origin
    const origin = client.handshake.headers.origin;
    if (!this.isValidOrigin(origin)) {
      this.logger.warn(`Invalid origin for WebSocket connection: ${origin} from IP: ${clientIP}`);
      this.connectionMonitoringService.recordConnectionEvent('error', client.id, clientIP, userAgent, undefined, { reason: 'Invalid origin' });
      client.disconnect(true);
      return;
    }

    // Check connection rate limiting
    if (!this.rateLimitService.isConnectionAllowed(clientIP)) {
      this.logger.warn(`Connection rate limit exceeded for IP: ${clientIP}`);
      this.connectionMonitoringService.recordConnectionEvent('rate_limit', client.id, clientIP, userAgent, undefined, { reason: 'Rate limit exceeded' });
      client.disconnect(true);
      return;
    }

    // Record successful connection
    this.connectionMonitoringService.recordConnectionStart(client.id);

    // Note: Authentication will be handled when the client tries to send messages
    // This allows for unauthenticated connections but requires auth for actions

    // Store connection for later use
    this.connectedUsers.set(client.id, client);

    this.logger.log(`Client connected successfully: ${client.id} from IP: ${clientIP}, User-Agent: ${userAgent}`);
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Record disconnection
    const clientIP = client.handshake.address;
    const userAgent = client.handshake.headers['user-agent'] || 'Unknown';
    this.connectionMonitoringService.recordConnectionEvent('disconnect', client.id, clientIP, userAgent, client.user?.id);
    this.connectionMonitoringService.recordConnectionEnd(client.id);
    
    // Remove from connected users
    this.connectedUsers.delete(client.id);
    
    // Handle user disconnection from all rooms
    if (client.user) {
      this.roomManagementService.handleUserDisconnection(client.user.id);
      
      // Handle presence service disconnection
      this.presenceService.handleUserDisconnection(this.server, client);
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('join:chat')
  async handleJoinChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    return await this.roomManagementService.joinRoom(this.server, client, data.chatId);
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('leave:chat')
  async handleLeaveChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    return await this.roomManagementService.leaveRoom(this.server, client, data.chatId);
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('message:typing')
  async handleTyping(
    @MessageBody() data: { chatId: string; isTyping: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    this.messagingService.handleTyping(this.server, client, data);
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('message:send')
  async handleMessage(
    @MessageBody() data: { chatId: string; content: string; type: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    return await this.messagingService.sendMessage(this.server, client, data);
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string; chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const { messageId, chatId } = data;
      
      if (!client.user) {
        throw new Error('User not authenticated');
      }
      
      // Delete message from database
      await this.messageService.remove(messageId, client.user.id);
      
      // Broadcast deletion to all users in the chat
      this.server.to(`chat:${chatId}`).emit('message:deleted', {
        messageId,
        chatId,
        deletedBy: client.user.id,
      });
      
      return { success: true, message: 'Message deleted successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error deleting message: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  // Get online users for a specific chat
  getOnlineUsersForChat(chatId: string): string[] {
    const onlineUsers: string[] = [];
    
    this.connectedUsers.forEach((client) => {
      if (client.rooms.has(`chat:${chatId}`) && client.user) {
        onlineUsers.push(client.user.id);
      }
    });
    
    return onlineUsers;
  }

  // Get all connected users
  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  // New room management endpoints
  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('room:info')
  async handleGetRoomInfo(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const roomInfo = await this.roomManagementService.getRoomInfo(data.chatId);
      if (!roomInfo) {
        return { success: false, message: 'Room not found' };
      }

      return { success: true, roomInfo };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting room info: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('room:list')
  async handleGetUserRooms(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const userRooms = this.roomManagementService.getUserRooms(client.user.id);
      return { success: true, rooms: userRooms };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting user rooms: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('room:online')
  async handleGetRoomOnlineUsers(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const onlineUsers = this.roomManagementService.getRoomOnlineUsers(data.chatId);
      return { success: true, onlineUsers };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting room online users: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('room:subscribe-multiple')
  async handleSubscribeToMultipleRooms(
    @MessageBody() data: { chatIds: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      if (!data.chatIds || !Array.isArray(data.chatIds)) {
        return { success: false, message: 'Invalid chat IDs provided' };
      }

      return await this.roomManagementService.subscribeToRooms(this.server, client, data.chatIds);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error subscribing to multiple rooms: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('room:unsubscribe-multiple')
  async handleUnsubscribeFromMultipleRooms(
    @MessageBody() data: { chatIds: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      if (!data.chatIds || !Array.isArray(data.chatIds)) {
        return { success: false, message: 'Invalid chat IDs provided' };
      }

      return await this.roomManagementService.unsubscribeFromRooms(this.server, client, data.chatIds);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error unsubscribing from multiple rooms: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('room:subscription-status')
  async handleGetSubscriptionStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const status = this.roomManagementService.getUserSubscriptionStatus(client.user.id);
      return { success: true, status };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting subscription status: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('room:subscription-details')
  async handleGetRoomSubscriptionDetails(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const details = this.roomManagementService.getRoomSubscriptionDetails(data.chatId);
      return { success: true, details };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting room subscription details: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  // New messaging endpoints
  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('message:delivered')
  async handleMessageDelivered(
    @MessageBody() data: { messageId: string; chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    this.messagingService.handleMessageDelivered(this.server, client, data);
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('message:read')
  async handleMessageRead(
    @MessageBody() data: { messageId: string; chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    this.messagingService.handleMessageRead(this.server, client, data);
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('message:typing-users')
  async handleGetTypingUsers(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const typingUsers = this.messagingService.getTypingUsers(data.chatId);
      return { success: true, typingUsers };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting typing users: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('message:delivery-status')
  async handleGetMessageDeliveryStatus(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const status = this.messagingService.getMessageDeliveryStatus(data.messageId);
      return { success: true, status };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting message delivery status: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('message:stats')
  async handleGetMessagingStats(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const stats = this.messagingService.getMessagingStats();
      return { success: true, stats };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting messaging stats: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  // Presence endpoints
  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('presence:update-status')
  async handleUpdateUserStatus(
    @MessageBody() data: { status: 'online' | 'away' | 'busy' },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      this.presenceService.updateUserStatus(this.server, client, data.status);
      return { success: true, message: 'Status updated successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error updating user status: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('presence:online-users')
  async handleGetOnlineUsers(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const onlineUsers = this.presenceService.getOnlineUsers();
      return { success: true, users: onlineUsers };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting online users: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('presence:user-status')
  async handleGetUserStatus(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const presence = this.presenceService.getUserPresence(data.userId);
      return { success: true, presence };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting user status: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('presence:stats')
  async handleGetPresenceStats(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const stats = this.presenceService.getPresenceStats();
      return { success: true, stats };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting presence stats: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  // Connection recovery endpoints
  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('connection:create-session')
  async handleCreateConnectionSession(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const recoveryToken = this.connectionRecoveryService.createConnectionSession(this.server, client);
      return { success: true, recoveryToken };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error creating connection session: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('connection:recover')
  async handleRecoverConnection(
    @MessageBody() data: { recoveryToken: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      return await this.connectionRecoveryService.recoverConnection(this.server, client, data.recoveryToken);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error recovering connection: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('connection:session-info')
  async handleGetSessionInfo(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const sessionInfo = this.connectionRecoveryService.getSessionInfo(client.id);
      return { success: true, sessionInfo };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting session info: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('connection:stats')
  async handleGetConnectionStats(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const stats = this.connectionRecoveryService.getRecoveryStats();
      return { success: true, stats };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting connection stats: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  // Connection monitoring endpoints
  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('monitoring:metrics')
  async handleGetConnectionMetrics(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const metrics = this.connectionMonitoringService.getConnectionMetrics();
      return { success: true, metrics };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting connection metrics: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('monitoring:events')
  async handleGetConnectionEvents(
    @MessageBody() data: { limit?: number; type?: string; userId?: string; ip?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      let events;
      if (data.type) {
        events = this.connectionMonitoringService.getConnectionEventsByType(data.type as any, data.limit || 100);
      } else if (data.userId) {
        events = this.connectionMonitoringService.getConnectionEventsByUser(data.userId, data.limit || 100);
      } else if (data.ip) {
        events = this.connectionMonitoringService.getConnectionEventsByIP(data.ip, data.limit || 100);
      } else {
        events = this.connectionMonitoringService.getConnectionEvents(data.limit || 100);
      }

      return { success: true, events };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting connection events: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('monitoring:stats')
  async handleGetMonitoringStats(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const stats = this.connectionMonitoringService.getConnectionStats();
      return { success: true, stats };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting monitoring stats: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('monitoring:health')
  async handleGetHealthStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const health = this.connectionMonitoringService.getHealthStatus();
      return { success: true, health };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting health status: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  // Validate connection origin
  private isValidOrigin(origin: string | undefined): boolean {
    if (!origin) {
      return false;
    }
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
    ];
    
    return allowedOrigins.includes(origin);
  }


}

