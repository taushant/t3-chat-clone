import { Test, TestingModule } from '@nestjs/testing';
import { ProviderRegistryService } from './provider-registry.service';
import { LLMProvider } from '../interfaces/llm-provider.interface';
import { RateLimitConfig } from '../types/chat-completion.types';

describe('ProviderRegistryService', () => {
  let service: ProviderRegistryService;
  let mockProvider: jest.Mocked<LLMProvider>;

  beforeEach(async () => {
    // Create a mock provider
    mockProvider = {
      name: 'test-provider',
      streamChatCompletion: jest.fn(),
      validateApiKey: jest.fn().mockResolvedValue(true),
      getRateLimits: jest.fn().mockReturnValue({
        requestsPerMinute: 60,
        tokensPerMinute: 10000,
      } as RateLimitConfig),
      getAvailableModels: jest.fn().mockResolvedValue(['model1', 'model2']),
      getDefaultModel: jest.fn().mockReturnValue('model1'),
      isHealthy: jest.fn().mockResolvedValue(true),
      parseError: jest.fn().mockReturnValue({
        code: 'test_error',
        message: 'Test error',
        type: 'server_error',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProviderRegistryService],
    }).compile();

    service = module.get<ProviderRegistryService>(ProviderRegistryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should register a provider', () => {
    service.registerProvider(mockProvider);
    expect(service.hasProvider('test-provider')).toBe(true);
    expect(service.listProviders()).toContain('test-provider');
  });

  it('should get a registered provider', () => {
    service.registerProvider(mockProvider);
    const provider = service.getProvider('test-provider');
    expect(provider).toBe(mockProvider);
  });

  it('should throw error when getting non-existent provider', () => {
    expect(() => service.getProvider('non-existent')).toThrow('Provider non-existent not found');
  });

  it('should unregister a provider', () => {
    service.registerProvider(mockProvider);
    expect(service.hasProvider('test-provider')).toBe(true);
    
    const removed = service.unregisterProvider('test-provider');
    expect(removed).toBe(true);
    expect(service.hasProvider('test-provider')).toBe(false);
  });

  it('should return false when unregistering non-existent provider', () => {
    const removed = service.unregisterProvider('non-existent');
    expect(removed).toBe(false);
  });

  it('should get available models from all providers', async () => {
    service.registerProvider(mockProvider);
    const models = await service.getAvailableModels();
    
    expect(models.has('test-provider')).toBe(true);
    expect(models.get('test-provider')).toEqual(['model1', 'model2']);
  });

  it('should get default models from all providers', () => {
    service.registerProvider(mockProvider);
    const defaultModels = service.getDefaultModels();
    
    expect(defaultModels.has('test-provider')).toBe(true);
    expect(defaultModels.get('test-provider')).toBe('model1');
  });

  it('should check provider health', async () => {
    service.registerProvider(mockProvider);
    const isHealthy = await service.checkProviderHealth('test-provider');
    
    expect(isHealthy).toBe(true);
    expect(mockProvider.isHealthy).toHaveBeenCalled();
  });

  it('should validate API key for provider', async () => {
    service.registerProvider(mockProvider);
    const isValid = await service.validateApiKey('test-provider', 'test-key');
    
    expect(isValid).toBe(true);
    expect(mockProvider.validateApiKey).toHaveBeenCalledWith('test-key');
  });

  it('should get provider rate limits', () => {
    service.registerProvider(mockProvider);
    const rateLimits = service.getProviderRateLimits('test-provider');
    
    expect(rateLimits.requestsPerMinute).toBe(60);
    expect(rateLimits.tokensPerMinute).toBe(10000);
  });

  it('should get provider statistics', () => {
    service.registerProvider(mockProvider);
    const stats = service.getProviderStats();
    
    expect(stats.totalProviders).toBe(1);
    expect(stats.healthyProviders).toBe(0); // Health not checked yet for this provider
    expect(stats.unhealthyProviders).toBe(1); // Provider not in health map is considered unhealthy
    expect(stats.providers).toHaveLength(1);
    expect(stats.providers[0].name).toBe('test-provider');
    expect(stats.providers[0].isHealthy).toBe(false); // Health not checked yet
  });
});
