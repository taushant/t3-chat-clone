import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';
import { ResponseProcessorService } from '../services/response-processor.service';
import { ResponseEnhancerService } from '../services/response-enhancer.service';
import { ResponseCacheService } from '../services/response-cache.service';
import { 
  ProcessedResponse,
  ProcessedChunk,
  ResponseProcessor,
  ResponseEnhancer,
  CacheStats,
} from '../types/response-processing.types';
import { ChatCompletionChunk } from '../types/chat-completion.types';

/**
 * Response Processing Controller
 * Provides API endpoints for response processing, enhancement, and caching
 */
@ApiTags('LLM Response Processing')
@Controller('llm/response-processing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResponseProcessingController {
  private readonly logger = new Logger(ResponseProcessingController.name);

  constructor(
    private readonly responseProcessor: ResponseProcessorService,
    private readonly responseEnhancer: ResponseEnhancerService,
    private readonly responseCache: ResponseCacheService,
  ) {}

  @Post('process')
  @ApiOperation({
    summary: 'Process LLM response',
    description: 'Process a complete LLM response with quality analysis and enhancements',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Response processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid response data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async processResponse(
    @Body() body: { response: any; cacheKey?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Processing response for user ${req.user.id}`);

      const { response, cacheKey } = body;

      if (!response || !response.choices || response.choices.length === 0) {
        throw new HttpException('Invalid response data', HttpStatus.BAD_REQUEST);
      }

      // Check cache first if cache key provided
      if (cacheKey) {
        const cachedResponse = this.responseCache.getCachedResponse(cacheKey);
        if (cachedResponse) {
          this.logger.debug(`Cache hit for key: ${cacheKey}`);
          return {
            success: true,
            data: cachedResponse,
            metadata: {
              userId: req.user.id,
              processedAt: new Date().toISOString(),
              cached: true,
              cacheKey,
            },
          };
        }
      }

      // Process the response
      const processedResponse = await this.responseProcessor.processResponse(response);

      // Add user metadata
      (processedResponse.metadata as any).userId = req.user.id;

      // Cache the processed response if cache key provided
      if (cacheKey) {
        this.responseCache.cacheResponse(cacheKey, processedResponse);
        this.logger.debug(`Cached response with key: ${cacheKey}`);
      }

      return {
        success: true,
        data: processedResponse,
        metadata: {
          userId: req.user.id,
          processedAt: new Date().toISOString(),
          cached: false,
          cacheKey,
        },
      };
    } catch (error) {
      this.logger.error(`Response processing failed for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Response processing failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('process-chunk')
  @ApiOperation({
    summary: 'Process streaming chunk',
    description: 'Process a streaming chat completion chunk',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chunk processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid chunk data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async processStreamingResponse(
    @Body() body: { chunk: ChatCompletionChunk; chunkIndex?: number; isFirstChunk?: boolean },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Processing streaming chunk for user ${req.user.id}`);

      const { chunk, chunkIndex = 0, isFirstChunk = false } = body;

      if (!chunk || !chunk.choices || chunk.choices.length === 0) {
        throw new HttpException('Invalid chunk data', HttpStatus.BAD_REQUEST);
      }

      // Process the chunk
      const processedChunk = await this.responseProcessor.processStreamingResponse(chunk);

      // Update chunk metadata
      processedChunk.metadata.chunkIndex = chunkIndex;
      processedChunk.metadata.isFirstChunk = isFirstChunk;

      return {
        success: true,
        data: processedChunk,
        metadata: {
          userId: req.user.id,
          processedAt: new Date().toISOString(),
          chunkIndex,
          isFirstChunk,
        },
      };
    } catch (error) {
      this.logger.error(`Chunk processing failed for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Chunk processing failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('enhance')
  @ApiOperation({
    summary: 'Enhance processed response',
    description: 'Enhance a processed response with additional metadata and features',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Response enhanced successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid response data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async enhanceResponse(
    @Body() body: { response: ProcessedResponse; optimizeForDisplay?: boolean },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Enhancing response for user ${req.user.id}`);

      const { response, optimizeForDisplay = false } = body;

      if (!response || !response.id) {
        throw new HttpException('Invalid response data', HttpStatus.BAD_REQUEST);
      }

      // Enhance the response
      let enhancedResponse = await this.responseEnhancer.enhanceResponse(response);

      // Optimize for display if requested
      if (optimizeForDisplay) {
        enhancedResponse = await this.responseEnhancer.optimizeForDisplay(enhancedResponse);
      }

      return {
        success: true,
        data: enhancedResponse,
        metadata: {
          userId: req.user.id,
          enhancedAt: new Date().toISOString(),
          optimizedForDisplay: optimizeForDisplay,
        },
      };
    } catch (error) {
      this.logger.error(`Response enhancement failed for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Response enhancement failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('enhance-chunk')
  @ApiOperation({
    summary: 'Enhance processed chunk',
    description: 'Enhance a processed chunk with additional metadata and features',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chunk enhanced successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid chunk data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async enhanceChunk(
    @Body() body: { chunk: ProcessedChunk },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Enhancing chunk for user ${req.user.id}`);

      const { chunk } = body;

      if (!chunk || !chunk.id) {
        throw new HttpException('Invalid chunk data', HttpStatus.BAD_REQUEST);
      }

      // Enhance the chunk
      const enhancedChunk = await this.responseEnhancer.enhanceChunk(chunk);

      return {
        success: true,
        data: enhancedChunk,
        metadata: {
          userId: req.user.id,
          enhancedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Chunk enhancement failed for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Chunk enhancement failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('validate')
  @ApiOperation({
    summary: 'Validate processed response',
    description: 'Validate a processed response for quality and completeness',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Response validation completed',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid response data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async validateResponse(
    @Body() body: { response: ProcessedResponse },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Validating response for user ${req.user.id}`);

      const { response } = body;

      if (!response || !response.id) {
        throw new HttpException('Invalid response data', HttpStatus.BAD_REQUEST);
      }

      // Validate the response
      const validation = this.responseProcessor.validateResponse(response);

      return {
        success: true,
        data: validation,
        metadata: {
          userId: req.user.id,
          validatedAt: new Date().toISOString(),
          responseId: response.id,
        },
      };
    } catch (error) {
      this.logger.error(`Response validation failed for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Response validation failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get processing statistics',
    description: 'Get statistics about response processing and enhancement',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getProcessingStats(@Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`Getting processing stats for user ${req.user.id}`);

      const processingStats = this.responseProcessor.getProcessingStats();
      const cacheStats = this.responseCache.getCacheStats();

      return {
        success: true,
        data: {
          processing: processingStats,
          cache: cacheStats,
        },
        metadata: {
          userId: req.user.id,
          retrievedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get processing stats for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to get processing stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('processors')
  @ApiOperation({
    summary: 'Get response processors',
    description: 'Get list of available response processors',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Processors retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getProcessors(@Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`Getting processors for user ${req.user.id}`);

      const processors = this.responseProcessor.getProcessors();

      return {
        success: true,
        data: processors,
        metadata: {
          userId: req.user.id,
          retrievedAt: new Date().toISOString(),
          processorCount: processors.length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get processors for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to get processors',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('enhancers')
  @ApiOperation({
    summary: 'Get response enhancers',
    description: 'Get list of available response enhancers',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enhancers retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getEnhancers(@Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`Getting enhancers for user ${req.user.id}`);

      const enhancers = this.responseEnhancer.getEnhancers();

      return {
        success: true,
        data: enhancers,
        metadata: {
          userId: req.user.id,
          retrievedAt: new Date().toISOString(),
          enhancerCount: enhancers.length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get enhancers for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to get enhancers',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('cache')
  @ApiOperation({
    summary: 'Get cache information',
    description: 'Get information about cached responses',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'provider', required: false, description: 'Filter by provider' })
  @ApiQuery({ name: 'model', required: false, description: 'Filter by model' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache information retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async getCacheInfo(
    @Request() req: AuthenticatedRequest,
    @Query('userId') userId?: string,
    @Query('provider') provider?: string,
    @Query('model') model?: string,
  ) {
    try {
      this.logger.log(`Getting cache info for user ${req.user.id}`);

      const cacheStats = this.responseCache.getCacheStats();
      let cacheEntries: any[] = [];

      if (userId) {
        cacheEntries = this.responseCache.getCacheEntriesByUser(userId);
      } else if (provider) {
        cacheEntries = this.responseCache.getCacheEntriesByProvider(provider);
      } else if (model) {
        cacheEntries = this.responseCache.getCacheEntriesByModel(model);
      } else {
        // Get all cache keys
        const keys = this.responseCache.getAllCacheKeys();
        cacheEntries = keys.map(key => ({
          key,
          metadata: this.responseCache.getCacheMetadata(key),
        }));
      }

      return {
        success: true,
        data: {
          stats: cacheStats,
          entries: cacheEntries,
        },
        metadata: {
          userId: req.user.id,
          retrievedAt: new Date().toISOString(),
          filter: { userId, provider, model },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get cache info for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to get cache info',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cache/invalidate')
  @ApiOperation({
    summary: 'Invalidate cache',
    description: 'Invalidate cache entries by key, pattern, or user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache invalidated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid invalidation parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async invalidateCache(
    @Body() body: { 
      key?: string; 
      pattern?: string; 
      userId?: string; 
      clearAll?: boolean;
    },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      this.logger.log(`Invalidating cache for user ${req.user.id}`);

      const { key, pattern, userId, clearAll } = body;

      if (clearAll) {
        this.responseCache.clearAllCache();
        this.logger.log('Cleared all cache entries');
      } else if (key) {
        this.responseCache.invalidateCache(key);
        this.logger.log(`Invalidated cache entry: ${key}`);
      } else if (pattern) {
        this.responseCache.invalidateCacheByPattern(pattern);
        this.logger.log(`Invalidated cache entries by pattern: ${pattern}`);
      } else if (userId) {
        this.responseCache.invalidateUserCache(userId);
        this.logger.log(`Invalidated cache entries for user: ${userId}`);
      } else {
        throw new HttpException('Invalid invalidation parameters', HttpStatus.BAD_REQUEST);
      }

      return {
        success: true,
        data: {
          invalidated: true,
          type: clearAll ? 'all' : key ? 'key' : pattern ? 'pattern' : 'user',
          value: clearAll ? null : key || pattern || userId,
        },
        metadata: {
          userId: req.user.id,
          invalidatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Cache invalidation failed for user ${req.user.id}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error instanceof Error ? error.message : 'Cache invalidation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cache/cleanup')
  @ApiOperation({
    summary: 'Clean up expired cache',
    description: 'Manually trigger cleanup of expired cache entries',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache cleanup completed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  async cleanupCache(@Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`Cleaning up cache for user ${req.user.id}`);

      this.responseCache.cleanupExpiredCache();

      return {
        success: true,
        data: {
          cleaned: true,
        },
        metadata: {
          userId: req.user.id,
          cleanedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Cache cleanup failed for user ${req.user.id}:`, error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Cache cleanup failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
