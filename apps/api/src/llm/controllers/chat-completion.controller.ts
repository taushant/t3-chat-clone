import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';
import { ProviderRegistryService } from '../services/provider-registry.service';
import { LLMRateLimitService } from '../services/rate-limit.service';
import { LLMRateLimitGuard, LLM_RATE_LIMIT } from '../guards/llm-rate-limit.guard';
import { 
  ChatCompletionRequestDto, 
  ChatCompletionResponseDto,
  ChatCompletionChunkDto 
} from '../dto/chat-completion.dto';
import { ChatCompletionRequest } from '../types/chat-completion.types';

/**
 * Chat Completion Controller
 * Handles LLM chat completion requests with streaming support
 */
@ApiTags('LLM Chat Completion')
@Controller('llm/chat')
@UseGuards(JwtAuthGuard, LLMRateLimitGuard)
@ApiBearerAuth()
export class ChatCompletionController {
  private readonly logger = new Logger(ChatCompletionController.name);

  constructor(
    private readonly providerRegistry: ProviderRegistryService,
    private readonly rateLimitService: LLMRateLimitService,
  ) {}

  @Post('completion')
  @LLM_RATE_LIMIT()
  @ApiOperation({
    summary: 'Create chat completion',
    description: 'Generate a chat completion response from an LLM provider',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chat completion generated successfully',
    type: ChatCompletionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'LLM provider error',
  })
  async createCompletion(
    @Body() request: ChatCompletionRequestDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ChatCompletionResponseDto> {
    try {
      this.logger.log(`Chat completion request from user ${req.user.id} for model ${request.model}`);

      // Get the provider based on the model
      const providerInstance = this.getProviderFromModel(request.model);
      
      // Convert DTO to internal request format
      const internalRequest: ChatCompletionRequest = {
        messages: request.messages,
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        stream: false, // Non-streaming for this endpoint
        stop: request.stop,
        topP: request.topP,
        frequencyPenalty: request.frequencyPenalty,
        presencePenalty: request.presencePenalty,
      };

      // Collect all chunks for non-streaming response
      const chunks: any[] = [];
      for await (const chunk of providerInstance.streamChatCompletion(internalRequest)) {
        chunks.push(chunk);
      }

      // Convert the last chunk to a complete response
      const lastChunk = chunks[chunks.length - 1];
      if (!lastChunk) {
        throw new HttpException('No response received from LLM provider', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Build complete response
      const response: ChatCompletionResponseDto = {
        id: lastChunk.id,
        object: 'chat.completion',
        created: lastChunk.created,
        model: lastChunk.model,
        choices: chunks.map(chunk => ({
          index: 0,
          message: {
            role: 'assistant',
            content: chunk.choices[0]?.delta?.content || '',
          },
          finishReason: chunk.choices[0]?.finishReason || 'stop',
        })),
        usage: lastChunk.usage || {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      };

      // Record usage for rate limiting
      const totalTokens = response.usage.totalTokens;
      const providerName = providerInstance.name;
      await this.rateLimitService.recordUsage(req.user.id, providerName, totalTokens);

      this.logger.log(`Chat completion completed for user ${req.user.id}`);
      return response;

    } catch (error) {
      this.logger.error(`Chat completion failed for user ${req.user.id}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to generate chat completion',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('completion/stream')
  @LLM_RATE_LIMIT()
  @ApiOperation({
    summary: 'Create streaming chat completion',
    description: 'Generate a streaming chat completion response from an LLM provider',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Streaming chat completion started',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'LLM provider error',
  })
  async streamCompletion(
    @Body() request: ChatCompletionRequestDto,
    @Res() res: Response,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    try {
      this.logger.log(`Streaming chat completion request from user ${req.user.id} for model ${request.model}`);

      // Set up Server-Sent Events headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

      // Get the provider based on the model
      const provider = this.getProviderFromModel(request.model);
      
      // Convert DTO to internal request format
      const internalRequest: ChatCompletionRequest = {
        messages: request.messages,
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        stream: true,
        stop: request.stop,
        topP: request.topP,
        frequencyPenalty: request.frequencyPenalty,
        presencePenalty: request.presencePenalty,
      };

      // Stream the response
      for await (const chunk of providerInstance.streamChatCompletion(internalRequest)) {
        const chunkDto: ChatCompletionChunkDto = {
          id: chunk.id,
          object: chunk.object,
          created: chunk.created,
          model: chunk.model,
          choices: chunk.choices,
        };

        // Send chunk as Server-Sent Event
        res.write(`data: ${JSON.stringify(chunkDto)}\n\n`);
      }

      // Send completion event
      res.write('data: [DONE]\n\n');
      res.end();

      this.logger.log(`Streaming chat completion completed for user ${req.user.id}`);

    } catch (error) {
      this.logger.error(`Streaming chat completion failed for user ${req.user.id}:`, error);
      
      // Send error as Server-Sent Event
      res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
      res.end();
    }
  }

  /**
   * Get provider from model name
   * @param model - Model name (e.g., 'gpt-3.5-turbo', 'claude-3-sonnet-20240229')
   * @returns LLMProvider instance
   */
  private getProviderFromModel(model: string) {
    // Determine provider based on model name
    let providerName: string;
    
    if (model.includes('gpt') || model.includes('openai')) {
      providerName = 'openai';
    } else if (model.includes('claude') || model.includes('anthropic')) {
      providerName = 'anthropic';
    } else if (model.includes('/')) {
      // OpenRouter models have format "provider/model"
      providerName = 'openrouter';
    } else {
      // Default to OpenAI for unknown models
      providerName = 'openai';
    }

    try {
      return this.providerRegistry.getProvider(providerName);
    } catch (error) {
      throw new HttpException(
        `Provider ${providerName} not available`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
