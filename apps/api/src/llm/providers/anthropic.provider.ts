import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider } from './base-provider';
import { LLMProviderConfig } from '../interfaces/llm-provider.interface';
import { 
  ChatCompletionRequest, 
  ChatCompletionChunk, 
  RateLimitConfig, 
  ProviderError 
} from '../types/chat-completion.types';

/**
 * Anthropic Provider Implementation
 * Handles Anthropic Claude API integration with streaming support
 */
@Injectable()
export class AnthropicProvider extends BaseLLMProvider {
  private client!: Anthropic;
  public readonly name = 'anthropic';

  constructor(config: LLMProviderConfig) {
    const rateLimits: RateLimitConfig = {
      requestsPerMinute: 1000,  // Anthropic's default rate limit
      tokensPerMinute: 40000,   // Anthropic's default token limit
      requestsPerDay: 5000,     // Conservative daily limit
      tokensPerDay: 500000,     // Conservative daily token limit
    };

    super('Anthropic', config, rateLimits);
    this.initializeClient();
  }

  /**
   * Initialize Anthropic client
   */
  private initializeClient(): void {
    this.client = new Anthropic({
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
      // Convert messages to Anthropic format
      const { system, messages } = this.convertMessages(request.messages);

      const stream = await this.withRetry(async () => {
        return await this.client.messages.create({
          model: request.model,
          system: system,
          messages: messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens || 1000,
          stream: true,
          stop_sequences: request.stop,
        });
      });

      let chunkId = 0;
      for await (const chunk of stream) {
        yield this.transformChunk(chunk, chunkId++);
      }

      this.logOperation('streamChatCompletion completed successfully');
    } catch (error) {
      this.logError('streamChatCompletion', error);
      throw this.parseError(error);
    }
  }

  /**
   * Validate API key with Anthropic
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      this.logOperation('validateApiKey');
      
      // Create a temporary client with the provided API key
      const tempClient = new Anthropic({
        apiKey,
        baseURL: this.config.baseUrl,
        timeout: 10000, // Shorter timeout for validation
      });

      // Make a simple request to validate the key
      await tempClient.messages.create({
        model: this.config.defaultModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      });
      
      this.logOperation('validateApiKey successful');
      return true;
    } catch (error) {
      this.logError('validateApiKey', error);
      return false;
    }
  }

  /**
   * Get available models from Anthropic
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      this.logOperation('getAvailableModels');
      
      // Anthropic doesn't have a models list endpoint, so we return known models
      const availableModels = [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'claude-2.1',
        'claude-2.0',
        'claude-instant-1.2',
      ];

      this.logOperation('getAvailableModels completed', { count: availableModels.length });
      return availableModels;
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
      await this.client.messages.create({
        model: this.config.defaultModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'health check' }],
      });
      
      this.logOperation('isHealthy successful');
      return true;
    } catch (error) {
      this.logError('isHealthy', error);
      return false;
    }
  }

  /**
   * Parse Anthropic-specific errors
   */
  parseError(error: any): ProviderError {
    if (error?.error) {
      const anthropicError = error.error;
      
      switch (anthropicError.type) {
        case 'invalid_request_error':
          return this.createError(
            anthropicError.message || 'Invalid request',
            anthropicError.code || 'invalid_request',
            'invalid_request_error',
          );
        
        case 'authentication_error':
          return this.createError(
            anthropicError.message || 'Authentication failed',
            anthropicError.code || 'authentication_error',
            'authentication_error',
          );
        
        case 'rate_limit_error':
          return this.createError(
            anthropicError.message || 'Rate limit exceeded',
            anthropicError.code || 'rate_limit_error',
            'rate_limit_error',
          );
        
        case 'server_error':
        default:
          return this.createError(
            anthropicError.message || 'Server error',
            anthropicError.code || 'server_error',
            'server_error',
          );
      }
    }

    // Handle network or other errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return this.createError(
        'Unable to connect to Anthropic API',
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
   * Convert standard messages to Anthropic format
   */
  private convertMessages(messages: Array<{ role: string; content: string; name?: string }>): {
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    let system: string | undefined;
    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const message of messages) {
      if (message.role === 'system') {
        system = message.content;
      } else if (message.role === 'user' || message.role === 'assistant') {
        anthropicMessages.push({
          role: message.role as 'user' | 'assistant',
          content: message.content,
        });
      }
    }

    return { system, messages: anthropicMessages };
  }

  /**
   * Transform Anthropic chunk to standardized format
   */
  private transformChunk(chunk: any, chunkId: number): ChatCompletionChunk {
    // Anthropic streaming format is different from OpenAI
    // We need to adapt it to our standard format
    const content = chunk.delta?.text || '';
    
    return {
      id: `anthropic-${chunkId}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: chunk.model || this.config.defaultModel,
      choices: [{
        index: 0,
        delta: {
          content: content,
        },
        finishReason: chunk.type === 'message_stop' ? 'stop' : undefined,
      }],
    };
  }

  /**
   * Set API key for the client
   */
  setApiKey(apiKey: string): void {
    this.client = new Anthropic({
      apiKey,
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });
  }

  /**
   * Get client instance (for testing purposes)
   */
  getClient(): Anthropic {
    return this.client;
  }
}
