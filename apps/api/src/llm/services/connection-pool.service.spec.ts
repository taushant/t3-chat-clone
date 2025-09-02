import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionPoolService } from './connection-pool.service';
import { StreamingConnection } from '../types/streaming.types';

describe('ConnectionPoolService', () => {
  let service: ConnectionPoolService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConnectionPoolService],
    }).compile();

    service = module.get<ConnectionPoolService>(ConnectionPoolService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConnection', () => {
    it('should create a new connection', () => {
      const userId = 'user123';
      const requestId = 'req456';
      const connection = service.createConnection(userId, requestId);

      expect(connection).toBeDefined();
      expect(connection.id).toBeDefined();
      expect(connection.userId).toBe(userId);
      expect(connection.requestId).toBe(requestId);
      expect(connection.isActive).toBe(true);
    });
  });

  describe('getConnection', () => {
    it('should return a connection if it exists', () => {
      const userId = 'user123';
      const requestId = 'req456';
      const connection = service.createConnection(userId, requestId);

      const retrieved = service.getConnection(connection.id);
      expect(retrieved).toBe(connection);
    });

    it('should return undefined if connection does not exist', () => {
      const retrieved = service.getConnection('nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('closeConnection', () => {
    it('should close a connection', () => {
      const userId = 'user123';
      const requestId = 'req456';
      const connection = service.createConnection(userId, requestId);

      service.closeConnection(connection.id);
      expect(connection.isActive).toBe(false);
    });
  });

  describe('getActiveConnections', () => {
    it('should return all active connections', () => {
      const userId1 = 'user123';
      const requestId1 = 'req456';
      const userId2 = 'user789';
      const requestId2 = 'req012';

      const connection1 = service.createConnection(userId1, requestId1);
      const connection2 = service.createConnection(userId2, requestId2);

      const activeConnections = service.getUserConnections(userId1);
      expect(activeConnections).toHaveLength(1);
      expect(activeConnections).toContain(connection1);
    });
  });

  describe('getConnectionsByUser', () => {
    it('should return connections for a specific user', () => {
      const userId = 'user123';
      const requestId1 = 'req456';
      const requestId2 = 'req789';

      const connection1 = service.createConnection(userId, requestId1);
      const connection2 = service.createConnection(userId, requestId2);

      const userConnections = service.getUserConnections(userId);
      expect(userConnections).toHaveLength(2);
      expect(userConnections).toContain(connection1);
      expect(userConnections).toContain(connection2);
    });
  });
});