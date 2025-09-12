import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { BaseLLMProvider } from './base-provider';
import { LLMProviderConfig } from '../interfaces/llm-provider.interface';
import { ConfigService } from '../../config/config.service';
import { 
  ChatCompletionRequest, 
  ChatCompletionChunk, 
  RateLimitConfig, 
  ProviderError 
} from '../types/chat-completion.types';

/**
 * OpenAI Provider Implementation
 * Handles OpenAI API integration with streaming support
 */
@Injectable()
export class OpenAIProvider extends BaseLLMProvider {
  private client!: OpenAI;
  public readonly name = 'openai';

  constructor(config: LLMProviderConfig, private readonly configService: ConfigService) {
    const rateLimits: RateLimitConfig = {
      requestsPerMinute: 3500, // OpenAI's default rate limit
      tokensPerMinute: 90000,  // OpenAI's default token limit
      requestsPerDay: 10000,   // Conservative daily limit
      tokensPerDay: 1000000,   // Conservative daily token limit
    };

    super('OpenAI', config, rateLimits);
    this.initializeClient();
  }

  /**
   * Initialize OpenAI client
   */
  private initializeClient(): void {
    const apiKey = this.configService.openaiApiKey;
    
    if (!apiKey || apiKey === 'your-openai-api-key') {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }

    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });
  }



  /**
   * Stream chat completion responses
   */
  async *streamChatCompletion(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    this.validateRequest(request);
    this.logOperation('streamChatCompletion', { model: request.model, messageCount: request.messages.length });

    try {
      const stream = await this.withRetry(async () => {
        return await this.client.chat.completions.create({
          model: request.model,
          messages: request.messages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content,
            name: msg.name,
          })),
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          stream: true,
          stop: request.stop,
          top_p: request.topP,
          frequency_penalty: request.frequencyPenalty,
          presence_penalty: request.presencePenalty,
        });
      });

      for await (const chunk of stream) {
        yield this.transformChunk(chunk);
      }

      this.logOperation('streamChatCompletion completed successfully');
    } catch (error) {
      this.logError('streamChatCompletion', error);
      throw this.parseError(error);
    }
  }

  /**
   * Validate API key with OpenAI
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      this.logOperation('validateApiKey');
      
      // Create a temporary client with the provided API key
      const tempClient = new OpenAI({
        apiKey,
        baseURL: this.config.baseUrl,
        timeout: 10000, // Shorter timeout for validation
      });

      // Make a simple request to validate the key
      await tempClient.models.list();
      
      this.logOperation('validateApiKey successful');
      return true;
    } catch (error) {
      this.logError('validateApiKey', error);
      return false;
    }
  }

  /**
   * Get available models from OpenAI
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      this.logOperation('getAvailableModels');
      
      const models = await this.withRetry(async () => {
        return await this.client.models.list();
      });

      // Filter for chat completion models
      const chatModels = models.data
        .filter(model => model.id.includes('gpt'))
        .map(model => model.id)
        .sort();

      this.logOperation('getAvailableModels completed', { count: chatModels.length });
      return chatModels;
    } catch (error) {
      this.logError('getAvailableModels', error);
      return [this.config.defaultModel]; // Fallback to default model
    }
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.config.defaultModel;
  }

  /**
   * Check if provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      this.logOperation('isHealthy');
      
      // Make a simple request to check health
      await this.client.models.list();
      
      this.logOperation('isHealthy successful');
      return true;
    } catch (error) {
      this.logError('isHealthy', error);
      return false;
    }
  }

  /**
   * Parse OpenAI-specific errors
   */
  parseError(error: any): ProviderError {
    if (error?.error) {
      const openaiError = error.error;
      
      switch (openaiError.type) {
        case 'invalid_request_error':
          return this.createError(
            openaiError.message || 'Invalid request',
            openaiError.code || 'invalid_request',
            'invalid_request_error',
          );
        
        case 'authentication_error':
          return this.createError(
            openaiError.message || 'Authentication failed',
            openaiError.code || 'authentication_error',
            'authentication_error',
          );
        
        case 'rate_limit_error':
          return this.createError(
            openaiError.message || 'Rate limit exceeded',
            openaiError.code || 'rate_limit_error',
            'rate_limit_error',
          );
        
        case 'server_error':
        default:
          return this.createError(
            openaiError.message || 'Server error',
            openaiError.code || 'server_error',
            'server_error',
          );
      }
    }

    // Handle network or other errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return this.createError(
        'Unable to connect to OpenAI API',
        'connection_error',
        'server_error',
      );
    }

    if (error.code === 'ETIMEDOUT') {
      return this.createError(
        'Request timeout',
        'timeout_error',
        'server_error',
      );
    }

    // Generic error
    return this.createError(
      error.message || 'Unknown error occurred',
      'unknown_error',
      'server_error',
    );
  }

  /**
   * Transform OpenAI chunk to standardized format
   */
  private transformChunk(chunk: OpenAI.Chat.Completions.ChatCompletionChunk): ChatCompletionChunk {
    return {
      id: chunk.id,
      object: chunk.object,
      created: chunk.created,
      model: chunk.model,
      choices: chunk.choices.map(choice => ({
        index: choice.index,
        delta: {
          role: choice.delta.role as 'system' | 'user' | 'assistant' | undefined,
          content: choice.delta.content || undefined,
        },
        finishReason: choice.finish_reason as 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call' | undefined,
      })),
      usage: chunk.usage ? {
        promptTokens: chunk.usage.prompt_tokens,
        completionTokens: chunk.usage.completion_tokens,
        totalTokens: chunk.usage.total_tokens,
      } : undefined,
    };
  }

  /**
   * Set API key for the client
   */
  setApiKey(apiKey: string): void {
    this.client = new OpenAI({
      apiKey,
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });
  }

  /**
   * Get client instance (for testing purposes)
   */
  getClient(): OpenAI {
    return this.client;
  }
}
