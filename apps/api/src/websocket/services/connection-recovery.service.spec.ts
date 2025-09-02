import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionRecoveryService } from './connection-recovery.service';
import { RoomManagementService } from './room-management.service';
import { MessagingService } from './messaging.service';
import { PresenceService } from './presence.service';
import { Server } from 'socket.io';

describe('ConnectionRecoveryService', () => {
  let service: ConnectionRecoveryService;
  let mockRoomManagementService: jest.Mocked<RoomManagementService>;
  let mockMessagingService: jest.Mocked<MessagingService>;
  let mockPresenceService: jest.Mocked<PresenceService>;
  let mockServer: jest.Mocked<Server>;

  const mockClient = {
    id: 'test-socket-id',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
    },
    join: jest.fn(),
    emit: jest.fn(),
  } as any;

  beforeEach(async () => {
    const mockRoomManagementServiceValue = {
      addUserToRoom: jest.fn(),
    };

    const mockMessagingServiceValue = {
      sendMessage: jest.fn(),
    };

    const mockPresenceServiceValue = {
      handleUserConnection: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionRecoveryService,
        {
          provide: RoomManagementService,
          useValue: mockRoomManagementServiceValue,
        },
        {
          provide: MessagingService,
          useValue: mockMessagingServiceValue,
        },
        {
          provide: PresenceService,
          useValue: mockPresenceServiceValue,
        },
      ],
    }).compile();

    service = module.get<ConnectionRecoveryService>(ConnectionRecoveryService);
    mockRoomManagementService = module.get(RoomManagementService);
    mockMessagingService = module.get(MessagingService);
    mockPresenceService = module.get(PresenceService);

    mockServer = {
      emit: jest.fn(),
    } as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConnectionSession', () => {
    it('should create a connection session', () => {
      const recoveryToken = service.createConnectionSession(mockServer, mockClient);

      expect(recoveryToken).toBeDefined();
      expect(typeof recoveryToken).toBe('string');
      expect(mockClient.emit).toHaveBeenCalledWith('connection:recovery-token', expect.any(Object));
    });

    it('should throw error if user is not authenticated', () => {
      const unauthenticatedClient = { ...mockClient, user: undefined };

      expect(() => service.createConnectionSession(mockServer, unauthenticatedClient))
        .toThrow('User not authenticated');
    });
  });

  describe('recoverConnection', () => {
    it('should recover connection with valid token', async () => {
      // First create a session
      const recoveryToken = service.createConnectionSession(mockServer, mockClient);
      
      // Then recover with new client
      const newClient = { ...mockClient, id: 'new-socket-id' };
      const result = await service.recoverConnection(mockServer, newClient, recoveryToken);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection recovered successfully');
      expect(newClient.emit).toHaveBeenCalledWith('connection:recovered', expect.any(Object));
    });

    it('should fail if user is not authenticated', async () => {
      const unauthenticatedClient = { ...mockClient, user: undefined };
      const result = await service.recoverConnection(mockServer, unauthenticatedClient, 'invalid-token');

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not authenticated');
    });

    it('should fail with invalid recovery token', async () => {
      const result = await service.recoverConnection(mockServer, mockClient, 'invalid-token');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid recovery token');
    });

    it('should fail if no session found for recovery', async () => {
      // Create a session for different user
      const otherClient = { ...mockClient, user: { ...mockClient.user, id: 'other-user-id' } };
      service.createConnectionSession(mockServer, otherClient);
      
      const result = await service.recoverConnection(mockServer, mockClient, 'some-token');

      expect(result.success).toBe(false);
      expect(result.message).toBe('No session found for recovery');
    });
  });

  describe('updateSessionActivity', () => {
    it('should update session activity', () => {
      const recoveryToken = service.createConnectionSession(mockServer, mockClient);
      const sessionInfo = service.getSessionInfo(mockClient.id);

      expect(sessionInfo).toBeDefined();
      
      // Update activity
      service.updateSessionActivity(mockClient.id);
      
      const updatedSessionInfo = service.getSessionInfo(mockClient.id);
      expect(updatedSessionInfo?.lastActivity).toBeDefined();
    });
  });

  describe('addRoomToSession', () => {
    it('should add room to session', () => {
      const recoveryToken = service.createConnectionSession(mockServer, mockClient);
      service.addRoomToSession(mockClient.id, 'test-room-id');

      const sessionInfo = service.getSessionInfo(mockClient.id);
      expect(sessionInfo?.rooms).toContain('test-room-id');
    });

    it('should not add duplicate room', () => {
      const recoveryToken = service.createConnectionSession(mockServer, mockClient);
      service.addRoomToSession(mockClient.id, 'test-room-id');
      service.addRoomToSession(mockClient.id, 'test-room-id');

      const sessionInfo = service.getSessionInfo(mockClient.id);
      expect(sessionInfo?.rooms.filter(room => room === 'test-room-id')).toHaveLength(1);
    });
  });

  describe('removeRoomFromSession', () => {
    it('should remove room from session', () => {
      const recoveryToken = service.createConnectionSession(mockServer, mockClient);
      service.addRoomToSession(mockClient.id, 'test-room-id');
      service.removeRoomFromSession(mockClient.id, 'test-room-id');

      const sessionInfo = service.getSessionInfo(mockClient.id);
      expect(sessionInfo?.rooms).not.toContain('test-room-id');
    });
  });

  describe('queueMessage', () => {
    it('should queue message for user', () => {
      const recoveryToken = service.createConnectionSession(mockServer, mockClient);
      const message = {
        id: 'test-message-id',
        chatId: 'test-chat-id',
        content: 'Test message',
        type: 'text',
      };

      service.queueMessage('test-user-id', message);

      const sessionInfo = service.getSessionInfo(mockClient.id);
      expect(sessionInfo?.messageQueue).toHaveLength(1);
      expect(sessionInfo?.messageQueue[0].id).toBe('test-message-id');
    });
  });

  describe('getSessionInfo', () => {
    it('should return session info', () => {
      const recoveryToken = service.createConnectionSession(mockServer, mockClient);
      const sessionInfo = service.getSessionInfo(mockClient.id);

      expect(sessionInfo).toBeDefined();
      expect(sessionInfo?.userId).toBe('test-user-id');
      expect(sessionInfo?.socketId).toBe('test-socket-id');
      expect(sessionInfo?.recoveryToken).toBe(recoveryToken);
    });

    it('should return null for non-existent session', () => {
      const sessionInfo = service.getSessionInfo('non-existent-socket');
      expect(sessionInfo).toBeNull();
    });
  });

  describe('getUserSessions', () => {
    it('should return user sessions', () => {
      const recoveryToken = service.createConnectionSession(mockServer, mockClient);
      const userSessions = service.getUserSessions('test-user-id');

      expect(userSessions).toHaveLength(1);
      expect(userSessions[0].userId).toBe('test-user-id');
    });

    it('should return empty array for user with no sessions', () => {
      const userSessions = service.getUserSessions('non-existent-user');
      expect(userSessions).toHaveLength(0);
    });
  });

  describe('forceDisconnectUser', () => {
    it('should force disconnect user from all sessions', () => {
      const recoveryToken = service.createConnectionSession(mockServer, mockClient);
      service.forceDisconnectUser(mockServer, 'test-user-id');

      const userSessions = service.getUserSessions('test-user-id');
      expect(userSessions).toHaveLength(0);
    });
  });

  describe('getRecoveryStats', () => {
    it('should return recovery statistics', () => {
      const recoveryToken = service.createConnectionSession(mockServer, mockClient);
      const stats = service.getRecoveryStats();

      expect(stats).toBeDefined();
      expect(stats.activeSessions).toBe(1);
      expect(stats.recoveryTokens).toBe(1);
      expect(stats.queuedMessages).toBe(0);
      expect(stats.averageSessionAge).toBeGreaterThanOrEqual(0);
    });

    it('should return zero stats when no sessions', () => {
      const stats = service.getRecoveryStats();

      expect(stats.activeSessions).toBe(0);
      expect(stats.recoveryTokens).toBe(0);
      expect(stats.queuedMessages).toBe(0);
      expect(stats.averageSessionAge).toBe(0);
    });
  });

  describe('cleanupOldSessions', () => {
    it('should clean up old sessions', () => {
      const recoveryToken = service.createConnectionSession(mockServer, mockClient);
      service.cleanupOldSessions();

      // Should not throw
      expect(() => service.cleanupOldSessions()).not.toThrow();
    });
  });
});
