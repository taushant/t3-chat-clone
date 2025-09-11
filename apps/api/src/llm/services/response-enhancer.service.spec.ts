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
        originalResponse: {},
        processedContent: 'This is a test response.',
        metadata: {
          processingTime: 100,
          contentLength: 50,
          wordCount: 10,
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
      const enhancers = service.getEnhancers();
      expect(enhancers).toBeDefined();
      expect(Array.isArray(enhancers)).toBe(true);
    });
  });

  describe('getAvailableEnhancements', () => {
    it('should return list of available enhancements', () => {
      const enhancements = service.getEnhancers();
      expect(enhancements).toBeDefined();
      expect(Array.isArray(enhancements)).toBe(true);
    });
  });
});
