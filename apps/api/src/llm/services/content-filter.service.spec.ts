import { Test, TestingModule } from '@nestjs/testing';
import { ContentFilterService } from './content-filter.service';
import { FilterResult } from '../types/content-moderation.types';

describe('ContentFilterService', () => {
  let service: ContentFilterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentFilterService],
    }).compile();

    service = module.get<ContentFilterService>(ContentFilterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('filterContent', () => {
    it('should filter text content', async () => {
      const content = 'This is a test message.';
      const context = {
        userId: 'user123',
        sessionId: 'session456',
        contentType: 'text' as any,
        userRole: 'user',
      };
      const result = await service.filterContent(content, context);

      expect(result).toBeDefined();
      expect(result.isBlocked).toBeDefined();
      expect(result.filteredContent).toBeDefined();
      expect(result.blockedRules).toBeDefined();
    });
  });

  describe('filterStreamingContent', () => {
    it('should filter streaming content chunk', async () => {
      const chunk = 'This is a streaming chunk.';
      const context = {
        userId: 'user123',
        sessionId: 'session456',
        contentType: 'text' as any,
        userRole: 'user',
      };
      const result = await service.filterStreamingContent(chunk, context);

      expect(result).toBeDefined();
      expect(result.isBlocked).toBeDefined();
      expect(result.filteredContent).toBeDefined();
      expect(result.blockedRules).toBeDefined();
    });
  });

  describe('getFilterStats', () => {
    it('should return filter statistics', () => {
      const stats = service.getFilterStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalFiltered).toBeDefined();
      expect(stats.filterTypes).toBeDefined();
    });
  });

  describe('getActiveFilters', () => {
    it('should return list of active filters', () => {
      const filters = service.getFilterRules();
      expect(filters).toBeDefined();
      expect(Array.isArray(filters)).toBe(true);
    });
  });
});
