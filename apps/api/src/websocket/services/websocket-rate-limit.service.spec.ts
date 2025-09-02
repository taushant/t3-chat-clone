import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketRateLimitService } from './websocket-rate-limit.service';

describe('WebSocketRateLimitService', () => {
  let service: WebSocketRateLimitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebSocketRateLimitService],
    }).compile();

    service = module.get<WebSocketRateLimitService>(WebSocketRateLimitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isConnectionAllowed', () => {
    it('should allow first connection attempt', () => {
      const ip = '192.168.1.1';
      expect(service.isConnectionAllowed(ip)).toBe(true);
    });

    it('should allow multiple connections within limit', () => {
      const ip = '192.168.1.2';
      
      // Make 4 attempts (within limit of 5)
      for (let i = 0; i < 4; i++) {
        expect(service.isConnectionAllowed(ip)).toBe(true);
      }
    });

    it('should block after exceeding connection limit', () => {
      const ip = '192.168.1.3';
      
      // Make 5 attempts (at limit)
      for (let i = 0; i < 5; i++) {
        expect(service.isConnectionAllowed(ip)).toBe(true);
      }
      
      // 6th attempt should be blocked
      expect(service.isConnectionAllowed(ip)).toBe(false);
    });

    it('should allow connections from different IPs', () => {
      const ip1 = '192.168.1.4';
      const ip2 = '192.168.1.5';
      
      // Block first IP
      for (let i = 0; i < 6; i++) {
        service.isConnectionAllowed(ip1);
      }
      
      // Second IP should still be allowed
      expect(service.isConnectionAllowed(ip2)).toBe(true);
    });
  });

  describe('isMessageAllowed', () => {
    it('should allow first message', () => {
      const userId = 'user1';
      expect(service.isMessageAllowed(userId)).toBe(true);
    });

    it('should allow multiple messages within limit', () => {
      const userId = 'user2';
      
      // Make 99 messages (within limit of 100)
      for (let i = 0; i < 99; i++) {
        expect(service.isMessageAllowed(userId)).toBe(true);
      }
    });

    it('should block after exceeding message limit', () => {
      const userId = 'user3';
      
      // Make 100 messages (at limit)
      for (let i = 0; i < 100; i++) {
        expect(service.isMessageAllowed(userId)).toBe(true);
      }
      
      // 101st message should be blocked
      expect(service.isMessageAllowed(userId)).toBe(false);
    });

    it('should allow messages from different users', () => {
      const userId1 = 'user4';
      const userId2 = 'user5';
      
      // Block first user
      for (let i = 0; i < 101; i++) {
        service.isMessageAllowed(userId1);
      }
      
      // Second user should still be allowed
      expect(service.isMessageAllowed(userId2)).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should clean up old data', () => {
      const ip = '192.168.1.6';
      
      // Make some attempts
      for (let i = 0; i < 3; i++) {
        service.isConnectionAllowed(ip);
      }
      
      // Cleanup should not throw
      expect(() => service.cleanup()).not.toThrow();
    });
  });
});
