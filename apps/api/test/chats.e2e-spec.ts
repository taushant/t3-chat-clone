import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('ChatsController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let userToken: string;
  let userId: string;
  let chatId: string;

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
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test123!@#',
        firstName: 'Test',
        lastName: 'User',
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test123!@#',
      });

    if (loginResponse.status === 201) {
      userToken = loginResponse.body.access_token;
      userId = loginResponse.body.user.id;
    }
  });

  afterEach(async () => {
    // Clean up test data
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

  describe('/api/v1/chats (POST)', () => {
    it('should create a new chat', async () => {
      const createChatDto = {
        title: 'Integration Test Chat',
        description: 'A chat created during integration testing',
        isPublic: false,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createChatDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(createChatDto.title);
      expect(response.body.description).toBe(createChatDto.description);
      expect(response.body.isPublic).toBe(createChatDto.isPublic);
      expect(response.body.participants).toHaveLength(1);
      expect(response.body.participants[0].role).toBe('OWNER');

      chatId = response.body.id;
    });

    it('should return 401 if not authenticated', async () => {
      const createChatDto = {
        title: 'Test Chat',
        description: 'Test description',
        isPublic: false,
      };

      await request(app.getHttpServer())
        .post('/api/v1/chats')
        .send(createChatDto)
        .expect(401);
    });

    it('should return 400 for invalid data', async () => {
      const invalidChatDto = {
        title: '', // Empty title should be invalid
        description: 'Test description',
        isPublic: false,
      };

      await request(app.getHttpServer())
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidChatDto)
        .expect(400);
    });
  });

  describe('/api/v1/chats (GET)', () => {
    beforeEach(async () => {
      // Create a test chat
      const response = await request(app.getHttpServer())
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test Chat for GET',
          description: 'Test description',
          isPublic: false,
        });
      
      chatId = response.body.id;
    });

    it('should return all accessible chats', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/chats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/chats?page=1&limit=10')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should support search', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/chats?search=Test')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].title).toContain('Test');
    });
  });

  describe('/api/v1/chats/my (GET)', () => {
    beforeEach(async () => {
      // Create a test chat
      const response = await request(app.getHttpServer())
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'My Test Chat',
          description: 'Test description',
          isPublic: false,
        });
      
      chatId = response.body.id;
    });

    it('should return user\'s chats', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/chats/my')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('userRole');
    });
  });

  describe('/api/v1/chats/:id (GET)', () => {
    beforeEach(async () => {
      // Create a test chat
      const response = await request(app.getHttpServer())
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Specific Test Chat',
          description: 'Test description',
          isPublic: false,
        });
      
      chatId = response.body.id;
    });

    it('should return specific chat details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/chats/${chatId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.id).toBe(chatId);
      expect(response.body.title).toBe('Specific Test Chat');
      expect(response.body).toHaveProperty('participants');
      expect(response.body).toHaveProperty('messages');
    });

    it('should return 404 for non-existent chat', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';
      
      await request(app.getHttpServer())
        .get(`/api/v1/chats/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('/api/v1/chats/:id (PATCH)', () => {
    beforeEach(async () => {
      // Create a test chat
      const response = await request(app.getHttpServer())
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Chat to Update',
          description: 'Original description',
          isPublic: false,
        });
      
      chatId = response.body.id;
    });

    it('should update chat details', async () => {
      const updateData = {
        title: 'Updated Chat Title',
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/chats/${chatId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
    });
  });

  describe('/api/v1/chats/:id (DELETE)', () => {
    beforeEach(async () => {
      // Create a test chat
      const response = await request(app.getHttpServer())
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Chat to Delete',
          description: 'Will be deleted',
          isPublic: false,
        });
      
      chatId = response.body.id;
    });

    it('should delete chat', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/chats/${chatId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.message).toBe('Chat deleted successfully');

      // Verify chat is deleted
      await request(app.getHttpServer())
        .get(`/api/v1/chats/${chatId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      // Set to null to prevent cleanup
      chatId = null;
    });
  });
});
