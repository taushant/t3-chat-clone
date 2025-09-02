import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { PrismaService } from '../database/prisma.service';
import { ChatRole } from '@prisma/client';

describe('ChatsService', () => {
  let service: ChatsService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    chat: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    chatParticipant: {
      findUnique: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    message: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ChatsService>(ChatsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createChat', () => {
    const mockCreator = {
      id: 'user-1',
      email: 'creator@example.com',
      username: 'creator',
    };

    const createChatDto = {
      title: 'Test Chat',
      description: 'A test chat',
      isPublic: false,
      participants: [
        { userId: 'user-2', role: ChatRole.MEMBER },
        { userId: 'user-3', role: ChatRole.MEMBER },
      ],
    };

    it('should create a chat successfully', async () => {
      const mockChat = {
        id: 'chat-1',
        title: 'Test Chat',
        description: 'A test chat',
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockChatWithParticipants = {
        ...mockChat,
        participants: [
          {
            id: 'participant-1',
            userId: 'user-1',
            chatId: 'chat-1',
            role: ChatRole.OWNER,
            joinedAt: new Date(),
            user: mockCreator,
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockCreator);
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-2' },
        { id: 'user-3' },
      ]);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          chat: {
            create: jest.fn().mockResolvedValue(mockChat),
            findUnique: jest.fn().mockResolvedValue(mockChatWithParticipants),
          },
          chatParticipant: {
            create: jest.fn(),
            createMany: jest.fn(),
          },
        });
      });

      const result = await service.createChat(createChatDto, 'user-1');

      expect(result).toEqual(mockChatWithParticipants);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-2', 'user-3'] } },
        select: { id: true },
      });
    });

    it('should throw NotFoundException if creator does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.createChat(createChatDto, 'invalid-user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if participant users do not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockCreator);
      mockPrismaService.user.findMany.mockResolvedValue([{ id: 'user-2' }]); // Only one user found

      await expect(service.createChat(createChatDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    const mockQuery = {
      page: 1,
      limit: 20,
      search: 'test',
      isPublic: true,
      sortBy: 'createdAt' as any,
      sortOrder: 'desc' as any,
    };

    it('should return paginated chats', async () => {
      const mockChats = [
        {
          id: 'chat-1',
          title: 'Test Chat',
          participants: [],
          _count: { participants: 2, messages: 5 },
        },
      ];

      mockPrismaService.chat.count.mockResolvedValue(1);
      mockPrismaService.chat.findMany.mockResolvedValue(mockChats);

      const result = await service.findAll(mockQuery);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });
  });

  describe('findOne', () => {
    const mockChat = {
      id: 'chat-1',
      title: 'Test Chat',
      isPublic: false,
      participants: [
        {
          user: { id: 'user-1' },
          role: ChatRole.OWNER,
        },
      ],
      messages: [],
      _count: { participants: 1, messages: 0 },
    };

    it('should return a chat if user has access', async () => {
      mockPrismaService.chat.findUnique.mockResolvedValue(mockChat);

      const result = await service.findOne('chat-1', 'user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('chat-1');
    });

    it('should throw NotFoundException if chat does not exist', async () => {
      mockPrismaService.chat.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-chat', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user has no access to private chat', async () => {
      const privateChatWithoutUser = {
        ...mockChat,
        participants: [], // User not in participants
      };

      mockPrismaService.chat.findUnique.mockResolvedValue(privateChatWithoutUser);

      await expect(service.findOne('chat-1', 'user-2')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    const updateChatDto = {
      title: 'Updated Chat',
      description: 'Updated description',
    };

    it('should update chat if user has permission', async () => {
      const mockParticipant = {
        userId: 'user-1',
        chatId: 'chat-1',
        role: ChatRole.OWNER,
      };

      const mockUpdatedChat = {
        id: 'chat-1',
        title: 'Updated Chat',
        participants: [],
      };

      mockPrismaService.chatParticipant.findUnique.mockResolvedValue(mockParticipant);
      mockPrismaService.chat.update.mockResolvedValue(mockUpdatedChat);

      const result = await service.update('chat-1', updateChatDto, 'user-1');

      expect(result).toEqual(mockUpdatedChat);
      expect(mockPrismaService.chat.update).toHaveBeenCalledWith({
        where: { id: 'chat-1' },
        data: updateChatDto,
        include: expect.any(Object),
      });
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      const mockParticipant = {
        userId: 'user-1',
        chatId: 'chat-1',
        role: ChatRole.MEMBER, // Not OWNER or ADMIN
      };

      mockPrismaService.chatParticipant.findUnique.mockResolvedValue(mockParticipant);

      await expect(service.update('chat-1', updateChatDto, 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('should delete chat if user is owner', async () => {
      const mockParticipant = {
        userId: 'user-1',
        chatId: 'chat-1',
        role: ChatRole.OWNER,
      };

      mockPrismaService.chatParticipant.findUnique.mockResolvedValue(mockParticipant);
      mockPrismaService.chat.delete.mockResolvedValue({});

      const result = await service.remove('chat-1', 'user-1');

      expect(result).toEqual({ message: 'Chat deleted successfully' });
      expect(mockPrismaService.chat.delete).toHaveBeenCalledWith({
        where: { id: 'chat-1' },
      });
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      const mockParticipant = {
        userId: 'user-1',
        chatId: 'chat-1',
        role: ChatRole.ADMIN, // Not OWNER
      };

      mockPrismaService.chatParticipant.findUnique.mockResolvedValue(mockParticipant);

      await expect(service.remove('chat-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('addParticipant', () => {
    const addParticipantDto = {
      userId: 'user-2',
      role: ChatRole.MEMBER,
      welcomeMessage: 'Welcome!',
    };

    it('should add participant successfully', async () => {
      const mockRequesterParticipant = {
        userId: 'user-1',
        chatId: 'chat-1',
        role: ChatRole.OWNER,
      };

      const mockNewParticipant = {
        id: 'participant-2',
        userId: 'user-2',
        chatId: 'chat-1',
        role: ChatRole.MEMBER,
        user: { id: 'user-2', username: 'newuser' },
      };

      mockPrismaService.chatParticipant.findUnique
        .mockResolvedValueOnce(mockRequesterParticipant) // For permission check
        .mockResolvedValueOnce(null); // For existing participant check

      mockPrismaService.chatParticipant.create.mockResolvedValue(mockNewParticipant);
      mockPrismaService.message.create.mockResolvedValue({});

      const result = await service.addParticipant('chat-1', addParticipantDto, 'user-1');

      expect(result).toEqual(mockNewParticipant);
      expect(mockPrismaService.message.create).toHaveBeenCalledWith({
        data: {
          content: 'Welcome!',
          type: 'SYSTEM',
          userId: 'user-1',
          chatId: 'chat-1',
          metadata: {
            type: 'welcome',
            newParticipantId: 'user-2',
          },
        },
      });
    });

    it('should throw ConflictException if participant already exists', async () => {
      const mockRequesterParticipant = {
        userId: 'user-1',
        chatId: 'chat-1',
        role: ChatRole.OWNER,
      };

      const mockExistingParticipant = {
        userId: 'user-2',
        chatId: 'chat-1',
        role: ChatRole.MEMBER,
      };

      mockPrismaService.chatParticipant.findUnique
        .mockResolvedValueOnce(mockRequesterParticipant)
        .mockResolvedValueOnce(mockExistingParticipant);

      await expect(
        service.addParticipant('chat-1', addParticipantDto, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant successfully', async () => {
      const mockRequesterParticipant = {
        userId: 'user-1',
        chatId: 'chat-1',
        role: ChatRole.OWNER,
      };

      const mockTargetParticipant = {
        userId: 'user-2',
        chatId: 'chat-1',
        role: ChatRole.MEMBER,
      };

      mockPrismaService.chatParticipant.findUnique
        .mockResolvedValueOnce(mockRequesterParticipant)
        .mockResolvedValueOnce(mockTargetParticipant);

      mockPrismaService.chatParticipant.delete.mockResolvedValue({});

      const result = await service.removeParticipant('chat-1', 'user-2', 'user-1');

      expect(result).toEqual({ message: 'Participant removed successfully' });
      expect(mockPrismaService.chatParticipant.delete).toHaveBeenCalledWith({
        where: {
          userId_chatId: {
            userId: 'user-2',
            chatId: 'chat-1',
          },
        },
      });
    });

    it('should throw BadRequestException when trying to remove owner', async () => {
      const mockRequesterParticipant = {
        userId: 'user-1',
        chatId: 'chat-1',
        role: ChatRole.OWNER,
      };

      const mockTargetParticipant = {
        userId: 'user-2',
        chatId: 'chat-1',
        role: ChatRole.OWNER, // Target is owner
      };

      mockPrismaService.chatParticipant.findUnique
        .mockResolvedValueOnce(mockRequesterParticipant)
        .mockResolvedValueOnce(mockTargetParticipant);

      await expect(
        service.removeParticipant('chat-1', 'user-2', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
