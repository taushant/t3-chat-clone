/**
 * Types for enhanced streaming functionality
 */

export interface StreamingConnection {
  id: string;
  userId: string;
  requestId: string;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface StreamingBuffer {
  id: string;
  connectionId: string;
  chunks: any[];
  totalSize: number;
  maxSize: number;
  createdAt: Date;
  lastFlush: Date;
}

export interface StreamingSession {
  id: string;
  userId: string;
  requestId: string;
  provider: string;
  model: string;
  status: StreamingStatus;
  startTime: Date;
  endTime?: Date;
  totalChunks: number;
  totalTokens: number;
  metadata: Record<string, any>;
}

export interface StreamingState {
  sessionId: string;
  status: StreamingStatus;
  currentChunk: number;
  totalChunks: number;
  progress: number; // 0-100
  estimatedTimeRemaining?: number;
  lastUpdate: Date;
}

export interface ProcessedChunk {
  originalChunk: any;
  processedContent: string;
  metadata: ChunkMetadata;
  timestamp: Date;
}

export interface ChunkMetadata {
  chunkIndex: number;
  isFirstChunk: boolean;
  isLastChunk: boolean;
  contentLength: number;
  processingTime: number;
  provider: string;
  model: string;
}

export interface StreamingMetrics {
  connectionId: string;
  totalChunks: number;
  totalBytes: number;
  averageChunkSize: number;
  averageLatency: number;
  errorCount: number;
  startTime: Date;
  endTime?: Date;
}

export interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  errorConnections: number;
  averageConnectionDuration: number;
  memoryUsage: number;
}

export interface StreamingConfig {
  maxConnections: number;
  maxBufferSize: number;
  flushInterval: number;
  connectionTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export enum StreamingStatus {
  CONNECTING = 'connecting',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error',
  DISCONNECTED = 'disconnected',
}

export enum ChunkType {
  CONTENT = 'content',
  METADATA = 'metadata',
  ERROR = 'error',
  HEARTBEAT = 'heartbeat',
  COMPLETION = 'completion',
}

export interface StreamingError {
  code: string;
  message: string;
  timestamp: Date;
  connectionId: string;
  recoverable: boolean;
  retryAfter?: number;
}

export interface ConnectionHealth {
  connectionId: string;
  isHealthy: boolean;
  lastHeartbeat: Date;
  latency: number;
  errorRate: number;
  memoryUsage: number;
}

export interface StreamingEvent {
  type: StreamingEventType;
  connectionId: string;
  data: any;
  timestamp: Date;
}

export enum StreamingEventType {
  CONNECTION_CREATED = 'connection_created',
  CONNECTION_CLOSED = 'connection_closed',
  CHUNK_RECEIVED = 'chunk_received',
  CHUNK_PROCESSED = 'chunk_processed',
  ERROR_OCCURRED = 'error_occurred',
  HEARTBEAT = 'heartbeat',
  BUFFER_FLUSHED = 'buffer_flushed',
  SESSION_STARTED = 'session_started',
  SESSION_COMPLETED = 'session_completed',
}

// Re-export ChatCompletionChunk from existing types
export type { ChatCompletionChunk } from './chat-completion.types';
