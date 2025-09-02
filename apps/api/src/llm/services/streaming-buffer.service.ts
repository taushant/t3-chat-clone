import { Injectable, Logger } from '@nestjs/common';
import { 
  StreamingBuffer, 
  ChatCompletionChunk, 
  ProcessedChunk,
  ChunkMetadata,
  StreamingEventType,
} from '../types/streaming.types';

/**
 * Streaming Buffer Service
 * Manages buffering of streaming chunks with intelligent flushing
 */
@Injectable()
export class StreamingBufferService {
  private readonly logger = new Logger(StreamingBufferService.name);
  private readonly buffers = new Map<string, StreamingBuffer>();
  private readonly config = {
    maxBufferSize: 1024 * 1024, // 1MB
    maxChunks: 100,
    flushInterval: 100, // 100ms
    maxAge: 5000, // 5 seconds
  };

  /**
   * Create a new streaming buffer
   * @param connectionId - Connection ID
   * @param maxSize - Maximum buffer size
   * @returns StreamingBuffer
   */
  createBuffer(connectionId: string, maxSize: number = this.config.maxBufferSize): StreamingBuffer {
    const buffer: StreamingBuffer = {
      id: `buffer_${connectionId}_${Date.now()}`,
      connectionId,
      chunks: [],
      totalSize: 0,
      maxSize,
      createdAt: new Date(),
      lastFlush: new Date(),
    };

    this.buffers.set(connectionId, buffer);
    this.logger.debug(`Created buffer for connection ${connectionId}`);

    return buffer;
  }

  /**
   * Write a chunk to the buffer
   * @param connectionId - Connection ID
   * @param chunk - Chat completion chunk
   * @returns ProcessedChunk
   */
  writeChunk(connectionId: string, chunk: ChatCompletionChunk): ProcessedChunk {
    const buffer = this.buffers.get(connectionId);
    if (!buffer) {
      throw new Error(`Buffer not found for connection ${connectionId}`);
    }

    const startTime = Date.now();
    
    // Process the chunk
    const processedChunk = this.processChunk(chunk, buffer.chunks.length);
    const processingTime = Date.now() - startTime;

    // Add to buffer
    buffer.chunks.push(chunk);
    buffer.totalSize += this.calculateChunkSize(chunk);
    buffer.lastFlush = new Date();

    // Check if buffer needs flushing
    if (this.shouldFlushBuffer(buffer)) {
      this.flushBuffer(connectionId);
    }

    this.logger.debug(
      `Wrote chunk to buffer ${connectionId}, size: ${buffer.totalSize}, chunks: ${buffer.chunks.length}`
    );

    return processedChunk;
  }

  /**
   * Flush the buffer for a connection
   * @param connectionId - Connection ID
   * @returns Array of chunks that were flushed
   */
  flushBuffer(connectionId: string): ChatCompletionChunk[] {
    const buffer = this.buffers.get(connectionId);
    if (!buffer || buffer.chunks.length === 0) {
      return [];
    }

    const chunksToFlush = [...buffer.chunks];
    
    // Clear the buffer
    buffer.chunks = [];
    buffer.totalSize = 0;
    buffer.lastFlush = new Date();

    this.logger.debug(`Flushed ${chunksToFlush.length} chunks from buffer ${connectionId}`);
    this.emitEvent(StreamingEventType.BUFFER_FLUSHED, connectionId, { 
      chunkCount: chunksToFlush.length,
      totalSize: buffer.totalSize 
    });

    return chunksToFlush;
  }

  /**
   * Get buffer status for a connection
   * @param connectionId - Connection ID
   * @returns Buffer status or null
   */
  getBufferStatus(connectionId: string): {
    chunkCount: number;
    totalSize: number;
    maxSize: number;
    utilization: number;
    age: number;
  } | null {
    const buffer = this.buffers.get(connectionId);
    if (!buffer) {
      return null;
    }

    const age = Date.now() - buffer.createdAt.getTime();
    const utilization = (buffer.totalSize / buffer.maxSize) * 100;

    return {
      chunkCount: buffer.chunks.length,
      totalSize: buffer.totalSize,
      maxSize: buffer.maxSize,
      utilization,
      age,
    };
  }

  /**
   * Clear buffer for a connection
   * @param connectionId - Connection ID
   */
  clearBuffer(connectionId: string): void {
    const buffer = this.buffers.get(connectionId);
    if (buffer) {
      buffer.chunks = [];
      buffer.totalSize = 0;
      buffer.lastFlush = new Date();
      
      this.logger.debug(`Cleared buffer for connection ${connectionId}`);
    }
  }

