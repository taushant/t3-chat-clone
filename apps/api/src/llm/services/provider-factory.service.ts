import { Injectable, Logger } from '@nestjs/common';
import { ProviderRegistryService } from './provider-registry.service';
import { OpenAIProvider } from '../providers/openai.provider';
import { AnthropicProvider } from '../providers/anthropic.provider';
import { OpenRouterProvider } from '../providers/openrouter.provider';
import { getProviderConfig } from '../config/provider.config';
import { LLMProvider } from '../interfaces/llm-provider.interface';

/**
 * Factory service for creating and registering LLM providers
 */
@Injectable()
export class ProviderFactoryService {
  private readonly logger = new Logger(ProviderFactoryService.name);

  constructor(private readonly providerRegistry: ProviderRegistryService) {}

  /**
   * Initialize all providers
   */
  async initializeProviders(): Promise<void> {
    this.logger.log('Initializing LLM providers...');

    try {
      // Initialize OpenAI provider
      await this.initializeOpenAIProvider();

      // Initialize Anthropic provider
      await this.initializeAnthropicProvider();

      // Initialize OpenRouter provider
      await this.initializeOpenRouterProvider();

      this.logger.log('All LLM providers initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize providers:', error);
      throw error;
    }
  }

  /**
   * Initialize OpenAI provider
   */
  private async initializeOpenAIProvider(): Promise<void> {
    try {
      const config = getProviderConfig('openai');
      const provider = new OpenAIProvider(config);
      
      this.providerRegistry.registerProvider(provider);
      this.logger.log('OpenAI provider initialized');
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI provider:', error);
      // Don't throw - allow other providers to initialize
    }
  }

  /**
   * Initialize Anthropic provider
   */
  private async initializeAnthropicProvider(): Promise<void> {
    try {
      const config = getProviderConfig('anthropic');
      const provider = new AnthropicProvider(config);
      
      this.providerRegistry.registerProvider(provider);
      this.logger.log('Anthropic provider initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Anthropic provider:', error);
      // Don't throw - allow other providers to initialize
    }
  }

  /**
   * Initialize OpenRouter provider
   */
  private async initializeOpenRouterProvider(): Promise<void> {
    try {
      const config = getProviderConfig('openrouter');
      const provider = new OpenRouterProvider(config);
      
      this.providerRegistry.registerProvider(provider);
      this.logger.log('OpenRouter provider initialized');
    } catch (error) {
      this.logger.error('Failed to initialize OpenRouter provider:', error);
      // Don't throw - allow other providers to initialize
    }
  }

  /**
   * Create a provider instance by name
   * @param providerName - Name of the provider to create
   * @returns LLMProvider instance
   */
  createProvider(providerName: string): LLMProvider {
    const config = getProviderConfig(providerName);

    switch (providerName.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'openrouter':
        return new OpenRouterProvider(config);
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  /**
   * Get list of supported provider names
   * @returns string[] - List of supported provider names
   */
  getSupportedProviders(): string[] {
    return ['openai', 'anthropic', 'openrouter'];
  }

  /**
   * Check if a provider is supported
   * @param providerName - Name of the provider to check
   * @returns boolean - true if supported
   */
  isProviderSupported(providerName: string): boolean {
    return this.getSupportedProviders().includes(providerName.toLowerCase());
  }

  /**
   * Get provider configuration
   * @param providerName - Name of the provider
   * @returns Provider configuration
   */
  getProviderConfiguration(providerName: string) {
    return getProviderConfig(providerName);
  }

  /**
   * Get all provider configurations
   * @returns All provider configurations
   */
  getAllProviderConfigurations() {
    return {
      openai: getProviderConfig('openai'),
      anthropic: getProviderConfig('anthropic'),
      openrouter: getProviderConfig('openrouter'),
    };
  }
}
