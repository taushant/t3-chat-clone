import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
  Logger,
  Headers,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LLMRateLimitGuard, LLM_RATE_LIMIT } from '../guards/llm-rate-limit.guard';
import { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';
import { ProviderRegistryService } from '../services/provider-registry.service';
import { LLMRateLimitService } from '../services/rate-limit.service';
import { ConnectionPoolService } from '../services/connection-pool.service';
import { StreamingBufferService } from '../services/streaming-buffer.service';
import { StreamingStateService } from '../services/streaming-state.service';
import { 
  ChatCompletionRequestDto, 
  ChatCompletionChunkDto 
} from '../dto/chat-completion.dto';
import { ChatCompletionRequest } from '../types/chat-completion.types';
import { 
  StreamingConnection,
  ProcessedChunk,
  StreamingStatus,
} from '../types/streaming.types';

/**
 * Enhanced Streaming Controller
 * Provides optimized streaming with connection management and buffering
 */
@ApiTags('LLM Enhanced Streaming')
@Controller('llm/stream')
@UseGuards(JwtAuthGuard, LLMRateLimitGuard)
@ApiBearerAuth()
export class EnhancedStreamingController {
  private readonly logger = new Logger(EnhancedStreamingController.name);

  constructor(
    private readonly providerRegistry: ProviderRegistryService,
    private readonly rateLimitService: LLMRateLimitService,
    private readonly connectionPool: ConnectionPoolService,
    private readonly bufferService: StreamingBufferService,
    private readonly stateService: StreamingStateService,
  ) {}

  @Post('completion/optimized')
  @LLM_RATE_LIMIT()
  @ApiOperation({
    summary: 'Optimized streaming chat completion',
    description: 'Enhanced streaming chat completion with connection management and buffering',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Optimized streaming started',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'LLM provider error',
  })
  async optimizedStreamCompletion(
    @Body() request: ChatCompletionRequestDto,
    @Res() res: Response,
    @Request() req: AuthenticatedRequest,
    @Headers() headers: Record<string, string>,
  ): Promise<void> {
    let connection: StreamingConnection | null = null;
    let sessionId: string | null = null;

    try {
      this.logger.log(
        `Starting optimized streaming for user ${req.user.id}, model: ${request.model}`
      );

      // Create connection
      connection = this.connectionPool.createConnection(
        req.user.id,
        `req_${Date.now()}`,
        {
          userAgent: headers['user-agent'] || 'unknown',
          ipAddress: req.ip || 'unknown',
          model: request.model,
        }
      );

      // Create streaming session
      const session = this.stateService.createSession(
        req.user.id,
        connection.requestId,
        this.getProviderFromModel(request.model).name,
        request.model,
        {
          userAgent: headers['user-agent'] || 'unknown',
          ipAddress: req.ip || 'unknown',
        }
      );
      sessionId = session.id;

      // Set up Server-Sent Events headers
      this.setupSSEHeaders(res, connection.id);

      // Create buffer for this connection
      this.bufferService.createBuffer(connection.id);

      // Get the provider
      const provider = this.getProviderFromModel(request.model);
      
      // Convert DTO to internal request format
      const internalRequest: ChatCompletionRequest = {
        messages: request.messages,
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        stream: true,
        stop: request.stop,
        topP: request.topP,
        frequencyPenalty: request.frequencyPenalty,
        presencePenalty: request.presencePenalty,
      };

      // Update session status to active
      this.stateService.updateSessionStatus(sessionId, StreamingStatus.ACTIVE);

      // Stream the response with enhanced processing
      let totalTokens = 0;
      let chunkCount = 0;

      for await (const chunk of provider.streamChatCompletion(internalRequest)) {
        // Update connection activity
        this.connectionPool.updateConnectionActivity(connection.id);

        // Process chunk through buffer
        const processedChunk = this.bufferService.writeChunk(connection.id, chunk);
        
        // Update session with chunk info
        const tokenCount = chunk.usage?.totalTokens || 0;
        this.stateService.addChunkToSession(sessionId, processedChunk.metadata.contentLength, tokenCount);
        
        totalTokens += tokenCount;
        chunkCount++;

        // Send processed chunk as Server-Sent Event
        const chunkDto: ChatCompletionChunkDto = {
          id: chunk.id,
          object: chunk.object,
          created: chunk.created,
          model: chunk.model,
          choices: chunk.choices,
        };

        // Add metadata to the chunk
        const enhancedChunk = {
          ...chunkDto,
          metadata: {
            chunkIndex: chunkCount,
            totalTokens,
            connectionId: connection.id,
            sessionId,
            processingTime: processedChunk.metadata.processingTime,
          },
        };

        res.write(`data: ${JSON.stringify(enhancedChunk)}\n\n`);

        // Send heartbeat every 10 chunks
        if (chunkCount % 10 === 0) {
          res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
        }
      }

      // Record usage for rate limiting
      await this.rateLimitService.recordUsage(req.user.id, provider.name, totalTokens);

      // Complete the session
      this.stateService.completeSession(sessionId, true);

      // Send completion event
      res.write(`data: ${JSON.stringify({ 
        type: 'completion', 
        sessionId,
        totalChunks: chunkCount,
        totalTokens,
        connectionId: connection.id 
      })}\n\n`);
      
      res.write('data: [DONE]\n\n');
      res.end();

      this.logger.log(
        `Optimized streaming completed for user ${req.user.id}, ` +
        `chunks: ${chunkCount}, tokens: ${totalTokens}`
      );

    } catch (error) {
      this.logger.error(`Optimized streaming failed for user ${req.user.id}:`, error);
      
      // Update session status to error
      if (sessionId) {
        this.stateService.completeSession(sessionId, false);
      }

      // Send error as Server-Sent Event
      const errorResponse = {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionId: connection?.id,
        sessionId,
        timestamp: Date.now(),
      };

      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.end();
    } finally {
      // Cleanup
      if (connection) {
        this.connectionPool.closeConnection(connection.id, 'stream_completed');
        this.bufferService.removeBuffer(connection.id);
      }
    }
  }

  @Post('completion/buffered')
  @LLM_RATE_LIMIT()
  @ApiOperation({
    summary: 'Buffered streaming chat completion',
    description: 'Streaming with intelligent buffering for better performance',
  })
  async bufferedStreamCompletion(
    @Body() request: ChatCompletionRequestDto,
    @Res() res: Response,
    @Request() req: AuthenticatedRequest,
    @Headers() headers: Record<string, string>,
  ): Promise<void> {
    let connection: StreamingConnection | null = null;
    let sessionId: string | null = null;

    try {
      this.logger.log(
        `Starting buffered streaming for user ${req.user.id}, model: ${request.model}`
      );

      // Create connection
      connection = this.connectionPool.createConnection(
        req.user.id,
        `req_${Date.now()}`,
        {
          userAgent: headers['user-agent'] || 'unknown',
          ipAddress: req.ip || 'unknown',
          model: request.model,
          buffered: true,
        }
      );

      // Create streaming session
      const session = this.stateService.createSession(
        req.user.id,
        connection.requestId,
        this.getProviderFromModel(request.model).name,
        request.model,
        {
          userAgent: headers['user-agent'] || 'unknown',
          ipAddress: req.ip || 'unknown',
          buffered: true,
        }
      );
      sessionId = session.id;

      // Set up Server-Sent Events headers
      this.setupSSEHeaders(res, connection.id);

      // Create buffer with custom size for buffered streaming
      this.bufferService.createBuffer(connection.id, 2048); // 2KB buffer

      // Get the provider
      const provider = this.getProviderFromModel(request.model);
      
      // Convert DTO to internal request format
      const internalRequest: ChatCompletionRequest = {
        messages: request.messages,
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        stream: true,
        stop: request.stop,
        topP: request.topP,
        frequencyPenalty: request.frequencyPenalty,
        presencePenalty: request.presencePenalty,
      };

      // Update session status to active
      this.stateService.updateSessionStatus(sessionId, StreamingStatus.ACTIVE);

      // Stream the response with buffering
      let totalTokens = 0;
      let chunkCount = 0;

      for await (const chunk of provider.streamChatCompletion(internalRequest)) {
        // Update connection activity
        this.connectionPool.updateConnectionActivity(connection.id);

        // Process chunk through buffer
        const processedChunk = this.bufferService.writeChunk(connection.id, chunk);
        
        // Update session with chunk info
        const tokenCount = chunk.usage?.totalTokens || 0;
        this.stateService.addChunkToSession(sessionId, processedChunk.metadata.contentLength, tokenCount);
        
        totalTokens += tokenCount;
        chunkCount++;

        // Check if buffer should be flushed
        const bufferStatus = this.bufferService.getBufferStatus(connection.id);
        if (bufferStatus && bufferStatus.utilization > 80) {
          // Flush buffer and send all chunks at once
          const flushedChunks = this.bufferService.flushBuffer(connection.id);
          
          for (const flushedChunk of flushedChunks) {
            const chunkDto: ChatCompletionChunkDto = {
              id: flushedChunk.id,
              object: flushedChunk.object,
              created: flushedChunk.created,
              model: flushedChunk.model,
              choices: flushedChunk.choices,
            };

            res.write(`data: ${JSON.stringify(chunkDto)}\n\n`);
          }
        }
      }

      // Flush any remaining chunks
      const remainingChunks = this.bufferService.flushBuffer(connection.id);
      for (const chunk of remainingChunks) {
        const chunkDto: ChatCompletionChunkDto = {
          id: chunk.id,
          object: chunk.object,
          created: chunk.created,
          model: chunk.model,
          choices: chunk.choices,
        };

        res.write(`data: ${JSON.stringify(chunkDto)}\n\n`);
      }

      // Record usage for rate limiting
      await this.rateLimitService.recordUsage(req.user.id, provider.name, totalTokens);

      // Complete the session
      this.stateService.completeSession(sessionId, true);

      // Send completion event
      res.write(`data: ${JSON.stringify({ 
        type: 'completion', 
        sessionId,
        totalChunks: chunkCount,
        totalTokens,
        connectionId: connection.id,
        buffered: true 
      })}\n\n`);
      
      res.write('data: [DONE]\n\n');
      res.end();

      this.logger.log(
        `Buffered streaming completed for user ${req.user.id}, ` +
        `chunks: ${chunkCount}, tokens: ${totalTokens}`
      );

    } catch (error) {
      this.logger.error(`Buffered streaming failed for user ${req.user.id}:`, error);
      
      // Update session status to error
      if (sessionId) {
        this.stateService.completeSession(sessionId, false);
      }

      // Send error as Server-Sent Event
      const errorResponse = {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionId: connection?.id,
        sessionId,
        timestamp: Date.now(),
      };

      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.end();
    } finally {
      // Cleanup
      if (connection) {
        this.connectionPool.closeConnection(connection.id, 'buffered_stream_completed');
        this.bufferService.removeBuffer(connection.id);
      }
    }
  }

  /**
   * Set up Server-Sent Events headers
   * @param res - Response object
   * @param connectionId - Connection ID
   */
  private setupSSEHeaders(res: Response, connectionId: string): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.setHeader('X-Connection-ID', connectionId);
  }

  /**
   * Get provider from model name
   * @param model - Model name
   * @returns LLMProvider instance
   */
  private getProviderFromModel(model: string) {
    // Determine provider based on model name
    let providerName: string;
    
    if (model.includes('gpt') || model.includes('openai')) {
      providerName = 'openai';
    } else if (model.includes('claude') || model.includes('anthropic')) {
      providerName = 'anthropic';
    } else if (model.includes('/')) {
      // OpenRouter models have format "provider/model"
      providerName = 'openrouter';
    } else {
      // Default to OpenAI for unknown models
      providerName = 'openai';
    }

    try {
      return this.providerRegistry.getProvider(providerName);
    } catch (error) {
      throw new HttpException(
        `Provider ${providerName} not available`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}

