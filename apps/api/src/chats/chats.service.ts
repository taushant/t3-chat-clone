import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { ChatQueryDto, ChatSortBy, SortOrder } from './dto/chat-query.dto';
import { AddParticipantDto } from './dto/add-participant.dto';
import { UpdateParticipantRoleDto } from './dto/update-participant-role.dto';
import { ChatRole } from '@prisma/client';

@Injectable()
export class ChatsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Create a new chat with initial participants
     */
    async createChat(createChatDto: CreateChatDto, creatorId: string) {
        const { participants = [], ...chatData } = createChatDto;

        // Type the participants array properly
        const typedParticipants = participants as Array<{ userId: string; role: ChatRole }>;

        // Validate that creator exists
        const creator = await this.prisma.user.findUnique({
            where: { id: creatorId },
        });

        if (!creator) {
            throw new NotFoundException('Creator user not found');
        }

        // Validate all participant IDs exist
        if (typedParticipants.length > 0) {
            const participantIds = typedParticipants.map(p => p.userId);
            const existingUsers = await this.prisma.user.findMany({
                where: { id: { in: participantIds } },
                select: { id: true },
            });

            if (existingUsers.length !== participantIds.length) {
                throw new BadRequestException('One or more participant users not found');
            }
        }

        // Create chat with participants in a transaction
        return await this.prisma.$transaction(async (tx) => {
            // Create the chat
            const chat = await tx.chat.create({
                data: chatData,
            });

            // Add creator as owner
            await tx.chatParticipant.create({
                data: {
                    userId: creatorId,
                    chatId: chat.id,
                    role: ChatRole.OWNER,
                },
            });

            // Add initial participants if any
            if (typedParticipants.length > 0) {
                const participantData = typedParticipants.map(p => ({
                    userId: p.userId,
                    chatId: chat.id,
                    role: p.role,
                }));

                await tx.chatParticipant.createMany({
                    data: participantData,
                });
            }

            // Return chat with participants
            return await tx.chat.findUnique({
                where: { id: chat.id },
                include: {
                    participants: {
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
                    },
                },
            });
        });
    }

    /**
     * Get all chats with filtering and pagination
     */
    async findAll(query: ChatQueryDto) {
        const { page = 1, limit = 20, search, isPublic, participantId, sortBy = ChatSortBy.CREATED_AT, sortOrder = SortOrder.DESC } = query;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};

        // Search in title and description
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Filter by public/private
        if (isPublic !== undefined) {
            where.isPublic = isPublic;
        }

        // Filter by user participation
        if (participantId) {
            where.participants = {
                some: { userId: participantId },
            };
        }

        // Get total count
        const total = await this.prisma.chat.count({ where });

        // Get chats with participants count
        const chats = await this.prisma.chat.findMany({
            where,
            include: {
                participants: {
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
                },
                _count: {
                    select: {
                        participants: true,
                        messages: true,
                    },
                },
            },
            orderBy: {
                [sortBy]: sortOrder,
            },
            skip,
            take: limit,
        });

        // Add participant count to each chat
        const chatsWithCounts = chats.map(chat => ({
            ...chat,
            participantCount: chat._count.participants,
            messageCount: chat._count.messages,
            _count: undefined, // Remove the _count object
        }));

        return {
            data: chatsWithCounts,
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
     * Get a specific chat by ID with participants and messages
     */
    async findOne(id: string, userId: string) {
        const chat = await this.prisma.chat.findUnique({
            where: { id },
            include: {
                participants: {
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
                },
                messages: {
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
                    orderBy: { createdAt: 'asc' },
                    take: 50, // Limit to last 50 messages for performance
                },
                _count: {
                    select: {
                        participants: true,
                        messages: true,
                    },
                },
            },
        });

        if (!chat) {
            throw new NotFoundException('Chat not found');
        }

        // Check if user has access to this chat
        const userParticipant = chat.participants.find(p => p.user.id === userId);
        if (!chat.isPublic && !userParticipant) {
            throw new ForbiddenException('Access denied to this chat');
        }

        return {
            ...chat,
            participantCount: chat._count.participants,
            messageCount: chat._count.messages,
            _count: undefined,
        };
    }

    /**
     * Update a chat
     */
    async update(id: string, updateChatDto: UpdateChatDto, userId: string) {
        // Check if user has permission to update this chat
        const participant = await this.prisma.chatParticipant.findUnique({
            where: {
                userId_chatId: {
                    userId,
                    chatId: id,
                },
            },
        });

        if (!participant || (participant.role !== ChatRole.OWNER && participant.role !== ChatRole.ADMIN)) {
            throw new ForbiddenException('Insufficient permissions to update this chat');
        }

        const chat = await this.prisma.chat.update({
            where: { id },
            data: updateChatDto,
            include: {
                participants: {
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
                },
            },
        });

        return chat;
    }

    /**
     * Delete a chat
     */
    async remove(id: string, userId: string) {
        // Check if user is the owner
        const participant = await this.prisma.chatParticipant.findUnique({
            where: {
                userId_chatId: {
                    userId,
                    chatId: id,
                },
            },
        });

        if (!participant || participant.role !== ChatRole.OWNER) {
            throw new ForbiddenException('Only the chat owner can delete this chat');
        }

        // Delete chat (cascade will handle participants and messages)
        await this.prisma.chat.delete({
            where: { id },
        });

        return { message: 'Chat deleted successfully' };
    }

    /**
     * Add a participant to a chat
     */
    async addParticipant(chatId: string, addParticipantDto: AddParticipantDto, userId: string) {
        const { userId: newParticipantId, role, welcomeMessage } = addParticipantDto;

        // Check if user has permission to add participants
        const requesterParticipant = await this.prisma.chatParticipant.findUnique({
            where: {
                userId_chatId: {
                    userId,
                    chatId,
                },
            },
        });

        if (!requesterParticipant || (requesterParticipant.role !== ChatRole.OWNER && requesterParticipant.role !== ChatRole.ADMIN)) {
            throw new ForbiddenException('Insufficient permissions to add participants');
        }

        // Check if participant is already in the chat
        const existingParticipant = await this.prisma.chatParticipant.findUnique({
            where: {
                userId_chatId: {
                    userId: newParticipantId,
                    chatId,
                },
            },
        });

        if (existingParticipant) {
            throw new ConflictException('User is already a participant in this chat');
        }

        // Add participant
        const participant = await this.prisma.chatParticipant.create({
            data: {
                userId: newParticipantId,
                chatId,
                role,
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

        // Add welcome message if provided
        if (welcomeMessage) {
            await this.prisma.message.create({
                data: {
                    content: welcomeMessage,
                    type: 'SYSTEM',
                    userId: userId, // System message from the user who added the participant
                    chatId,
                    metadata: {
                        type: 'welcome',
                        newParticipantId,
                    },
                },
            });
        }

        return participant;
    }

    /**
     * Update participant role
     */
    async updateParticipantRole(chatId: string, updateParticipantRoleDto: UpdateParticipantRoleDto, userId: string) {
        const { userId: participantId, newRole } = updateParticipantRoleDto;

        // Check if requester has permission to update roles
        const requesterParticipant = await this.prisma.chatParticipant.findUnique({
            where: {
                userId_chatId: {
                    userId,
                    chatId,
                },
            },
        });

        if (!requesterParticipant || (requesterParticipant.role !== ChatRole.OWNER && requesterParticipant.role !== ChatRole.ADMIN)) {
            throw new ForbiddenException('Insufficient permissions to update participant roles');
        }

        // Prevent role escalation (only owner can make admins)
        if (newRole === ChatRole.ADMIN && requesterParticipant.role !== ChatRole.OWNER) {
            throw new ForbiddenException('Only the chat owner can assign admin roles');
        }

        // Prevent changing owner role
        if (newRole === ChatRole.OWNER) {
            throw new BadRequestException('Cannot change the owner role');
        }

        // Update participant role
        const participant = await this.prisma.chatParticipant.update({
            where: {
                userId_chatId: {
                    userId: participantId,
                    chatId,
                },
            },
            data: { role: newRole },
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

        return participant;
    }

    /**
     * Remove a participant from a chat
     */
    async removeParticipant(chatId: string, participantId: string, userId: string) {
        // Check if user has permission to remove participants
        const requesterParticipant = await this.prisma.chatParticipant.findUnique({
            where: {
                userId_chatId: {
                    userId,
                    chatId,
                },
            },
        });

        if (!requesterParticipant || (requesterParticipant.role !== ChatRole.OWNER && requesterParticipant.role !== ChatRole.ADMIN)) {
            throw new ForbiddenException('Insufficient permissions to remove participants');
        }

        // Prevent removing the owner
        const targetParticipant = await this.prisma.chatParticipant.findUnique({
            where: {
                userId_chatId: {
                    userId: participantId,
                    chatId,
                },
            },
        });

        if (!targetParticipant) {
            throw new NotFoundException('Participant not found in this chat');
        }

        if (targetParticipant.role === ChatRole.OWNER) {
            throw new BadRequestException('Cannot remove the chat owner');
        }

        // Prevent removing admins unless requester is owner
        if (targetParticipant.role === ChatRole.ADMIN && requesterParticipant.role !== ChatRole.OWNER) {
            throw new ForbiddenException('Only the chat owner can remove admin participants');
        }

        // Remove participant
        await this.prisma.chatParticipant.delete({
            where: {
                userId_chatId: {
                    userId: participantId,
                    chatId,
                },
            },
        });

        return { message: 'Participant removed successfully' };
    }

    /**
     * Get user's chats
     */
    async getUserChats(userId: string, query: ChatQueryDto) {
        const { page = 1, limit = 20, search, sortBy = ChatSortBy.UPDATED_AT, sortOrder = SortOrder.DESC } = query;
        const skip = (page - 1) * limit;

        // Build where clause for user's chats
        const where = {
            participants: {
                some: { userId },
            },
        };

        // Add search if provided
        if (search) {
            Object.assign(where, {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            });
        }

        // Get total count
        const total = await this.prisma.chat.count({ where });

        // Get chats
        const chats = await this.prisma.chat.findMany({
            where,
            include: {
                participants: {
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
                },
                _count: {
                    select: {
                        participants: true,
                        messages: true,
                    },
                },
            },
            orderBy: {
                [sortBy]: sortOrder,
            },
            skip,
            take: limit,
        });

        // Add counts and user's role
        const chatsWithDetails = chats.map(chat => {
            const userParticipant = chat.participants.find(p => p.user.id === userId);
            return {
                ...chat,
                participantCount: chat._count.participants,
                messageCount: chat._count.messages,
                userRole: userParticipant?.role,
                _count: undefined,
            };
        });

        return {
            data: chatsWithDetails,
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
}
