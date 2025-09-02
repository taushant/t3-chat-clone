import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { io, Socket } from 'socket.io-client';

describe('LLM Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let userToken: string;
  let userId: string;
  let apiKeyId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    
    await app.init();
  });

  beforeEach(async () => {
    // Create a test user and get token
    const testUser = await prismaService.user.create({
      data: {
        email: 'llm-test@example.com',
        username: 'llmtestuser',
        password: 'hashedpassword',
        firstName: 'LLM',
        lastName: 'Test',
        isActive: true,
        isVerified: true,
      },
    });

    userId = testUser.id;
    userToken = jwtService.sign({
      sub: testUser.id,
      email: testUser.email,
      username: testUser.username,
      role: testUser.role,
    });
  });

  afterEach(async () => {
    // Clean up test data
    if (apiKeyId) {
      await prismaService.apiKey.deleteMany({
        where: { id: apiKeyId },
      });
      apiKeyId = null;
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

  describe('API Key Management', () => {
    it('should create an API key', async () => {
      const createApiKeyDto = {
        name: 'Test OpenAI Key',
        provider: 'openai',
        key: 'sk-test1234567890abcdef',
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/api-keys')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createApiKeyDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createApiKeyDto.name);
      expect(response.body.provider).toBe(createApiKeyDto.provider);
      expect(response.body.isActive).toBe(true);
      expect(response.body.key).not.toBe(createApiKeyDto.key); // Should be masked

      apiKeyId = response.body.id;
    });

    it('should list user API keys', async () => {
      // Create a test API key first
      const apiKey = await prismaService.apiKey.create({
        data: {
          name: 'Test Key',
          provider: 'openai',
          key: 'sk-test1234567890abcdef',
          userId: userId,
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/llm/api-keys')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('provider');
      expect(response.body[0].key).toMatch(/^\*{8,}$/); // Should be masked
    });

    it('should validate an API key', async () => {
      const validateDto = {
        provider: 'openai',
        key: 'sk-test1234567890abcdef',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/api-keys/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validateDto)
        .expect(200);

      expect(response.body).toHaveProperty('isValid');
      expect(typeof response.body.isValid).toBe('boolean');
    });

    it('should get available providers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/llm/api-keys/providers')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContain('openai');
      expect(response.body).toContain('anthropic');
      expect(response.body).toContain('openrouter');
    });

    it('should get available models', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/llm/api-keys/models')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('provider');
      expect(response.body[0]).toHaveProperty('models');
      expect(Array.isArray(response.body[0].models)).toBe(true);
    });
  });

  describe('Chat Completion - Non-Streaming', () => {
    beforeEach(async () => {
      // Create a test API key
      const apiKey = await prismaService.apiKey.create({
        data: {
          name: 'Test OpenAI Key',
          provider: 'openai',
          key: 'sk-test1234567890abcdef',
          userId: userId,
          isActive: true,
        },
      });
      apiKeyId = apiKey.id;
    });

    it('should create a chat completion', async () => {
      const completionDto = {
        messages: [
          {
            role: 'user',
            content: 'Hello, how are you?',
          },
        ],
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 100,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/chat/completion')
        .set('Authorization', `Bearer ${userToken}`)
        .send(completionDto)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('object');
      expect(response.body).toHaveProperty('created');
      expect(response.body).toHaveProperty('model');
      expect(response.body).toHaveProperty('choices');
      expect(response.body).toHaveProperty('usage');
      expect(Array.isArray(response.body.choices)).toBe(true);
      expect(response.body.choices.length).toBeGreaterThan(0);
      expect(response.body.choices[0]).toHaveProperty('message');
      expect(response.body.choices[0].message).toHaveProperty('content');
    });

    it('should handle rate limiting', async () => {
      const completionDto = {
        messages: [
          {
            role: 'user',
            content: 'Test message',
          },
        ],
        model: 'gpt-3.5-turbo',
      };

      // Make multiple requests to trigger rate limiting
      const promises = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/v1/llm/chat/completion')
          .set('Authorization', `Bearer ${userToken}`)
          .send(completionDto)
      );

      const responses = await Promise.allSettled(promises);
      
      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 429
      );
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should return 401 for invalid token', async () => {
      const completionDto = {
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
        model: 'gpt-3.5-turbo',
      };

      await request(app.getHttpServer())
        .post('/api/v1/llm/chat/completion')
        .set('Authorization', 'Bearer invalid-token')
        .send(completionDto)
        .expect(401);
    });

    it('should return 400 for invalid request', async () => {
      const invalidDto = {
        messages: [], // Empty messages
        model: 'gpt-3.5-turbo',
      };

      await request(app.getHttpServer())
        .post('/api/v1/llm/chat/completion')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('Chat Completion - Streaming', () => {
    beforeEach(async () => {
      // Create a test API key
      const apiKey = await prismaService.apiKey.create({
        data: {
          name: 'Test OpenAI Key',
          provider: 'openai',
          key: 'sk-test1234567890abcdef',
          userId: userId,
          isActive: true,
        },
      });
      apiKeyId = apiKey.id;
    });

    it('should stream chat completion', async () => {
      const completionDto = {
        messages: [
          {
            role: 'user',
            content: 'Tell me a short story',
          },
        ],
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 200,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/chat/completion/stream')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Accept', 'text/event-stream')
        .send(completionDto)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/event-stream');
      
      // Check that we receive streaming data
      const chunks = response.text.split('\n').filter(line => line.startsWith('data: '));
      expect(chunks.length).toBeGreaterThan(0);
      
      // Check for [DONE] marker
      expect(response.text).toContain('data: [DONE]');
    });

    it('should handle streaming errors gracefully', async () => {
      const invalidDto = {
        messages: [
          {
            role: 'user',
            content: 'Test',
          },
        ],
        model: 'invalid-model',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/chat/completion/stream')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Accept', 'text/event-stream')
        .send(invalidDto);

      // Should return error in streaming format
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Enhanced Streaming', () => {
    beforeEach(async () => {
      // Create a test API key
      const apiKey = await prismaService.apiKey.create({
        data: {
          name: 'Test OpenAI Key',
          provider: 'openai',
          key: 'sk-test1234567890abcdef',
          userId: userId,
          isActive: true,
        },
      });
      apiKeyId = apiKey.id;
    });

    it('should handle optimized streaming', async () => {
      const completionDto = {
        messages: [
          {
            role: 'user',
            content: 'Write a haiku about programming',
          },
        ],
        model: 'gpt-3.5-turbo',
        temperature: 0.8,
        maxTokens: 100,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/stream/completion/optimized')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Accept', 'text/event-stream')
        .send(completionDto)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/event-stream');
      
      // Check for enhanced streaming features
      const chunks = response.text.split('\n').filter(line => line.startsWith('data: '));
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('WebSocket LLM Streaming', () => {
    let client: Socket;
    let authToken: string;

    beforeEach(async () => {
      // Create a test API key
      const apiKey = await prismaService.apiKey.create({
        data: {
          name: 'Test OpenAI Key',
          provider: 'openai',
          key: 'sk-test1234567890abcdef',
          userId: userId,
          isActive: true,
        },
      });
      apiKeyId = apiKey.id;

      authToken = userToken;
    });

    afterEach(() => {
      if (client) {
        client.disconnect();
      }
    });

    it('should handle WebSocket LLM streaming', (done) => {
      client = io('http://localhost:3001/llm', {
        auth: {
          token: authToken,
        },
      });

      client.on('connect', () => {
        const streamRequest = {
          messages: [
            {
              role: 'user',
              content: 'Hello, WebSocket test!',
            },
          ],
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 100,
        };

        client.emit('llm:stream-completion', streamRequest);
      });

      let chunksReceived = 0;
      let streamCompleted = false;

      client.on('llm:stream-start', (data) => {
        expect(data).toHaveProperty('requestId');
        expect(data).toHaveProperty('model');
      });

      client.on('llm:stream-chunk', (data) => {
        chunksReceived++;
        expect(data).toHaveProperty('content');
        expect(data).toHaveProperty('chunkIndex');
      });

      client.on('llm:stream-end', (data) => {
        streamCompleted = true;
        expect(data).toHaveProperty('requestId');
        expect(data).toHaveProperty('totalChunks');
        expect(chunksReceived).toBeGreaterThan(0);
        done();
      });

      client.on('llm:stream-error', (error) => {
        done(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!streamCompleted) {
          done(new Error('Stream did not complete within timeout'));
        }
      }, 10000);
    });

    it('should handle WebSocket authentication errors', (done) => {
      client = io('http://localhost:3001/llm', {
        auth: {
          token: 'invalid-token',
        },
      });

      client.on('connect_error', (error) => {
        expect(error.message).toContain('Unauthorized');
        done();
      });

      client.on('connect', () => {
        done(new Error('Should not have connected with invalid token'));
      });
    });
  });

  describe('Content Moderation', () => {
    it('should moderate content', async () => {
      const moderationDto = {
        content: 'This is a test message for moderation.',
        type: 'text',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/moderation/moderate')
        .set('Authorization', `Bearer ${userToken}`)
        .send(moderationDto)
        .expect(200);

      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('isApproved');
      expect(response.body.result).toHaveProperty('confidence');
      expect(typeof response.body.result.isApproved).toBe('boolean');
      expect(typeof response.body.result.confidence).toBe('number');
    });

    it('should filter content', async () => {
      const filterDto = {
        content: 'This is a test message for filtering.',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/moderation/filter')
        .set('Authorization', `Bearer ${userToken}`)
        .send(filterDto)
        .expect(200);

      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('isAllowed');
      expect(response.body.result).toHaveProperty('filteredContent');
      expect(typeof response.body.result.isAllowed).toBe('boolean');
    });
  });

  describe('Markdown Processing', () => {
    it('should parse markdown', async () => {
      const markdownDto = {
        content: '# Hello World\n\n```javascript\nconsole.log("Hello");\n```',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/markdown/parse')
        .set('Authorization', `Bearer ${userToken}`)
        .send(markdownDto)
        .expect(200);

      expect(response.body).toHaveProperty('parsed');
      expect(response.body.parsed).toHaveProperty('blocks');
      expect(response.body.parsed).toHaveProperty('metadata');
      expect(Array.isArray(response.body.parsed.blocks)).toBe(true);
    });

    it('should render markdown to HTML', async () => {
      const renderDto = {
        content: '# Hello World\n\nThis is a **test** message.',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/markdown/render')
        .set('Authorization', `Bearer ${userToken}`)
        .send(renderDto)
        .expect(200);

      expect(response.body).toHaveProperty('html');
      expect(response.body.html).toContain('<h1>Hello World</h1>');
      expect(response.body.html).toContain('<strong>test</strong>');
    });

    it('should process code blocks', async () => {
      const codeBlockDto = {
        language: 'javascript',
        code: 'console.log("Hello World");',
        theme: 'default',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/markdown/code-block/process')
        .set('Authorization', `Bearer ${userToken}`)
        .send(codeBlockDto)
        .expect(200);

      expect(response.body).toHaveProperty('processed');
      expect(response.body.processed).toHaveProperty('language');
      expect(response.body.processed).toHaveProperty('html');
      expect(response.body.processed.language).toBe('javascript');
    });
  });

  describe('Response Processing', () => {
    it('should process response', async () => {
      const responseDto = {
        response: {
          id: 'test-response-123',
          content: 'This is a test response for processing.',
          model: 'gpt-3.5-turbo',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/response/process')
        .set('Authorization', `Bearer ${userToken}`)
        .send(responseDto)
        .expect(200);

      expect(response.body).toHaveProperty('processed');
      expect(response.body.processed).toHaveProperty('id');
      expect(response.body.processed).toHaveProperty('content');
      expect(response.body.processed).toHaveProperty('metadata');
    });

    it('should enhance response', async () => {
      const enhanceDto = {
        response: {
          id: 'test-response-123',
          content: 'This is a test response for enhancement.',
          metadata: {},
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/response/enhance')
        .set('Authorization', `Bearer ${userToken}`)
        .send(enhanceDto)
        .expect(200);

      expect(response.body).toHaveProperty('enhanced');
      expect(response.body.enhanced).toHaveProperty('id');
      expect(response.body.enhanced).toHaveProperty('content');
      expect(response.body.enhanced).toHaveProperty('enhancements');
    });
  });
});
