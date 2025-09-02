import { IsString, IsArray, IsOptional, IsNumber, IsBoolean, Min, Max, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

export class ChatMessageDto {
  @ApiProperty({
    description: 'Role of the message sender',
    enum: MessageRole,
    example: MessageRole.USER,
  })
  @IsEnum(MessageRole)
  role: MessageRole;

  @ApiProperty({
    description: 'Content of the message',
    example: 'Hello, how are you?',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Name of the message sender (optional)',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class ChatCompletionRequestDto {
  @ApiProperty({
    description: 'Array of chat messages',
    type: [ChatMessageDto],
    example: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, how are you?' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiProperty({
    description: 'Model to use for completion',
    example: 'gpt-3.5-turbo',
  })
  @IsString()
  model: string;

  @ApiPropertyOptional({
    description: 'Sampling temperature (0-2)',
    minimum: 0,
    maximum: 2,
    default: 1,
    example: 0.7,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of tokens to generate',
    minimum: 1,
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({
    description: 'Whether to stream the response',
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiPropertyOptional({
    description: 'Stop sequences',
    type: [String],
    example: ['\n', 'Human:'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stop?: string[];

  @ApiPropertyOptional({
    description: 'Top-p sampling parameter (0-1)',
    minimum: 0,
    maximum: 1,
    example: 0.9,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @ApiPropertyOptional({
    description: 'Frequency penalty (-2 to 2)',
    minimum: -2,
    maximum: 2,
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  frequencyPenalty?: number;

  @ApiPropertyOptional({
    description: 'Presence penalty (-2 to 2)',
    minimum: -2,
    maximum: 2,
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  presencePenalty?: number;
}

export class ChatCompletionResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the completion',
    example: 'chatcmpl-123',
  })
  id: string;

  @ApiProperty({
    description: 'Object type',
    example: 'chat.completion',
  })
  object: string;

  @ApiProperty({
    description: 'Unix timestamp of creation',
    example: 1677652288,
  })
  created: number;

  @ApiProperty({
    description: 'Model used for completion',
    example: 'gpt-3.5-turbo',
  })
  model: string;

  @ApiProperty({
    description: 'Array of completion choices',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        index: { type: 'number', example: 0 },
        message: {
          type: 'object',
          properties: {
            role: { type: 'string', example: 'assistant' },
            content: { type: 'string', example: 'Hello! I am doing well, thank you for asking.' },
          },
        },
        finishReason: { type: 'string', example: 'stop' },
      },
    },
  })
  choices: any[];

  @ApiProperty({
    description: 'Token usage information',
    type: 'object',
    properties: {
      promptTokens: { type: 'number', example: 10 },
      completionTokens: { type: 'number', example: 20 },
      totalTokens: { type: 'number', example: 30 },
    },
  })
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class ChatCompletionChunkDto {
  @ApiProperty({
    description: 'Unique identifier for the completion',
    example: 'chatcmpl-123',
  })
  id: string;

  @ApiProperty({
    description: 'Object type',
    example: 'chat.completion.chunk',
  })
  object: string;

  @ApiProperty({
    description: 'Unix timestamp of creation',
    example: 1677652288,
  })
  created: number;

  @ApiProperty({
    description: 'Model used for completion',
    example: 'gpt-3.5-turbo',
  })
  model: string;

  @ApiProperty({
    description: 'Array of completion choices',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        index: { type: 'number', example: 0 },
        delta: {
          type: 'object',
          properties: {
            role: { type: 'string', example: 'assistant' },
            content: { type: 'string', example: 'Hello' },
          },
        },
        finishReason: { type: 'string', example: 'stop' },
      },
    },
  })
  choices: any[];
}
