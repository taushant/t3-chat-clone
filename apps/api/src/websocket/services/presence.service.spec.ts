import { Test, TestingModule } from '@nestjs/testing';
import { PresenceService } from './presence.service';
import { PrismaService } from '../../database/prisma.service';
import { Server } from 'socket.io';

describe('PresenceService', () => {
  let service: PresenceService;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockServer: jest.Mocked<Server>;

  const mockClient = {
    id: 'test-socket-id',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
    },
    handshake: {
      headers: {
        'user-agent': 'test-user-agent',
      },
      address: '192.168.1.1',
    },
    emit: jest.fn(),
  } as any;

  beforeEach(async () => {
    const mockPrismaServiceValue = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceService,
        {
          provide: PrismaService,
          useValue: mockPrismaServiceValue,
        },
      ],
    }).compile();

    service = module.get<PresenceService>(PresenceService);
    mockPrismaService = module.get(PrismaService);

    mockServer = {
      emit: jest.fn(),
    } as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleUserConnection', () => {
    it('should handle user connection and set online status', () => {
      service.handleUserConnection(mockServer, mockClient);

      expect(mockServer.emit).toHaveBeenCalledWith('user:online', expect.any(Object));
      expect(mockClient.emit).toHaveBeenCalledWith('users:online', expect.any(Object));
    });

    it('should not emit events if user is not authenticated', () => {
      const unauthenticatedClient = { ...mockClient, user: undefined };
      service.handleUserConnection(mockServer, unauthenticatedClient);

      expect(mockServer.emit).not.toHaveBeenCalled();
      expect(unauthenticatedClient.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleUserDisconnection', () => {
    it('should handle user disconnection and set offline status', () => {
      // First connect the user
      service.handleUserConnection(mockServer, mockClient);
      
      // Then disconnect
      service.handleUserDisconnection(mockServer, mockClient);

      expect(mockServer.emit).toHaveBeenCalledWith('user:offline', expect.any(Object));
    });

    it('should not emit events if user is not authenticated', () => {
      const unauthenticatedClient = { ...mockClient, user: undefined };
      service.handleUserDisconnection(mockServer, unauthenticatedClient);

      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status and broadcast change', () => {
      // First connect the user
      service.handleUserConnection(mockServer, mockClient);
      
      // Then update status
      service.updateUserStatus(mockServer, mockClient, 'away');

      expect(mockServer.emit).toHaveBeenCalledWith('user:status-changed', expect.any(Object));
    });

    it('should not update status if user is not authenticated', () => {
      const unauthenticatedClient = { ...mockClient, user: undefined };
      service.updateUserStatus(mockServer, unauthenticatedClient, 'away');

      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should not update status if user is not in presence map', () => {
      service.updateUserStatus(mockServer, mockClient, 'away');

      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe('getOnlineUsers', () => {
    it('should return online users', () => {
      service.handleUserConnection(mockServer, mockClient);
      const onlineUsers = service.getOnlineUsers();

      expect(onlineUsers).toHaveLength(1);
      expect(onlineUsers[0].userId).toBe('test-user-id');
      expect(onlineUsers[0].username).toBe('testuser');
      expect(onlineUsers[0].status).toBe('online');
    });

    it('should return empty array when no users are online', () => {
      const onlineUsers = service.getOnlineUsers();
      expect(onlineUsers).toHaveLength(0);
    });
  });

  describe('getUserPresence', () => {
    it('should return user presence', () => {
      service.handleUserConnection(mockServer, mockClient);
      const presence = service.getUserPresence('test-user-id');

      expect(presence).toBeDefined();
      expect(presence?.userId).toBe('test-user-id');
      expect(presence?.username).toBe('testuser');
      expect(presence?.status).toBe('online');
    });

    it('should return null for non-existent user', () => {
      const presence = service.getUserPresence('non-existent-user');
      expect(presence).toBeNull();
    });
  });

  describe('getAllUsersPresence', () => {
    it('should return all users presence', () => {
      service.handleUserConnection(mockServer, mockClient);
      const allPresence = service.getAllUsersPresence();

      expect(allPresence).toHaveLength(1);
      expect(allPresence[0].userId).toBe('test-user-id');
    });

    it('should return empty array when no users', () => {
      const allPresence = service.getAllUsersPresence();
      expect(allPresence).toHaveLength(0);
    });
  });

  describe('isUserOnline', () => {
    it('should return true if user is online', () => {
      service.handleUserConnection(mockServer, mockClient);
      const isOnline = service.isUserOnline('test-user-id');

      expect(isOnline).toBe(true);
    });

    it('should return false if user is not online', () => {
      const isOnline = service.isUserOnline('test-user-id');
      expect(isOnline).toBe(false);
    });
  });

  describe('getPresenceStats', () => {
    it('should return presence statistics', () => {
      service.handleUserConnection(mockServer, mockClient);
      const stats = service.getPresenceStats();

      expect(stats).toBeDefined();
      expect(stats.totalUsers).toBe(1);
      expect(stats.onlineUsers).toBe(1);
      expect(stats.awayUsers).toBe(0);
      expect(stats.busyUsers).toBe(0);
      expect(stats.offlineUsers).toBe(0);
    });

    it('should return zero stats when no users', () => {
      const stats = service.getPresenceStats();

      expect(stats.totalUsers).toBe(0);
      expect(stats.onlineUsers).toBe(0);
      expect(stats.awayUsers).toBe(0);
      expect(stats.busyUsers).toBe(0);
      expect(stats.offlineUsers).toBe(0);
    });
  });

  describe('getUsersByStatus', () => {
    it('should return users by status', () => {
      service.handleUserConnection(mockServer, mockClient);
      const onlineUsers = service.getUsersByStatus('online');

      expect(onlineUsers).toHaveLength(1);
      expect(onlineUsers[0].userId).toBe('test-user-id');
    });

    it('should return empty array for status with no users', () => {
      const awayUsers = service.getUsersByStatus('away');
      expect(awayUsers).toHaveLength(0);
    });
  });

  describe('getUserConnectionInfo', () => {
    it('should return user connection info', () => {
      service.handleUserConnection(mockServer, mockClient);
      const connectionInfo = service.getUserConnectionInfo('test-user-id');

      expect(connectionInfo).toBeDefined();
      expect(connectionInfo.socketCount).toBe(1);
      expect(connectionInfo.socketIds).toContain('test-socket-id');
      expect(connectionInfo.isOnline).toBe(true);
      expect(connectionInfo.status).toBe('online');
    });

    it('should return default info for non-existent user', () => {
      const connectionInfo = service.getUserConnectionInfo('non-existent-user');

      expect(connectionInfo.socketCount).toBe(0);
      expect(connectionInfo.socketIds).toHaveLength(0);
      expect(connectionInfo.isOnline).toBe(false);
      expect(connectionInfo.status).toBe('offline');
    });
  });

  describe('forceDisconnectUser', () => {
    it('should force disconnect user from all sockets', () => {
      service.handleUserConnection(mockServer, mockClient);
      service.forceDisconnectUser(mockServer, 'test-user-id');

      const isOnline = service.isUserOnline('test-user-id');
      expect(isOnline).toBe(false);
    });
  });

  describe('cleanupOldPresence', () => {
    it('should clean up old presence data', () => {
      expect(() => service.cleanupOldPresence()).not.toThrow();
    });
  });
});
