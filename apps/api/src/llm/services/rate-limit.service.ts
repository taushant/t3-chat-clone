import { Injectable, Logger } from '@nestjs/common';
import { UsageStats, RateLimitConfig } from '../types/chat-completion.types';

/**
 * Rate limiting configuration for different limits
 */
interface RateLimitRule {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  maxTokens: number; // Maximum tokens per window
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
}

/**
 * Rate limit status
 */
interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Usage tracking for rate limiting
 */
interface UsageRecord {
  userId: string;
  provider: string;
  requests: number;
  tokens: number;
  windowStart: number;
  lastRequest: number;
}

/**
 * LLM Rate Limiting Service
 * Handles rate limiting for LLM providers with user-based and provider-based limits
 */
@Injectable()
export class LLMRateLimitService {
  private readonly logger = new Logger(LLMRateLimitService.name);
  
  // In-memory storage for rate limiting (in production, use Redis)
  private readonly usageRecords = new Map<string, UsageRecord>();
  private readonly rateLimitRules = new Map<string, RateLimitRule>();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default rate limiting rules for each provider
   */
  private initializeDefaultRules(): void {
    // OpenAI rate limits
    this.rateLimitRules.set('openai', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60, // 60 requests per minute
      maxTokens: 150000, // 150k tokens per minute
    });

