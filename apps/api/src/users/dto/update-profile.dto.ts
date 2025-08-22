import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsUrl } from 'class-validator';

export class UpdateProfileDto {
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

    @ApiPropertyOptional({
        description: 'User avatar URL',
        example: 'https://example.com/avatar.jpg',
    })
    @IsOptional()
    @IsUrl({}, { message: 'Please provide a valid URL for avatar' })
    avatar?: string;
}
