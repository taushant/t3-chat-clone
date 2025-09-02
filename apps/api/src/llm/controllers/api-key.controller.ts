import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';
import { ProviderRegistryService } from '../services/provider-registry.service';
import { 
  CreateApiKeyDto,
  ApiKeyResponseDto,
  ApiKeyListResponseDto,
  ValidateApiKeyDto,
  ValidateApiKeyResponseDto,
} from '../dto/api-key.dto';

/**
 * API Key Management Controller
 * Handles LLM provider API key management for users
 */
@ApiTags('LLM API Keys')
@Controller('llm/api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeyController {
  private readonly logger = new Logger(ApiKeyController.name);

  constructor(
    private readonly providerRegistry: ProviderRegistryService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create API key',
    description: 'Create a new API key for an LLM provider',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'API key created successfully',
    type: ApiKeyResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async createApiKey(
    @Body() request: CreateApiKeyDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiKeyResponseDto> {
    try {
      this.logger.log(`Creating API key for user ${req.user.id} and provider ${request.provider}`);

      // Validate the API key with the provider
      const isValid = await this.providerRegistry.validateApiKey(request.provider, request.key);
      if (!isValid) {
        throw new HttpException(
          'Invalid API key for the specified provider',
          HttpStatus.BAD_REQUEST,
        );
      }

      // TODO: Store the API key in the database
      // For now, we'll return a mock response
      const apiKey: ApiKeyResponseDto = {
        id: `ak_${Date.now()}`,
        name: request.name,
        provider: request.provider,
        isActive: request.isActive ?? true,
        expiresAt: request.expiresAt ? new Date(request.expiresAt) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
      };

      this.logger.log(`API key created successfully for user ${req.user.id}`);
      return apiKey;

    } catch (error) {
      this.logger.error(`Failed to create API key for user ${req.user.id}:`, error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to create API key',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Get user API keys',
    description: 'Get all API keys for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API keys retrieved successfully',
    type: ApiKeyListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getUserApiKeys(
    @Request() req: AuthenticatedRequest,
  ): Promise<ApiKeyListResponseDto> {
    try {
      this.logger.log(`Getting API keys for user ${req.user.id}`);

      // TODO: Retrieve API keys from database
      // For now, we'll return a mock response
      const apiKeys: ApiKeyResponseDto[] = [];

      const response: ApiKeyListResponseDto = {
        apiKeys,
        total: apiKeys.length,
      };

      this.logger.log(`Retrieved ${apiKeys.length} API keys for user ${req.user.id}`);
      return response;

    } catch (error) {
      this.logger.error(`Failed to get API keys for user ${req.user.id}:`, error);
      throw new HttpException(
        'Failed to retrieve API keys',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete API key',
    description: 'Delete an API key by ID',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'API key deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'API key not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async deleteApiKey(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    try {
      this.logger.log(`Deleting API key ${id} for user ${req.user.id}`);

      // TODO: Delete API key from database
      // For now, we'll just log the action

      this.logger.log(`API key ${id} deleted successfully for user ${req.user.id}`);

    } catch (error) {
      this.logger.error(`Failed to delete API key ${id} for user ${req.user.id}:`, error);
      throw new HttpException(
        'Failed to delete API key',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('validate')
  @ApiOperation({
    summary: 'Validate API key',
    description: 'Validate an API key for a specific provider',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API key validation completed',
    type: ValidateApiKeyResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async validateApiKey(
    @Body() request: ValidateApiKeyDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ValidateApiKeyResponseDto> {
    try {
      this.logger.log(`Validating API key for user ${req.user.id} and provider ${request.provider}`);

      const isValid = await this.providerRegistry.validateApiKey(request.provider, request.key);
      
      const response: ValidateApiKeyResponseDto = {
        isValid,
        error: isValid ? undefined : 'Invalid API key',
        providerInfo: isValid ? {
          provider: request.provider,
          validatedAt: new Date().toISOString(),
        } : undefined,
      };

      this.logger.log(`API key validation completed for user ${req.user.id}: ${isValid ? 'valid' : 'invalid'}`);
      return response;

    } catch (error) {
      this.logger.error(`Failed to validate API key for user ${req.user.id}:`, error);
      
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  @Get('providers')
  @ApiOperation({
    summary: 'Get available providers',
    description: 'Get list of available LLM providers',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Providers retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getAvailableProviders(): Promise<{
    providers: string[];
    defaultModels: Record<string, string>;
  }> {
    try {
      this.logger.log('Getting available providers');

      const providers = this.providerRegistry.listProviders();
      const defaultModels = this.providerRegistry.getDefaultModels();
      
      const defaultModelsObj: Record<string, string> = {};
      for (const [provider, model] of defaultModels) {
        defaultModelsObj[provider] = model;
      }

      this.logger.log(`Retrieved ${providers.length} available providers`);
      return {
        providers,
        defaultModels: defaultModelsObj,
      };

    } catch (error) {
      this.logger.error('Failed to get available providers:', error);
      throw new HttpException(
        'Failed to retrieve providers',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('models')
  @ApiOperation({
    summary: 'Get available models',
    description: 'Get list of available models from all providers',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Models retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getAvailableModels(): Promise<{
    models: Record<string, string[]>;
  }> {
    try {
      this.logger.log('Getting available models');

      const models = await this.providerRegistry.getAvailableModels();
      
      const modelsObj: Record<string, string[]> = {};
      for (const [provider, modelList] of models) {
        modelsObj[provider] = modelList;
      }

      this.logger.log(`Retrieved models for ${Object.keys(modelsObj).length} providers`);
      return {
        models: modelsObj,
      };

    } catch (error) {
      this.logger.error('Failed to get available models:', error);
      throw new HttpException(
        'Failed to retrieve models',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
