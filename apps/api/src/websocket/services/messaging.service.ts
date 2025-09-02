import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../websocket.gateway';
import { MessagesService } from '../../messages/messages.service';
import { ChatsService } from '../../chats/chats.service';
import { RoomManagementService } from './room-management.service';
import { WebSocketRateLimitService } from './websocket-rate-limit.service';

interface MessageDeliveryStatus {
  messageId: string;
  chatId: string;
  senderId: string;
  deliveredTo: Set<string>;
  readBy: Set<string>;
  timestamp: Date;
}

interface TypingUser {
  userId: string;
  username: string;
  chatId: string;
  startedAt: Date;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly messageDeliveryStatus = new Map<string, MessageDeliveryStatus>();
  private readonly typingUsers = new Map<string, TypingUser>();
  private readonly typingTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly messageService: MessagesService,
    private readonly chatService: ChatsService,
    private readonly roomManagementService: RoomManagementService,
    private readonly rateLimitService: WebSocketRateLimitService,
  ) {}

  /**
   * Send a message and broadcast it to room participants
   */
  async sendMessage(
    server: Server,
    client: AuthenticatedSocket,
    data: { chatId: string; content: string; type: string },
  ): Promise<{ success: boolean; message: string; messageData?: any }> {
    try {
      const { chatId, content, type } = data;

      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      // Check message rate limiting
      if (!this.rateLimitService.isMessageAllowed(client.user.id)) {
        this.logger.warn(`Message rate limit exceeded for user: ${client.user.id}`);
        return { success: false, message: 'Message rate limit exceeded. Please slow down.' };
      }

      // Validate message content
      if (!content || content.trim().length === 0) {
        return { success: false, message: 'Message content cannot be empty' };
      }

      if (content.length > 4000) {
        return { success: false, message: 'Message content too long (max 4000 characters)' };
      }

      // Create message in database
      const message = await this.messageService.create(
        {
          content: content.trim(),
          type: type as any,
          chatId,
        },
        client.user.id,
      );

      // Create message delivery status tracking
      const deliveryStatus: MessageDeliveryStatus = {
        messageId: message.id,
        chatId,
        senderId: client.user.id,
        deliveredTo: new Set(),
        readBy: new Set([client.user.id]), // Sender has read their own message
        timestamp: new Date(),
      };
      this.messageDeliveryStatus.set(message.id, deliveryStatus);

      // Prepare message data for broadcasting
      const messageData = {
        ...message,
        user: {
          id: client.user.id,
          username: client.user.username,
          email: client.user.email,
        },
        timestamp: new Date().toISOString(),
        deliveryStatus: {
          delivered: false,
          read: false,
        },
      };

      // Broadcast message to all users in the chat
      const onlineUsers = this.roomManagementService.getRoomOnlineUsers(chatId);
      server.to(`chat:${chatId}`).emit('message:new', messageData);

      // Send delivery confirmation to sender
      client.emit('message:sent', {
        messageId: message.id,
        chatId,
        timestamp: new Date().toISOString(),
        deliveredTo: onlineUsers.length,
      });

      // Update chat's updatedAt timestamp
      await this.chatService.update(chatId, {}, client.user.id);

      // Update room activity
      this.roomManagementService.updateRoomActivity(chatId);

      // Stop typing indicator for sender
      this.stopTyping(client.user.id, chatId);

      this.logger.log(`Message sent by ${client.user.username} in chat ${chatId}: ${message.id}`);

      return {
        success: true,
        message: 'Message sent successfully',
        messageData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending message: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Handle message delivery confirmation
   */
  handleMessageDelivered(
    server: Server,
    client: AuthenticatedSocket,
    data: { messageId: string; chatId: string },
  ): void {
    try {
      if (!client.user) {
        return;
      }

      const { messageId, chatId } = data;
      const deliveryStatus = this.messageDeliveryStatus.get(messageId);

      if (!deliveryStatus) {
        return;
      }

      // Mark message as delivered to this user
      deliveryStatus.deliveredTo.add(client.user.id);

      // Notify sender about delivery
      const senderSocket = this.findSocketByUserId(server, deliveryStatus.senderId);
      if (senderSocket) {
        senderSocket.emit('message:delivered', {
          messageId,
          chatId,
          deliveredTo: client.user.id,
          deliveredCount: deliveryStatus.deliveredTo.size,
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.debug(`Message ${messageId} delivered to user ${client.user.id}`);
    } catch (error) {
      this.logger.error(`Error handling message delivery: ${error}`);
    }
  }

  /**
   * Handle message read confirmation
   */
  handleMessageRead(
    server: Server,
    client: AuthenticatedSocket,
    data: { messageId: string; chatId: string },
  ): void {
    try {
      if (!client.user) {
        return;
      }

      const { messageId, chatId } = data;
      const deliveryStatus = this.messageDeliveryStatus.get(messageId);

      if (!deliveryStatus) {
        return;
      }

      // Mark message as read by this user
      deliveryStatus.readBy.add(client.user.id);

      // Notify sender about read status
      const senderSocket = this.findSocketByUserId(server, deliveryStatus.senderId);
      if (senderSocket) {
        senderSocket.emit('message:read', {
          messageId,
          chatId,
          readBy: client.user.id,
          readCount: deliveryStatus.readBy.size,
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.debug(`Message ${messageId} read by user ${client.user.id}`);
    } catch (error) {
      this.logger.error(`Error handling message read: ${error}`);
    }
  }

  /**
   * Handle typing indicator
   */
  handleTyping(
    server: Server,
    client: AuthenticatedSocket,
    data: { chatId: string; isTyping: boolean },
  ): void {
    try {
      if (!client.user) {
        return;
      }

      const { chatId, isTyping } = data;
      const userId = client.user.id;
      const typingKey = `${userId}:${chatId}`;

      if (isTyping) {
        // Start typing
        const typingUser: TypingUser = {
          userId,
          username: client.user.username,
          chatId,
          startedAt: new Date(),
        };

        this.typingUsers.set(typingKey, typingUser);

        // Clear existing timeout
        const existingTimeout = this.typingTimeouts.get(typingKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set timeout to stop typing after 3 seconds
        const timeout = setTimeout(() => {
          this.stopTyping(userId, chatId);
        }, 3000);
        this.typingTimeouts.set(typingKey, timeout);

        // Broadcast typing indicator to other users in the chat
        client.to(`chat:${chatId}`).emit('user:typing', {
          userId,
          username: client.user.username,
          chatId,
          isTyping: true,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Stop typing
        this.stopTyping(userId, chatId);
      }
    } catch (error) {
      this.logger.error(`Error handling typing indicator: ${error}`);
    }
  }

  /**
   * Stop typing indicator for a user
   */
  private stopTyping(userId: string, chatId: string): void {
    const typingKey = `${userId}:${chatId}`;
    const typingUser = this.typingUsers.get(typingKey);

    if (typingUser) {
      // Clear timeout
      const timeout = this.typingTimeouts.get(typingKey);
      if (timeout) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(typingKey);
      }

      // Remove from typing users
      this.typingUsers.delete(typingKey);

      // Broadcast stop typing to other users in the chat
      const server = this.getServerInstance();
      if (server) {
        server.to(`chat:${chatId}`).emit('user:typing', {
          userId,
          username: typingUser.username,
          chatId,
          isTyping: false,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Get typing users in a chat
   */
  getTypingUsers(chatId: string): TypingUser[] {
    return Array.from(this.typingUsers.values()).filter(
      user => user.chatId === chatId
    );
  }

  /**
   * Get typing users with additional info
   */
  getTypingUsersInfo(chatId: string): {
    users: Array<{
      userId: string;
      username: string;
      startedAt: Date;
      duration: number;
    }>;
    count: number;
  } {
    const typingUsers = this.getTypingUsers(chatId);
    const now = new Date();

    const users = typingUsers.map(user => ({
      userId: user.userId,
      username: user.username,
      startedAt: user.startedAt,
      duration: now.getTime() - user.startedAt.getTime(),
    }));

    return {
      users,
      count: users.length,
    };
  }

  /**
   * Check if a user is typing in a chat
   */
  isUserTyping(userId: string, chatId: string): boolean {
    const typingKey = `${userId}:${chatId}`;
    return this.typingUsers.has(typingKey);
  }

  /**
   * Get all typing users across all chats
   */
  getAllTypingUsers(): Map<string, TypingUser[]> {
    const result = new Map<string, TypingUser[]>();
    
    for (const user of this.typingUsers.values()) {
      if (!result.has(user.chatId)) {
        result.set(user.chatId, []);
      }
      result.get(user.chatId)!.push(user);
    }

    return result;
  }

  /**
   * Get message delivery status
   */
  getMessageDeliveryStatus(messageId: string): MessageDeliveryStatus | null {
    return this.messageDeliveryStatus.get(messageId) || null;
  }

  /**
   * Clean up old message delivery statuses
   */
  cleanupOldMessageStatuses(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [messageId, status] of this.messageDeliveryStatus.entries()) {
      if (now.getTime() - status.timestamp.getTime() > maxAge) {
        this.messageDeliveryStatus.delete(messageId);
      }
    }
  }

  /**
   * Get messaging statistics
   */
  getMessagingStats(): {
    activeTypingUsers: number;
    trackedMessages: number;
    totalDeliveries: number;
    totalReads: number;
  } {
    let totalDeliveries = 0;
    let totalReads = 0;

    for (const status of this.messageDeliveryStatus.values()) {
      totalDeliveries += status.deliveredTo.size;
      totalReads += status.readBy.size;
    }

    return {
      activeTypingUsers: this.typingUsers.size,
      trackedMessages: this.messageDeliveryStatus.size,
      totalDeliveries,
      totalReads,
    };
  }

  /**
   * Private helper methods
   */
  private findSocketByUserId(server: Server, userId: string): AuthenticatedSocket | null {
    // This would need to be implemented based on how you track user sockets
    // For now, we'll return null as this requires socket tracking
    return null;
  }

  private getServerInstance(): Server | null {
    // This would need to be injected or accessed differently
    // For now, we'll return null
    return null;
  }
}
