import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ChatRole } from '@prisma/client';

export class UpdateParticipantRoleDto {
    @ApiProperty({
        description: 'User ID of the participant',
        example: 'user-id-123',
    })
    @IsUUID('4', { message: 'Invalid user ID format' })
    userId!: string;

    @ApiProperty({
        description: 'New role for the participant',
        enum: ChatRole,
        example: ChatRole.MODERATOR,
    })
    @IsEnum(ChatRole, { message: 'Invalid chat role' })
    newRole!: ChatRole;
}
