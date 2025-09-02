import { Test, TestingModule } from '@nestjs/testing';
import { LLMModule } from './llm.module';
import { ProviderRegistryService } from './services/provider-registry.service';
import { ProviderFactoryService } from './services/provider-factory.service';
import { LLMRateLimitService } from './services/rate-limit.service';
import { LLMRateLimitGuard } from './guards/llm-rate-limit.guard';
import { ChatCompletionController } from './controllers/chat-completion.controller';
import { ApiKeyController } from './controllers/api-key.controller';

describe('LLMModule', () => {
  let module: TestingModule;
  let providerRegistry: ProviderRegistryService;
  let providerFactory: ProviderFactoryService;
  let rateLimitService: LLMRateLimitService;
  let rateLimitGuard: LLMRateLimitGuard;
  let chatCompletionController: ChatCompletionController;
  let apiKeyController: ApiKeyController;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [LLMModule],
    }).compile();

    providerRegistry = module.get<ProviderRegistryService>(ProviderRegistryService);
    providerFactory = module.get<ProviderFactoryService>(ProviderFactoryService);
    rateLimitService = module.get<LLMRateLimitService>(LLMRateLimitService);
    rateLimitGuard = module.get<LLMRateLimitGuard>(LLMRateLimitGuard);
    chatCompletionController = module.get<ChatCompletionController>(ChatCompletionController);
    apiKeyController = module.get<ApiKeyController>(ApiKeyController);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide ProviderRegistryService', () => {
    expect(providerRegistry).toBeDefined();
    expect(providerRegistry).toBeInstanceOf(ProviderRegistryService);
  });

  it('should provide ProviderFactoryService', () => {
    expect(providerFactory).toBeDefined();
    expect(providerFactory).toBeInstanceOf(ProviderFactoryService);
  });

  it('should provide LLMRateLimitService', () => {
    expect(rateLimitService).toBeDefined();
    expect(rateLimitService).toBeInstanceOf(LLMRateLimitService);
  });

  it('should provide LLMRateLimitGuard', () => {
    expect(rateLimitGuard).toBeDefined();
    expect(rateLimitGuard).toBeInstanceOf(LLMRateLimitGuard);
  });

  it('should provide ChatCompletionController', () => {
    expect(chatCompletionController).toBeDefined();
    expect(chatCompletionController).toBeInstanceOf(ChatCompletionController);
  });

  it('should provide ApiKeyController', () => {
    expect(apiKeyController).toBeDefined();
    expect(apiKeyController).toBeInstanceOf(ApiKeyController);
  });

  it('should initialize providers on module init', async () => {
    // Wait for module initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const providers = providerRegistry.listProviders();
    expect(providers.length).toBeGreaterThan(0);
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
    expect(providers).toContain('openrouter');
  });

  it('should have rate limiting rules configured', () => {
    const openaiLimits = rateLimitService.getProviderRateLimits('openai');
    const anthropicLimits = rateLimitService.getProviderRateLimits('anthropic');
    const openrouterLimits = rateLimitService.getProviderRateLimits('openrouter');

    expect(openaiLimits).toBeDefined();
    expect(anthropicLimits).toBeDefined();
    expect(openrouterLimits).toBeDefined();

    expect(openaiLimits?.requestsPerMinute).toBeGreaterThan(0);
    expect(anthropicLimits?.requestsPerMinute).toBeGreaterThan(0);
    expect(openrouterLimits?.requestsPerMinute).toBeGreaterThan(0);
  });
});
