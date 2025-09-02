import { ChatCompletionRequest, ChatCompletionChunk, RateLimitConfig, ProviderError } from '../types/chat-completion.types';

/**
 * Core interface for LLM providers
 * All LLM providers must implement this interface
 */
export interface LLMProvider {
  /**
   * Unique name identifier for the provider
   */
  readonly name: string;

  /**
   * Stream chat completion responses
   * @param request - Chat completion request
   * @returns Async iterable of chat completion chunks
   */
  streamChatCompletion(request: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>;

  /**
   * Validate API key for the provider
   * @param apiKey - API key to validate
   * @returns Promise<boolean> - true if valid, false otherwise
   */
  validateApiKey(apiKey: string): Promise<boolean>;

  /**
   * Get rate limits for the provider
   * @returns RateLimitConfig - Rate limiting configuration
   */
  getRateLimits(): RateLimitConfig;

  /**
   * Get available models for the provider
   * @returns Promise<string[]> - List of available model names
   */
  getAvailableModels(): Promise<string[]>;

  /**
   * Get default model for the provider
   * @returns string - Default model name
   */
  getDefaultModel(): string;

  /**
   * Check if provider is healthy and available
   * @returns Promise<boolean> - true if healthy, false otherwise
   */
  isHealthy(): Promise<boolean>;

  /**
   * Get provider-specific error information
   * @param error - Original error from provider
   * @returns ProviderError - Standardized error information
   */
  parseError(error: any): ProviderError;
}

/**
 * Configuration interface for LLM providers
 */
export interface LLMProviderConfig {
  baseUrl: string;
  defaultModel: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Provider factory interface for creating provider instances
 */
export interface LLMProviderFactory {
  createProvider(config: LLMProviderConfig): LLMProvider;
  getProviderName(): string;
}
