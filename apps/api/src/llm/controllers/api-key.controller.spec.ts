import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiKeyController } from './api-key.controller';
import { ProviderRegistryService } from '../services/provider-registry.service';
import { CreateApiKeyDto, ValidateApiKeyDto } from '../dto/api-key.dto';
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

describe('ApiKeyController', () => {
  let controller: ApiKeyController;
  let providerRegistry: jest.Mocked<ProviderRegistryService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeyController],
      providers: [
        {
          provide: ProviderRegistryService,
          useValue: mockProviderRegistry,
        },
      ],
    }).compile();

    controller = module.get<ApiKeyController>(ApiKeyController);
    providerRegistry = module.get(ProviderRegistryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createApiKey', () => {
    const mockRequest: CreateApiKeyDto = {
      name: 'My OpenAI Key',
      provider: 'openai',
      key: 'sk-1234567890abcdef',
      isActive: true,
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

    it('should create API key successfully', async () => {
      providerRegistry.validateApiKey.mockResolvedValue(true);

      const result = await controller.createApiKey(mockRequest, mockReq);

      expect(result).toBeDefined();
      expect(result.name).toBe('My OpenAI Key');
      expect(result.provider).toBe('openai');
      expect(result.isActive).toBe(true);
      expect(result.id).toMatch(/^ak_/);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.usageCount).toBe(0);

      expect(providerRegistry.validateApiKey).toHaveBeenCalledWith('openai', 'sk-1234567890abcdef');
    });

    it('should reject invalid API key', async () => {
      providerRegistry.validateApiKey.mockResolvedValue(false);

      await expect(controller.createApiKey(mockRequest, mockReq))
        .rejects
        .toThrow(HttpException);

      expect(providerRegistry.validateApiKey).toHaveBeenCalledWith('openai', 'sk-1234567890abcdef');
    });

    it('should handle validation error', async () => {
      providerRegistry.validateApiKey.mockRejectedValue(new Error('Validation error'));

      await expect(controller.createApiKey(mockRequest, mockReq))
        .rejects
        .toThrow(HttpException);
    });
  });

  describe('getUserApiKeys', () => {
    const mockUser: AuthenticatedRequest['user'] = {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'USER',
    };

    const mockReq: AuthenticatedRequest = {
      user: mockUser,
    } as AuthenticatedRequest;

    it('should return user API keys', async () => {
      const result = await controller.getUserApiKeys(mockReq);

      expect(result).toBeDefined();
      expect(result.apiKeys).toBeDefined();
      expect(result.total).toBe(0);
    });
  });

  describe('deleteApiKey', () => {
    const mockUser: AuthenticatedRequest['user'] = {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'USER',
    };

    const mockReq: AuthenticatedRequest = {
      user: mockUser,
    } as AuthenticatedRequest;

    it('should delete API key successfully', async () => {
      const result = await controller.deleteApiKey('ak-123', mockReq);

      expect(result).toBeUndefined(); // No return value for delete
    });
  });

  describe('validateApiKey', () => {
    const mockRequest: ValidateApiKeyDto = {
      provider: 'openai',
      key: 'sk-1234567890abcdef',
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

    it('should validate API key successfully', async () => {
      providerRegistry.validateApiKey.mockResolvedValue(true);

      const result = await controller.validateApiKey(mockRequest, mockReq);

      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.providerInfo).toBeDefined();
      expect(result.providerInfo?.provider).toBe('openai');

      expect(providerRegistry.validateApiKey).toHaveBeenCalledWith('openai', 'sk-1234567890abcdef');
    });

    it('should return invalid for bad API key', async () => {
      providerRegistry.validateApiKey.mockResolvedValue(false);

      const result = await controller.validateApiKey(mockRequest, mockReq);

      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid API key');
      expect(result.providerInfo).toBeUndefined();
    });

    it('should handle validation error gracefully', async () => {
      providerRegistry.validateApiKey.mockRejectedValue(new Error('Network error'));

      const result = await controller.validateApiKey(mockRequest, mockReq);

      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return available providers', async () => {
      providerRegistry.listProviders.mockReturnValue(['openai', 'anthropic', 'openrouter']);
      providerRegistry.getDefaultModels.mockReturnValue(new Map([
        ['openai', 'gpt-3.5-turbo'],
        ['anthropic', 'claude-3-sonnet-20240229'],
        ['openrouter', 'openai/gpt-3.5-turbo'],
      ]));

      const result = await controller.getAvailableProviders();

      expect(result).toBeDefined();
      expect(result.providers).toEqual(['openai', 'anthropic', 'openrouter']);
      expect(result.defaultModels).toEqual({
        openai: 'gpt-3.5-turbo',
        anthropic: 'claude-3-sonnet-20240229',
        openrouter: 'openai/gpt-3.5-turbo',
      });
    });

    it('should handle error when getting providers', async () => {
      providerRegistry.listProviders.mockImplementation(() => {
        throw new Error('Provider error');
      });

      await expect(controller.getAvailableProviders())
        .rejects
        .toThrow(HttpException);
    });
  });

  describe('getAvailableModels', () => {
    it('should return available models', async () => {
      const mockModels = new Map([
        ['openai', ['gpt-3.5-turbo', 'gpt-4']],
        ['anthropic', ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307']],
        ['openrouter', ['openai/gpt-3.5-turbo', 'anthropic/claude-3-sonnet-20240229']],
      ]);

      providerRegistry.getAvailableModels.mockResolvedValue(mockModels);

      const result = await controller.getAvailableModels();

      expect(result).toBeDefined();
      expect(result.models).toEqual({
        openai: ['gpt-3.5-turbo', 'gpt-4'],
        anthropic: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        openrouter: ['openai/gpt-3.5-turbo', 'anthropic/claude-3-sonnet-20240229'],
      });
    });

    it('should handle error when getting models', async () => {
      providerRegistry.getAvailableModels.mockRejectedValue(new Error('Models error'));

      await expect(controller.getAvailableModels())
        .rejects
        .toThrow(HttpException);
    });
  });
});
