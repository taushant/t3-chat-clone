import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { io, Socket } from 'socket.io-client';

describe('LLM Performance Tests (e2e)', () => {
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
        email: 'perf-test@example.com',
        username: 'perftestuser',
        password: 'hashedpassword',
        firstName: 'Performance',
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

    // Create a test API key
    const apiKey = await prismaService.apiKey.create({
      data: {
        name: 'Performance Test Key',
        provider: 'openai',
        key: 'sk-test1234567890abcdef',
        userId: userId,
        isActive: true,
      },
    });
    apiKeyId = apiKey.id;
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

  describe('Response Time Performance', () => {
    it('should complete chat completion within 5 seconds', async () => {
      const completionDto = {
        messages: [
          {
            role: 'user',
            content: 'Hello, how are you?',
          },
        ],
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 50,
      };

      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/chat/completion')
        .set('Authorization', `Bearer ${userToken}`)
        .send(completionDto)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(5000); // 5 seconds
      expect(response.body).toHaveProperty('choices');
      expect(response.body.choices.length).toBeGreaterThan(0);
    });

    it('should start streaming within 100ms', async () => {
      const completionDto = {
        messages: [
          {
            role: 'user',
            content: 'Tell me a short story',
          },
        ],
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 100,
      };

      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/chat/completion/stream')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Accept', 'text/event-stream')
        .send(completionDto)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(100); // 100ms
      expect(response.headers['content-type']).toContain('text/event-stream');
    });

    it('should process markdown within 100ms for 10KB content', async () => {
      const largeMarkdown = '# Test Document\n\n' + 
        'This is a test document with multiple sections.\n\n' +
        '## Section 1\n\n' +
        '```javascript\n' +
        'console.log("Hello World");\n' +
        'const data = { name: "Test", value: 123 };\n' +
        '```\n\n' +
        '## Section 2\n\n' +
        'More content here...\n\n'.repeat(100); // Make it ~10KB

      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/markdown/parse')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: largeMarkdown })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(100); // 100ms
      expect(response.body).toHaveProperty('parsed');
      expect(response.body.parsed).toHaveProperty('blocks');
    });

    it('should moderate content within 200ms', async () => {
      const moderationDto = {
        content: 'This is a test message for content moderation. It contains various words and phrases to test the moderation system.',
        type: 'text',
      };

      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/moderation/moderate')
        .set('Authorization', `Bearer ${userToken}`)
        .send(moderationDto)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(200); // 200ms
      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('isApproved');
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle 10 concurrent chat completions', async () => {
      const completionDto = {
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 20,
      };

      const startTime = Date.now();
      
      const promises = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/v1/llm/chat/completion')
          .set('Authorization', `Bearer ${userToken}`)
          .send(completionDto)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('choices');
      });

      // Should complete within reasonable time (10 seconds for 10 requests)
      expect(totalTime).toBeLessThan(10000);
    });

    it('should handle 5 concurrent streaming requests', async () => {
      const completionDto = {
        messages: [
          {
            role: 'user',
            content: 'Tell me a joke',
          },
        ],
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 50,
      };

      const startTime = Date.now();
      
      const promises = Array(5).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/v1/llm/chat/completion/stream')
          .set('Authorization', `Bearer ${userToken}`)
          .set('Accept', 'text/event-stream')
          .send(completionDto)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/event-stream');
      });

      // Should complete within reasonable time (5 seconds for 5 requests)
      expect(totalTime).toBeLessThan(5000);
    });

    it('should handle 20 concurrent markdown processing requests', async () => {
      const markdownDto = {
        content: '# Test\n\n```javascript\nconsole.log("test");\n```',
      };

      const startTime = Date.now();
      
      const promises = Array(20).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/v1/llm/markdown/parse')
          .set('Authorization', `Bearer ${userToken}`)
          .send(markdownDto)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('parsed');
      });

      // Should complete within reasonable time (2 seconds for 20 requests)
      expect(totalTime).toBeLessThan(2000);
    });
  });

  describe('WebSocket Performance', () => {
    let client: Socket;
    let authToken: string;

    beforeEach(() => {
      authToken = userToken;
    });

    afterEach(() => {
      if (client) {
        client.disconnect();
      }
    });

    it('should establish WebSocket connection within 100ms', (done) => {
      const startTime = Date.now();
      
      client = io('http://localhost:3001/llm', {
        auth: {
          token: authToken,
        },
      });

      client.on('connect', () => {
        const endTime = Date.now();
        const connectionTime = endTime - startTime;
        
        expect(connectionTime).toBeLessThan(100); // 100ms
        done();
      });

      client.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should handle multiple concurrent WebSocket streams', (done) => {
      const clients: Socket[] = [];
      const streamCount = 3;
      let completedStreams = 0;

      const createClient = (index: number) => {
        const client = io('http://localhost:3001/llm', {
          auth: {
            token: authToken,
          },
        });

        client.on('connect', () => {
          const streamRequest = {
            messages: [
              {
                role: 'user',
                content: `Test message ${index}`,
              },
            ],
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            maxTokens: 30,
          };

          client.emit('llm:stream-completion', streamRequest);
        });

        client.on('llm:stream-end', () => {
          completedStreams++;
          if (completedStreams === streamCount) {
            // Clean up all clients
            clients.forEach(c => c.disconnect());
            done();
          }
        });

        client.on('llm:stream-error', (error) => {
          clients.forEach(c => c.disconnect());
          done(error);
        });

        clients.push(client);
      };

      // Create multiple clients
      for (let i = 0; i < streamCount; i++) {
        createClient(i);
      }

      // Timeout after 10 seconds
      setTimeout(() => {
        clients.forEach(c => c.disconnect());
        done(new Error('WebSocket streams did not complete within timeout'));
      }, 10000);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should handle large markdown content without memory issues', async () => {
      // Create a large markdown document (~1MB)
      const largeContent = '# Large Document\n\n' + 
        'This is a large document for testing memory usage.\n\n' +
        '```javascript\n' +
        'const largeObject = {\n' +
        '  data: Array(1000).fill("test data"),\n' +
        '  metadata: { created: new Date(), version: "1.0" }\n' +
        '};\n' +
        '```\n\n'.repeat(1000);

      const startTime = Date.now();
      
      const response = await request(app.getHttpServer())
        .post('/api/v1/llm/markdown/parse')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: largeContent })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should complete within reasonable time even for large content
      expect(responseTime).toBeLessThan(2000); // 2 seconds
      expect(response.body).toHaveProperty('parsed');
      expect(response.body.parsed).toHaveProperty('blocks');
    });

    it('should handle multiple large requests without memory leaks', async () => {
      const largeContent = '# Test Document\n\n' + 
        'Large content for memory testing.\n\n'.repeat(100);

      const promises = Array(5).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/v1/llm/markdown/parse')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ content: largeContent })
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('parsed');
      });
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should enforce rate limits efficiently', async () => {
      const completionDto = {
        messages: [
          {
            role: 'user',
            content: 'Test',
          },
        ],
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 10,
      };

      const startTime = Date.now();
      
      // Make requests rapidly to trigger rate limiting
      const promises = Array(20).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/v1/llm/chat/completion')
          .set('Authorization', `Bearer ${userToken}`)
          .send(completionDto)
      );

      const responses = await Promise.allSettled(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete quickly even with rate limiting
      expect(totalTime).toBeLessThan(3000); // 3 seconds

      // Some requests should be rate limited
      const rateLimitedCount = responses.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 429
      ).length;
      
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Caching Performance', () => {
    it('should cache responses efficiently', async () => {
      const responseDto = {
        response: {
          id: 'cache-test-123',
          content: 'This is a test response for caching.',
          model: 'gpt-3.5-turbo',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      };

      // First request - should cache the response
      const startTime1 = Date.now();
      const response1 = await request(app.getHttpServer())
        .post('/api/v1/llm/response/process')
        .set('Authorization', `Bearer ${userToken}`)
        .send(responseDto)
        .expect(200);
      const endTime1 = Date.now();
      const firstRequestTime = endTime1 - startTime1;

      // Second request - should be faster due to caching
      const startTime2 = Date.now();
      const response2 = await request(app.getHttpServer())
        .post('/api/v1/llm/response/process')
        .set('Authorization', `Bearer ${userToken}`)
        .send(responseDto)
        .expect(200);
      const endTime2 = Date.now();
      const secondRequestTime = endTime2 - startTime2;

      // Both requests should succeed
      expect(response1.body).toHaveProperty('processed');
      expect(response2.body).toHaveProperty('processed');

      // Second request should be faster (cached)
      expect(secondRequestTime).toBeLessThan(firstRequestTime);
    });
  });
});
