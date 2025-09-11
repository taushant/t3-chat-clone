import { IsString, IsOptional, IsEnum, IsUUID, MinLength, MaxLength, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '@prisma/client';

export class CreateMessageDto {
    @ApiProperty({
        description: 'Message content',
        example: 'Hello everyone! How is the project going?',
        minLength: 1,
        maxLength: 5000,
    })
    @IsString()
    @MinLength(1, { message: 'Message content must not be empty' })
    @MaxLength(5000, { message: 'Message content must not exceed 5000 characters' })
    content!: string;

    @ApiProperty({
        description: 'Type of message',
        enum: MessageType,
        example: MessageType.TEXT,
        default: MessageType.TEXT,
    })
    @IsEnum(MessageType, { message: 'Invalid message type' })
    type: MessageType = MessageType.TEXT;

    @ApiProperty({
        description: 'Chat ID where the message will be sent',
        example: 'chat-id-123',
    })
    @IsUUID('4', { message: 'Invalid chat ID format' })
    chatId!: string;

    @ApiPropertyOptional({
        description: 'Additional metadata for the message',
        example: {
            replyTo: 'message-id-123',
            attachments: ['file-id-1', 'file-id-2'],
            mentions: ['user-id-1', 'user-id-2'],
        },
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
