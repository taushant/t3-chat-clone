import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionMonitoringService } from './connection-monitoring.service';

describe('ConnectionMonitoringService', () => {
  let service: ConnectionMonitoringService;
  let mockServer: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConnectionMonitoringService],
    }).compile();

    service = module.get<ConnectionMonitoringService>(ConnectionMonitoringService);
    mockServer = {
      emit: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordConnectionEvent', () => {
    it('should record connection event', () => {
      service.recordConnectionEvent('connect', 'socket-1', '192.168.1.1', 'test-agent', 'user-1');

      const events = service.getConnectionEvents(1);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('connect');
      expect(events[0].socketId).toBe('socket-1');
      expect(events[0].userId).toBe('user-1');
    });

    it('should limit events to 1000', () => {
      // Record 1001 events
      for (let i = 0; i < 1001; i++) {
        service.recordConnectionEvent('connect', `socket-${i}`, '192.168.1.1', 'test-agent');
      }

      const events = service.getConnectionEvents();
      expect(events).toHaveLength(1000);
    });
  });

  describe('recordConnectionStart', () => {
    it('should record connection start', () => {
      service.recordConnectionStart('socket-1');

      const metrics = service.getConnectionMetrics();
      expect(metrics.totalConnections).toBe(1);
      expect(metrics.activeConnections).toBe(1);
    });

    it('should update peak connections', () => {
      service.recordConnectionStart('socket-1');
      service.recordConnectionStart('socket-2');

      const metrics = service.getConnectionMetrics();
      expect(metrics.peakConnections).toBe(2);
    });
  });

  describe('recordConnectionEnd', () => {
    it('should record connection end', () => {
      service.recordConnectionStart('socket-1');
      service.recordConnectionEnd('socket-1');

      const metrics = service.getConnectionMetrics();
      expect(metrics.activeConnections).toBe(0);
    });

    it('should not go below zero active connections', () => {
      service.recordConnectionEnd('non-existent-socket');

      const metrics = service.getConnectionMetrics();
      expect(metrics.activeConnections).toBe(0);
    });

    it('should update average connection duration', () => {
      service.recordConnectionStart('socket-1');
      
      // Simulate some time passing
      setTimeout(() => {
        service.recordConnectionEnd('socket-1');
        
        const metrics = service.getConnectionMetrics();
        expect(metrics.averageConnectionDuration).toBeGreaterThan(0);
      }, 10);
    });
  });

  describe('getConnectionMetrics', () => {
    it('should return connection metrics', () => {
      service.recordConnectionStart('socket-1');
      service.recordConnectionEvent('connect', 'socket-1', '192.168.1.1', 'test-agent');

      const metrics = service.getConnectionMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalConnections).toBe(1);
      expect(metrics.activeConnections).toBe(1);
      expect(metrics.failedConnections).toBe(0);
      expect(metrics.peakConnections).toBe(1);
    });
  });

  describe('getConnectionEvents', () => {
    it('should return connection events', () => {
      service.recordConnectionEvent('connect', 'socket-1', '192.168.1.1', 'test-agent');
      service.recordConnectionEvent('disconnect', 'socket-1', '192.168.1.1', 'test-agent');

      const events = service.getConnectionEvents();
      expect(events).toHaveLength(2);
    });

    it('should limit events by limit parameter', () => {
      service.recordConnectionEvent('connect', 'socket-1', '192.168.1.1', 'test-agent');
      service.recordConnectionEvent('disconnect', 'socket-1', '192.168.1.1', 'test-agent');

      const events = service.getConnectionEvents(1);
      expect(events).toHaveLength(1);
    });
  });

  describe('getConnectionEventsByType', () => {
    it('should return events by type', () => {
      service.recordConnectionEvent('connect', 'socket-1', '192.168.1.1', 'test-agent');
      service.recordConnectionEvent('error', 'socket-2', '192.168.1.2', 'test-agent');

      const connectEvents = service.getConnectionEventsByType('connect');
      const errorEvents = service.getConnectionEventsByType('error');

      expect(connectEvents).toHaveLength(1);
      expect(errorEvents).toHaveLength(1);
      expect(connectEvents[0].type).toBe('connect');
      expect(errorEvents[0].type).toBe('error');
    });
  });

  describe('getConnectionEventsByUser', () => {
    it('should return events by user', () => {
      service.recordConnectionEvent('connect', 'socket-1', '192.168.1.1', 'test-agent', 'user-1');
      service.recordConnectionEvent('connect', 'socket-2', '192.168.1.2', 'test-agent', 'user-2');

      const user1Events = service.getConnectionEventsByUser('user-1');
      const user2Events = service.getConnectionEventsByUser('user-2');

      expect(user1Events).toHaveLength(1);
      expect(user2Events).toHaveLength(1);
      expect(user1Events[0].userId).toBe('user-1');
      expect(user2Events[0].userId).toBe('user-2');
    });
  });

  describe('getConnectionEventsByIP', () => {
    it('should return events by IP', () => {
      service.recordConnectionEvent('connect', 'socket-1', '192.168.1.1', 'test-agent');
      service.recordConnectionEvent('connect', 'socket-2', '192.168.1.2', 'test-agent');

      const ip1Events = service.getConnectionEventsByIP('192.168.1.1');
      const ip2Events = service.getConnectionEventsByIP('192.168.1.2');

      expect(ip1Events).toHaveLength(1);
      expect(ip2Events).toHaveLength(1);
      expect(ip1Events[0].ipAddress).toBe('192.168.1.1');
      expect(ip2Events[0].ipAddress).toBe('192.168.1.2');
    });
  });

  describe('getConnectionStats', () => {
    it('should return comprehensive connection stats', () => {
      service.recordConnectionEvent('connect', 'socket-1', '192.168.1.1', 'test-agent', 'user-1');
      service.recordConnectionEvent('error', 'socket-2', '192.168.1.2', 'test-agent', 'user-2');

      const stats = service.getConnectionStats();

      expect(stats).toBeDefined();
      expect(stats.metrics).toBeDefined();
      expect(stats.recentEvents).toBeDefined();
      expect(stats.topIPs).toBeDefined();
      expect(stats.topUserAgents).toBeDefined();
      expect(stats.errorRate).toBeDefined();
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status for normal conditions', () => {
      service.recordConnectionEvent('connect', 'socket-1', '192.168.1.1', 'test-agent');

      const health = service.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.issues).toHaveLength(0);
      expect(health.recommendations).toHaveLength(0);
    });

    it('should return warning status for high error rate', () => {
      // Record 10 events with 2 errors (20% error rate)
      for (let i = 0; i < 8; i++) {
        service.recordConnectionEvent('connect', `socket-${i}`, '192.168.1.1', 'test-agent');
      }
      for (let i = 0; i < 2; i++) {
        service.recordConnectionEvent('error', `socket-error-${i}`, '192.168.1.1', 'test-agent');
      }

      const health = service.getHealthStatus();

      expect(health.status).toBe('warning');
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.recommendations.length).toBeGreaterThan(0);
    });

    it('should return critical status for very high error rate', () => {
      // Record 10 events with 6 errors (60% error rate)
      for (let i = 0; i < 4; i++) {
        service.recordConnectionEvent('connect', `socket-${i}`, '192.168.1.1', 'test-agent');
      }
      for (let i = 0; i < 6; i++) {
        service.recordConnectionEvent('error', `socket-error-${i}`, '192.168.1.1', 'test-agent');
      }

      const health = service.getHealthStatus();

      expect(health.status).toBe('critical');
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', () => {
      service.recordConnectionStart('socket-1');
      service.recordConnectionEvent('connect', 'socket-1', '192.168.1.1', 'test-agent');

      service.resetMetrics();

      const metrics = service.getConnectionMetrics();
      expect(metrics.totalConnections).toBe(0);
      expect(metrics.failedConnections).toBe(0);
      expect(metrics.peakConnections).toBe(0);
    });
  });

  describe('cleanupOldData', () => {
    it('should clean up old data', () => {
      service.recordConnectionEvent('connect', 'socket-1', '192.168.1.1', 'test-agent');

      expect(() => service.cleanupOldData()).not.toThrow();
    });
  });
});
