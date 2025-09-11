import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { 
  StreamingConnection, 
  ConnectionPoolStats, 
  StreamingConfig,
  ConnectionHealth,
  StreamingEvent,
  StreamingEventType,
} from '../types/streaming.types';

/**
 * Connection Pool Service
 * Manages active streaming connections with health monitoring and cleanup
 */
@Injectable()
export class ConnectionPoolService implements OnModuleDestroy {
  private readonly logger = new Logger(ConnectionPoolService.name);
  private readonly activeConnections = new Map<string, StreamingConnection>();
  private readonly connectionHealth = new Map<string, ConnectionHealth>();
  private readonly config: StreamingConfig;
  private cleanupInterval!: NodeJS.Timeout;

  constructor() {
    this.config = {
      maxConnections: 1000,
      maxBufferSize: 1024 * 1024, // 1MB
      flushInterval: 100, // 100ms
      connectionTimeout: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
    };

    this.startCleanupInterval();
  }

  /**
   * Create a new streaming connection
   * @param userId - User ID
   * @param requestId - Request ID
   * @param metadata - Additional metadata
   * @returns StreamingConnection
   */
  createConnection(
    userId: string, 
    requestId: string, 
    metadata: Record<string, any> = {}
  ): StreamingConnection {
    const connectionId = this.generateConnectionId(userId, requestId);
    
    // Check if we're at capacity
    if (this.activeConnections.size >= this.config.maxConnections) {
      this.logger.warn(`Connection pool at capacity (${this.config.maxConnections}), rejecting new connection`);
      throw new Error('Connection pool at capacity');
    }

    const connection: StreamingConnection = {
      id: connectionId,
      userId,
      requestId,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      metadata: {
        ...metadata,
        userAgent: metadata.userAgent || 'unknown',
        ipAddress: metadata.ipAddress || 'unknown',
      },
    };

    this.activeConnections.set(connectionId, connection);
    this.initializeConnectionHealth(connectionId);

    this.logger.log(`Created connection ${connectionId} for user ${userId}`);
    this.emitEvent(StreamingEventType.CONNECTION_CREATED, connectionId, connection);

    return connection;
  }

  /**
   * Get a connection by ID
   * @param connectionId - Connection ID
   * @returns StreamingConnection or null
   */
  getConnection(connectionId: string): StreamingConnection | null {
    return this.activeConnections.get(connectionId) || null;
  }

  /**
   * Update connection activity
   * @param connectionId - Connection ID
   */
  updateConnectionActivity(connectionId: string): void {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
      this.updateConnectionHealth(connectionId, { lastHeartbeat: new Date() });
    }
  }

  /**
   * Close a connection
   * @param connectionId - Connection ID
   * @param reason - Reason for closing
   */
  closeConnection(connectionId: string, reason: string = 'manual'): void {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      connection.isActive = false;
      this.activeConnections.delete(connectionId);
      this.connectionHealth.delete(connectionId);

      this.logger.log(`Closed connection ${connectionId} for user ${connection.userId}, reason: ${reason}`);
      this.emitEvent(StreamingEventType.CONNECTION_CLOSED, connectionId, { reason, connection });
    }
  }

  /**
   * Get all active connections for a user
   * @param userId - User ID
   * @returns Array of connections
   */
  getUserConnections(userId: string): StreamingConnection[] {
    return Array.from(this.activeConnections.values())
      .filter(conn => conn.userId === userId && conn.isActive);
  }

  /**
   * Get connection pool statistics
   * @returns ConnectionPoolStats
   */
  getPoolStats(): ConnectionPoolStats {
    const connections = Array.from(this.activeConnections.values());
    const now = new Date();
    
    const activeConnections = connections.filter(conn => conn.isActive).length;
    const idleConnections = connections.filter(conn => 
      conn.isActive && (now.getTime() - conn.lastActivity.getTime()) > 60000 // 1 minute
    ).length;
    const errorConnections = Array.from(this.connectionHealth.values())
      .filter(health => !health.isHealthy).length;

    const averageConnectionDuration = connections.length > 0
      ? connections.reduce((sum, conn) => 
          sum + (now.getTime() - conn.createdAt.getTime()), 0
        ) / connections.length
      : 0;

    return {
      totalConnections: connections.length,
      activeConnections,
      idleConnections,
      errorConnections,
      averageConnectionDuration,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Get connection health information
   * @param connectionId - Connection ID
   * @returns ConnectionHealth or null
   */
  getConnectionHealth(connectionId: string): ConnectionHealth | null {
    return this.connectionHealth.get(connectionId) || null;
  }

  /**
   * Get all unhealthy connections
   * @returns Array of unhealthy connection IDs
   */
  getUnhealthyConnections(): string[] {
    return Array.from(this.connectionHealth.entries())
      .filter(([_, health]) => !health.isHealthy)
      .map(([connectionId, _]) => connectionId);
  }

  /**
   * Clean up stale connections
   */
  cleanupStaleConnections(): void {
    const now = new Date();
    const staleConnections: string[] = [];

    for (const [connectionId, connection] of this.activeConnections) {
      const timeSinceLastActivity = now.getTime() - connection.lastActivity.getTime();
      
      if (timeSinceLastActivity > this.config.connectionTimeout) {
        staleConnections.push(connectionId);
      }
    }

    for (const connectionId of staleConnections) {
      this.closeConnection(connectionId, 'stale');
    }

    if (staleConnections.length > 0) {
      this.logger.log(`Cleaned up ${staleConnections.length} stale connections`);
    }
  }

  /**
   * Update connection health
   * @param connectionId - Connection ID
   * @param updates - Health updates
   */
  private updateConnectionHealth(
    connectionId: string, 
    updates: Partial<ConnectionHealth>
  ): void {
    const health = this.connectionHealth.get(connectionId);
    if (health) {
      Object.assign(health, updates);
      this.connectionHealth.set(connectionId, health);
    }
  }

  /**
   * Initialize connection health tracking
   * @param connectionId - Connection ID
   */
  private initializeConnectionHealth(connectionId: string): void {
    const health: ConnectionHealth = {
      connectionId,
      isHealthy: true,
      lastHeartbeat: new Date(),
      latency: 0,
      errorRate: 0,
      memoryUsage: 0,
    };

    this.connectionHealth.set(connectionId, health);
  }

  /**
   * Generate unique connection ID
   * @param userId - User ID
   * @param requestId - Request ID
   * @returns Connection ID
   */
  private generateConnectionId(userId: string, requestId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `conn_${userId}_${requestId}_${timestamp}_${random}`;
  }

  /**
   * Estimate memory usage
   * @returns Memory usage in bytes
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    // Estimate connection object size
    for (const connection of this.activeConnections.values()) {
      totalSize += JSON.stringify(connection).length;
    }
    
    // Estimate health object size
    for (const health of this.connectionHealth.values()) {
      totalSize += JSON.stringify(health).length;
    }
    
    return totalSize;
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 30000); // Clean up every 30 seconds
  }

  /**
   * Emit streaming event
   * @param type - Event type
   * @param connectionId - Connection ID
   * @param data - Event data
   */
  private emitEvent(
    type: StreamingEventType, 
    connectionId: string, 
    data: any
  ): void {
    const event: StreamingEvent = {
      type,
      connectionId,
      data,
      timestamp: new Date(),
    };

    // In a real implementation, you might emit this to an event bus
    this.logger.debug(`Streaming event: ${type} for connection ${connectionId}`);
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all active connections
    for (const connectionId of this.activeConnections.keys()) {
      this.closeConnection(connectionId, 'module_destroy');
    }

    this.logger.log('Connection pool service destroyed');
  }
}

