import { Test, TestingModule } from '@nestjs/testing';
import { ResponseCacheService } from './response-cache.service';
import { ProcessedResponse } from '../types/response-processing.types';

describe('ResponseCacheService', () => {
  let service: ResponseCacheService;

  const createMockResponse = (id: string, content: string): ProcessedResponse => ({
    id,
    originalResponse: {},
    processedContent: content,
    metadata: {
      processingTime: 100,
      contentLength: content.length,
      wordCount: content.split(' ').length,
    },
    enhancements: {
      markdownProcessed: false,
      syntaxHighlighted: false,
      linksExtracted: [],
      imagesExtracted: [],
      codeBlocksExtracted: [],
      tablesExtracted: [],
      citationsExtracted: [],
      summariesGenerated: [],
    },
    quality: {
      score: 0.8,
      factors: [],
      suggestions: [],
      readability: {
        score: 0.8,
        level: 'intermediate' as any,
        suggestions: [],
        metrics: {
          averageWordsPerSentence: 15,
          averageSyllablesPerWord: 2,
          complexWords: 5,
          totalWords: 100,
          totalSentences: 10,
          fleschKincaid: 8,
          gunningFog: 12,
          smog: 10,
        },
      },
      coherence: 0.8,
      relevance: 0.8,
      completeness: 0.8,
    },
    timestamp: new Date(),
  });

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
      const response = createMockResponse('resp123', 'This is a test response.');

      service.cacheResponse(key, response);
      const cached = service.getCachedResponse(key);
      expect(cached).toBeDefined();
      expect(cached).toBe(response);
    });
  });

  describe('getCachedResponse', () => {
    it('should return cached response if it exists', () => {
      const key = 'cache123';
      const response = createMockResponse('resp123', 'This is a test response.');

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
      const response = createMockResponse('resp123', 'This is a test response.');

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
      const response = createMockResponse('resp123', 'This is a test response.');

      service.cacheResponse(key, response);
      service.clearAllCache();
      const cached = service.getCachedResponse(key);
      expect(cached).toBeNull();
    });
  });
});
