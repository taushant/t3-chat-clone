import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('MessagesController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let userToken: string;
  let userId: string;
  let chatId: string;
  let messageId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  beforeEach(async () => {
    // Create a test user and get token
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'testmsg@example.com',
        username: 'testmsguser',
        password: 'Test123!@#',
        firstName: 'Test',
        lastName: 'User',
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'testmsg@example.com',
        password: 'Test123!@#',
      });

    if (loginResponse.status === 201) {
      userToken = loginResponse.body.access_token;
      userId = loginResponse.body.user.id;
    }

    // Create a test chat
    const chatResponse = await request(app.getHttpServer())
      .post('/api/v1/chats')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Chat for Messages',
        description: 'A chat for testing messages',
        isPublic: false,
      });

    chatId = chatResponse.body.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (messageId) {
      await prismaService.message.deleteMany({
        where: { id: messageId },
      });
      messageId = null;
    }

    if (chatId) {
      await prismaService.message.deleteMany({
        where: { chatId },
      });
      await prismaService.chatParticipant.deleteMany({
        where: { chatId },
      });
      await prismaService.chat.deleteMany({
        where: { id: chatId },
      });
      chatId = null;
    }

    if (userId) {
      await prismaService.user.deleteMany({
        where: { id: userId },
      });
      userId = null;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/messages (POST)', () => {
    it('should create a new message', async () => {
      const createMessageDto = {
        content: 'Hello, this is a test message!',
        type: 'TEXT',
        chatId: chatId,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createMessageDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe(createMessageDto.content);
      expect(response.body.type).toBe(createMessageDto.type);
      expect(response.body.chatId).toBe(createMessageDto.chatId);
      expect(response.body.userId).toBe(userId);
      expect(response.body).toHaveProperty('user');

      messageId = response.body.id;
    });

    it('should return 401 if not authenticated', async () => {
      const createMessageDto = {
        content: 'Test message',
        type: 'TEXT',
        chatId: chatId,
      };

      await request(app.getHttpServer())
        .post('/api/v1/messages')
        .send(createMessageDto)
        .expect(401);
    });

    it('should return 400 for empty content', async () => {
      const invalidMessageDto = {
        content: '',
        type: 'TEXT',
        chatId: chatId,
      };

      await request(app.getHttpServer())
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidMessageDto)
        .expect(400);
    });
  });

  describe('/api/v1/messages (GET)', () => {
    beforeEach(async () => {
      // Create a test message
      const response = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Test message for GET',
          type: 'TEXT',
          chatId: chatId,
        });
      
      messageId = response.body.id;
    });

    it('should return all accessible messages', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/messages?page=1&limit=10')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should support search', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/messages?search=Test')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter by chat', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/messages?chatId=${chatId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].chatId).toBe(chatId);
    });
  });

  describe('/api/v1/messages/my (GET)', () => {
    beforeEach(async () => {
      // Create a test message
      const response = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'My test message',
          type: 'TEXT',
          chatId: chatId,
        });
      
      messageId = response.body.id;
    });

    it('should return user\'s messages', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/messages/my')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].userId).toBe(userId);
    });
  });

  describe('/api/v1/messages/chat/:chatId (GET)', () => {
    beforeEach(async () => {
      // Create a test message
      const response = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Chat-specific message',
          type: 'TEXT',
          chatId: chatId,
        });
      
      messageId = response.body.id;
    });

    it('should return messages for specific chat', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/messages/chat/${chatId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].chatId).toBe(chatId);
    });

    it('should return 403 for inaccessible chat', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';
      
      await request(app.getHttpServer())
        .get(`/api/v1/messages/chat/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('/api/v1/messages/:id (GET)', () => {
    beforeEach(async () => {
      // Create a test message
      const response = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Specific test message',
          type: 'TEXT',
          chatId: chatId,
        });
      
      messageId = response.body.id;
    });

    it('should return specific message details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/messages/${messageId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.id).toBe(messageId);
      expect(response.body.content).toBe('Specific test message');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('chat');
    });

    it('should return 404 for non-existent message', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';
      
      await request(app.getHttpServer())
        .get(`/api/v1/messages/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('/api/v1/messages/:id (PATCH)', () => {
    beforeEach(async () => {
      // Create a test message
      const response = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Message to update',
          type: 'TEXT',
          chatId: chatId,
        });
      
      messageId = response.body.id;
    });

    it('should update message content', async () => {
      const updateData = {
        content: 'Updated message content',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/messages/${messageId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.content).toBe(updateData.content);
    });
  });

  describe('/api/v1/messages/:id (DELETE)', () => {
    beforeEach(async () => {
      // Create a test message
      const response = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Message to delete',
          type: 'TEXT',
          chatId: chatId,
        });
      
      messageId = response.body.id;
    });

    it('should delete message', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/messages/${messageId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.message).toBe('Message deleted successfully');

      // Verify message is deleted
      await request(app.getHttpServer())
        .get(`/api/v1/messages/${messageId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      // Set to null to prevent cleanup
      messageId = null;
    });
  });

  describe('/api/v1/messages/search (GET)', () => {
    beforeEach(async () => {
      // Create a test message with searchable content
      const response = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'This is a unique searchable message',
          type: 'TEXT',
          chatId: chatId,
        });
      
      messageId = response.body.id;
    });

    it('should search messages', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/messages/search?q=unique')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 400 for missing search query', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/messages/search')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });
  });
});
