import { Test, TestingModule } from '@nestjs/testing';
import { RoomManagementService } from './room-management.service';
import { ChatsService } from '../../chats/chats.service';
import { PrismaService } from '../../database/prisma.service';
import { Server } from 'socket.io';

describe('RoomManagementService', () => {
  let service: RoomManagementService;
  let mockChatsService: jest.Mocked<ChatsService>;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockServer: jest.Mocked<Server>;

  const mockClient = {
    id: 'test-socket-id',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
    },
    join: jest.fn(),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as any;

  const mockChat = {
    id: 'test-chat-id',
    name: 'Test Chat',
    description: 'Test Description',
    isPublic: true,
    participantCount: 1,
    messageCount: 0,
    _count: undefined,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: [
      {
        userId: 'test-user-id',
        role: 'MEMBER',
        user: {
          id: 'test-user-id',
          username: 'testuser',
          email: 'test@example.com',
        },
      },
    ],
  };

  beforeEach(async () => {
    const mockChatsServiceValue = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockPrismaServiceValue = {
      chat: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomManagementService,
        {
          provide: ChatsService,
          useValue: mockChatsServiceValue,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaServiceValue,
        },
      ],
    }).compile();

    service = module.get<RoomManagementService>(RoomManagementService);
    mockChatsService = module.get(ChatsService);
    mockPrismaService = module.get(PrismaService);

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    // Setup default mocks
    mockChatsService.findOne.mockResolvedValue(mockChat);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('joinRoom', () => {
    it('should successfully join a room', async () => {
      const result = await service.joinRoom(mockServer, mockClient, 'test-chat-id');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Joined chat successfully');
      expect(mockClient.join).toHaveBeenCalledWith('chat:test-chat-id');
      expect(mockChatsService.findOne).toHaveBeenCalledWith('test-chat-id', 'test-user-id');
    });

    it('should fail if user is not authenticated', async () => {
      const unauthenticatedClient = { ...mockClient, user: undefined };
      const result = await service.joinRoom(mockServer, unauthenticatedClient, 'test-chat-id');

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not authenticated');
    });

    it('should fail if chat is not found', async () => {
      mockChatsService.findOne.mockResolvedValue(undefined);
      const result = await service.joinRoom(mockServer, mockClient, 'non-existent-chat');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Chat not found or access denied');
    });

    it('should fail if user is already in room', async () => {
      // First join
      await service.joinRoom(mockServer, mockClient, 'test-chat-id');
      
      // Second join should fail
      const result = await service.joinRoom(mockServer, mockClient, 'test-chat-id');

      expect(result.success).toBe(false);
      expect(result.message).toBe('User already in this room');
    });
  });

  describe('leaveRoom', () => {
    it('should successfully leave a room', async () => {
      // First join the room
      await service.joinRoom(mockServer, mockClient, 'test-chat-id');
      
      // Then leave it
      const result = await service.leaveRoom(mockServer, mockClient, 'test-chat-id');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Left chat successfully');
    });

    it('should fail if user is not in room', async () => {
      const result = await service.leaveRoom(mockServer, mockClient, 'test-chat-id');

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not in this room');
    });
  });

  describe('getRoomInfo', () => {
    it('should return room information', async () => {
      await service.joinRoom(mockServer, mockClient, 'test-chat-id');
      const roomInfo = await service.getRoomInfo('test-chat-id');

      expect(roomInfo).toBeDefined();
      expect(roomInfo.chatId).toBe('test-chat-id');
      expect(roomInfo.participantCount).toBe(1);
    });

    it('should return null for non-existent room', async () => {
      const roomInfo = await service.getRoomInfo('non-existent-chat');
      expect(roomInfo).toBeNull();
    });
  });

  describe('getRoomOnlineUsers', () => {
    it('should return online users in room', async () => {
      await service.joinRoom(mockServer, mockClient, 'test-chat-id');
      const onlineUsers = service.getRoomOnlineUsers('test-chat-id');

      expect(onlineUsers).toHaveLength(1);
      expect(onlineUsers[0]).toBe('test-user-id');
    });

    it('should return empty array for non-existent room', () => {
      const onlineUsers = service.getRoomOnlineUsers('non-existent-chat');
      expect(onlineUsers).toHaveLength(0);
    });
  });

  describe('getUserRooms', () => {
    it('should return user rooms', async () => {
      await service.joinRoom(mockServer, mockClient, 'test-chat-id');
      const userRooms = service.getUserRooms('test-user-id');

      expect(userRooms).toContain('test-chat-id');
    });

    it('should return empty array for user with no rooms', () => {
      const userRooms = service.getUserRooms('non-existent-user');
      expect(userRooms).toHaveLength(0);
    });
  });

  describe('isUserInRoom', () => {
    it('should return true if user is in room', async () => {
      await service.joinRoom(mockServer, mockClient, 'test-chat-id');
      const isInRoom = service.isUserInRoom('test-user-id', 'test-chat-id');

      expect(isInRoom).toBe(true);
    });

    it('should return false if user is not in room', () => {
      const isInRoom = service.isUserInRoom('test-user-id', 'test-chat-id');
      expect(isInRoom).toBe(false);
    });
  });

  describe('handleUserDisconnection', () => {
    it('should handle user disconnection from all rooms', async () => {
      await service.joinRoom(mockServer, mockClient, 'test-chat-id');
      service.handleUserDisconnection('test-user-id');

      const isInRoom = service.isUserInRoom('test-user-id', 'test-chat-id');
      expect(isInRoom).toBe(false);
    });
  });

  describe('cleanupEmptyRooms', () => {
    it('should clean up empty rooms', async () => {
      await service.joinRoom(mockServer, mockClient, 'test-chat-id');
      await service.leaveRoom(mockServer, mockClient, 'test-chat-id');
      
      service.cleanupEmptyRooms();
      
      const roomInfo = await service.getRoomInfo('test-chat-id');
      expect(roomInfo).toBeNull();
    });
  });
});
