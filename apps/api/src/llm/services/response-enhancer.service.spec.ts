import { Test, TestingModule } from '@nestjs/testing';
import { ResponseEnhancerService } from './response-enhancer.service';
import { ProcessedResponse } from '../types/response-processing.types';

describe('ResponseEnhancerService', () => {
  let service: ResponseEnhancerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseEnhancerService],
    }).compile();

    service = module.get<ResponseEnhancerService>(ResponseEnhancerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enhanceResponse', () => {
    it('should enhance a processed response', async () => {
      const response: ProcessedResponse = {
        id: 'resp123',
        processedContent: 'This is a test response.',
        metadata: {
          processingTime: 100,
          contentLength: 50,
          wordCount: 10,
        },
      };

      const enhanced = await service.enhanceResponse(response);
      expect(enhanced).toBeDefined();
      expect(enhanced.id).toBe(response.id);
      expect(enhanced.processedContent).toBeDefined();
      expect(enhanced.enhancements).toBeDefined();
    });
  });

  describe('getEnhancementStats', () => {
    it('should return enhancement statistics', () => {
      const stats = service.getEnhancementStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalEnhanced).toBeDefined();
      expect(stats.enhancementTypes).toBeDefined();
    });
  });

  describe('getAvailableEnhancements', () => {
    it('should return list of available enhancements', () => {
      const enhancements = service.getAvailableEnhancementTypes();
      expect(enhancements).toBeDefined();
      expect(Array.isArray(enhancements)).toBe(true);
    });
  });
});
