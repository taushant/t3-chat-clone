import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    Request,
    HttpStatus,
    HttpCode,
    ParseUUIDPipe,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
    ApiBody,
} from '@nestjs/swagger';

interface AuthenticatedRequest extends ExpressRequest {
    user: {
        id: string;
        email: string;
        username: string;
        role: UserRole;
    };
}
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { ChatQueryDto } from './dto/chat-query.dto';
import { AddParticipantDto } from './dto/add-participant.dto';
import { UpdateParticipantRoleDto } from './dto/update-participant-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Chats')
@Controller('chats')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ChatsController {
    constructor(private readonly chatsService: ChatsService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Create a new chat',
        description: 'Create a new chat with optional initial participants',
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Chat created successfully',
        schema: {
            example: {
                id: 'chat-id-123',
                title: 'Project Discussion',
                description: 'Discussion about the new project features',
                isPublic: false,
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
                participants: [
                    {
                        id: 'participant-id-1',
                        userId: 'user-id-1',
                        chatId: 'chat-id-123',
                        role: 'OWNER',
                        joinedAt: '2024-01-01T00:00:00.000Z',
                        user: {
                            id: 'user-id-1',
                            username: 'john_doe',
                            firstName: 'John',
                            lastName: 'Doe',
                            avatar: 'https://example.com/avatar.jpg',
                        },
                    },
                ],
            },
        },
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid input data',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    @ApiBody({ type: CreateChatDto })
    async create(@Body() createChatDto: CreateChatDto, @Request() req: AuthenticatedRequest) {
        return await this.chatsService.createChat(createChatDto, req.user.id);
    }

    @Get()
    @ApiOperation({
        summary: 'Get all chats',
        description: 'Retrieve all chats with filtering, sorting, and pagination',
    })
    @ApiQuery({ name: 'search', required: false, description: 'Search term for chat title or description' })
    @ApiQuery({ name: 'isPublic', required: false, description: 'Filter by public/private chats' })
    @ApiQuery({ name: 'participantId', required: false, description: 'Filter by user participation' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'updatedAt', 'title', 'participantCount'] })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Chats retrieved successfully',
        schema: {
            example: {
                data: [
                    {
                        id: 'chat-id-123',
                        title: 'Project Discussion',
                        description: 'Discussion about the new project features',
                        isPublic: false,
                        createdAt: '2024-01-01T00:00:00.000Z',
                        updatedAt: '2024-01-01T00:00:00.000Z',
                        participantCount: 5,
                        messageCount: 25,
                        participants: [
                            {
                                id: 'participant-id-1',
                                userId: 'user-id-1',
                                chatId: 'chat-id-123',
                                role: 'OWNER',
                                joinedAt: '2024-01-01T00:00:00.000Z',
                                user: {
                                    id: 'user-id-1',
                                    username: 'john_doe',
                                    firstName: 'John',
                                    lastName: 'Doe',
                                    avatar: 'https://example.com/avatar.jpg',
                                },
                            },
                        ],
                    },
                ],
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 1,
                    totalPages: 1,
                    hasNext: false,
                    hasPrev: false,
                },
            },
        },
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    async findAll(@Query() query: ChatQueryDto) {
        return await this.chatsService.findAll(query);
    }

    @Get('my')
    @ApiOperation({
        summary: 'Get user\'s chats',
        description: 'Retrieve all chats where the current user is a participant',
    })
    @ApiQuery({ name: 'search', required: false, description: 'Search term for chat title or description' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'updatedAt', 'title', 'participantCount'] })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'User\'s chats retrieved successfully',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    async getMyChats(@Query() query: ChatQueryDto, @Request() req: AuthenticatedRequest) {
        return await this.chatsService.getUserChats(req.user.id, query);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get a specific chat',
        description: 'Retrieve a specific chat by ID with participants and messages',
    })
    @ApiParam({ name: 'id', description: 'Chat ID', example: 'chat-id-123' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Chat retrieved successfully',
        schema: {
            example: {
                id: 'chat-id-123',
                title: 'Project Discussion',
                description: 'Discussion about the new project features',
                isPublic: false,
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
                participantCount: 5,
                messageCount: 25,
                participants: [
                    {
                        id: 'participant-id-1',
                        userId: 'user-id-1',
                        chatId: 'chat-id-123',
                        role: 'OWNER',
                        joinedAt: '2024-01-01T00:00:00.000Z',
                        user: {
                            id: 'user-id-1',
                            username: 'john_doe',
                            firstName: 'John',
                            lastName: 'Doe',
                            avatar: 'https://example.com/avatar.jpg',
                        },
                    },
                ],
                messages: [
                    {
                        id: 'message-id-1',
                        content: 'Hello everyone!',
                        type: 'TEXT',
                        createdAt: '2024-01-01T00:00:00.000Z',
                        updatedAt: '2024-01-01T00:00:00.000Z',
                        userId: 'user-id-1',
                        chatId: 'chat-id-123',
                        user: {
                            id: 'user-id-1',
                            username: 'john_doe',
                            firstName: 'John',
                            lastName: 'Doe',
                            avatar: 'https://example.com/avatar.jpg',
                        },
                    },
                ],
            },
        },
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Chat not found',
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'Access denied to this chat',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
        return await this.chatsService.findOne(id, req.user.id);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Update a chat',
        description: 'Update chat details (requires OWNER or ADMIN role)',
    })
    @ApiParam({ name: 'id', description: 'Chat ID', example: 'chat-id-123' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Chat updated successfully',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Chat not found',
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'Insufficient permissions to update this chat',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    @ApiBody({ type: UpdateChatDto })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateChatDto: UpdateChatDto,
        @Request() req: AuthenticatedRequest,
    ) {
        return await this.chatsService.update(id, updateChatDto, req.user.id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Delete a chat',
        description: 'Delete a chat (requires OWNER role)',
    })
    @ApiParam({ name: 'id', description: 'Chat ID', example: 'chat-id-123' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Chat deleted successfully',
        schema: {
            example: {
                message: 'Chat deleted successfully',
            },
        },
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Chat not found',
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'Only the chat owner can delete this chat',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
        return await this.chatsService.remove(id, req.user.id);
    }

    @Post(':id/participants')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Add a participant to a chat',
        description: 'Add a new participant to a chat (requires OWNER or ADMIN role)',
    })
    @ApiParam({ name: 'id', description: 'Chat ID', example: 'chat-id-123' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Participant added successfully',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Chat not found',
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'Insufficient permissions to add participants',
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'User is already a participant in this chat',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    @ApiBody({ type: AddParticipantDto })
    async addParticipant(
        @Param('id', ParseUUIDPipe) chatId: string,
        @Body() addParticipantDto: AddParticipantDto,
        @Request() req: AuthenticatedRequest,
    ) {
        return await this.chatsService.addParticipant(chatId, addParticipantDto, req.user.id);
    }

    @Patch(':id/participants/:participantId/role')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Update participant role',
        description: 'Update a participant\'s role in a chat (requires OWNER or ADMIN role)',
    })
    @ApiParam({ name: 'id', description: 'Chat ID', example: 'chat-id-123' })
    @ApiParam({ name: 'participantId', description: 'Participant User ID', example: 'user-id-123' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Participant role updated successfully',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Chat or participant not found',
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'Insufficient permissions to update participant roles',
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid role change request',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    @ApiBody({ type: UpdateParticipantRoleDto })
    async updateParticipantRole(
        @Param('id', ParseUUIDPipe) chatId: string,
        @Param('participantId', ParseUUIDPipe) participantId: string,
        @Body() updateParticipantRoleDto: UpdateParticipantRoleDto,
        @Request() req: AuthenticatedRequest,
    ) {
        return await this.chatsService.updateParticipantRole(chatId, updateParticipantRoleDto, req.user.id);
    }

    @Delete(':id/participants/:participantId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Remove a participant from a chat',
        description: 'Remove a participant from a chat (requires OWNER or ADMIN role)',
    })
    @ApiParam({ name: 'id', description: 'Chat ID', example: 'chat-id-123' })
    @ApiParam({ name: 'participantId', description: 'Participant User ID', example: 'user-id-123' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Participant removed successfully',
        schema: {
            example: {
                message: 'Participant removed successfully',
            },
        },
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Chat or participant not found',
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'Insufficient permissions to remove participants',
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Cannot remove the chat owner',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    async removeParticipant(
        @Param('id', ParseUUIDPipe) chatId: string,
        @Param('participantId', ParseUUIDPipe) participantId: string,
        @Request() req: AuthenticatedRequest,
    ) {
        return await this.chatsService.removeParticipant(chatId, participantId, req.user.id);
    }

    @Get('public')
    @ApiOperation({
        summary: 'Get public chats',
        description: 'Retrieve all public chats with filtering and pagination',
    })
    @ApiQuery({ name: 'search', required: false, description: 'Search term for chat title or description' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'updatedAt', 'title', 'participantCount'] })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Public chats retrieved successfully',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    async getPublicChats(@Query() query: ChatQueryDto) {
        // Override isPublic to true for this endpoint
        const publicQuery = { ...query, isPublic: true };
        return await this.chatsService.findAll(publicQuery, 'public');
    }
}
