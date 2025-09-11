import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({
        description: 'User email address',
        example: 'user@example.com',
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    email!: string;

    @ApiProperty({
        description: 'Username (3-20 characters, alphanumeric and underscore only)',
        example: 'john_doe',
    })
    @IsString()
    @MinLength(3, { message: 'Username must be at least 3 characters long' })
    @MaxLength(20, { message: 'Username must not exceed 20 characters' })
    @Matches(/^[a-zA-Z0-9_]+$/, {
        message: 'Username can only contain letters, numbers, and underscores',
    })
    username!: string;

    @ApiProperty({
        description: 'Password (minimum 8 characters)',
        example: 'SecurePass123!',
    })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    })
    password!: string;

    @ApiPropertyOptional({
        description: 'User first name',
        example: 'John',
    })
    @IsOptional()
    @IsString()
    @MaxLength(50, { message: 'First name must not exceed 50 characters' })
    firstName?: string;

    @ApiPropertyOptional({
        description: 'User last name',
        example: 'Doe',
    })
    @IsOptional()
    @IsString()
    @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
    lastName?: string;
}
