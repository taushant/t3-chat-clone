import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatCompletionController } from './chat-completion.controller';
import { ProviderRegistryService } from '../services/provider-registry.service';
import { LLMRateLimitService } from '../services/rate-limit.service';
import { ChatCompletionRequestDto } from '../dto/chat-completion.dto';
import { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';

// Mock the provider registry service
const mockProviderRegistry = {
  getProvider: jest.fn(),
  listProviders: jest.fn(),
  getAllProviders: jest.fn(),
  hasProvider: jest.fn(),
  unregisterProvider: jest.fn(),
  getAvailableModels: jest.fn(),
  getDefaultModels: jest.fn(),
  checkProviderHealth: jest.fn(),
  checkAllProvidersHealth: jest.fn(),
  getProvidersHealth: jest.fn(),
  getHealthyProviders: jest.fn(),
  getProviderStats: jest.fn(),
  validateApiKey: jest.fn(),
  getProviderRateLimits: jest.fn(),
};

// Mock the rate limit service
const mockRateLimitService = {
  checkRateLimit: jest.fn(),
  recordUsage: jest.fn(),
  getUsageStats: jest.fn(),
  getProviderRateLimits: jest.fn(),
  updateRateLimitRule: jest.fn(),
  clearUsageRecords: jest.fn(),
  getCurrentUsage: jest.fn(),
  getAllRateLimitRules: jest.fn(),
  cleanupOldRecords: jest.fn(),
};

// Mock LLM provider
const mockProvider = {
  name: 'openai',
  streamChatCompletion: jest.fn(),
  validateApiKey: jest.fn(),
  getRateLimits: jest.fn(),
  getAvailableModels: jest.fn(),
  getDefaultModel: jest.fn(),
  isHealthy: jest.fn(),
  parseError: jest.fn(),
};

describe('ChatCompletionController', () => {
  let controller: ChatCompletionController;
  let providerRegistry: jest.Mocked<ProviderRegistryService>;
  let rateLimitService: jest.Mocked<LLMRateLimitService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatCompletionController],
      providers: [
        {
          provide: ProviderRegistryService,
          useValue: mockProviderRegistry,
        },
        {
          provide: LLMRateLimitService,
          useValue: mockRateLimitService,
        },
      ],
    }).compile();

    controller = module.get<ChatCompletionController>(ChatCompletionController);
    providerRegistry = module.get(ProviderRegistryService);
    rateLimitService = module.get(LLMRateLimitService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCompletion', () => {
    const mockRequest: ChatCompletionRequestDto = {
      messages: [
        { role: 'user' as any, content: 'Hello, how are you?' },
      ],
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
    };

    const mockUser: AuthenticatedRequest['user'] = {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'USER',
    };

    const mockReq: AuthenticatedRequest = {
      user: mockUser,
    } as AuthenticatedRequest;

    it('should create chat completion successfully', async () => {
      // Mock provider
      const mockChunks = [
        {
          id: 'chatcmpl-123',
          object: 'chat.completion.chunk',
          created: 1677652288,
          model: 'gpt-3.5-turbo',
          choices: [
            {
              index: 0,
              delta: { content: 'Hello! I am doing well, thank you for asking.' },
              finishReason: 'stop',
            },
          ],
          usage: {
            promptTokens: 10,
            completionTokens: 20,
            totalTokens: 30,
          },
        },
      ];

      mockProvider.streamChatCompletion.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockChunks) {
            yield chunk;
          }
        },
      });

      providerRegistry.getProvider.mockReturnValue(mockProvider as any);
      rateLimitService.recordUsage.mockResolvedValue();

      const result = await controller.createCompletion(mockRequest, mockReq);

      expect(result).toBeDefined();
      expect(result.id).toBe('chatcmpl-123');
      expect(result.model).toBe('gpt-3.5-turbo');
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].message.content).toBe('Hello! I am doing well, thank you for asking.');
      expect(result.usage.totalTokens).toBe(30);

      expect(providerRegistry.getProvider).toHaveBeenCalledWith('openai');
      expect(rateLimitService.recordUsage).toHaveBeenCalledWith('user-123', 'openai', 30);
    });

    it('should handle provider not found error', async () => {
      providerRegistry.getProvider.mockImplementation(() => {
        throw new Error('Provider openai not found');
      });

      await expect(controller.createCompletion(mockRequest, mockReq))
        .rejects
        .toThrow(HttpException);
    });

    it('should handle streaming error', async () => {
      mockProvider.streamChatCompletion.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          throw new Error('Streaming error');
        },
      });

      providerRegistry.getProvider.mockReturnValue(mockProvider as any);

      await expect(controller.createCompletion(mockRequest, mockReq))
        .rejects
        .toThrow(HttpException);
    });

    it('should handle empty response', async () => {
      mockProvider.streamChatCompletion.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          // No chunks
        },
      });

      providerRegistry.getProvider.mockReturnValue(mockProvider as any);

      await expect(controller.createCompletion(mockRequest, mockReq))
        .rejects
        .toThrow(HttpException);
    });
  });

  describe('streamCompletion', () => {
    const mockRequest: ChatCompletionRequestDto = {
      messages: [
        { role: 'user' as any, content: 'Hello, how are you?' },
      ],
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
    };

    const mockUser: AuthenticatedRequest['user'] = {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'USER',
    };

    const mockReq: AuthenticatedRequest = {
      user: mockUser,
    } as AuthenticatedRequest;

    it('should stream chat completion successfully', async () => {
      const mockChunks = [
        {
          id: 'chatcmpl-123',
          object: 'chat.completion.chunk',
          created: 1677652288,
          model: 'gpt-3.5-turbo',
          choices: [
            {
              index: 0,
              delta: { content: 'Hello' },
              finishReason: null,
            },
          ],
        },
        {
          id: 'chatcmpl-123',
          object: 'chat.completion.chunk',
          created: 1677652288,
          model: 'gpt-3.5-turbo',
          choices: [
            {
              index: 0,
              delta: { content: ' there!' },
              finishReason: 'stop',
            },
          ],
        },
      ];

      mockProvider.streamChatCompletion.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockChunks) {
            yield chunk;
          }
        },
      });

      providerRegistry.getProvider.mockReturnValue(mockProvider as any);

      // Mock response object
      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      await controller.streamCompletion(mockRequest, mockRes, mockReq);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockRes.write).toHaveBeenCalledTimes(3); // 2 chunks + [DONE]
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should handle streaming error', async () => {
      mockProvider.streamChatCompletion.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          throw new Error('Streaming error');
        },
      });

      providerRegistry.getProvider.mockReturnValue(mockProvider as any);

      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      await controller.streamCompletion(mockRequest, mockRes, mockReq);

      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('"error":"Streaming error"')
      );
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe('getProviderFromModel', () => {
    it('should extract OpenAI provider from GPT model', () => {
      const provider = (controller as any).getProviderFromModel('gpt-3.5-turbo');
      expect(provider.name).toBe('openai');
    });

    it('should extract Anthropic provider from Claude model', () => {
      const provider = (controller as any).getProviderFromModel('claude-3-sonnet-20240229');
      expect(provider.name).toBe('anthropic');
    });

    it('should extract OpenRouter provider from model with slash', () => {
      const provider = (controller as any).getProviderFromModel('openai/gpt-3.5-turbo');
      expect(provider.name).toBe('openrouter');
    });

    it('should default to OpenAI for unknown models', () => {
      const provider = (controller as any).getProviderFromModel('unknown-model');
      expect(provider.name).toBe('openai');
    });
  });
});
