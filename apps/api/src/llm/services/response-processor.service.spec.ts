import { Test, TestingModule } from '@nestjs/testing';
import { ResponseProcessorService } from './response-processor.service';
import { ProcessedResponse } from '../types/response-processing.types';

describe('ResponseProcessorService', () => {
  let service: ResponseProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseProcessorService],
    }).compile();

    service = module.get<ResponseProcessorService>(ResponseProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processResponse', () => {
    it('should process an LLM response', async () => {
      const response: any = {
        id: 'resp123',
        content: 'This is a test response.',
        model: 'gpt-3.5-turbo',
        timestamp: new Date(),
        metadata: {},
      };

      const processed = await service.processResponse(response);
      expect(processed).toBeDefined();
      expect(processed.id).toBe(response.id);
      expect(processed.processedContent).toBeDefined();
      expect(processed.metadata).toBeDefined();
    });
  });

  describe('processStreamingResponse', () => {
    it('should process a streaming response chunk', async () => {
      const chunk = {
        id: 'chunk123',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            delta: { content: 'Hello' },
            finish_reason: null,
          },
        ],
      };

      const processed = await service.processStreamingResponse(chunk);
      expect(processed).toBeDefined();
      expect(processed.id).toBe(chunk.id);
      expect(processed.processedContent).toBeDefined();
      expect(processed.metadata).toBeDefined();
    });
  });

  describe('getProcessingStats', () => {
    it('should return processing statistics', () => {
      const stats = service.getProcessingStats();
      expect(stats).toBeDefined();
      expect(stats.totalResponses).toBeDefined();
      expect(stats.averageProcessingTime).toBeDefined();
    });
  });

  describe('getActiveProcessors', () => {
    it('should return list of active processors', () => {
      const processors = service.getProcessors();
      expect(processors).toBeDefined();
      expect(Array.isArray(processors)).toBe(true);
    });
  });
});
