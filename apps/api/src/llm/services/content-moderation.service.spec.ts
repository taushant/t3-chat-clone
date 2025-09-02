import { Test, TestingModule } from '@nestjs/testing';
import { ContentModerationService } from './content-moderation.service';
import { ContentType, ModerationResult } from '../types/content-moderation.types';

describe('ContentModerationService', () => {
  let service: ContentModerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentModerationService],
    }).compile();

    service = module.get<ContentModerationService>(ContentModerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('moderateContent', () => {
    it('should moderate text content', async () => {
      const content = 'This is a test message.';
      const type = ContentType.TEXT;
      const context = {
        userId: 'user123',
        sessionId: 'session456',
        contentType: type,
      };
      const result = await service.moderateContent(content, type, context);

      expect(result).toBeDefined();
      expect(result.isApproved).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.flags).toBeDefined();
    });
  });

  describe('moderateStreamingContent', () => {
    it('should moderate streaming content chunk', async () => {
      const chunk = 'This is a streaming chunk.';
      const context = {
        userId: 'user123',
        sessionId: 'session456',
        contentType: ContentType.TEXT,
        previousChunks: [],
      };
      const result = await service.moderateStreamingContent(chunk, context);

      expect(result).toBeDefined();
      expect(result.isApproved).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.flags).toBeDefined();
    });
  });

  describe('getModerationHistory', () => {
    it('should return moderation history for a user', () => {
      const userId = 'user123';
      const history = service.getModerationHistory(userId);

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('getModerationStats', () => {
    it('should return moderation statistics', () => {
      const stats = service.getModerationStats();
      expect(stats).toBeDefined();
      expect(stats.totalModerated).toBeDefined();
      expect(stats.approvedContent).toBeDefined();
      expect(stats.rejectedContentCount).toBeDefined();
    });
  });
});
