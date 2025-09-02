import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LLMProvider } from '../interfaces/llm-provider.interface';
import { ProviderError } from '../types/chat-completion.types';

/**
 * Registry service for managing LLM providers
 * Handles provider registration, retrieval, and health monitoring
 */
@Injectable()
export class ProviderRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ProviderRegistryService.name);
  private readonly providers = new Map<string, LLMProvider>();
  private readonly providerHealth = new Map<string, boolean>();

  /**
   * Initialize the registry on module startup
   */
  async onModuleInit() {
    this.logger.log('Initializing LLM Provider Registry');
    await this.checkAllProvidersHealth();
  }

  /**
   * Register a new LLM provider
   * @param provider - Provider instance to register
   */
  registerProvider(provider: LLMProvider): void {
    if (this.providers.has(provider.name)) {
      this.logger.warn(`Provider ${provider.name} is already registered, replacing...`);
    }

    this.providers.set(provider.name, provider);
    this.logger.log(`Registered provider: ${provider.name}`);
  }

  /**
   * Get a provider by name
   * @param name - Provider name
   * @returns LLMProvider - Provider instance
   * @throws Error if provider not found
   */
  getProvider(name: string): LLMProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider ${name} not found`);
    }
    return provider;
  }

  /**
   * Get all registered provider names
   * @returns string[] - List of provider names
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get all registered providers
   * @returns Map<string, LLMProvider> - Map of providers
   */
  getAllProviders(): Map<string, LLMProvider> {
    return new Map(this.providers);
  }

  /**
   * Check if a provider is registered
   * @param name - Provider name
   * @returns boolean - true if registered
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Remove a provider from the registry
   * @param name - Provider name
   * @returns boolean - true if removed, false if not found
   */
  unregisterProvider(name: string): boolean {
    const removed = this.providers.delete(name);
    this.providerHealth.delete(name);
    
    if (removed) {
      this.logger.log(`Unregistered provider: ${name}`);
    }
    
    return removed;
  }

  /**
   * Get available models from all providers
   * @returns Promise<Map<string, string[]>> - Map of provider name to available models
   */
  async getAvailableModels(): Promise<Map<string, string[]>> {
    const models = new Map<string, string[]>();
    
    for (const [name, provider] of this.providers) {
      try {
        const providerModels = await provider.getAvailableModels();
        models.set(name, providerModels);
      } catch (error) {
        this.logger.error(`Failed to get models for provider ${name}:`, error);
        models.set(name, []);
      }
    }
    
    return models;
  }

  /**
   * Get default models from all providers
   * @returns Map<string, string> - Map of provider name to default model
   */
  getDefaultModels(): Map<string, string> {
    const defaultModels = new Map<string, string>();
    
    for (const [name, provider] of this.providers) {
      try {
        const defaultModel = provider.getDefaultModel();
        defaultModels.set(name, defaultModel);
      } catch (error) {
        this.logger.error(`Failed to get default model for provider ${name}:`, error);
      }
    }
    
    return defaultModels;
  }

  /**
   * Check health of a specific provider
   * @param name - Provider name
   * @returns Promise<boolean> - true if healthy
   */
  async checkProviderHealth(name: string): Promise<boolean> {
    try {
      const provider = this.getProvider(name);
      const isHealthy = await provider.isHealthy();
      this.providerHealth.set(name, isHealthy);
      
      if (!isHealthy) {
        this.logger.warn(`Provider ${name} is unhealthy`);
      }
      
      return isHealthy;
    } catch (error) {
      this.logger.error(`Health check failed for provider ${name}:`, error);
      this.providerHealth.set(name, false);
      return false;
    }
  }

  /**
   * Check health of all providers
   * @returns Promise<Map<string, boolean>> - Map of provider health status
   */
  async checkAllProvidersHealth(): Promise<Map<string, boolean>> {
    const healthChecks = Array.from(this.providers.keys()).map(async (name) => {
      const isHealthy = await this.checkProviderHealth(name);
      return [name, isHealthy] as [string, boolean];
    });

    const results = await Promise.all(healthChecks);
    const healthMap = new Map(results);
    
    this.logger.log(`Health check completed for ${results.length} providers`);
    return healthMap;
  }

  /**
   * Get health status of all providers
   * @returns Map<string, boolean> - Map of provider health status
   */
  getProvidersHealth(): Map<string, boolean> {
    return new Map(this.providerHealth);
  }

  /**
   * Get healthy providers only
   * @returns LLMProvider[] - List of healthy providers
   */
  getHealthyProviders(): LLMProvider[] {
    const healthyProviders: LLMProvider[] = [];
    
    for (const [name, provider] of this.providers) {
      if (this.providerHealth.get(name) === true) {
        healthyProviders.push(provider);
      }
    }
    
    return healthyProviders;
  }

  /**
   * Get provider statistics
   * @returns object - Provider statistics
   */
  getProviderStats(): {
    totalProviders: number;
    healthyProviders: number;
    unhealthyProviders: number;
    providers: Array<{
      name: string;
      isHealthy: boolean;
      defaultModel: string;
    }>;
  } {
    const totalProviders = this.providers.size;
    let healthyProviders = 0;
    let unhealthyProviders = 0;
    
    const providers = Array.from(this.providers.entries()).map(([name, provider]) => {
      const isHealthy = this.providerHealth.get(name) === true;
      if (isHealthy) {
        healthyProviders++;
      } else {
        unhealthyProviders++;
      }
      
      return {
        name,
        isHealthy,
        defaultModel: provider.getDefaultModel(),
      };
    });

    return {
      totalProviders,
      healthyProviders,
      unhealthyProviders,
      providers,
    };
  }

  /**
   * Validate API key for a specific provider
   * @param providerName - Provider name
   * @param apiKey - API key to validate
   * @returns Promise<boolean> - true if valid
   */
  async validateApiKey(providerName: string, apiKey: string): Promise<boolean> {
    try {
      const provider = this.getProvider(providerName);
      return await provider.validateApiKey(apiKey);
    } catch (error) {
      this.logger.error(`API key validation failed for provider ${providerName}:`, error);
      return false;
    }
  }

  /**
   * Get rate limits for a specific provider
   * @param providerName - Provider name
   * @returns Rate limit configuration
   */
  getProviderRateLimits(providerName: string) {
    const provider = this.getProvider(providerName);
    return provider.getRateLimits();
  }
}
