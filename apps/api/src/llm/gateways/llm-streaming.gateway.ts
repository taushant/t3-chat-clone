import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtAuthGuard } from '../../websocket/guards/ws-jwt-auth.guard';
import { ProviderRegistryService } from '../services/provider-registry.service';
import { LLMRateLimitService } from '../services/rate-limit.service';
import { ConnectionPoolService } from '../services/connection-pool.service';
import { StreamingBufferService } from '../services/streaming-buffer.service';
import { StreamingStateService } from '../services/streaming-state.service';
import { ChatCompletionRequest } from '../types/chat-completion.types';
import { 
  StreamingConnection,
  StreamingStatus,
  StreamingEventType,
} from '../types/streaming.types';

/**
 * WebSocket Streaming Gateway
 * Provides real-time LLM streaming via WebSocket connections
 */
@WebSocketGateway({ 
  namespace: '/llm',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
@UseGuards(WsJwtAuthGuard)
export class LLMStreamingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(LLMStreamingGateway.name);
  private readonly activeStreams = new Map<string, {
    connection: StreamingConnection;
    sessionId: string;
    provider: any;
    request: ChatCompletionRequest;
  }>();

  constructor(
    private readonly providerRegistry: ProviderRegistryService,
    private readonly rateLimitService: LLMRateLimitService,
    private readonly connectionPool: ConnectionPoolService,
    private readonly bufferService: StreamingBufferService,
    private readonly stateService: StreamingStateService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('LLM Streaming Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Clean up any active streams for this client
    const streamInfo = this.activeStreams.get(client.id);
    if (streamInfo) {
      this.cleanupStream(client.id, streamInfo);
    }
  }

  @SubscribeMessage('llm:stream-completion')
  async handleStreamCompletion(
    @MessageBody() data: {
      messages: any[];
      model: string;
      temperature?: number;
      maxTokens?: number;
      stop?: string[];
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    let connection: StreamingConnection | null = null;
    let sessionId: string | null = null;

    try {
      // Extract user from JWT token (assuming it's attached to the socket)
      const user = (client as any).user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      this.logger.log(
        `Starting WebSocket streaming for user ${user.id}, model: ${data.model}`
      );

      // Create connection
      connection = this.connectionPool.createConnection(
        user.id,
        `ws_${client.id}_${Date.now()}`,
        {
          clientId: client.id,
          userAgent: client.handshake.headers['user-agent'] || 'unknown',
          ipAddress: client.handshake.address || 'unknown',
          model: data.model,
          websocket: true,
        }
      );

      // Create streaming session
      const session = this.stateService.createSession(
        user.id,
        connection.requestId,
        this.getProviderFromModel(data.model).name,
        data.model,
        {
          clientId: client.id,
          userAgent: client.handshake.headers['user-agent'] || 'unknown',
          ipAddress: client.handshake.address || 'unknown',
          websocket: true,
        }
      );
      sessionId = session.id;

      // Create buffer for this connection
      this.bufferService.createBuffer(connection.id);

      // Get the provider
      const provider = this.getProviderFromModel(data.model);
      
      // Convert to internal request format
      const request: ChatCompletionRequest = {
        messages: data.messages,
        model: data.model,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        stream: true,
        stop: data.stop,
        topP: data.topP,
        frequencyPenalty: data.frequencyPenalty,
        presencePenalty: data.presencePenalty,
      };

      // Store stream info
      this.activeStreams.set(client.id, {
        connection,
        sessionId,
        provider,
        request,
      });

      // Update session status to active
      this.stateService.updateSessionStatus(sessionId, StreamingStatus.ACTIVE);

      // Send initial response
      client.emit('llm:stream-started', {
        sessionId,
        connectionId: connection.id,
        model: data.model,
        timestamp: Date.now(),
      });

      // Stream the response
      let totalTokens = 0;
      let chunkCount = 0;

      for await (const chunk of provider.streamChatCompletion(request)) {
        // Update connection activity
        this.connectionPool.updateConnectionActivity(connection.id);

        // Process chunk through buffer
        const processedChunk = this.bufferService.writeChunk(connection.id, chunk);
        
        // Update session with chunk info
        const tokenCount = chunk.usage?.totalTokens || 0;
        this.stateService.addChunkToSession(sessionId, processedChunk.metadata.contentLength, tokenCount);
        
        totalTokens += tokenCount;
        chunkCount++;

        // Send chunk to client
        client.emit('llm:chunk', {
          id: chunk.id,
          object: chunk.object,
          created: chunk.created,
          model: chunk.model,
          choices: chunk.choices,
          metadata: {
            chunkIndex: chunkCount,
            totalTokens,
            connectionId: connection.id,
            sessionId,
            processingTime: processedChunk.metadata.processingTime,
          },
        });

        // Send progress update every 5 chunks
        if (chunkCount % 5 === 0) {
          const sessionState = this.stateService.getSessionState(sessionId);
          client.emit('llm:progress', {
            sessionId,
            progress: sessionState?.progress || 0,
            currentChunk: chunkCount,
            totalTokens,
            estimatedTimeRemaining: sessionState?.estimatedTimeRemaining,
          });
        }
      }

      // Record usage for rate limiting
      await this.rateLimitService.recordUsage(user.id, provider.name, totalTokens);

      // Complete the session
      this.stateService.completeSession(sessionId, true);

      // Send completion event
      client.emit('llm:stream-completed', {
        sessionId,
        connectionId: connection.id,
        totalChunks: chunkCount,
        totalTokens,
        timestamp: Date.now(),
      });

      this.logger.log(
        `WebSocket streaming completed for user ${user.id}, ` +
        `chunks: ${chunkCount}, tokens: ${totalTokens}`
      );

    } catch (error) {
      this.logger.error(`WebSocket streaming failed for user ${(client as any).user?.id}:`, error);
      
      // Update session status to error
      if (sessionId) {
        this.stateService.completeSession(sessionId, false);
      }

      // Send error to client
      client.emit('llm:stream-error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionId: connection?.id,
        sessionId,
        timestamp: Date.now(),
      });
    } finally {
      // Clean up
      if (connection) {
        this.connectionPool.closeConnection(connection.id, 'websocket_stream_completed');
        this.bufferService.removeBuffer(connection.id);
        this.activeStreams.delete(client.id);
      }
    }
  }

  @SubscribeMessage('llm:stop-stream')
  async handleStopStream(@ConnectedSocket() client: Socket) {
    const streamInfo = this.activeStreams.get(client.id);
    if (streamInfo) {
      this.logger.log(`Stopping stream for client ${client.id}`);
      
      // Complete session with error status
      this.stateService.completeSession(streamInfo.sessionId, false);
      
      // Clean up
      this.cleanupStream(client.id, streamInfo);
      
      // Notify client
      client.emit('llm:stream-stopped', {
        sessionId: streamInfo.sessionId,
        timestamp: Date.now(),
      });
    }
  }

  @SubscribeMessage('llm:get-session-status')
  async handleGetSessionStatus(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.stateService.getSession(data.sessionId);
    const sessionState = this.stateService.getSessionState(data.sessionId);
    
    if (session) {
      client.emit('llm:session-status', {
        session,
        state: sessionState,
        timestamp: Date.now(),
      });
    } else {
      client.emit('llm:session-not-found', {
        sessionId: data.sessionId,
        timestamp: Date.now(),
      });
    }
  }

  @SubscribeMessage('llm:heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: Socket) {
    const streamInfo = this.activeStreams.get(client.id);
    if (streamInfo) {
      // Update connection activity
      this.connectionPool.updateConnectionActivity(streamInfo.connection.id);
      
      // Send heartbeat response
      client.emit('llm:heartbeat-response', {
        connectionId: streamInfo.connection.id,
        sessionId: streamInfo.sessionId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Clean up stream resources
   * @param clientId - Client ID
   * @param streamInfo - Stream information
   */
  private cleanupStream(
    clientId: string, 
    streamInfo: {
      connection: StreamingConnection;
      sessionId: string;
      provider: any;
      request: ChatCompletionRequest;
    }
  ): void {
    this.connectionPool.closeConnection(streamInfo.connection.id, 'stream_cleanup');
    this.bufferService.removeBuffer(streamInfo.connection.id);
    this.activeStreams.delete(clientId);
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
      throw new Error(`Provider ${providerName} not available`);
    }
  }

  /**
   * Broadcast message to all connected clients
   * @param event - Event name
   * @param data - Event data
   */
  broadcast(event: string, data: any): void {
    this.server.emit(event, data);
  }

  /**
   * Send message to specific client
   * @param clientId - Client ID
   * @param event - Event name
   * @param data - Event data
   */
  sendToClient(clientId: string, event: string, data: any): void {
    this.server.to(clientId).emit(event, data);
  }

  /**
   * Get active streams count
   * @returns Number of active streams
   */
  getActiveStreamsCount(): number {
    return this.activeStreams.size;
  }

  /**
   * Get active streams info
   * @returns Array of active stream information
   */
  getActiveStreamsInfo(): Array<{
    clientId: string;
    userId: string;
    sessionId: string;
    model: string;
    startTime: Date;
  }> {
    return Array.from(this.activeStreams.entries()).map(([clientId, streamInfo]) => ({
      clientId,
      userId: streamInfo.connection.userId,
      sessionId: streamInfo.sessionId,
      model: streamInfo.request.model,
      startTime: streamInfo.connection.createdAt,
    }));
  }
}

