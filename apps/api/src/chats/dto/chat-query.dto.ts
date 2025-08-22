import { IsOptional, IsString, IsBoolean, IsInt, Min, Max, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export enum ChatSortBy {
    CREATED_AT = 'createdAt',
    UPDATED_AT = 'updatedAt',
    TITLE = 'title',
    PARTICIPANT_COUNT = 'participantCount',
}

export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc',
}

export class ChatQueryDto {
    @ApiPropertyOptional({
        description: 'Search term for chat title or description',
        example: 'project',
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: 'Filter by public/private chats',
        example: true,
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    isPublic?: boolean;

    @ApiPropertyOptional({
        description: 'Filter by user participation',
        example: 'user-id-123',
    })
    @IsOptional()
    @IsString()
    participantId?: string;

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
        example: 20,
        minimum: 1,
        maximum: 100,
        default: 20,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional({
        description: 'Sort field',
        enum: ChatSortBy,
        example: ChatSortBy.CREATED_AT,
        default: ChatSortBy.CREATED_AT,
    })
    @IsOptional()
    @IsEnum(ChatSortBy)
    sortBy?: ChatSortBy = ChatSortBy.CREATED_AT;

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
