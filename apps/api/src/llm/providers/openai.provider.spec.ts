import { Test, TestingModule } from '@nestjs/testing';
import { OpenAIProvider } from './openai.provider';
import { getProviderConfig } from '../config/provider.config';
import { ChatCompletionRequest } from '../types/chat-completion.types';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
      models: {
        list: jest.fn(),
      },
    })),
  };
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockOpenAI: any;

  beforeEach(async () => {
    const config = getProviderConfig('openai');
    provider = new OpenAIProvider(config);
    
    // Get the mocked OpenAI instance
    mockOpenAI = (provider as any).client;
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should have correct name', () => {
    expect(provider.name).toBe('openai');
  });

  it('should have correct default model', () => {
    expect(provider.getDefaultModel()).toBe('gpt-3.5-turbo');
  });

  it('should have correct rate limits', () => {
    const rateLimits = provider.getRateLimits();
    expect(rateLimits.requestsPerMinute).toBe(3500);
    expect(rateLimits.tokensPerMinute).toBe(90000);
  });

  describe('validateApiKey', () => {
    it('should return true for valid API key', async () => {
      mockOpenAI.models.list.mockResolvedValue({ data: [] });
      
      const isValid = await provider.validateApiKey('valid-key');
      expect(isValid).toBe(true);
      expect(mockOpenAI.models.list).toHaveBeenCalled();
    });

    it('should return false for invalid API key', async () => {
      mockOpenAI.models.list.mockRejectedValue(new Error('Invalid API key'));
      
      const isValid = await provider.validateApiKey('invalid-key');
      expect(isValid).toBe(false);
    });
  });

  describe('getAvailableModels', () => {
    it('should return available models', async () => {
      const mockModels = {
        data: [
          { id: 'gpt-3.5-turbo' },
          { id: 'gpt-4' },
          { id: 'gpt-4-turbo' },
        ],
      };
      mockOpenAI.models.list.mockResolvedValue(mockModels);
      
      const models = await provider.getAvailableModels();
      expect(models).toEqual(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']);
    });

    it('should return default model on error', async () => {
      mockOpenAI.models.list.mockRejectedValue(new Error('API error'));
      
      const models = await provider.getAvailableModels();
      expect(models).toEqual(['gpt-3.5-turbo']);
    });
  });

  describe('isHealthy', () => {
    it('should return true when healthy', async () => {
      mockOpenAI.models.list.mockResolvedValue({ data: [] });
      
      const isHealthy = await provider.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it('should return false when unhealthy', async () => {
      mockOpenAI.models.list.mockRejectedValue(new Error('API error'));
      
      const isHealthy = await provider.isHealthy();
      expect(isHealthy).toBe(false);
    });
  });

  describe('streamChatCompletion', () => {
    it('should stream chat completion', async () => {
      const request: ChatCompletionRequest = {
        messages: [
          { role: 'user', content: 'Hello' },
        ],
        model: 'gpt-3.5-turbo',
        stream: true,
      };

      const mockStream = [
        {
          id: 'chatcmpl-123',
          object: 'chat.completion.chunk',
          created: 1677652288,
          model: 'gpt-3.5-turbo',
          choices: [
            {
              index: 0,
              delta: { content: 'Hello' },
              finish_reason: null,
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
              finish_reason: 'stop',
            },
          ],
        },
      ];

      mockOpenAI.chat.completions.create.mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockStream) {
            yield chunk;
          }
        },
      });

      const chunks = [];
      for await (const chunk of provider.streamChatCompletion(request)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].choices[0].delta.content).toBe('Hello');
      expect(chunks[1].choices[0].delta.content).toBe(' there!');
    });

    it('should validate request', async () => {
      const invalidRequest = {
        messages: [],
        model: 'gpt-3.5-turbo',
      } as ChatCompletionRequest;

      await expect(async () => {
        for await (const _ of provider.streamChatCompletion(invalidRequest)) {
          // This should not execute
        }
      }).rejects.toThrow('Messages array cannot be empty');
    });
  });

  describe('parseError', () => {
    it('should parse OpenAI error correctly', () => {
      const openaiError = {
        error: {
          type: 'invalid_request_error',
          message: 'Invalid request',
          code: 'invalid_request',
        },
      };

      const parsedError = provider.parseError(openaiError);
      expect(parsedError.type).toBe('invalid_request_error');
      expect(parsedError.message).toBe('Invalid request');
      expect(parsedError.code).toBe('invalid_request');
    });

    it('should handle network errors', () => {
      const networkError = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND api.openai.com',
      };

      const parsedError = provider.parseError(networkError);
      expect(parsedError.type).toBe('server_error');
      expect(parsedError.message).toBe('Unable to connect to OpenAI API');
      expect(parsedError.code).toBe('connection_error');
    });
  });
});
