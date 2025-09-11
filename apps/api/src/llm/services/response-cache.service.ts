import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { 
  ResponseCache,
  CacheMetadata,
  ProcessedResponse,
  CacheStats,
  CacheStrategy,
} from '../types/response-processing.types';

/**
 * Response Cache Service
 * Manages caching of processed responses with TTL and eviction strategies
 */
@Injectable()
export class ResponseCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(ResponseCacheService.name);
  private readonly cache = new Map<string, ResponseCache>();
  private readonly accessTimes = new Map<string, Date>();
  private readonly accessCounts = new Map<string, number>();
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private readonly strategy: CacheStrategy;
  private cleanupInterval!: NodeJS.Timeout;

  constructor() {
    this.maxSize = 1000; // Maximum number of cached responses
    this.defaultTTL = 3600000; // 1 hour default TTL
    this.strategy = CacheStrategy.LRU; // Least Recently Used eviction strategy

    this.startCleanupInterval();
  }

  /**
   * Cache a processed response
   * @param key - Cache key
   * @param response - Processed response to cache
   * @param ttl - Time to live in milliseconds
   */
  cacheResponse(key: string, response: ProcessedResponse, ttl?: number): void {
    this.logger.debug(`Caching response with key: ${key}`);

    try {
      // Check if we need to evict entries
      if (this.cache.size >= this.maxSize) {
        this.evictEntries();
      }

      const expiresAt = new Date(Date.now() + (ttl || this.defaultTTL));
      const cacheEntry: ResponseCache = {
        key,
        response,
        metadata: {
          userId: (response.metadata as any).userId || 'unknown',
          sessionId: (response.metadata as any).sessionId,
          provider: this.extractProviderFromModel(response.originalResponse.model),
          model: response.originalResponse.model,
          contentHash: this.generateContentHash(response.processedContent),
          size: this.calculateResponseSize(response),
          ttl: ttl || this.defaultTTL,
        },
        createdAt: new Date(),
        expiresAt,
        accessCount: 0,
        lastAccessed: new Date(),
      };

      this.cache.set(key, cacheEntry);
      this.accessTimes.set(key, new Date());
      this.accessCounts.set(key, 0);

      this.logger.debug(`Cached response with key: ${key}, expires at: ${expiresAt.toISOString()}`);

    } catch (error) {
      this.logger.error(`Failed to cache response with key ${key}:`, error);
    }
  }

  /**
   * Get a cached response
   * @param key - Cache key
   * @returns Cached response or null
   */
  getCachedResponse(key: string): ProcessedResponse | null {
    this.logger.debug(`Getting cached response with key: ${key}`);

    try {
      const cacheEntry = this.cache.get(key);
      
      if (!cacheEntry) {
        this.logger.debug(`Cache miss for key: ${key}`);
        return null;
      }

      // Check if entry has expired
      if (new Date() > cacheEntry.expiresAt) {
        this.logger.debug(`Cache entry expired for key: ${key}`);
        this.cache.delete(key);
        this.accessTimes.delete(key);
        this.accessCounts.delete(key);
        return null;
      }

      // Update access information
      cacheEntry.accessCount++;
      cacheEntry.lastAccessed = new Date();
      this.accessTimes.set(key, new Date());
      this.accessCounts.set(key, cacheEntry.accessCount);

      this.logger.debug(`Cache hit for key: ${key}, access count: ${cacheEntry.accessCount}`);

      return cacheEntry.response;

    } catch (error) {
      this.logger.error(`Failed to get cached response with key ${key}:`, error);
      return null;
    }
  }

  /**
   * Invalidate cache entry
   * @param key - Cache key to invalidate
   */
  invalidateCache(key: string): void {
    this.logger.debug(`Invalidating cache entry with key: ${key}`);

    this.cache.delete(key);
    this.accessTimes.delete(key);
    this.accessCounts.delete(key);
  }

  /**
   * Invalidate cache entries by pattern
   * @param pattern - Pattern to match keys
   */
  invalidateCacheByPattern(pattern: string | RegExp): void {
    this.logger.debug(`Invalidating cache entries by pattern: ${pattern}`);

    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.invalidateCache(key);
    }

    this.logger.debug(`Invalidated ${keysToDelete.length} cache entries`);
  }

  /**
   * Invalidate cache entries for a user
   * @param userId - User ID
   */
  invalidateUserCache(userId: string): void {
    this.logger.debug(`Invalidating cache entries for user: ${userId}`);

    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata.userId === userId) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.invalidateCache(key);
    }

    this.logger.debug(`Invalidated ${keysToDelete.length} cache entries for user ${userId}`);
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache(): void {
    this.logger.debug('Cleaning up expired cache entries');

    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.invalidateCache(key);
    }

    if (keysToDelete.length > 0) {
      this.logger.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   * @returns CacheStats
   */
  getCacheStats(): CacheStats {
    const totalEntries = this.cache.size;
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.metadata.size, 0);

    // Calculate hit rate (simplified - in production, track hits/misses)
    const hitRate = 0.8; // Placeholder
    const missRate = 1 - hitRate;

    // Calculate average access time
    const accessTimes = Array.from(this.accessTimes.values());
    const averageAccessTime = accessTimes.length > 0
      ? accessTimes.reduce((sum, time) => sum + time.getTime(), 0) / accessTimes.length
      : 0;

    return {
      totalEntries,
      hitRate,
      missRate,
      averageAccessTime,
      totalSize,
      evictionCount: 0, // Would track in production
    };
  }

  /**
   * Get cache entry metadata
   * @param key - Cache key
   * @returns Cache metadata or null
   */
  getCacheMetadata(key: string): CacheMetadata | null {
    const entry = this.cache.get(key);
    return entry ? entry.metadata : null;
  }

  /**
   * Check if cache entry exists
   * @param key - Cache key
   * @returns true if exists and not expired
   */
  hasCacheEntry(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.invalidateCache(key);
      return false;
    }

    return true;
  }

  /**
   * Get all cache keys
   * @returns Array of cache keys
   */
  getAllCacheKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entries by user
   * @param userId - User ID
   * @returns Array of cache entries
   */
  getCacheEntriesByUser(userId: string): ResponseCache[] {
    return Array.from(this.cache.values())
      .filter(entry => entry.metadata.userId === userId);
  }

  /**
   * Get cache entries by provider
   * @param provider - Provider name
   * @returns Array of cache entries
   */
  getCacheEntriesByProvider(provider: string): ResponseCache[] {
    return Array.from(this.cache.values())
      .filter(entry => entry.metadata.provider === provider);
  }

  /**
   * Get cache entries by model
   * @param model - Model name
   * @returns Array of cache entries
   */
  getCacheEntriesByModel(model: string): ResponseCache[] {
    return Array.from(this.cache.values())
      .filter(entry => entry.metadata.model === model);
  }

  /**
   * Clear all cache entries
   */
  clearAllCache(): void {
    this.logger.log('Clearing all cache entries');

    this.cache.clear();
    this.accessTimes.clear();
    this.accessCounts.clear();
  }

  /**
   * Evict entries based on strategy
   */
  private evictEntries(): void {
    this.logger.debug(`Evicting entries using ${this.strategy} strategy`);

    const entriesToEvict = this.strategy === CacheStrategy.LRU
      ? this.getLRUEntries()
      : this.strategy === CacheStrategy.LFU
      ? this.getLFUEntries()
      : this.getFIFOEntries();

    for (const key of entriesToEvict) {
      this.invalidateCache(key);
    }

    this.logger.debug(`Evicted ${entriesToEvict.length} entries`);
  }

  /**
   * Get least recently used entries
   * @returns Array of keys to evict
   */
  private getLRUEntries(): string[] {
    const sortedEntries = Array.from(this.accessTimes.entries())
      .sort((a, b) => a[1].getTime() - b[1].getTime());

    const evictCount = Math.floor(this.maxSize * 0.1); // Evict 10% of entries
    return sortedEntries.slice(0, evictCount).map(([key]) => key);
  }

  /**
   * Get least frequently used entries
   * @returns Array of keys to evict
   */
  private getLFUEntries(): string[] {
    const sortedEntries = Array.from(this.accessCounts.entries())
      .sort((a, b) => a[1] - b[1]);

    const evictCount = Math.floor(this.maxSize * 0.1); // Evict 10% of entries
    return sortedEntries.slice(0, evictCount).map(([key]) => key);
  }

  /**
   * Get first in, first out entries
   * @returns Array of keys to evict
   */
  private getFIFOEntries(): string[] {
    const sortedEntries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());

    const evictCount = Math.floor(this.maxSize * 0.1); // Evict 10% of entries
    return sortedEntries.slice(0, evictCount).map(([key]) => key);
  }

  /**
   * Generate content hash
   * @param content - Content to hash
   * @returns Content hash
   */
  private generateContentHash(content: string): string {
    // Simple hash function - in production, use crypto.createHash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Calculate response size in bytes
   * @param response - Processed response
   * @returns Size in bytes
   */
  private calculateResponseSize(response: ProcessedResponse): number {
    return JSON.stringify(response).length;
  }

  /**
   * Extract provider from model name
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
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, 300000); // Clean up every 5 minutes
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.clearAllCache();
    this.logger.log('Response cache service destroyed');
  }
}
