import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
    @ApiProperty({
        description: 'Current password',
        example: 'CurrentPass123!',
    })
    @IsString({ message: 'Current password is required' })
    currentPassword: string;

    @ApiProperty({
        description: 'New password (minimum 8 characters)',
        example: 'NewSecurePass123!',
    })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    })
    newPassword: string;
}