  /**
   * Remove buffer for a connection
   * @param connectionId - Connection ID
   */
  removeBuffer(connectionId: string): void {
    const buffer = this.buffers.get(connectionId);
    if (buffer) {
      // Flush any remaining chunks before removing
      if (buffer.chunks.length > 0) {
        this.flushBuffer(connectionId);
      }
      
      this.buffers.delete(connectionId);
      this.logger.debug(`Removed buffer for connection ${connectionId}`);
    }
  }

  /**
   * Get all buffer statistics
   * @returns Buffer statistics
   */
  getAllBufferStats(): {
    totalBuffers: number;
    totalChunks: number;
    totalSize: number;
    averageUtilization: number;
  } {
    const buffers = Array.from(this.buffers.values());
    
    const totalBuffers = buffers.length;
    const totalChunks = buffers.reduce((sum, buffer) => sum + buffer.chunks.length, 0);
    const totalSize = buffers.reduce((sum, buffer) => sum + buffer.totalSize, 0);
    const averageUtilization = buffers.length > 0
      ? buffers.reduce((sum, buffer) => sum + (buffer.totalSize / buffer.maxSize), 0) / buffers.length * 100
      : 0;

    return {
      totalBuffers,
      totalChunks,
      totalSize,
      averageUtilization,
    };
  }

  /**
   * Clean up old buffers
   */
  cleanupOldBuffers(): void {
    const now = Date.now();
    const oldBuffers: string[] = [];

    for (const [connectionId, buffer] of this.buffers) {
      const age = now - buffer.createdAt.getTime();
      if (age > this.config.maxAge) {
        oldBuffers.push(connectionId);
      }
    }

    for (const connectionId of oldBuffers) {
      this.removeBuffer(connectionId);
    }

    if (oldBuffers.length > 0) {
      this.logger.log(`Cleaned up ${oldBuffers.length} old buffers`);
    }
  }

  /**
   * Process a chunk and add metadata
   * @param chunk - Chat completion chunk
   * @param chunkIndex - Index of the chunk
   * @returns ProcessedChunk
   */
  private processChunk(chunk: ChatCompletionChunk, chunkIndex: number): ProcessedChunk {
    const content = chunk.choices[0]?.delta?.content || '';
    const isFirstChunk = chunkIndex === 0;
    const isLastChunk = chunk.choices[0]?.finishReason !== null;

    const metadata: ChunkMetadata = {
      chunkIndex,
      isFirstChunk,
      isLastChunk,
      contentLength: content.length,
      processingTime: 0, // Will be set by caller
      provider: this.extractProviderFromModel(chunk.model),
      model: chunk.model,
    };

    return {
      originalChunk: chunk,
      processedContent: content,
      metadata,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate the size of a chunk in bytes
   * @param chunk - Chat completion chunk
   * @returns Size in bytes
   */
  private calculateChunkSize(chunk: ChatCompletionChunk): number {
    return JSON.stringify(chunk).length;
  }

  /**
   * Check if buffer should be flushed
   * @param buffer - Streaming buffer
   * @returns true if should flush
   */
  private shouldFlushBuffer(buffer: StreamingBuffer): boolean {
    // Flush if buffer is full
    if (buffer.totalSize >= buffer.maxSize) {
      return true;
    }

    // Flush if too many chunks
    if (buffer.chunks.length >= this.config.maxChunks) {
      return true;
    }

    // Flush if buffer is old
    const age = Date.now() - buffer.lastFlush.getTime();
    if (age >= this.config.flushInterval) {
      return true;
    }

    return false;
  }

  /**
   * Extract provider name from model
   * @param model - Model name
   * @returns Provider name
   */
  private extractProviderFromModel(model: string): string {
    if (model.includes('gpt') || model.includes('openai')) {
      return 'openai';
    } else if (model.includes('claude') || model.includes('anthropic')) {
      return 'anthropic';
    } else if (model.includes('/')) {
      return 'openrouter';
    }
    return 'unknown';
  }

  /**
   * Emit streaming event
   * @param type - Event type
   * @param connectionId - Connection ID
   * @param data - Event data
   */
  private emitEvent(type: StreamingEventType, connectionId: string, data: any): void {
    // In a real implementation, you might emit this to an event bus
    this.logger.debug(`Streaming event: ${type} for connection ${connectionId}`);
  }
}

