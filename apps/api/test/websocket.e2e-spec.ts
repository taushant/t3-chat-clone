import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('WebSocket Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let server: any;
  let client: Socket;
  let authToken: string;
  let testUser: any;
  let testChat: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    // Create test user
    testUser = await prismaService.user.create({
      data: {
        email: 'websocket-test@example.com',
        username: 'websockettest',
        password: 'hashedpassword',
        isActive: true,
        isVerified: true,
      },
    });

    // Create test chat
    testChat = await prismaService.chat.create({
      data: {
        name: 'WebSocket Test Chat',
        description: 'Test chat for WebSocket integration tests',
        isPublic: true,
        createdBy: testUser.id,
        participants: {
          create: {
            userId: testUser.id,
            role: 'OWNER',
          },
        },
      },
    });

    // Generate JWT token
    authToken = jwtService.sign({
      sub: testUser.id,
      email: testUser.email,
      username: testUser.username,
      role: testUser.role,
    });
  });

  afterEach(async () => {
    if (client) {
      client.disconnect();
    }

    // Clean up test data
    await prismaService.chat.deleteMany({
      where: { createdBy: testUser.id },
    });
    await prismaService.user.delete({
      where: { id: testUser.id },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('WebSocket Connection', () => {
    it('should connect successfully with valid token', (done) => {
      client = io('http://localhost:3001/chat', {
        auth: {
          token: authToken,
        },
      });

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        done();
      });

      client.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should fail to connect with invalid token', (done) => {
      const invalidClient = io('http://localhost:3001/chat', {
        auth: {
          token: 'invalid-token',
        },
      });

      invalidClient.on('connect_error', (error) => {
        expect(error.message).toContain('Unauthorized');
        invalidClient.disconnect();
        done();
      });

      invalidClient.on('connect', () => {
        done(new Error('Should not have connected with invalid token'));
      });
    });
  });

  describe('Room Management', () => {
    beforeEach((done) => {
      client = io('http://localhost:3001/chat', {
        auth: {
          token: authToken,
        },
      });

      client.on('connect', () => {
        done();
      });
    });

    it('should join a chat room successfully', (done) => {
      client.emit('join:chat', { chatId: testChat.id }, (response) => {
        expect(response.success).toBe(true);
        expect(response.message).toBe('Joined chat successfully');
        done();
      });
    });

    it('should fail to join non-existent chat', (done) => {
      client.emit('join:chat', { chatId: 'non-existent-chat' }, (response) => {
        expect(response.success).toBe(false);
        expect(response.message).toBe('Chat not found or access denied');
        done();
      });
    });

    it('should leave a chat room successfully', (done) => {
      // First join the room
      client.emit('join:chat', { chatId: testChat.id }, (joinResponse) => {
        expect(joinResponse.success).toBe(true);

        // Then leave the room
        client.emit('leave:chat', { chatId: testChat.id }, (leaveResponse) => {
          expect(leaveResponse.success).toBe(true);
          expect(leaveResponse.message).toBe('Left chat successfully');
          done();
        });
      });
    });

    it('should get room information', (done) => {
      client.emit('join:chat', { chatId: testChat.id }, (joinResponse) => {
        expect(joinResponse.success).toBe(true);

        client.emit('room:info', { chatId: testChat.id }, (response) => {
          expect(response.success).toBe(true);
          expect(response.roomInfo).toBeDefined();
          expect(response.roomInfo.chatId).toBe(testChat.id);
          done();
        });
      });
    });

    it('should get user rooms list', (done) => {
      client.emit('room:list', {}, (response) => {
        expect(response.success).toBe(true);
        expect(response.rooms).toBeDefined();
        expect(Array.isArray(response.rooms)).toBe(true);
        done();
      });
    });
  });

  describe('Real-time Messaging', () => {
    beforeEach((done) => {
      client = io('http://localhost:3001/chat', {
        auth: {
          token: authToken,
        },
      });

      client.on('connect', () => {
        // Join the test chat
        client.emit('join:chat', { chatId: testChat.id }, () => {
          done();
        });
      });
    });

    it('should send a message successfully', (done) => {
      const messageData = {
        chatId: testChat.id,
        content: 'Hello, WebSocket test!',
        type: 'text',
      };

      client.emit('message:send', messageData, (response) => {
        expect(response.success).toBe(true);
        expect(response.message).toBe('Message sent successfully');
        expect(response.sentMessage).toBeDefined();
        expect(response.sentMessage.content).toBe(messageData.content);
        done();
      });
    });

    it('should handle typing indicators', (done) => {
      const typingData = {
        chatId: testChat.id,
        isTyping: true,
      };

      client.emit('message:typing', typingData, (response) => {
        expect(response.success).toBe(true);
        done();
      });
    });

    it('should get typing users', (done) => {
      client.emit('message:typing-users', { chatId: testChat.id }, (response) => {
        expect(response.success).toBe(true);
        expect(response.typingUsers).toBeDefined();
        expect(Array.isArray(response.typingUsers)).toBe(true);
        done();
      });
    });

    it('should handle message delivery confirmation', (done) => {
      // First send a message
      client.emit('message:send', {
        chatId: testChat.id,
        content: 'Test delivery message',
        type: 'text',
      }, (sendResponse) => {
        expect(sendResponse.success).toBe(true);

        // Then confirm delivery
        client.emit('message:delivered', {
          messageId: sendResponse.sentMessage.id,
          chatId: testChat.id,
        }, (deliveryResponse) => {
          expect(deliveryResponse.success).toBe(true);
          done();
        });
      });
    });

    it('should handle message read confirmation', (done) => {
      // First send a message
      client.emit('message:send', {
        chatId: testChat.id,
        content: 'Test read message',
        type: 'text',
      }, (sendResponse) => {
        expect(sendResponse.success).toBe(true);

        // Then confirm read
        client.emit('message:read', {
          messageId: sendResponse.sentMessage.id,
          chatId: testChat.id,
        }, (readResponse) => {
          expect(readResponse.success).toBe(true);
          done();
        });
      });
    });
  });

  describe('Presence Management', () => {
    beforeEach((done) => {
      client = io('http://localhost:3001/chat', {
        auth: {
          token: authToken,
        },
      });

      client.on('connect', () => {
        done();
      });
    });

    it('should get online users', (done) => {
      client.emit('presence:online-users', {}, (response) => {
        expect(response.success).toBe(true);
        expect(response.users).toBeDefined();
        expect(Array.isArray(response.users)).toBe(true);
        done();
      });
    });

    it('should update user status', (done) => {
      client.emit('presence:update-status', { status: 'away' }, (response) => {
        expect(response.success).toBe(true);
        expect(response.message).toBe('Status updated successfully');
        done();
      });
    });

    it('should get user status', (done) => {
      client.emit('presence:user-status', { userId: testUser.id }, (response) => {
        expect(response.success).toBe(true);
        expect(response.presence).toBeDefined();
        done();
      });
    });

    it('should get presence statistics', (done) => {
      client.emit('presence:stats', {}, (response) => {
        expect(response.success).toBe(true);
        expect(response.stats).toBeDefined();
        expect(response.stats.totalUsers).toBeDefined();
        expect(response.stats.onlineUsers).toBeDefined();
        done();
      });
    });
  });

  describe('Connection Recovery', () => {
    beforeEach((done) => {
      client = io('http://localhost:3001/chat', {
        auth: {
          token: authToken,
        },
      });

      client.on('connect', () => {
        done();
      });
    });

    it('should create connection session', (done) => {
      client.emit('connection:create-session', {}, (response) => {
        expect(response.success).toBe(true);
        expect(response.recoveryToken).toBeDefined();
        done();
      });
    });

    it('should get session information', (done) => {
      client.emit('connection:session-info', {}, (response) => {
        expect(response.success).toBe(true);
        expect(response.sessionInfo).toBeDefined();
        done();
      });
    });

    it('should get connection statistics', (done) => {
      client.emit('connection:stats', {}, (response) => {
        expect(response.success).toBe(true);
        expect(response.stats).toBeDefined();
        done();
      });
    });
  });

  describe('Connection Monitoring', () => {
    beforeEach((done) => {
      client = io('http://localhost:3001/chat', {
        auth: {
          token: authToken,
        },
      });

      client.on('connect', () => {
        done();
      });
    });

    it('should get connection metrics', (done) => {
      client.emit('monitoring:metrics', {}, (response) => {
        expect(response.success).toBe(true);
        expect(response.metrics).toBeDefined();
        expect(response.metrics.totalConnections).toBeDefined();
        expect(response.metrics.activeConnections).toBeDefined();
        done();
      });
    });

    it('should get connection events', (done) => {
      client.emit('monitoring:events', { limit: 10 }, (response) => {
        expect(response.success).toBe(true);
        expect(response.events).toBeDefined();
        expect(Array.isArray(response.events)).toBe(true);
        done();
      });
    });

    it('should get monitoring statistics', (done) => {
      client.emit('monitoring:stats', {}, (response) => {
        expect(response.success).toBe(true);
        expect(response.stats).toBeDefined();
        expect(response.stats.metrics).toBeDefined();
        expect(response.stats.recentEvents).toBeDefined();
        done();
      });
    });

    it('should get health status', (done) => {
      client.emit('monitoring:health', {}, (response) => {
        expect(response.success).toBe(true);
        expect(response.health).toBeDefined();
        expect(response.health.status).toBeDefined();
        expect(['healthy', 'warning', 'critical']).toContain(response.health.status);
        done();
      });
    });
  });

  describe('Event Broadcasting', () => {
    let client1: Socket;
    let client2: Socket;

    beforeEach((done) => {
      // Create two clients
      client1 = io('http://localhost:3001/chat', {
        auth: { token: authToken },
      });

      client2 = io('http://localhost:3001/chat', {
        auth: { token: authToken },
      });

      let connectedCount = 0;
      const onConnect = () => {
        connectedCount++;
        if (connectedCount === 2) {
          // Both clients connected, join them to the same room
          client1.emit('join:chat', { chatId: testChat.id }, () => {
            client2.emit('join:chat', { chatId: testChat.id }, () => {
              done();
            });
          });
        }
      };

      client1.on('connect', onConnect);
      client2.on('connect', onConnect);
    });

    afterEach(() => {
      if (client1) client1.disconnect();
      if (client2) client2.disconnect();
    });

    it('should broadcast messages to all room participants', (done) => {
      const messageContent = 'Broadcast test message';
      let messageReceived = false;

      // Listen for message on client2
      client2.on('message:new', (message) => {
        expect(message.content).toBe(messageContent);
        messageReceived = true;
      });

      // Send message from client1
      client1.emit('message:send', {
        chatId: testChat.id,
        content: messageContent,
        type: 'text',
      }, (response) => {
        expect(response.success).toBe(true);

        // Wait a bit for the broadcast
        setTimeout(() => {
          expect(messageReceived).toBe(true);
          done();
        }, 100);
      });
    });

    it('should broadcast typing indicators', (done) => {
      let typingReceived = false;

      // Listen for typing on client2
      client2.on('user:typing', (data) => {
        expect(data.userId).toBe(testUser.id);
        expect(data.isTyping).toBe(true);
        typingReceived = true;
      });

      // Send typing from client1
      client1.emit('message:typing', {
        chatId: testChat.id,
        isTyping: true,
      }, (response) => {
        expect(response.success).toBe(true);

        // Wait a bit for the broadcast
        setTimeout(() => {
          expect(typingReceived).toBe(true);
          done();
        }, 100);
      });
    });

    it('should broadcast user join/leave events', (done) => {
      let joinEventReceived = false;

      // Listen for user join on client2
      client2.on('user:joined', (data) => {
        expect(data.userId).toBe(testUser.id);
        expect(data.chatId).toBe(testChat.id);
        joinEventReceived = true;
      });

      // Create a third client and join
      const client3 = io('http://localhost:3001/chat', {
        auth: { token: authToken },
      });

      client3.on('connect', () => {
        client3.emit('join:chat', { chatId: testChat.id }, (response) => {
          expect(response.success).toBe(true);

          // Wait a bit for the broadcast
          setTimeout(() => {
            expect(joinEventReceived).toBe(true);
            client3.disconnect();
            done();
          }, 100);
        });
      });
    });
  });

  describe('Rate Limiting', () => {
    beforeEach((done) => {
      client = io('http://localhost:3001/chat', {
        auth: {
          token: authToken,
        },
      });

      client.on('connect', () => {
        client.emit('join:chat', { chatId: testChat.id }, () => {
          done();
        });
      });
    });

    it('should handle message rate limiting', (done) => {
      let successCount = 0;
      let rateLimitCount = 0;
      const totalMessages = 105; // Exceed the 100 message limit

      const sendMessage = (index: number) => {
        if (index >= totalMessages) {
          expect(successCount).toBe(100); // First 100 should succeed
          expect(rateLimitCount).toBe(5); // Last 5 should be rate limited
          done();
          return;
        }

        client.emit('message:send', {
          chatId: testChat.id,
          content: `Rate limit test message ${index}`,
          type: 'text',
        }, (response) => {
          if (response.success) {
            successCount++;
          } else if (response.message.includes('rate limit')) {
            rateLimitCount++;
          }

          // Send next message after a short delay
          setTimeout(() => sendMessage(index + 1), 10);
        });
      };

      sendMessage(0);
    });
  });
});
