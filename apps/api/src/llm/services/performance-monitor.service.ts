import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface PerformanceMetrics {
  timestamp: Date;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  userId?: string;
  provider?: string;
  model?: string;
  tokens?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

export interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  successRate: number;
  errorRate: number;
  requestsPerSecond: number;
  memoryUsage: {
    average: number;
    peak: number;
    current: number;
  };
  topEndpoints: Array<{
    endpoint: string;
    count: number;
    averageResponseTime: number;
  }>;
  topErrors: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
}

interface AlertThresholds {
  maxResponseTime: number;
  minSuccessRate: number;
  maxMemoryUsage: number;
  maxErrorRate: number;
  maxRequestsPerSecond: number;
}

@Injectable()
export class PerformanceMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private readonly metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsHistory = 10000; // Keep last 10k metrics
  private alertThresholds: AlertThresholds = {
    maxResponseTime: 5000, // 5 seconds
    minSuccessRate: 95, // 95%
    maxMemoryUsage: 500 * 1024 * 1024, // 500MB
    maxErrorRate: 5, // 5%
    maxRequestsPerSecond: 1000, // 1000 RPS
  };
  
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private startTime = Date.now();
  private requestCount = 0;
  private lastCpuUsage: NodeJS.CpuUsage;

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.lastCpuUsage = process.cpuUsage();
  }

  onModuleInit() {
    this.startMonitoring();
    this.logger.log('Performance monitoring started');
  }

  onModuleDestroy() {
    this.stopMonitoring();
    this.logger.log('Performance monitoring stopped');
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetrics, 'timestamp' | 'memoryUsage' | 'cpuUsage'>): void {
    const fullMetric: PerformanceMetrics = {
      ...metric,
      timestamp: new Date(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(this.lastCpuUsage),
    };

    this.metrics.push(fullMetric);
    this.requestCount++;

    // Keep only the last N metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.splice(0, this.metrics.length - this.maxMetricsHistory);
    }

    // Check for alerts
    this.checkAlerts(fullMetric);

    // Emit performance event
    this.eventEmitter.emit('performance.metric.recorded', fullMetric);
  }

  /**
   * Get current performance statistics
   */
  getPerformanceStats(timeWindowMinutes: number = 60): PerformanceStats {
    const now = new Date();
    const timeWindow = new Date(now.getTime() - timeWindowMinutes * 60 * 1000);
    
    const recentMetrics = this.metrics.filter(m => m.timestamp >= timeWindow);
    
    if (recentMetrics.length === 0) {
      return this.getEmptyStats();
    }

    const responseTimes = recentMetrics.map(m => m.responseTime);
    const successfulRequests = recentMetrics.filter(m => m.statusCode >= 200 && m.statusCode < 400);
    const failedRequests = recentMetrics.filter(m => m.statusCode >= 400);
    
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    
    const successRate = (successfulRequests.length / recentMetrics.length) * 100;
    const errorRate = (failedRequests.length / recentMetrics.length) * 100;
    
    const timeWindowSeconds = timeWindowMinutes * 60;
    const requestsPerSecond = recentMetrics.length / timeWindowSeconds;
    
    const memoryUsages = recentMetrics.map(m => m.memoryUsage?.heapUsed || 0);
    const averageMemoryUsage = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
    const peakMemoryUsage = Math.max(...memoryUsages);
    const currentMemoryUsage = process.memoryUsage().heapUsed;
    
    // Top endpoints
    const endpointStats = new Map<string, { count: number; totalResponseTime: number }>();
    recentMetrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      const existing = endpointStats.get(key) || { count: 0, totalResponseTime: 0 };
      endpointStats.set(key, {
        count: existing.count + 1,
        totalResponseTime: existing.totalResponseTime + m.responseTime,
      });
    });
    
    const topEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        averageResponseTime: stats.totalResponseTime / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Top errors
    const errorStats = new Map<string, number>();
    failedRequests.forEach(m => {
      const error = `${m.statusCode}`;
      errorStats.set(error, (errorStats.get(error) || 0) + 1);
    });
    
    const topErrors = Array.from(errorStats.entries())
      .map(([error, count]) => ({
        error,
        count,
        percentage: (count / failedRequests.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests: recentMetrics.length,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      successRate,
      errorRate,
      requestsPerSecond,
      memoryUsage: {
        average: averageMemoryUsage,
        peak: peakMemoryUsage,
        current: currentMemoryUsage,
      },
      topEndpoints,
      topErrors,
    };
  }

  /**
   * Get performance metrics for a specific time range
   */
  getMetrics(startTime: Date, endTime: Date): PerformanceMetrics[] {
    return this.metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
  }

  /**
   * Get performance metrics for a specific endpoint
   */
  getEndpointMetrics(endpoint: string, timeWindowMinutes: number = 60): PerformanceMetrics[] {
    const now = new Date();
    const timeWindow = new Date(now.getTime() - timeWindowMinutes * 60 * 1000);
    
    return this.metrics.filter(m => 
      m.timestamp >= timeWindow && 
      m.endpoint === endpoint
    );
  }

  /**
   * Get performance metrics for a specific user
   */
  getUserMetrics(userId: string, timeWindowMinutes: number = 60): PerformanceMetrics[] {
    const now = new Date();
    const timeWindow = new Date(now.getTime() - timeWindowMinutes * 60 * 1000);
    
    return this.metrics.filter(m => 
      m.timestamp >= timeWindow && 
      m.userId === userId
    );
  }

  /**
   * Get performance metrics for a specific provider
   */
  getProviderMetrics(provider: string, timeWindowMinutes: number = 60): PerformanceMetrics[] {
    const now = new Date();
    const timeWindow = new Date(now.getTime() - timeWindowMinutes * 60 * 1000);
    
    return this.metrics.filter(m => 
      m.timestamp >= timeWindow && 
      m.provider === provider
    );
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const initialLength = this.metrics.length;
    
    this.metrics.splice(0, this.metrics.findIndex(m => m.timestamp >= cutoffTime));
    
    const removedCount = initialLength - this.metrics.length;
    if (removedCount > 0) {
      this.logger.log(`Cleared ${removedCount} old performance metrics`);
    }
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  } {
    const stats = this.getPerformanceStats(5); // Last 5 minutes
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // Check response time
    if (stats.averageResponseTime > this.alertThresholds.maxResponseTime) {
      issues.push(`High response time: ${stats.averageResponseTime.toFixed(2)}ms`);
      status = 'warning';
    }
    
    // Check success rate
    if (stats.successRate < this.alertThresholds.minSuccessRate) {
      issues.push(`Low success rate: ${stats.successRate.toFixed(2)}%`);
      status = 'critical';
    }
    
    // Check memory usage
    if (stats.memoryUsage.current > this.alertThresholds.maxMemoryUsage) {
      issues.push(`High memory usage: ${(stats.memoryUsage.current / 1024 / 1024).toFixed(2)}MB`);
      status = 'warning';
    }
    
    // Check error rate
    if (stats.errorRate > this.alertThresholds.maxErrorRate) {
      issues.push(`High error rate: ${stats.errorRate.toFixed(2)}%`);
      status = 'critical';
    }
    
    // Check RPS
    if (stats.requestsPerSecond > this.alertThresholds.maxRequestsPerSecond) {
      issues.push(`High request rate: ${stats.requestsPerSecond.toFixed(2)} RPS`);
      status = 'warning';
    }

    return {
      status,
      issues,
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(this.lastCpuUsage),
    };
  }

  /**
   * Update alert thresholds
   */
  updateAlertThresholds(thresholds: Partial<AlertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    this.logger.log('Alert thresholds updated', this.alertThresholds);
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    const health = this.getSystemHealth();
    
    if (health.status === 'critical') {
      this.logger.error('System health critical', { issues: health.issues });
      this.eventEmitter.emit('performance.health.critical', health);
    } else if (health.status === 'warning') {
      this.logger.warn('System health warning', { issues: health.issues });
      this.eventEmitter.emit('performance.health.warning', health);
    }
    
    // Log performance stats every 5 minutes
    if (this.requestCount % 100 === 0) {
      const stats = this.getPerformanceStats(5);
      this.logger.log('Performance stats', {
        requests: stats.totalRequests,
        avgResponseTime: stats.averageResponseTime.toFixed(2),
        successRate: stats.successRate.toFixed(2),
        rps: stats.requestsPerSecond.toFixed(2),
        memory: (stats.memoryUsage.current / 1024 / 1024).toFixed(2),
      });
    }
  }

  /**
   * Check for alerts
   */
  private checkAlerts(metric: PerformanceMetrics): void {
    const alerts: string[] = [];
    
    if (metric.responseTime > this.alertThresholds.maxResponseTime) {
      alerts.push(`Slow response: ${metric.responseTime}ms for ${metric.endpoint}`);
    }
    
    if (metric.statusCode >= 400) {
      alerts.push(`Error response: ${metric.statusCode} for ${metric.endpoint}`);
    }
    
    if (metric.memoryUsage && metric.memoryUsage.heapUsed > this.alertThresholds.maxMemoryUsage) {
      alerts.push(`High memory usage: ${(metric.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }
    
    if (alerts.length > 0) {
      this.logger.warn('Performance alerts triggered', { alerts, metric });
      this.eventEmitter.emit('performance.alerts', { alerts, metric });
    }
  }

  /**
   * Get empty stats for when no metrics are available
   */
  private getEmptyStats(): PerformanceStats {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      successRate: 100,
      errorRate: 0,
      requestsPerSecond: 0,
      memoryUsage: {
        average: 0,
        peak: 0,
        current: process.memoryUsage().heapUsed,
      },
      topEndpoints: [],
      topErrors: [],
    };
  }
}
