import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  MinLength,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateApiKeyDto {
  @ApiProperty({
    description: "Name for the API key",
    example: "My OpenAI Key",
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: "LLM provider name",
    example: "openai",
  })
  @IsString()
  provider!: string;

  @ApiProperty({
    description: "API key value",
    example: "sk-1234567890abcdef",
  })
  @IsString()
  @MinLength(1)
  key!: string;

  @ApiPropertyOptional({
    description: "Whether the API key is active",
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Expiration date (ISO string)",
    example: "2024-12-31T23:59:59.000Z",
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateApiKeyDto {
  @ApiPropertyOptional({
    description: "Name for the API key",
    example: "Updated OpenAI Key",
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: "Whether the API key is active",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Expiration date (ISO string)",
    example: "2024-12-31T23:59:59.000Z",
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ApiKeyResponseDto {
  @ApiProperty({
    description: "API key ID",
    example: "cm1234567890",
  })
  id!: string;

  @ApiProperty({
    description: "Name of the API key",
    example: "My OpenAI Key",
  })
  name!: string;

  @ApiProperty({
    description: "LLM provider name",
    example: "openai",
  })
  provider!: string;

  @ApiProperty({
    description: "Whether the API key is active",
    example: true,
  })
  isActive!: boolean;

  @ApiPropertyOptional({
    description: "Expiration date",
    example: "2024-12-31T23:59:59.000Z",
  })
  expiresAt?: Date;

  @ApiProperty({
    description: "Creation date",
    example: "2024-01-01T00:00:00.000Z",
  })
  createdAt!: Date;

  @ApiProperty({
    description: "Last update date",
    example: "2024-01-01T00:00:00.000Z",
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: "Last usage date",
    example: "2024-01-01T00:00:00.000Z",
  })
  lastUsed?: Date;

  @ApiProperty({
    description: "Number of times this key has been used",
    example: 42,
  })
  usageCount!: number;
}

export class ApiKeyListResponseDto {
  @ApiProperty({
    description: "Array of API keys",
    type: [ApiKeyResponseDto],
  })
  apiKeys!: ApiKeyResponseDto[];

  @ApiProperty({
    description: "Total number of API keys",
    example: 5,
  })
  total!: number;
}

export class ValidateApiKeyDto {
  @ApiProperty({
    description: "LLM provider name",
    example: "openai",
  })
  @IsString()
  provider!: string;

  @ApiProperty({
    description: "API key to validate",
    example: "sk-1234567890abcdef",
  })
  @IsString()
  key!: string;
}

export class ValidateApiKeyResponseDto {
  @ApiProperty({
    description: "Whether the API key is valid",
    example: true,
  })
  isValid!: boolean;

  @ApiPropertyOptional({
    description: "Error message if validation failed",
    example: "Invalid API key",
  })
  error?: string;

  @ApiPropertyOptional({
    description: "Provider-specific information",
    example: {
      model: "gpt-3.5-turbo",
      organization: "org-123",
    },
  })
  providerInfo?: any;
}
