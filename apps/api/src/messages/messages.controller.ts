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
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
    ApiBody,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
    user: {
        id: string;
        email: string;
        username: string;
        role: string;
    };
}

@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Create a new message',
        description: 'Create a new message in a chat where the user is a participant',
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Message created successfully',
        schema: {
            example: {
                id: 'message-id-123',
                content: 'Hello everyone! How is the project going?',
                type: 'TEXT',
                metadata: null,
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
                userId: 'user-id-123',
                chatId: 'chat-id-123',
                user: {
                    id: 'user-id-123',
                    username: 'john_doe',
                    firstName: 'John',
                    lastName: 'Doe',
                    avatar: 'https://example.com/avatar.jpg',
                },
            },
        },
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid input data',
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'User is not a participant in this chat',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    @ApiBody({ type: CreateMessageDto })
    async create(@Body() createMessageDto: CreateMessageDto, @Request() req: AuthenticatedRequest) {
        return await this.messagesService.create(createMessageDto, req.user.id);
    }

    @Get()
    @ApiOperation({
        summary: 'Get all messages',
        description: 'Retrieve all messages with filtering, sorting, and pagination',
    })
    @ApiQuery({ name: 'search', required: false, description: 'Search term for message content' })
    @ApiQuery({ name: 'type', required: false, enum: ['TEXT', 'IMAGE', 'FILE', 'SYSTEM'] })
    @ApiQuery({ name: 'userId', required: false, description: 'Filter by user who sent the message' })
    @ApiQuery({ name: 'chatId', required: false, description: 'Filter by chat ID' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'updatedAt'] })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Messages retrieved successfully',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    async findAll(@Query() query: MessageQueryDto, @Request() req: AuthenticatedRequest) {
        return await this.messagesService.findAll(query, req.user.id);
    }

    @Get('search')
    @ApiOperation({
        summary: 'Search messages',
        description: 'Search messages across all accessible chats',
    })
    @ApiQuery({ name: 'q', required: true, description: 'Search term' })
    @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of results' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Search results retrieved successfully',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    async searchMessages(
        @Query('q') searchTerm: string,
        @Query('limit') limit: string,
        @Request() req: AuthenticatedRequest,
    ) {
        const limitNum = limit ? parseInt(limit, 10) : 20;
        return await this.messagesService.searchMessages(searchTerm, req.user.id, limitNum);
    }

    @Get('my')
    @ApiOperation({
        summary: 'Get user\'s messages',
        description: 'Retrieve all messages sent by the current user',
    })
    @ApiQuery({ name: 'search', required: false, description: 'Search term for message content' })
    @ApiQuery({ name: 'type', required: false, enum: ['TEXT', 'IMAGE', 'FILE', 'SYSTEM'] })
    @ApiQuery({ name: 'chatId', required: false, description: 'Filter by chat ID' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'updatedAt'] })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'User\'s messages retrieved successfully',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    async getMyMessages(@Query() query: MessageQueryDto, @Request() req: AuthenticatedRequest) {
        return await this.messagesService.getUserMessages(req.user.id, query);
    }

    @Get('chat/:chatId')
    @ApiOperation({
        summary: 'Get chat messages',
        description: 'Retrieve all messages from a specific chat',
    })
    @ApiParam({ name: 'chatId', description: 'Chat ID', example: 'chat-id-123' })
    @ApiQuery({ name: 'search', required: false, description: 'Search term for message content' })
    @ApiQuery({ name: 'type', required: false, enum: ['TEXT', 'IMAGE', 'FILE', 'SYSTEM'] })
    @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'updatedAt'] })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Chat messages retrieved successfully',
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'User does not have access to this chat',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    async getChatMessages(
        @Param('chatId', ParseUUIDPipe) chatId: string,
        @Query() query: MessageQueryDto,
        @Request() req: AuthenticatedRequest,
    ) {
        return await this.messagesService.getChatMessages(chatId, query, req.user.id);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get a specific message',
        description: 'Retrieve a specific message by ID',
    })
    @ApiParam({ name: 'id', description: 'Message ID', example: 'message-id-123' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Message retrieved successfully',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Message not found',
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'User does not have access to this message',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
        return await this.messagesService.findOne(id, req.user.id);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Update a message',
        description: 'Update a message (only own messages or admin/moderator can edit others)',
    })
    @ApiParam({ name: 'id', description: 'Message ID', example: 'message-id-123' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Message updated successfully',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Message not found',
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'User cannot edit this message',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    @ApiBody({ type: UpdateMessageDto })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateMessageDto: UpdateMessageDto,
        @Request() req: AuthenticatedRequest,
    ) {
        return await this.messagesService.update(id, updateMessageDto, req.user.id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Delete a message',
        description: 'Delete a message (only own messages or admin/moderator can delete others)',
    })
    @ApiParam({ name: 'id', description: 'Message ID', example: 'message-id-123' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Message deleted successfully',
        schema: {
            example: {
                message: 'Message deleted successfully',
            },
        },
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Message not found',
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'User cannot delete this message',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'User not authenticated',
    })
    async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
        return await this.messagesService.remove(id, req.user.id);
    }
}
