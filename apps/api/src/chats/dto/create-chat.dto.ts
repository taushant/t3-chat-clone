import { IsString, IsOptional, IsBoolean, IsArray, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ChatRole } from '@prisma/client';

export class CreateChatDto {
    @ApiProperty({
        description: 'Chat title',
        example: 'Project Discussion',
        minLength: 1,
        maxLength: 100,
    })
    @IsString()
    @MinLength(1, { message: 'Title must not be empty' })
    @MaxLength(100, { message: 'Title must not exceed 100 characters' })
    title!: string;

    @ApiPropertyOptional({
        description: 'Chat description',
        example: 'Discussion about the new project features',
        maxLength: 500,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500, { message: 'Description must not exceed 500 characters' })
    description?: string;

    @ApiPropertyOptional({
        description: 'Whether the chat is public',
        example: false,
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    isPublic?: boolean;

    @ApiPropertyOptional({
        description: 'Initial participants with their roles',
        example: [
            { userId: 'user-id-1', role: ChatRole.ADMIN },
            { userId: 'user-id-2', role: ChatRole.MEMBER },
        ],
    })
    @IsOptional()
    @IsArray()
    participants?: Array<{
        userId: string;
        role: ChatRole;
    }>;
}
