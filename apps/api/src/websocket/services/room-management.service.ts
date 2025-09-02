import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../websocket.gateway';
import { ChatsService } from '../../chats/chats.service';
import { PrismaService } from '../../database/prisma.service';

interface RoomInfo {
  chatId: string;
  participants: Set<string>;
  lastActivity: Date;
  isActive: boolean;
}

@Injectable()
export class RoomManagementService {
  private readonly logger = new Logger(RoomManagementService.name);
  private readonly rooms = new Map<string, RoomInfo>();
  private readonly userRooms = new Map<string, Set<string>>(); // userId -> Set of chatIds

  constructor(
    private readonly chatService: ChatsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Join a user to a chat room
   */
  async joinRoom(
    server: Server,
    client: AuthenticatedSocket,
    chatId: string,
  ): Promise<{ success: boolean; message: string; roomInfo?: any }> {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const userId = client.user.id;

      // Verify user has access to this chat
      const chat = await this.chatService.findOne(chatId, userId);
      if (!chat) {
        return { success: false, message: 'Chat not found or access denied' };
      }

      // Check if user is already in the room
      if (this.isUserInRoom(userId, chatId)) {
        return { success: false, message: 'User already in this room' };
      }

      // Join the socket.io room
      await client.join(`chat:${chatId}`);

      // Update room management data
      this.addUserToRoom(userId, chatId);

      // Get room participants info
      const roomInfo = await this.getRoomInfo(chatId);

      this.logger.log(`User ${client.user.username} (${userId}) joined chat ${chatId}`);

      // Notify other users in the chat
      client.to(`chat:${chatId}`).emit('user:joined', {
        userId,
        username: client.user.username,
        chatId,
        timestamp: new Date().toISOString(),
        roomInfo,
        onlineCount: roomInfo.participantCount,
      });

      // Send room info to the joining user
      client.emit('room:joined', {
        chatId,
        roomInfo,
        message: 'Successfully joined room',
        onlineCount: roomInfo.participantCount,
      });

      // Broadcast updated online users list to all room participants
      const onlineUsers = this.getRoomOnlineUsers(chatId);
      server.to(`chat:${chatId}`).emit('room:online-update', {
        chatId,
        onlineUsers,
        count: onlineUsers.length,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Joined chat successfully',
        roomInfo,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error joining room: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Remove a user from a chat room
   */
  async leaveRoom(
    server: Server,
    client: AuthenticatedSocket,
    chatId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!client.user) {
        return { success: false, message: 'User not authenticated' };
      }

      const userId = client.user.id;

      // Check if user is in the room
      if (!this.isUserInRoom(userId, chatId)) {
        return { success: false, message: 'User not in this room' };
      }

      // Leave the socket.io room
      await client.leave(`chat:${chatId}`);

      // Update room management data
      this.removeUserFromRoom(userId, chatId);

      this.logger.log(`User ${client.user.username} (${userId}) left chat ${chatId}`);

      // Get updated room info before notifying
      const roomInfo = await this.getRoomInfo(chatId);

      // Notify other users in the chat
      client.to(`chat:${chatId}`).emit('user:left', {
        userId,
        username: client.user.username,
        chatId,
        timestamp: new Date().toISOString(),
        onlineCount: roomInfo?.participantCount || 0,
      });

      // Send confirmation to the leaving user
      client.emit('room:left', {
        chatId,
        message: 'Successfully left room',
        onlineCount: roomInfo?.participantCount || 0,
      });

      // Broadcast updated online users list to remaining room participants
      const onlineUsers = this.getRoomOnlineUsers(chatId);
      server.to(`chat:${chatId}`).emit('room:online-update', {
        chatId,
        onlineUsers,
        count: onlineUsers.length,
        timestamp: new Date().toISOString(),
      });

      return { success: true, message: 'Left chat successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error leaving room: ${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Get information about a room
   */
  async getRoomInfo(chatId: string): Promise<any> {
    const room = this.rooms.get(chatId);
    if (!room) {
      return null;
    }

    // Get chat details from database
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        title: true,
        description: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        participants: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              },
            },
            role: true,
            joinedAt: true,
          },
        },
      },
    });

    if (!chat) {
      return null;
    }

    return {
      chatId,
      title: chat.title,
      description: chat.description,
      isPublic: chat.isPublic,
      participantCount: room.participants.size,
      onlineParticipants: Array.from(room.participants),
      allParticipants: chat.participants,
      lastActivity: room.lastActivity,
      isActive: room.isActive,
    };
  }

  /**
   * Get all rooms a user is currently in
   */
  getUserRooms(userId: string): string[] {
    const userRoomSet = this.userRooms.get(userId);
    return userRoomSet ? Array.from(userRoomSet) : [];
  }

  /**
   * Get all active rooms
   */
  getActiveRooms(): string[] {
    return Array.from(this.rooms.keys()).filter(chatId => {
      const room = this.rooms.get(chatId);
      return room && room.isActive && room.participants.size > 0;
    });
  }

  /**
   * Check if a user is in a specific room
   */
  isUserInRoom(userId: string, chatId: string): boolean {
    const userRoomSet = this.userRooms.get(userId);
    return userRoomSet ? userRoomSet.has(chatId) : false;
  }

  /**
   * Get online users in a specific room
   */
  getRoomOnlineUsers(chatId: string): string[] {
    const room = this.rooms.get(chatId);
    return room ? Array.from(room.participants) : [];
  }

  /**
   * Update room activity timestamp
   */
  updateRoomActivity(chatId: string): void {
    const room = this.rooms.get(chatId);
    if (room) {
      room.lastActivity = new Date();
    }
  }

  /**
   * Clean up empty rooms
   */
  cleanupEmptyRooms(): void {
    const emptyRooms: string[] = [];
    
    for (const [chatId, room] of this.rooms.entries()) {
      if (room.participants.size === 0) {
        emptyRooms.push(chatId);
      }
    }

    for (const chatId of emptyRooms) {
      this.rooms.delete(chatId);
      this.logger.log(`Cleaned up empty room: ${chatId}`);
    }

    if (emptyRooms.length > 0) {
      this.logger.log(`Cleaned up ${emptyRooms.length} empty rooms`);
    }
  }

  /**
   * Handle user disconnection from all rooms
   */
  handleUserDisconnection(userId: string): void {
    const userRoomSet = this.userRooms.get(userId);
    if (!userRoomSet) {
      return;
    }

    const roomsToLeave = Array.from(userRoomSet);
    
    for (const chatId of roomsToLeave) {
      this.removeUserFromRoom(userId, chatId);
    }

    this.userRooms.delete(userId);
    this.logger.log(`User ${userId} disconnected from ${roomsToLeave.length} rooms`);
  }

  /**
   * Subscribe user to multiple rooms at once
   */
  async subscribeToRooms(
    server: Server,
    client: AuthenticatedSocket,
    chatIds: string[],
  ): Promise<{ success: boolean; message: string; results: any[] }> {
    const results = [];
    
    for (const chatId of chatIds) {
      const result = await this.joinRoom(server, client, chatId);
      results.push({ chatId, ...result });
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return {
      success: successCount > 0,
      message: `Subscribed to ${successCount}/${totalCount} rooms`,
      results,
    };
  }

  /**
   * Unsubscribe user from multiple rooms at once
   */
  async unsubscribeFromRooms(
    server: Server,
    client: AuthenticatedSocket,
    chatIds: string[],
  ): Promise<{ success: boolean; message: string; results: any[] }> {
    const results = [];
    
    for (const chatId of chatIds) {
      const result = await this.leaveRoom(server, client, chatId);
      results.push({ chatId, ...result });
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return {
      success: successCount > 0,
      message: `Unsubscribed from ${successCount}/${totalCount} rooms`,
      results,
    };
  }

  /**
   * Get user's room subscription status
   */
  getUserSubscriptionStatus(userId: string): {
    subscribedRooms: string[];
    totalRooms: number;
    activeRooms: number;
  } {
    const subscribedRooms = this.getUserRooms(userId);
    const activeRooms = subscribedRooms.filter(chatId => {
      const room = this.rooms.get(chatId);
      return room && room.isActive;
    });

    return {
      subscribedRooms,
      totalRooms: subscribedRooms.length,
      activeRooms: activeRooms.length,
    };
  }

  /**
   * Check if user is subscribed to a room
   */
  isUserSubscribed(userId: string, chatId: string): boolean {
    return this.isUserInRoom(userId, chatId);
  }

  /**
   * Get room subscription details
   */
  getRoomSubscriptionDetails(chatId: string): {
    chatId: string;
    subscriberCount: number;
    subscribers: string[];
    isActive: boolean;
    lastActivity: Date | null;
  } {
    const room = this.rooms.get(chatId);
    
    if (!room) {
      return {
        chatId,
        subscriberCount: 0,
        subscribers: [],
        isActive: false,
        lastActivity: null,
      };
    }

    return {
      chatId,
      subscriberCount: room.participants.size,
      subscribers: Array.from(room.participants),
      isActive: room.isActive,
      lastActivity: room.lastActivity,
    };
  }

  /**
   * Get room statistics
   */
  getRoomStats(): {
    totalRooms: number;
    activeRooms: number;
    totalUsers: number;
    averageUsersPerRoom: number;
  } {
    const totalRooms = this.rooms.size;
    const activeRooms = this.getActiveRooms().length;
    const totalUsers = this.userRooms.size;
    const averageUsersPerRoom = totalRooms > 0 ? totalUsers / totalRooms : 0;

    return {
      totalRooms,
      activeRooms,
      totalUsers,
      averageUsersPerRoom: Math.round(averageUsersPerRoom * 100) / 100,
    };
  }

  /**
   * Private helper methods
   */
  private addUserToRoom(userId: string, chatId: string): void {
    // Add to room participants
    let room = this.rooms.get(chatId);
    if (!room) {
      room = {
        chatId,
        participants: new Set(),
        lastActivity: new Date(),
        isActive: true,
      };
      this.rooms.set(chatId, room);
    }
    room.participants.add(userId);
    room.lastActivity = new Date();

    // Add to user rooms
    let userRoomSet = this.userRooms.get(userId);
    if (!userRoomSet) {
      userRoomSet = new Set();
      this.userRooms.set(userId, userRoomSet);
    }
    userRoomSet.add(chatId);
  }

  private removeUserFromRoom(userId: string, chatId: string): void {
    // Remove from room participants
    const room = this.rooms.get(chatId);
    if (room) {
      room.participants.delete(userId);
      room.lastActivity = new Date();
      
      // Mark room as inactive if no participants
      if (room.participants.size === 0) {
        room.isActive = false;
      }
    }

    // Remove from user rooms
    const userRoomSet = this.userRooms.get(userId);
    if (userRoomSet) {
      userRoomSet.delete(chatId);
      if (userRoomSet.size === 0) {
        this.userRooms.delete(userId);
      }
    }
  }
}
