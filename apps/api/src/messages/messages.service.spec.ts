import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { PrismaService } from '../database/prisma.service';
import { MessageType } from '@prisma/client';

describe('MessagesService', () => {
  let service: MessagesService;

  const mockPrismaService = {
    chatParticipant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    chat: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createMessageDto = {
      content: 'Hello, world!',
      type: MessageType.TEXT,
      chatId: 'chat-1',
              metadata: {},
    };

    it('should create a message successfully', async () => {
      const mockParticipant = {
        userId: 'user-1',
        chatId: 'chat-1',
        role: 'MEMBER',
      };

      const mockMessage = {
        id: 'message-1',
        content: 'Hello, world!',
        type: MessageType.TEXT,
        userId: 'user-1',
        chatId: 'chat-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-1',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          avatar: null,
        },
      };

      mockPrismaService.chatParticipant.findUnique.mockResolvedValue(mockParticipant);
      mockPrismaService.message.create.mockResolvedValue(mockMessage);
      mockPrismaService.chat.update.mockResolvedValue({});

      const result = await service.create(createMessageDto, 'user-1');

      expect(result).toEqual(mockMessage);
      expect(mockPrismaService.message.create).toHaveBeenCalledWith({
        data: {
          content: 'Hello, world!',
          type: MessageType.TEXT,
          metadata: {},
          userId: 'user-1',
          chatId: 'chat-1',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });
      expect(mockPrismaService.chat.update).toHaveBeenCalledWith({
        where: { id: 'chat-1' },
        data: { updatedAt: expect.any(Date) },
      });
    });

    it('should throw ForbiddenException if user is not a participant', async () => {
      mockPrismaService.chatParticipant.findUnique.mockResolvedValue(null);

      await expect(service.create(createMessageDto, 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrismaService.chatParticipant.findUnique).toHaveBeenCalledWith({
        where: {
          userId_chatId: {
            userId: 'user-1',
            chatId: 'chat-1',
          },
        },
      });
    });

    it('should throw BadRequestException for empty text message', async () => {
      const mockParticipant = {
        userId: 'user-1',
        chatId: 'chat-1',
        role: 'MEMBER',
      };

      const emptyMessageDto = {
        ...createMessageDto,
        content: '   ', // Empty content with spaces
      };

      mockPrismaService.chatParticipant.findUnique.mockResolvedValue(mockParticipant);

      await expect(service.create(emptyMessageDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    const mockQuery = {
      page: 1,
      limit: 50,
      search: 'hello',
      type: MessageType.TEXT,
      userId: 'user-1',
      chatId: 'chat-1',
      sortBy: 'createdAt' as any,
      sortOrder: 'desc' as any,
    };

    it('should return messages with pagination for specific chat', async () => {
      const mockParticipant = {
        userId: 'user-1',
        chatId: 'chat-1',
        role: 'MEMBER',
      };

      const mockMessages = [
        {
          id: 'message-1',
          content: 'Hello, world!',
          type: MessageType.TEXT,
          userId: 'user-1',
          chatId: 'chat-1',
          user: { id: 'user-1', username: 'testuser' },
        },
      ];

      mockPrismaService.chatParticipant.findUnique.mockResolvedValue(mockParticipant);
      mockPrismaService.message.count.mockResolvedValue(1);
      mockPrismaService.message.findMany.mockResolvedValue(mockMessages);

      const result = await service.findAll(mockQuery, 'user-1');

      expect(result.data).toEqual(mockMessages);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('should return messages from user accessible chats when no chatId specified', async () => {
      const queryWithoutChatId = { ...mockQuery };
      // delete queryWithoutChatId.chatId;

      const mockUserChats = [
        { chatId: 'chat-1' },
        { chatId: 'chat-2' },
      ];

      mockPrismaService.chatParticipant.findMany.mockResolvedValue(mockUserChats);
      mockPrismaService.message.count.mockResolvedValue(5);
      mockPrismaService.message.findMany.mockResolvedValue([]);

      const result = await service.findAll(queryWithoutChatId, 'user-1');

      expect(mockPrismaService.chatParticipant.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: { chatId: true },
      });
      expect(result.pagination.total).toBe(5);
    });

    it('should throw ForbiddenException if user has no access to specified chat', async () => {
      mockPrismaService.chatParticipant.findUnique.mockResolvedValue(null);

      await expect(service.findAll(mockQuery, 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findOne', () => {
    const mockMessage = {
      id: 'message-1',
      content: 'Hello, world!',
      type: MessageType.TEXT,
      userId: 'user-1',
      chatId: 'chat-1',
      user: { id: 'user-1', username: 'testuser' },
      chat: {
        participants: [{ role: 'MEMBER' }],
      },
    };

    it('should return message if user has access', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);

      const result = await service.findOne('message-1', 'user-1');

      expect(result).toEqual(mockMessage);
      expect(mockPrismaService.message.findUnique).toHaveBeenCalledWith({
        where: { id: 'message-1' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          chat: {
            include: {
              participants: {
                where: { userId: 'user-1' },
                select: { role: true },
              },
            },
          },
        },
      });
    });

    it('should throw NotFoundException if message does not exist', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-message', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user has no access to message', async () => {
      const messageWithoutAccess = {
        ...mockMessage,
        chat: {
          participants: [], // User not in participants
        },
      };

      mockPrismaService.message.findUnique.mockResolvedValue(messageWithoutAccess);

      await expect(service.findOne('message-1', 'user-2')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    const updateMessageDto = {
      content: 'Updated message content',
    };

    it('should update message if user is the author', async () => {
      const mockMessage = {
        id: 'message-1',
        userId: 'user-1',
        chatId: 'chat-1',
        type: MessageType.TEXT,
        chat: {
          participants: [{ role: 'MEMBER' }],
        },
      };

      const mockUpdatedMessage = {
        ...mockMessage,
        content: 'Updated message content',
        user: { id: 'user-1', username: 'testuser' },
      };

      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
      mockPrismaService.message.update.mockResolvedValue(mockUpdatedMessage);
      mockPrismaService.chat.update.mockResolvedValue({});

      const result = await service.update('message-1', updateMessageDto, 'user-1');

      expect(result).toEqual(mockUpdatedMessage);
      expect(mockPrismaService.message.update).toHaveBeenCalledWith({
        where: { id: 'message-1' },
        data: {
          ...updateMessageDto,
          updatedAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });
    });

    it('should allow admin/moderator to update messages', async () => {
      const mockMessage = {
        id: 'message-1',
        userId: 'user-2', // Different user
        chatId: 'chat-1',
        type: MessageType.TEXT,
        chat: {
          participants: [{ role: 'ADMIN' }], // User is admin
        },
      };

      const mockUpdatedMessage = {
        ...mockMessage,
        content: 'Updated message content',
        user: { id: 'user-2', username: 'otheruser' },
      };

      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
      mockPrismaService.message.update.mockResolvedValue(mockUpdatedMessage);
      mockPrismaService.chat.update.mockResolvedValue({});

      const result = await service.update('message-1', updateMessageDto, 'user-1');

      expect(result).toEqual(mockUpdatedMessage);
    });

    it('should throw ForbiddenException for system messages', async () => {
      const mockSystemMessage = {
        id: 'message-1',
        userId: 'user-1',
        chatId: 'chat-1',
        type: MessageType.SYSTEM,
        chat: {
          participants: [{ role: 'MEMBER' }],
        },
      };

      mockPrismaService.message.findUnique.mockResolvedValue(mockSystemMessage);

      await expect(service.update('message-1', updateMessageDto, 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('should delete message if user is the author', async () => {
      const mockMessage = {
        id: 'message-1',
        userId: 'user-1',
        chatId: 'chat-1',
        type: MessageType.TEXT,
        chat: {
          participants: [{ role: 'MEMBER' }],
        },
      };

      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
      mockPrismaService.message.delete.mockResolvedValue({});
      mockPrismaService.chat.update.mockResolvedValue({});

      const result = await service.remove('message-1', 'user-1');

      expect(result).toEqual({ message: 'Message deleted successfully' });
      expect(mockPrismaService.message.delete).toHaveBeenCalledWith({
        where: { id: 'message-1' },
      });
    });

    it('should throw ForbiddenException for system messages', async () => {
      const mockSystemMessage = {
        id: 'message-1',
        userId: 'user-1',
        chatId: 'chat-1',
        type: MessageType.SYSTEM,
        chat: {
          participants: [{ role: 'MEMBER' }],
        },
      };

      mockPrismaService.message.findUnique.mockResolvedValue(mockSystemMessage);

      await expect(service.remove('message-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getChatMessages', () => {
    it('should return messages for accessible chat', async () => {
      const mockParticipant = {
        userId: 'user-1',
        chatId: 'chat-1',
        role: 'MEMBER',
      };

      const mockQuery = { page: 1, limit: 50 };
      const mockResult = { data: [], pagination: {} };

      mockPrismaService.chatParticipant.findUnique.mockResolvedValue(mockParticipant);

      // Mock the findAll method
      jest.spyOn(service, 'findAll').mockResolvedValue(mockResult as any);

      const result = await service.getChatMessages('chat-1', mockQuery, 'user-1');

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(
        { ...mockQuery, chatId: 'chat-1' },
        'user-1',
      );
    });

    it('should throw ForbiddenException if user has no access to chat', async () => {
      mockPrismaService.chatParticipant.findUnique.mockResolvedValue(null);

      await expect(service.getChatMessages('chat-1', {}, 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('searchMessages', () => {
    it('should search messages across accessible chats', async () => {
      const mockUserChats = [
        { chatId: 'chat-1' },
        { chatId: 'chat-2' },
      ];

      const mockMessages = [
        {
          id: 'message-1',
          content: 'Hello world',
          user: { id: 'user-1', username: 'testuser' },
          chat: { id: 'chat-1', title: 'Test Chat' },
        },
      ];

      mockPrismaService.chatParticipant.findMany.mockResolvedValue(mockUserChats);
      mockPrismaService.message.findMany.mockResolvedValue(mockMessages);

      const result = await service.searchMessages('hello', 'user-1', 10);

      expect(result.data).toEqual(mockMessages);
      expect(result.total).toBe(1);
      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith({
        where: {
          chatId: { in: ['chat-1', 'chat-2'] },
          content: { contains: 'hello', mode: 'insensitive' },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          chat: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('should return empty result if user has no accessible chats', async () => {
      mockPrismaService.chatParticipant.findMany.mockResolvedValue([]);

      const result = await service.searchMessages('hello', 'user-1', 10);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