    // Anthropic rate limits
    this.rateLimitRules.set('anthropic', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 50, // 50 requests per minute
      maxTokens: 40000, // 40k tokens per minute
    });

    // OpenRouter rate limits
    this.rateLimitRules.set('openrouter', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 requests per minute
      maxTokens: 100000, // 100k tokens per minute
    });

    this.logger.log('Rate limiting rules initialized');
  }

  /**
   * Check if a request is allowed based on rate limits
   * @param userId - User ID
   * @param provider - Provider name
   * @param estimatedTokens - Estimated tokens for the request
   * @returns RateLimitStatus - Rate limit status
   */
  async checkRateLimit(
    userId: string,
    provider: string,
    estimatedTokens: number = 0,
  ): Promise<RateLimitStatus> {
    try {
      const rule = this.rateLimitRules.get(provider);
      if (!rule) {
        this.logger.warn(`No rate limit rule found for provider: ${provider}`);
        return { allowed: true, remaining: Infinity, resetTime: Date.now() };
      }

      const key = `${userId}:${provider}`;
      const now = Date.now();
      const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;

      // Get or create usage record
      let record = this.usageRecords.get(key);
      if (!record || record.windowStart !== windowStart) {
        record = {
          userId,
          provider,
          requests: 0,
          tokens: 0,
          windowStart,
          lastRequest: now,
        };
        this.usageRecords.set(key, record);
      }

      // Check if request would exceed limits
      const wouldExceedRequests = record.requests + 1 > rule.maxRequests;
      const wouldExceedTokens = record.tokens + estimatedTokens > rule.maxTokens;

      if (wouldExceedRequests || wouldExceedTokens) {
        const resetTime = windowStart + rule.windowMs;
        const retryAfter = Math.ceil((resetTime - now) / 1000);

        this.logger.warn(
          `Rate limit exceeded for user ${userId} on provider ${provider}. ` +
          `Requests: ${record.requests}/${rule.maxRequests}, ` +
          `Tokens: ${record.tokens}/${rule.maxTokens}`,
        );

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter,
        };
      }

      // Calculate remaining capacity
      const remainingRequests = rule.maxRequests - record.requests - 1;
      const remainingTokens = rule.maxTokens - record.tokens - estimatedTokens;
      const remaining = Math.min(remainingRequests, Math.floor(remainingTokens / 1000)); // Approximate

      return {
        allowed: true,
        remaining,
        resetTime: windowStart + rule.windowMs,
      };

    } catch (error) {
      this.logger.error(`Error checking rate limit for user ${userId}:`, error);
      // Fail open - allow request if rate limiting fails
      return { allowed: true, remaining: Infinity, resetTime: Date.now() };
    }
  }

  /**
   * Record usage after a successful request
   * @param userId - User ID
   * @param provider - Provider name
   * @param tokens - Number of tokens used
   */
  async recordUsage(
    userId: string,
    provider: string,
    tokens: number,
  ): Promise<void> {
    try {
      const key = `${userId}:${provider}`;
      const now = Date.now();
      const rule = this.rateLimitRules.get(provider);
      
      if (!rule) {
        this.logger.warn(`No rate limit rule found for provider: ${provider}`);
        return;
      }

      const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;

      // Get or create usage record
      let record = this.usageRecords.get(key);
      if (!record || record.windowStart !== windowStart) {
        record = {
          userId,
          provider,
          requests: 0,
          tokens: 0,
          windowStart,
          lastRequest: now,
        };
      }

      // Update usage
      record.requests += 1;
      record.tokens += tokens;
      record.lastRequest = now;

      this.usageRecords.set(key, record);

      this.logger.debug(
        `Recorded usage for user ${userId} on provider ${provider}: ` +
        `${record.requests} requests, ${record.tokens} tokens`,
      );

    } catch (error) {
      this.logger.error(`Error recording usage for user ${userId}:`, error);
    }
  }

  /**
   * Get usage statistics for a user
   * @param userId - User ID
   * @param period - Time period ('day', 'week', 'month')
   * @returns UsageStats - Usage statistics
   */
  async getUsageStats(
    userId: string,
    period: 'day' | 'week' | 'month' = 'day',
  ): Promise<UsageStats[]> {
    try {
      const now = Date.now();
      const periodMs = this.getPeriodMs(period);
      const cutoffTime = now - periodMs;

      const stats: UsageStats[] = [];

      // Aggregate usage across all providers
      for (const [key, record] of this.usageRecords) {
        if (record.userId === userId && record.lastRequest >= cutoffTime) {
          const existingStat = stats.find(s => s.provider === record.provider);
          
          if (existingStat) {
            existingStat.totalRequests += record.requests;
            existingStat.totalTokens += record.tokens;
            existingStat.lastUsed = new Date(Math.max(
              existingStat.lastUsed.getTime(),
              record.lastRequest,
            ));
          } else {
            stats.push({
              userId,
              provider: record.provider,
              totalRequests: record.requests,
              totalTokens: record.tokens,
              totalCost: 0, // TODO: Calculate based on provider pricing
              lastUsed: new Date(record.lastRequest),
              period,
            });
          }
        }
      }

      return stats;

    } catch (error) {
      this.logger.error(`Error getting usage stats for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get rate limit configuration for a provider
   * @param provider - Provider name
   * @returns RateLimitConfig - Rate limit configuration
   */
  getProviderRateLimits(provider: string): RateLimitConfig | null {
    const rule = this.rateLimitRules.get(provider);
    if (!rule) {
      return null;
    }

    return {
      requestsPerMinute: Math.floor((rule.maxRequests * 60000) / rule.windowMs),
      tokensPerMinute: Math.floor((rule.maxTokens * 60000) / rule.windowMs),
      requestsPerDay: Math.floor((rule.maxRequests * 24 * 60 * 60000) / rule.windowMs),
      tokensPerDay: Math.floor((rule.maxTokens * 24 * 60 * 60000) / rule.windowMs),
    };
  }

  /**
   * Update rate limit rules for a provider
   * @param provider - Provider name
   * @param rule - New rate limit rule
   */
  updateRateLimitRule(provider: string, rule: RateLimitRule): void {
    this.rateLimitRules.set(provider, rule);
    this.logger.log(`Updated rate limit rule for provider ${provider}`);
  }

  /**
   * Clear usage records (useful for testing or manual reset)
   * @param userId - Optional user ID to clear specific user's records
   */
  clearUsageRecords(userId?: string): void {
    if (userId) {
      // Clear records for specific user
      for (const [key, record] of this.usageRecords) {
        if (record.userId === userId) {
          this.usageRecords.delete(key);
        }
      }
      this.logger.log(`Cleared usage records for user ${userId}`);
    } else {
      // Clear all records
      this.usageRecords.clear();
      this.logger.log('Cleared all usage records');
    }
  }

  /**
   * Get current usage for a user and provider
   * @param userId - User ID
   * @param provider - Provider name
   * @returns Current usage record or null
   */
  getCurrentUsage(userId: string, provider: string): UsageRecord | null {
    const key = `${userId}:${provider}`;
    return this.usageRecords.get(key) || null;
  }

  /**
   * Get all active rate limit rules
   * @returns Map of provider to rate limit rules
   */
  getAllRateLimitRules(): Map<string, RateLimitRule> {
    return new Map(this.rateLimitRules);
  }

  /**
   * Get period duration in milliseconds
   * @param period - Time period
   * @returns Duration in milliseconds
   */
  private getPeriodMs(period: 'day' | 'week' | 'month'): number {
    switch (period) {
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Clean up old usage records (should be called periodically)
   */
  cleanupOldRecords(): void {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoffTime = now - maxAge;

    let cleanedCount = 0;
    for (const [key, record] of this.usageRecords) {
      if (record.lastRequest < cutoffTime) {
        this.usageRecords.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} old usage records`);
    }
  }
}
