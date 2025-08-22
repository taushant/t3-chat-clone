import { IsOptional, IsString, IsEnum, IsInt, Min, Max, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MessageType } from '@prisma/client';

export enum MessageSortBy {
    CREATED_AT = 'createdAt',
    UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc',
}

export class MessageQueryDto {
    @ApiPropertyOptional({
        description: 'Search term for message content',
        example: 'project',
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: 'Filter by message type',
        enum: MessageType,
        example: MessageType.TEXT,
    })
    @IsOptional()
    @IsEnum(MessageType)
    type?: MessageType;

    @ApiPropertyOptional({
        description: 'Filter by user who sent the message',
        example: 'user-id-123',
    })
    @IsOptional()
    @IsUUID('4')
    userId?: string;

    @ApiPropertyOptional({
        description: 'Filter by chat ID',
        example: 'chat-id-123',
    })
    @IsOptional()
    @IsUUID('4')
    chatId?: string;

    @ApiPropertyOptional({
        description: 'Page number for pagination',
        example: 1,
        minimum: 1,
        default: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Number of items per page',
        example: 50,
        minimum: 1,
        maximum: 100,
        default: 50,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 50;

    @ApiPropertyOptional({
        description: 'Sort field',
        enum: MessageSortBy,
        example: MessageSortBy.CREATED_AT,
        default: MessageSortBy.CREATED_AT,
    })
    @IsOptional()
    @IsEnum(MessageSortBy)
    sortBy?: MessageSortBy = MessageSortBy.CREATED_AT;

    @ApiPropertyOptional({
        description: 'Sort order',
        enum: SortOrder,
        example: SortOrder.DESC,
        default: SortOrder.DESC,
    })
    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.DESC;
}
