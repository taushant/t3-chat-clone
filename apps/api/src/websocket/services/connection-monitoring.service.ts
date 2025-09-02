import { Injectable, Logger } from "@nestjs/common";

interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  averageConnectionDuration: number;
  peakConnections: number;
  connectionsPerMinute: number;
  lastReset: Date;
}

interface ConnectionEvent {
  type: "connect" | "disconnect" | "error" | "rate_limit" | "auth_failure";
  socketId: string;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  details?: any;
}

@Injectable()
export class ConnectionMonitoringService {
  private readonly logger = new Logger(ConnectionMonitoringService.name);
  private readonly connectionEvents: ConnectionEvent[] = [];
  private readonly connectionMetrics: ConnectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    failedConnections: 0,
    averageConnectionDuration: 0,
    peakConnections: 0,
    connectionsPerMinute: 0,
    lastReset: new Date(),
  };
  private readonly connectionStartTimes = new Map<string, Date>();
  private readonly connectionDurations: number[] = [];

  /**
   * Record connection event
   */
  recordConnectionEvent(
    type: ConnectionEvent["type"],
    socketId: string,
    ipAddress: string,
    userAgent?: string,
    userId?: string,
    details?: any,
  ): void {
    const event: ConnectionEvent = {
      type,
      socketId,
      userId,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      details,
    };

    this.connectionEvents.push(event);

    // Keep only last 1000 events to prevent memory issues
    if (this.connectionEvents.length > 1000) {
      this.connectionEvents.shift();
    }

    // Update metrics based on event type
    this.updateMetrics(event);

    this.logger.debug(
      `Recorded connection event: ${type} for socket ${socketId}`,
    );
  }

  /**
   * Record connection start
   */
  recordConnectionStart(socketId: string): void {
    this.connectionStartTimes.set(socketId, new Date());
    this.connectionMetrics.totalConnections++;
    this.connectionMetrics.activeConnections++;

    // Update peak connections
    if (
      this.connectionMetrics.activeConnections >
      this.connectionMetrics.peakConnections
    ) {
      this.connectionMetrics.peakConnections =
        this.connectionMetrics.activeConnections;
    }

    this.logger.debug(`Recorded connection start for socket ${socketId}`);
  }

  /**
   * Record connection end
   */
  recordConnectionEnd(socketId: string): void {
    const startTime = this.connectionStartTimes.get(socketId);
    if (startTime) {
      const duration = Date.now() - startTime.getTime();
      this.connectionDurations.push(duration);
      this.connectionStartTimes.delete(socketId);

      // Update average connection duration
      this.updateAverageConnectionDuration();
    }

    this.connectionMetrics.activeConnections = Math.max(
      0,
      this.connectionMetrics.activeConnections - 1,
    );
    this.logger.debug(`Recorded connection end for socket ${socketId}`);
  }

  /**
   * Get connection metrics
   */
  getConnectionMetrics(): ConnectionMetrics {
    return { ...this.connectionMetrics };
  }

  /**
   * Get connection events
   */
  getConnectionEvents(limit: number = 100): ConnectionEvent[] {
    return this.connectionEvents.slice(-limit);
  }

  /**
   * Get connection events by type
   */
  getConnectionEventsByType(
    type: ConnectionEvent["type"],
    limit: number = 100,
  ): ConnectionEvent[] {
    return this.connectionEvents
      .filter((event) => event.type === type)
      .slice(-limit);
  }

  /**
   * Get connection events by user
   */
  getConnectionEventsByUser(
    userId: string,
    limit: number = 100,
  ): ConnectionEvent[] {
    return this.connectionEvents
      .filter((event) => event.userId === userId)
      .slice(-limit);
  }

  /**
   * Get connection events by IP
   */
  getConnectionEventsByIP(
    ipAddress: string,
    limit: number = 100,
  ): ConnectionEvent[] {
    return this.connectionEvents
      .filter((event) => event.ipAddress === ipAddress)
      .slice(-limit);
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    metrics: ConnectionMetrics;
    recentEvents: ConnectionEvent[];
    topIPs: Array<{ ip: string; count: number }>;
    topUserAgents: Array<{ userAgent: string; count: number }>;
    errorRate: number;
  } {
    const recentEvents = this.getConnectionEvents(50);
    const topIPs = this.getTopIPs();
    const topUserAgents = this.getTopUserAgents();
    const errorRate = this.calculateErrorRate();

    return {
      metrics: this.getConnectionMetrics(),
      recentEvents,
      topIPs,
      topUserAgents,
      errorRate,
    };
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: "healthy" | "warning" | "critical";
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: "healthy" | "warning" | "critical" = "healthy";

    // Check error rate
    const errorRate = this.calculateErrorRate();
    if (errorRate > 0.1) {
      // 10% error rate
      issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
      recommendations.push("Investigate connection failures and rate limiting");
      status = "warning";
    }

    // Check peak connections
    if (this.connectionMetrics.peakConnections > 1000) {
      issues.push(
        `High peak connections: ${this.connectionMetrics.peakConnections}`,
      );
      recommendations.push("Consider scaling or connection pooling");
      status = status === "healthy" ? "warning" : "critical";
    }

    // Check failed connections
    if (this.connectionMetrics.failedConnections > 100) {
      issues.push(
        `High failed connections: ${this.connectionMetrics.failedConnections}`,
      );
      recommendations.push("Review authentication and rate limiting settings");
      status = status === "healthy" ? "warning" : "critical";
    }

    return {
      status,
      issues,
      recommendations,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.connectionMetrics.totalConnections = 0;
    this.connectionMetrics.failedConnections = 0;
    this.connectionMetrics.peakConnections =
      this.connectionMetrics.activeConnections;
    this.connectionMetrics.connectionsPerMinute = 0;
    this.connectionMetrics.lastReset = new Date();
    this.connectionEvents.length = 0;
    this.connectionDurations.length = 0;

    this.logger.log("Connection metrics reset");
  }

  /**
   * Clean up old data
   */
  cleanupOldData(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Remove old events
    const cutoffTime = new Date(now.getTime() - maxAge);
    const initialLength = this.connectionEvents.length;
    this.connectionEvents.splice(
      0,
      this.connectionEvents.findIndex((event) => event.timestamp > cutoffTime),
    );

    if (this.connectionEvents.length < initialLength) {
      this.logger.log(
        `Cleaned up ${initialLength - this.connectionEvents.length} old connection events`,
      );
    }

    // Remove old connection durations (keep last 1000)
    if (this.connectionDurations.length > 1000) {
      this.connectionDurations.splice(
        0,
        this.connectionDurations.length - 1000,
      );
    }
  }

  /**
   * Private helper methods
   */
  private updateMetrics(event: ConnectionEvent): void {
    switch (event.type) {
      case "connect":
        this.connectionMetrics.activeConnections++;
        break;
      case "disconnect":
        this.connectionMetrics.activeConnections = Math.max(
          0,
          this.connectionMetrics.activeConnections - 1,
        );
        break;
      case "error":
      case "rate_limit":
      case "auth_failure":
        this.connectionMetrics.failedConnections++;
        break;
    }
  }

  private updateAverageConnectionDuration(): void {
    if (this.connectionDurations.length > 0) {
      const sum = this.connectionDurations.reduce((a, b) => a + b, 0);
      this.connectionMetrics.averageConnectionDuration =
        sum / this.connectionDurations.length;
    }
  }

  private getTopIPs(): Array<{ ip: string; count: number }> {
    const ipCounts = new Map<string, number>();

    for (const event of this.connectionEvents) {
      ipCounts.set(event.ipAddress, (ipCounts.get(event.ipAddress) || 0) + 1);
    }

    return Array.from(ipCounts.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getTopUserAgents(): Array<{ userAgent: string; count: number }> {
    const userAgentCounts = new Map<string, number>();

    for (const event of this.connectionEvents) {
      if (event.userAgent) {
        userAgentCounts.set(
          event.userAgent,
          (userAgentCounts.get(event.userAgent) || 0) + 1,
        );
      }
    }

    return Array.from(userAgentCounts.entries())
      .map(([userAgent, count]) => ({ userAgent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateErrorRate(): number {
    if (this.connectionEvents.length === 0) {
      return 0;
    }

    const errorEvents = this.connectionEvents.filter(
      (event) =>
        event.type === "error" ||
        event.type === "rate_limit" ||
        event.type === "auth_failure",
    );

    return errorEvents.length / this.connectionEvents.length;
  }
}
