import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { BaseLLMProvider } from './base-provider';
import { LLMProviderConfig } from '../interfaces/llm-provider.interface';
import { 
  ChatCompletionRequest, 
  ChatCompletionChunk, 
  RateLimitConfig, 
  ProviderError 
} from '../types/chat-completion.types';

/**
 * OpenRouter Provider Implementation
 * Handles OpenRouter API integration with streaming support
 * OpenRouter provides access to multiple LLM providers through a unified API
 */
@Injectable()
export class OpenRouterProvider extends BaseLLMProvider {
  private client: OpenAI;
  public readonly name = 'openrouter';

  constructor(config: LLMProviderConfig) {
    const rateLimits: RateLimitConfig = {
      requestsPerMinute: 2000,  // OpenRouter's default rate limit
      tokensPerMinute: 50000,   // OpenRouter's default token limit
      requestsPerDay: 10000,    // Conservative daily limit
      tokensPerDay: 1000000,    // Conservative daily token limit
    };

    super('OpenRouter', config, rateLimits);
    this.initializeClient();
  }

  /**
   * Initialize OpenRouter client (uses OpenAI-compatible API)
   */
  private initializeClient(): void {
    this.client = new OpenAI({
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
   * Validate API key with OpenRouter
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
   * Get available models from OpenRouter
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      this.logOperation('getAvailableModels');
      
      const models = await this.withRetry(async () => {
        return await this.client.models.list();
      });

      // Filter for chat completion models and sort by name
      const chatModels = models.data
        .filter(model => model.id.includes('/')) // OpenRouter models have format "provider/model"
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
   * Parse OpenRouter-specific errors
   */
  parseError(error: any): ProviderError {
    if (error?.error) {
      const openrouterError = error.error;
      
      switch (openrouterError.type) {
        case 'invalid_request_error':
          return this.createError(
            openrouterError.message || 'Invalid request',
            openrouterError.code || 'invalid_request',
            'invalid_request_error',
          );
        
        case 'authentication_error':
          return this.createError(
            openrouterError.message || 'Authentication failed',
            openrouterError.code || 'authentication_error',
            'authentication_error',
          );
        
        case 'rate_limit_error':
          return this.createError(
            openrouterError.message || 'Rate limit exceeded',
            openrouterError.code || 'rate_limit_error',
            'rate_limit_error',
          );
        
        case 'server_error':
        default:
          return this.createError(
            openrouterError.message || 'Server error',
            openrouterError.code || 'server_error',
            'server_error',
          );
      }
    }

    // Handle network or other errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return this.createError(
        'Unable to connect to OpenRouter API',
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
   * Transform OpenRouter chunk to standardized format
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

  /**
   * Get model information for a specific model
   * OpenRouter provides additional metadata about models
   */
  async getModelInfo(modelId: string): Promise<any> {
    try {
      this.logOperation('getModelInfo', { modelId });
      
      const models = await this.client.models.list();
      const model = models.data.find(m => m.id === modelId);
      
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      return {
        id: model.id,
        object: model.object,
        created: model.created,
        owned_by: model.owned_by,
        // OpenRouter specific fields (if available)
        context_length: (model as any).context_length,
        pricing: (model as any).pricing,
        architecture: (model as any).architecture,
      };
    } catch (error) {
      this.logError('getModelInfo', error);
      throw this.parseError(error);
    }
  }

  /**
   * Get pricing information for models
   */
  async getPricingInfo(): Promise<any> {
    try {
      this.logOperation('getPricingInfo');
      
      const models = await this.client.models.list();
      const pricingInfo = models.data
        .filter(model => (model as any).pricing)
        .map(model => ({
          id: model.id,
          pricing: (model as any).pricing,
        }));

      return pricingInfo;
    } catch (error) {
      this.logError('getPricingInfo', error);
      throw this.parseError(error);
    }
  }
}
