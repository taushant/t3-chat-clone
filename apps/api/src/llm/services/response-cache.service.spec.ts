import { Test, TestingModule } from '@nestjs/testing';
import { ResponseCacheService } from './response-cache.service';
import { ProcessedResponse } from '../types/response-processing.types';

describe('ResponseCacheService', () => {
  let service: ResponseCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseCacheService],
    }).compile();

    service = module.get<ResponseCacheService>(ResponseCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cacheResponse', () => {
    it('should cache a processed response', () => {
      const key = 'cache123';
      const response: ProcessedResponse = {
        id: 'resp123',
        processedContent: 'This is a test response.',
        metadata: {
          processingTime: 100,
          contentLength: 50,
          wordCount: 10,
        },
      };

      service.cacheResponse(key, response);
      const cached = service.getCachedResponse(key);
      expect(cached).toBeDefined();
      expect(cached).toBe(response);
    });
  });

  describe('getCachedResponse', () => {
    it('should return cached response if it exists', () => {
      const key = 'cache123';
      const response: ProcessedResponse = {
        id: 'resp123',
        processedContent: 'This is a test response.',
        metadata: {
          processingTime: 100,
          contentLength: 50,
          wordCount: 10,
        },
      };

      service.cacheResponse(key, response);
      const cached = service.getCachedResponse(key);
      expect(cached).toBeDefined();
      expect(cached).toBe(response);
    });

    it('should return null if response is not cached', () => {
      const cached = service.getCachedResponse('nonexistent');
      expect(cached).toBeNull();
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cached response', () => {
      const key = 'cache123';
      const response: ProcessedResponse = {
        id: 'resp123',
        processedContent: 'This is a test response.',
        metadata: {
          processingTime: 100,
          contentLength: 50,
          wordCount: 10,
        },
      };

      service.cacheResponse(key, response);
      service.invalidateCache(key);
      const cached = service.getCachedResponse(key);
      expect(cached).toBeNull();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = service.getCacheStats();
      expect(stats).toBeDefined();
      expect(stats.totalEntries).toBeDefined();
      expect(stats.hitRate).toBeDefined();
    });
  });

  describe('clearCache', () => {
    it('should clear all cached responses', () => {
      const key = 'cache123';
      const response: ProcessedResponse = {
        id: 'resp123',
        processedContent: 'This is a test response.',
        metadata: {
          processingTime: 100,
          contentLength: 50,
          wordCount: 10,
        },
      };

      service.cacheResponse(key, response);
      service.clearAllCache();
      const cached = service.getCachedResponse(key);
      expect(cached).toBeNull();
    });
  });
});
