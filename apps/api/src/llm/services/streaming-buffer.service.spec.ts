import { Test, TestingModule } from '@nestjs/testing';
import { StreamingBufferService } from './streaming-buffer.service';
import { ChatCompletionChunk } from '../types/chat-completion.types';

describe('StreamingBufferService', () => {
  let service: StreamingBufferService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamingBufferService],
    }).compile();

    service = module.get<StreamingBufferService>(StreamingBufferService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBuffer', () => {
    it('should create a new buffer', () => {
      const connectionId = 'conn123';
      const buffer = service.createBuffer(connectionId);

      expect(buffer).toBeDefined();
      expect(buffer.connectionId).toBe(connectionId);
      expect(buffer.chunks).toEqual([]);
      expect(buffer.totalSize).toBe(0);
    });
  });

  describe('writeChunk', () => {
    it('should write a chunk to the buffer', () => {
      const connectionId = 'conn123';
      const buffer = service.createBuffer(connectionId);

      const chunk: ChatCompletionChunk = {
        id: 'chunk123',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            delta: { content: 'Hello' },
            finishReason: undefined,
          },
        ],
      };

      service.writeChunk(connectionId, chunk);
      expect(buffer.chunks).toHaveLength(1);
      expect(buffer.chunks[0]).toBe(chunk);
      expect(buffer.totalSize).toBeGreaterThan(0);
    });
  });

  describe('readChunks', () => {
    it('should read all chunks from the buffer', () => {
      const connectionId = 'conn123';
      const buffer = service.createBuffer(connectionId);

      const chunk1: ChatCompletionChunk = {
        id: 'chunk123',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            delta: { content: 'Hello' },
            finishReason: undefined,
          },
        ],
      };

      const chunk2: ChatCompletionChunk = {
        id: 'chunk124',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            delta: { content: ' World' },
            finishReason: undefined,
          },
        ],
      };

      service.writeChunk(connectionId, chunk1);
      service.writeChunk(connectionId, chunk2);

      const chunks = service.getChunks(connectionId);
      expect(chunks).toHaveLength(2);
      expect(chunks).toContain(chunk1);
      expect(chunks).toContain(chunk2);
    });
  });

  describe('clearBuffer', () => {
    it('should clear the buffer', () => {
      const connectionId = 'conn123';
      const buffer = service.createBuffer(connectionId);

      const chunk: ChatCompletionChunk = {
        id: 'chunk123',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            delta: { content: 'Hello' },
            finishReason: undefined,
          },
        ],
      };

      service.writeChunk(connectionId, chunk);
      service.clearBuffer(connectionId);

      expect(buffer.chunks).toEqual([]);
      expect(buffer.totalSize).toBe(0);
    });
  });

  describe('getBufferStats', () => {
    it('should return buffer statistics', () => {
      const connectionId = 'conn123';
      service.createBuffer(connectionId);

      const stats = service.getBufferStatus(connectionId);
      expect(stats).toBeDefined();
      expect(stats?.chunkCount).toBe(0);
      expect(stats?.totalSize).toBe(0);
    });
  });
});