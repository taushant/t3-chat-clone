import { Injectable, Logger } from '@nestjs/common';
import { LLMProvider, LLMProviderConfig } from '../interfaces/llm-provider.interface';
import { 
  ChatCompletionRequest, 
  ChatCompletionChunk, 
  RateLimitConfig, 
  ProviderError 
} from '../types/chat-completion.types';

/**
 * Base class for LLM providers
 * Provides common functionality and enforces interface implementation
 */
@Injectable()
export abstract class BaseLLMProvider implements LLMProvider {
  protected readonly logger: Logger;
  protected readonly config: LLMProviderConfig;
  protected readonly rateLimits: RateLimitConfig;

  constructor(
    providerName: string,
    config: LLMProviderConfig,
    rateLimits: RateLimitConfig,
  ) {
    this.logger = new Logger(`${providerName}Provider`);
    this.config = config;
    this.rateLimits = rateLimits;
  }

  /**
   * Abstract methods that must be implemented by concrete providers
   */
  abstract get name(): string;
  abstract streamChatCompletion(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>;
  abstract validateApiKey(apiKey: string): Promise<boolean>;
  abstract getAvailableModels(): Promise<string[]>;
  abstract getDefaultModel(): string;
  abstract isHealthy(): Promise<boolean>;
  abstract parseError(error: any): ProviderError;

  /**
   * Get rate limits for the provider
   */
  getRateLimits(): RateLimitConfig {
    return this.rateLimits;
  }

  /**
   * Validate chat completion request
   * @param request - Request to validate
   * @throws Error if request is invalid
   */
  protected validateRequest(request: ChatCompletionRequest): void {
    if (!request.messages || request.messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }

    if (!request.model) {
      throw new Error('Model is required');
    }

    if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
      throw new Error('Temperature must be between 0 and 2');
    }

    if (request.maxTokens !== undefined && request.maxTokens < 1) {
      throw new Error('Max tokens must be greater than 0');
    }

    // Validate message structure
    for (const message of request.messages) {
      if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
        throw new Error('Invalid message role');
      }
      if (!message.content || typeof message.content !== 'string') {
        throw new Error('Message content is required and must be a string');
      }
    }
  }

  /**
   * Create standardized error response
   * @param message - Error message
   * @param code - Error code
   * @param type - Error type
   * @returns ProviderError
   */
  protected createError(
    message: string,
    code: string = 'provider_error',
    type: 'invalid_request_error' | 'authentication_error' | 'rate_limit_error' | 'server_error' = 'server_error',
  ): ProviderError {
    return {
      code,
      message,
      type,
    };
  }

  /**
   * Log provider operation
   * @param operation - Operation name
   * @param details - Additional details
   */
  protected logOperation(operation: string, details?: any): void {
    this.logger.log(`${operation}${details ? `: ${JSON.stringify(details)}` : ''}`);
  }

  /**
   * Log provider error
   * @param operation - Operation name
   * @param error - Error details
   */
  protected logError(operation: string, error: any): void {
    this.logger.error(`${operation} failed: ${error.message || error}`, error.stack);
  }

  /**
   * Retry mechanism for failed requests
   * @param operation - Operation to retry
   * @param maxRetries - Maximum number of retries
   * @returns Promise<T> - Result of the operation
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries,
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }

        // Don't retry on authentication or invalid request errors
        const providerError = this.parseError(error);
        if (providerError.type === 'authentication_error' || providerError.type === 'invalid_request_error') {
          throw error;
        }

        // Wait before retrying
        const delay = this.config.retryDelay * Math.pow(2, attempt);
        this.logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable
   * @param error - Error to check
   * @returns boolean - true if retryable
   */
  protected isRetryableError(error: any): boolean {
    const providerError = this.parseError(error);
    return providerError.type === 'rate_limit_error' || providerError.type === 'server_error';
  }
}
