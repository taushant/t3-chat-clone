import { IsString, IsEnum, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatRole } from '@prisma/client';

export class AddParticipantDto {
    @ApiProperty({
        description: 'User ID to add to the chat',
        example: 'user-id-123',
    })
    @IsUUID('4', { message: 'Invalid user ID format' })
    userId: string;

    @ApiProperty({
        description: 'Role for the participant in the chat',
        enum: ChatRole,
        example: ChatRole.MEMBER,
        default: ChatRole.MEMBER,
    })
    @IsEnum(ChatRole, { message: 'Invalid chat role' })
    role: ChatRole = ChatRole.MEMBER;

    @ApiPropertyOptional({
        description: 'Custom welcome message for the participant',
        example: 'Welcome to the team!',
        maxLength: 200,
    })
    @IsOptional()
    @IsString()
    welcomeMessage?: string;
}
