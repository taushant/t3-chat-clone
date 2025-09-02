import { Test, TestingModule } from '@nestjs/testing';
import { StreamingStateService } from './streaming-state.service';
import { StreamingState } from '../types/streaming.types';

describe('StreamingStateService', () => {
  let service: StreamingStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamingStateService],
    }).compile();

    service = module.get<StreamingStateService>(StreamingStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create a new streaming session', () => {
      const userId = 'user123';
      const requestId = 'req456';
      const provider = 'openai';
      const model = 'gpt-3.5-turbo';
      const session = service.createSession(userId, requestId, provider, model);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.requestId).toBe(requestId);
      expect(session.provider).toBe(provider);
      expect(session.model).toBe(model);
    });
  });

  describe('updateSession', () => {
    it('should update a session state', () => {
      const userId = 'user123';
      const requestId = 'req456';
      const provider = 'openai';
      const model = 'gpt-3.5-turbo';
      const session = service.createSession(userId, requestId, provider, model);

      const newState: StreamingState = {
        status: 'streaming' as any,
        progress: 0.5,
        totalChunks: 10,
      };

      service.updateSession(session.id, newState);
      expect(session.currentState).toBe(newState);
    });
  });

  describe('getSession', () => {
    it('should return a session if it exists', () => {
      const userId = 'user123';
      const requestId = 'req456';
      const provider = 'openai';
      const model = 'gpt-3.5-turbo';
      const session = service.createSession(userId, requestId, provider, model);

      const retrieved = service.getSession(session.id);
      expect(retrieved).toBe(session);
    });

    it('should return undefined if session does not exist', () => {
      const retrieved = service.getSession('nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });



  describe('getActiveSessions', () => {
    it('should return all active sessions', () => {
      const userId1 = 'user123';
      const requestId1 = 'req456';
      const userId2 = 'user789';
      const requestId2 = 'req012';

      const session1 = service.createSession(userId1, requestId1, 'openai', 'gpt-3.5-turbo');
      const session2 = service.createSession(userId2, requestId2, 'openai', 'gpt-3.5-turbo');

      const activeSessions = service.getActiveUserSessions(userId1);
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions).toContain(session1);
    });
  });

  describe('getSessionsByUser', () => {
    it('should return sessions for a specific user', () => {
      const userId = 'user123';
      const requestId1 = 'req456';
      const requestId2 = 'req789';

      const session1 = service.createSession(userId, requestId1, 'openai', 'gpt-3.5-turbo');
      const session2 = service.createSession(userId, requestId2, 'openai', 'gpt-3.5-turbo');

      const userSessions = service.getActiveUserSessions(userId);
      expect(userSessions).toHaveLength(2);
      expect(userSessions).toContain(session1);
      expect(userSessions).toContain(session2);
    });
  });
});