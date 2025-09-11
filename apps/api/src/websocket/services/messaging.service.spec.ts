import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from './messaging.service';
import { MessagesService } from '../../messages/messages.service';
import { ChatsService } from '../../chats/chats.service';
import { WebSocketRateLimitService } from './websocket-rate-limit.service';
import { RoomManagementService } from './room-management.service';
import { Server } from 'socket.io';

describe('MessagingService', () => {
  let service: MessagingService;
  let mockMessagesService: jest.Mocked<MessagesService>;
  let mockChatsService: jest.Mocked<ChatsService>;
  let mockRateLimitService: jest.Mocked<WebSocketRateLimitService>;
  let mockRoomManagementService: jest.Mocked<RoomManagementService>;
  let mockServer: jest.Mocked<Server>;

  const mockClient = {
    id: 'test-socket-id',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
    },
    emit: jest.fn(),
  } as any;

  const mockMessage = {
    id: 'test-message-id',
    content: 'Test message',
    type: 'TEXT' as any,
    chatId: 'test-chat-id',
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'test-user-id',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      avatar: null,
    },
    metadata: {},
  };

  beforeEach(async () => {
    const mockMessagesServiceValue = {
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockChatsServiceValue = {
      update: jest.fn(),
    };

    const mockRateLimitServiceValue = {
      isMessageAllowed: jest.fn(),
    };

    const mockRoomManagementServiceValue = {
      updateRoomActivity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: MessagesService,
          useValue: mockMessagesServiceValue,
        },
        {
          provide: ChatsService,
          useValue: mockChatsServiceValue,
        },
        {
          provide: WebSocketRateLimitService,
          useValue: mockRateLimitServiceValue,
        },
        {
          provide: RoomManagementService,
          useValue: mockRoomManagementServiceValue,
        },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    mockMessagesService = module.get(MessagesService);
    mockChatsService = module.get(ChatsService);
    mockRateLimitService = module.get(WebSocketRateLimitService);
    mockRoomManagementService = module.get(RoomManagementService);

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    // Setup default mocks
    mockMessagesService.create.mockResolvedValue(mockMessage);
    mockRateLimitService.isMessageAllowed.mockReturnValue(true);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should successfully send a message', async () => {
      const messageData = {
        chatId: 'test-chat-id',
        content: 'Test message',
        type: 'TEXT' as any,
      };

      const result = await service.sendMessage(mockServer, mockClient, messageData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Message sent successfully');
      expect(mockMessagesService.create).toHaveBeenCalledWith(
        {
          content: 'Test message',
          type: 'TEXT' as any,
          chatId: 'test-chat-id',
        },
        'test-user-id'
      );
      expect(mockServer.to).toHaveBeenCalledWith('chat:test-chat-id');
      expect(mockServer.emit).toHaveBeenCalledWith('message:new', expect.any(Object));
    });

    it('should fail if user is not authenticated', async () => {
      const unauthenticatedClient = { ...mockClient, user: undefined };
      const messageData = {
        chatId: 'test-chat-id',
        content: 'Test message',
        type: 'TEXT' as any,
      };

      const result = await service.sendMessage(mockServer, unauthenticatedClient, messageData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not authenticated');
    });

    it('should fail if rate limit exceeded', async () => {
      mockRateLimitService.isMessageAllowed.mockReturnValue(false);
      const messageData = {
        chatId: 'test-chat-id',
        content: 'Test message',
        type: 'TEXT' as any,
      };

      const result = await service.sendMessage(mockServer, mockClient, messageData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Message rate limit exceeded. Please slow down.');
    });

    it('should handle message creation error', async () => {
      mockMessagesService.create.mockRejectedValue(new Error('Database error'));
      const messageData = {
        chatId: 'test-chat-id',
        content: 'Test message',
        type: 'TEXT' as any,
      };

      const result = await service.sendMessage(mockServer, mockClient, messageData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
    });
  });

  describe('handleTyping', () => {
    it('should handle typing start', () => {
      const typingData = {
        chatId: 'test-chat-id',
        isTyping: true,
      };

      service.handleTyping(mockServer, mockClient, typingData);

      expect(mockServer.to).toHaveBeenCalledWith('chat:test-chat-id');
      expect(mockServer.emit).toHaveBeenCalledWith('user:typing', expect.any(Object));
    });

    it('should handle typing stop', () => {
      const typingData = {
        chatId: 'test-chat-id',
        isTyping: false,
      };

      service.handleTyping(mockServer, mockClient, typingData);

      expect(mockServer.to).toHaveBeenCalledWith('chat:test-chat-id');
      expect(mockServer.emit).toHaveBeenCalledWith('user:typing', expect.any(Object));
    });

    it('should fail if user is not authenticated', () => {
      const unauthenticatedClient = { ...mockClient, user: undefined };
      const typingData = {
        chatId: 'test-chat-id',
        isTyping: true,
      };

      expect(() => service.handleTyping(mockServer, unauthenticatedClient, typingData))
        .toThrow('User not authenticated');
    });
  });

  describe('handleMessageDelivered', () => {
    it('should handle message delivered', () => {
      const deliveryData = {
        messageId: 'test-message-id',
        chatId: 'test-chat-id',
      };

      service.handleMessageDelivered(mockServer, mockClient, deliveryData);

      expect(mockServer.to).toHaveBeenCalledWith('chat:test-chat-id');
      expect(mockServer.emit).toHaveBeenCalledWith('message:delivered', expect.any(Object));
    });

    it('should fail if user is not authenticated', () => {
      const unauthenticatedClient = { ...mockClient, user: undefined };
      const deliveryData = {
        messageId: 'test-message-id',
        chatId: 'test-chat-id',
      };

      expect(() => service.handleMessageDelivered(mockServer, unauthenticatedClient, deliveryData))
        .toThrow('User not authenticated');
    });
  });

  describe('handleMessageRead', () => {
    it('should handle message read', () => {
      const readData = {
        messageId: 'test-message-id',
        chatId: 'test-chat-id',
      };

      service.handleMessageRead(mockServer, mockClient, readData);

      expect(mockServer.to).toHaveBeenCalledWith('chat:test-chat-id');
      expect(mockServer.emit).toHaveBeenCalledWith('message:read', expect.any(Object));
    });

    it('should fail if user is not authenticated', () => {
      const unauthenticatedClient = { ...mockClient, user: undefined };
      const readData = {
        messageId: 'test-message-id',
        chatId: 'test-chat-id',
      };

      expect(() => service.handleMessageRead(mockServer, unauthenticatedClient, readData))
        .toThrow('User not authenticated');
    });
  });

  describe('getTypingUsers', () => {
    it('should return typing users for chat', () => {
      const typingData = {
        chatId: 'test-chat-id',
        isTyping: true,
      };

      service.handleTyping(mockServer, mockClient, typingData);
      const typingUsers = service.getTypingUsers('test-chat-id');

      expect(typingUsers).toHaveLength(1);
      expect(typingUsers[0].userId).toBe('test-user-id');
      expect(typingUsers[0].username).toBe('testuser');
    });

    it('should return empty array for chat with no typing users', () => {
      const typingUsers = service.getTypingUsers('non-existent-chat');
      expect(typingUsers).toHaveLength(0);
    });
  });

  describe('getMessageDeliveryStatus', () => {
    it('should return message delivery status', async () => {
      const messageData = {
        chatId: 'test-chat-id',
        content: 'Test message',
        type: 'TEXT' as any,
      };

      await service.sendMessage(mockServer, mockClient, messageData);
      const status = service.getMessageDeliveryStatus('test-message-id');

      expect(status).toBeDefined();
      if (status) {
        expect(status.messageId).toBe('test-message-id');
        expect(status.deliveredTo).toBeInstanceOf(Set);
        expect(status.readBy).toBeInstanceOf(Set);
      }
    });

    it('should return null for non-existent message', () => {
      const status = service.getMessageDeliveryStatus('non-existent-message');
      expect(status).toBeNull();
    });
  });

  describe('getMessagingStats', () => {
    it('should return messaging statistics', () => {
      const stats = service.getMessagingStats();

      expect(stats).toBeDefined();
      expect(stats.activeTypingUsers).toBe(0);
      expect(stats.trackedMessages).toBe(0);
      expect(stats.totalDeliveries).toBe(0);
      expect(stats.totalReads).toBe(0);
    });
  });

  describe('cleanupOldMessageStatuses', () => {
    it('should clean up old message statuses', () => {
      expect(() => service.cleanupOldMessageStatuses()).not.toThrow();
    });
  });
});
