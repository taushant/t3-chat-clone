import { Test, TestingModule } from '@nestjs/testing';
import { LLMRateLimitService } from './rate-limit.service';

describe('LLMRateLimitService', () => {
  let service: LLMRateLimitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LLMRateLimitService],
    }).compile();

    service = module.get<LLMRateLimitService>(LLMRateLimitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkRateLimit', () => {
    it('should allow request within rate limits', async () => {
      const result = await service.checkRateLimit('user1', 'openai', 1000);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should reject request exceeding rate limits', async () => {
      const userId = 'user2';
      const provider = 'openai';
      
      // Make multiple requests to exceed the limit
      for (let i = 0; i < 70; i++) {
        await service.recordUsage(userId, provider, 1000);
      }
      
      const result = await service.checkRateLimit(userId, provider, 1000);
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should handle unknown provider gracefully', async () => {
      const result = await service.checkRateLimit('user1', 'unknown-provider', 1000);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });
  });

  describe('recordUsage', () => {
    it('should record usage correctly', async () => {
      const userId = 'user3';
      const provider = 'anthropic';
      const tokens = 500;
      
      await service.recordUsage(userId, provider, tokens);
      
      const usage = service.getCurrentUsage(userId, provider);
      expect(usage).toBeDefined();
      expect(usage?.requests).toBe(1);
      expect(usage?.tokens).toBe(tokens);
      expect(usage?.userId).toBe(userId);
      expect(usage?.provider).toBe(provider);
    });

    it('should accumulate usage within the same window', async () => {
      const userId = 'user4';
      const provider = 'openrouter';
      
      await service.recordUsage(userId, provider, 100);
      await service.recordUsage(userId, provider, 200);
      await service.recordUsage(userId, provider, 300);
      
      const usage = service.getCurrentUsage(userId, provider);
      expect(usage?.requests).toBe(3);
      expect(usage?.tokens).toBe(600);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics for a user', async () => {
      const userId = 'user5';
      const provider = 'openai';
      
      await service.recordUsage(userId, provider, 1000);
      await service.recordUsage(userId, provider, 2000);
      
      const stats = await service.getUsageStats(userId, 'day');
      
      expect(stats).toHaveLength(1);
      expect(stats[0].userId).toBe(userId);
      expect(stats[0].provider).toBe(provider);
      expect(stats[0].totalRequests).toBe(2);
      expect(stats[0].totalTokens).toBe(3000);
      expect(stats[0].period).toBe('day');
    });

    it('should return empty array for user with no usage', async () => {
      const stats = await service.getUsageStats('nonexistent-user', 'day');
      expect(stats).toHaveLength(0);
    });
  });

  describe('getProviderRateLimits', () => {
    it('should return rate limits for known provider', () => {
      const limits = service.getProviderRateLimits('openai');
      
      expect(limits).toBeDefined();
      expect(limits?.requestsPerMinute).toBeGreaterThan(0);
      expect(limits?.tokensPerMinute).toBeGreaterThan(0);
      expect(limits?.requestsPerDay).toBeGreaterThan(0);
      expect(limits?.tokensPerDay).toBeGreaterThan(0);
    });

    it('should return null for unknown provider', () => {
      const limits = service.getProviderRateLimits('unknown-provider');
      expect(limits).toBeNull();
    });
  });

  describe('clearUsageRecords', () => {
    it('should clear usage records for specific user', async () => {
      const userId = 'user6';
      const provider = 'anthropic';
      
      await service.recordUsage(userId, provider, 1000);
      await service.recordUsage('other-user', provider, 1000);
      
      service.clearUsageRecords(userId);
      
      const userUsage = service.getCurrentUsage(userId, provider);
      const otherUsage = service.getCurrentUsage('other-user', provider);
      
      expect(userUsage).toBeNull();
      expect(otherUsage).toBeDefined();
    });

    it('should clear all usage records when no user specified', async () => {
      await service.recordUsage('user1', 'openai', 1000);
      await service.recordUsage('user2', 'anthropic', 1000);
      
      service.clearUsageRecords();
      
      const usage1 = service.getCurrentUsage('user1', 'openai');
      const usage2 = service.getCurrentUsage('user2', 'anthropic');
      
      expect(usage1).toBeNull();
      expect(usage2).toBeNull();
    });
  });

  describe('updateRateLimitRule', () => {
    it('should update rate limit rule for provider', () => {
      const newRule = {
        windowMs: 60000,
        maxRequests: 100,
        maxTokens: 200000,
      };
      
      service.updateRateLimitRule('test-provider', newRule);
      
      const limits = service.getProviderRateLimits('test-provider');
      expect(limits).toBeDefined();
      expect(limits?.requestsPerMinute).toBe(100);
      expect(limits?.tokensPerMinute).toBe(200000);
    });
  });

  describe('cleanupOldRecords', () => {
    it('should clean up old usage records', async () => {
      const userId = 'user7';
      const provider = 'openai';
      
      // Create a record
      await service.recordUsage(userId, provider, 1000);
      
      // Manually set old timestamp
      const usage = service.getCurrentUsage(userId, provider);
      if (usage) {
        usage.lastRequest = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
      }
      
      service.cleanupOldRecords();
      
      const cleanedUsage = service.getCurrentUsage(userId, provider);
      expect(cleanedUsage).toBeNull();
    });
  });
});
