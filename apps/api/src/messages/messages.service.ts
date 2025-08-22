import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageQueryDto, MessageSortBy, SortOrder } from './dto/message-query.dto';
import { MessageType } from '@prisma/client';

@Injectable()
export class MessagesService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create a new message
     */
    async create(createMessageDto: CreateMessageDto, userId: string) {
        const { chatId, content, type, metadata } = createMessageDto;

        // Check if user is a participant in the chat
        const participant = await this.prisma.chatParticipant.findUnique({
            where: {
                userId_chatId: {
                    userId,
                    chatId,
                },
            },
        });

        if (!participant) {
            throw new ForbiddenException('You are not a participant in this chat');
        }

        // Validate message content based on type
        if (type === MessageType.TEXT && content.trim().length === 0) {
            throw new BadRequestException('Text message content cannot be empty');
        }

        // Create the message
        const message = await this.prisma.message.create({
            data: {
                content,
                type,
                metadata,
                userId,
                chatId,
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

        // Update chat's updatedAt timestamp
        await this.prisma.chat.update({
            where: { id: chatId },
            data: { updatedAt: new Date() },
        });

        return message;
    }

    /**
     * Get all messages with filtering and pagination
     */
    async findAll(query: MessageQueryDto, userId: string) {
        const { page = 1, limit = 50, search, type, userId: messageUserId, chatId, sortBy = MessageSortBy.CREATED_AT, sortOrder = SortOrder.DESC } = query;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};

        // Search in content
        if (search) {
            where.content = { contains: search, mode: 'insensitive' };
        }

        // Filter by type
        if (type) {
            where.type = type;
        }

        // Filter by user who sent the message
        if (messageUserId) {
            where.userId = messageUserId;
        }

        // Filter by chat
        if (chatId) {
            where.chatId = chatId;
        }

        // If no chatId specified, only show messages from chats where user is a participant
        if (!chatId) {
            const userChats = await this.prisma.chatParticipant.findMany({
                where: { userId },
                select: { chatId: true },
            });
            const chatIds = userChats.map(cp => cp.chatId);
            where.chatId = { in: chatIds };
        } else {
            // Check if user has access to the specified chat
            const participant = await this.prisma.chatParticipant.findUnique({
                where: {
                    userId_chatId: {
                        userId,
                        chatId,
                    },
                },
            });

            if (!participant) {
                throw new ForbiddenException('You do not have access to this chat');
            }
        }

        // Get total count
        const total = await this.prisma.message.count({ where });

        // Get messages
        const messages = await this.prisma.message.findMany({
            where,
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
            orderBy: {
                [sortBy]: sortOrder,
            },
            skip,
            take: limit,
        });

        return {
            data: messages,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }

    /**
     * Get a specific message by ID
     */
    async findOne(id: string, userId: string) {
        const message = await this.prisma.message.findUnique({
            where: { id },
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
                            where: { userId },
                            select: { role: true },
                        },
                    },
                },
            },
        });

        if (!message) {
            throw new NotFoundException('Message not found');
        }

        // Check if user has access to this message
        if (message.chat.participants.length === 0) {
            throw new ForbiddenException('You do not have access to this message');
        }

        return message;
    }

    /**
     * Update a message
     */
    async update(id: string, updateMessageDto: UpdateMessageDto, userId: string) {
        const message = await this.prisma.message.findUnique({
            where: { id },
            include: {
                chat: {
                    include: {
                        participants: {
                            where: { userId },
                            select: { role: true },
                        },
                    },
                },
            },
        });

        if (!message) {
            throw new NotFoundException('Message not found');
        }

        // Check if user can edit this message
        if (message.userId !== userId) {
            // Check if user is admin or moderator in the chat
            const participant = message.chat.participants[0];
            if (!participant || !['OWNER', 'ADMIN', 'MODERATOR'].includes(participant.role)) {
                throw new ForbiddenException('You can only edit your own messages');
            }
        }

        // Prevent editing system messages
        if (message.type === MessageType.SYSTEM) {
            throw new ForbiddenException('System messages cannot be edited');
        }

        // Update the message
        const updatedMessage = await this.prisma.message.update({
            where: { id },
            data: {
                ...updateMessageDto,
                updatedAt: new Date(),
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

        // Update chat's updatedAt timestamp
        await this.prisma.chat.update({
            where: { id: message.chatId },
            data: { updatedAt: new Date() },
        });

        return updatedMessage;
    }

    /**
     * Delete a message
     */
    async remove(id: string, userId: string) {
        const message = await this.prisma.message.findUnique({
            where: { id },
            include: {
                chat: {
                    include: {
                        participants: {
                            where: { userId },
                            select: { role: true },
                        },
                    },
                },
            },
        });

        if (!message) {
            throw new NotFoundException('Message not found');
        }

        // Check if user can delete this message
        if (message.userId !== userId) {
            // Check if user is admin or moderator in the chat
            const participant = message.chat.participants[0];
            if (!participant || !['OWNER', 'ADMIN', 'MODERATOR'].includes(participant.role)) {
                throw new ForbiddenException('You can only delete your own messages');
            }
        }

        // Prevent deleting system messages
        if (message.type === MessageType.SYSTEM) {
            throw new ForbiddenException('System messages cannot be deleted');
        }

        // Delete the message
        await this.prisma.message.delete({
            where: { id },
        });

        // Update chat's updatedAt timestamp
        await this.prisma.chat.update({
            where: { id: message.chatId },
            data: { updatedAt: new Date() },
        });

        return { message: 'Message deleted successfully' };
    }

    /**
     * Get messages for a specific chat
     */
    async getChatMessages(chatId: string, query: MessageQueryDto, userId: string) {
        // Check if user has access to this chat
        const participant = await this.prisma.chatParticipant.findUnique({
            where: {
                userId_chatId: {
                    userId,
                    chatId,
                },
            },
        });

        if (!participant) {
            throw new ForbiddenException('You do not have access to this chat');
        }

        // Override chatId in query
        const chatQuery = { ...query, chatId };
        return await this.findAll(chatQuery, userId);
    }

    /**
     * Get user's messages
     */
    async getUserMessages(userId: string, query: MessageQueryDto) {
        // Override userId in query
        const userQuery = { ...query, userId };
        return await this.findAll(userQuery, userId);
    }

    /**
     * Search messages across all accessible chats
     */
    async searchMessages(searchTerm: string, userId: string, limit: number = 20) {
        // Get all chats where user is a participant
        const userChats = await this.prisma.chatParticipant.findMany({
            where: { userId },
            select: { chatId: true },
        });
        const chatIds = userChats.map(cp => cp.chatId);

        if (chatIds.length === 0) {
            return { data: [], total: 0 };
        }

        // Search messages in accessible chats
        const messages = await this.prisma.message.findMany({
            where: {
                chatId: { in: chatIds },
                content: { contains: searchTerm, mode: 'insensitive' },
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
            take: limit,
        });

        return {
            data: messages,
            total: messages.length,
        };
    }
}
