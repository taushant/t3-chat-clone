import { LLMProviderConfig } from '../interfaces/llm-provider.interface';

/**
 * Configuration for all LLM providers
 */
export interface ProviderConfig {
  openai: LLMProviderConfig;
  anthropic: LLMProviderConfig;
  openrouter: LLMProviderConfig;
}

/**
 * Default configuration for OpenAI provider
 */
export const OPENAI_CONFIG: LLMProviderConfig = {
  baseUrl: 'https://api.openai.com/v1',
  defaultModel: 'gpt-3.5-turbo',
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

/**
 * Default configuration for Anthropic provider
 */
export const ANTHROPIC_CONFIG: LLMProviderConfig = {
  baseUrl: 'https://api.anthropic.com/v1',
  defaultModel: 'claude-3-sonnet-20240229',
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

/**
 * Default configuration for OpenRouter provider
 */
export const OPENROUTER_CONFIG: LLMProviderConfig = {
  baseUrl: 'https://openrouter.ai/api/v1',
  defaultModel: 'openai/gpt-3.5-turbo',
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

/**
 * Get provider configuration from environment variables
 * @param providerName - Name of the provider
 * @returns LLMProviderConfig - Provider configuration
 */
export function getProviderConfig(providerName: string): LLMProviderConfig {
  const baseConfig = getBaseConfig(providerName);
  
  return {
    ...baseConfig,
    baseUrl: process.env[`${providerName.toUpperCase()}_BASE_URL`] || baseConfig.baseUrl,
    defaultModel: process.env[`${providerName.toUpperCase()}_DEFAULT_MODEL`] || baseConfig.defaultModel,
    timeout: parseInt(process.env[`${providerName.toUpperCase()}_TIMEOUT`] || baseConfig.timeout.toString()),
    maxRetries: parseInt(process.env[`${providerName.toUpperCase()}_MAX_RETRIES`] || baseConfig.maxRetries.toString()),
    retryDelay: parseInt(process.env[`${providerName.toUpperCase()}_RETRY_DELAY`] || baseConfig.retryDelay.toString()),
  };
}

/**
 * Get base configuration for provider
 * @param providerName - Name of the provider
 * @returns LLMProviderConfig - Base configuration
 */
function getBaseConfig(providerName: string): LLMProviderConfig {
  switch (providerName.toLowerCase()) {
    case 'openai':
      return OPENAI_CONFIG;
    case 'anthropic':
      return ANTHROPIC_CONFIG;
    case 'openrouter':
      return OPENROUTER_CONFIG;
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

/**
 * Get all provider configurations
 * @returns ProviderConfig - All provider configurations
 */
export function getAllProviderConfigs(): ProviderConfig {
  return {
    openai: getProviderConfig('openai'),
    anthropic: getProviderConfig('anthropic'),
    openrouter: getProviderConfig('openrouter'),
  };
}
