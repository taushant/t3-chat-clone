import { io, Socket } from 'socket.io-client';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';

interface LoadTestConfig {
  baseUrl: string;
  authToken: string;
  concurrentUsers: number;
  requestsPerUser: number;
  testDuration: number; // in seconds
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
}

class LLMLoadTester {
  private config: LoadTestConfig;
  private results: LoadTestResult[] = [];
  private startTime: number = 0;
  private endTime: number = 0;

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  async runChatCompletionLoadTest(): Promise<LoadTestResult> {
    console.log(`Starting chat completion load test with ${this.config.concurrentUsers} concurrent users...`);
    
    this.startTime = Date.now();
    const promises: Promise<any>[] = [];

    for (let i = 0; i < this.config.concurrentUsers; i++) {
      promises.push(this.runUserChatCompletionSession(i));
    }

    const userResults = await Promise.all(promises);
    this.endTime = Date.now();

    return this.aggregateResults(userResults);
  }

  async runStreamingLoadTest(): Promise<LoadTestResult> {
    console.log(`Starting streaming load test with ${this.config.concurrentUsers} concurrent users...`);
    
    this.startTime = Date.now();
    const promises: Promise<any>[] = [];

    for (let i = 0; i < this.config.concurrentUsers; i++) {
      promises.push(this.runUserStreamingSession(i));
    }

    const userResults = await Promise.all(promises);
    this.endTime = Date.now();

    return this.aggregateResults(userResults);
  }

  async runWebSocketLoadTest(): Promise<LoadTestResult> {
    console.log(`Starting WebSocket load test with ${this.config.concurrentUsers} concurrent users...`);
    
    this.startTime = Date.now();
    const promises: Promise<any>[] = [];

    for (let i = 0; i < this.config.concurrentUsers; i++) {
      promises.push(this.runUserWebSocketSession(i));
    }

    const userResults = await Promise.all(promises);
    this.endTime = Date.now();

    return this.aggregateResults(userResults);
  }

  private async runUserChatCompletionSession(userId: number): Promise<any[]> {
    const results: any[] = [];
    const baseUrl = this.config.baseUrl;

    for (let i = 0; i < this.config.requestsPerUser; i++) {
      const startTime = Date.now();
      
      try {
        const response = await request(baseUrl)
          .post('/api/v1/llm/chat/completion')
          .set('Authorization', `Bearer ${this.config.authToken}`)
          .send({
            messages: [
              {
                role: 'user',
                content: `Load test message ${userId}-${i}`,
              },
            ],
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            maxTokens: 50,
          });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        results.push({
          success: response.status === 200,
          responseTime,
          status: response.status,
          error: null,
        });
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        results.push({
          success: false,
          responseTime,
          status: 0,
          error: error.message,
        });
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  private async runUserStreamingSession(userId: number): Promise<any[]> {
    const results: any[] = [];
    const baseUrl = this.config.baseUrl;

    for (let i = 0; i < this.config.requestsPerUser; i++) {
      const startTime = Date.now();
      
      try {
        const response = await request(baseUrl)
          .post('/api/v1/llm/chat/completion/stream')
          .set('Authorization', `Bearer ${this.config.authToken}`)
          .set('Accept', 'text/event-stream')
          .send({
            messages: [
              {
                role: 'user',
                content: `Streaming load test message ${userId}-${i}`,
              },
            ],
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            maxTokens: 100,
          });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        results.push({
          success: response.status === 200,
          responseTime,
          status: response.status,
          error: null,
        });
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        results.push({
          success: false,
          responseTime,
          status: 0,
          error: error.message,
        });
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }

  private async runUserWebSocketSession(userId: number): Promise<any[]> {
    const results: any[] = [];

    for (let i = 0; i < this.config.requestsPerUser; i++) {
      const startTime = Date.now();
      
      try {
        const result = await this.runWebSocketRequest(userId, i);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        results.push({
          success: result.success,
          responseTime,
          status: result.success ? 200 : 0,
          error: result.error,
        });
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        results.push({
          success: false,
          responseTime,
          status: 0,
          error: error.message,
        });
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return results;
  }

  private async runWebSocketRequest(userId: number, requestId: number): Promise<any> {
    return new Promise((resolve) => {
      const client: Socket = io(`${this.config.baseUrl}/llm`, {
        auth: {
          token: this.config.authToken,
        },
        timeout: 10000,
      });

      let completed = false;

      const timeout = setTimeout(() => {
        if (!completed) {
          completed = true;
          client.disconnect();
          resolve({
            success: false,
            error: 'WebSocket request timeout',
          });
        }
      }, 10000);

      client.on('connect', () => {
        const streamRequest = {
          messages: [
            {
              role: 'user',
              content: `WebSocket load test message ${userId}-${requestId}`,
            },
          ],
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 50,
        };

        client.emit('llm:stream-completion', streamRequest);
      });

      client.on('llm:stream-end', () => {
        if (!completed) {
          completed = true;
          clearTimeout(timeout);
          client.disconnect();
          resolve({
            success: true,
            error: null,
          });
        }
      });

      client.on('llm:stream-error', (error) => {
        if (!completed) {
          completed = true;
          clearTimeout(timeout);
          client.disconnect();
          resolve({
            success: false,
            error: error.message || 'WebSocket stream error',
          });
        }
      });

      client.on('connect_error', (error) => {
        if (!completed) {
          completed = true;
          clearTimeout(timeout);
          client.disconnect();
          resolve({
            success: false,
            error: error.message || 'WebSocket connection error',
          });
        }
      });
    });
  }

  private aggregateResults(userResults: any[][]): LoadTestResult {
    const allResults = userResults.flat();
    const totalRequests = allResults.length;
    const successfulRequests = allResults.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const responseTimes = allResults.map(r => r.responseTime);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    
    const testDuration = (this.endTime - this.startTime) / 1000; // in seconds
    const requestsPerSecond = totalRequests / testDuration;
    const errorRate = (failedRequests / totalRequests) * 100;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      requestsPerSecond,
      errorRate,
    };
  }

  printResults(result: LoadTestResult, testType: string): void {
    console.log(`\n=== ${testType} Load Test Results ===`);
    console.log(`Total Requests: ${result.totalRequests}`);
    console.log(`Successful Requests: ${result.successfulRequests}`);
    console.log(`Failed Requests: ${result.failedRequests}`);
    console.log(`Error Rate: ${result.errorRate.toFixed(2)}%`);
    console.log(`Average Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
    console.log(`Min Response Time: ${result.minResponseTime}ms`);
    console.log(`Max Response Time: ${result.maxResponseTime}ms`);
    console.log(`Requests Per Second: ${result.requestsPerSecond.toFixed(2)}`);
    console.log(`Test Duration: ${((this.endTime - this.startTime) / 1000).toFixed(2)}s`);
  }
}

// Load test scenarios
export const loadTestScenarios = {
  // Light load test
  light: {
    concurrentUsers: 5,
    requestsPerUser: 10,
    testDuration: 60,
  },
  
  // Medium load test
  medium: {
    concurrentUsers: 20,
    requestsPerUser: 20,
    testDuration: 120,
  },
  
  // Heavy load test
  heavy: {
    concurrentUsers: 50,
    requestsPerUser: 30,
    testDuration: 300,
  },
  
  // Stress test
  stress: {
    concurrentUsers: 100,
    requestsPerUser: 50,
    testDuration: 600,
  },
};

// Main load test runner
export async function runLoadTests(
  baseUrl: string,
  authToken: string,
  scenario: keyof typeof loadTestScenarios = 'medium'
): Promise<void> {
  const config = {
    baseUrl,
    authToken,
    ...loadTestScenarios[scenario],
  };

  const tester = new LLMLoadTester(config);

  try {
    // Run chat completion load test
    const chatResult = await tester.runChatCompletionLoadTest();
    tester.printResults(chatResult, 'Chat Completion');

    // Run streaming load test
    const streamingResult = await tester.runStreamingLoadTest();
    tester.printResults(streamingResult, 'Streaming');

    // Run WebSocket load test
    const websocketResult = await tester.runWebSocketLoadTest();
    tester.printResults(websocketResult, 'WebSocket');

    // Performance analysis
    console.log('\n=== Performance Analysis ===');
    
    const allResults = [chatResult, streamingResult, websocketResult];
    const avgResponseTime = allResults.reduce((sum, r) => sum + r.averageResponseTime, 0) / allResults.length;
    const avgRPS = allResults.reduce((sum, r) => sum + r.requestsPerSecond, 0) / allResults.length;
    const avgErrorRate = allResults.reduce((sum, r) => sum + r.errorRate, 0) / allResults.length;

    console.log(`Overall Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Overall Average RPS: ${avgRPS.toFixed(2)}`);
    console.log(`Overall Average Error Rate: ${avgErrorRate.toFixed(2)}%`);

    // Performance recommendations
    console.log('\n=== Performance Recommendations ===');
    
    if (avgResponseTime > 1000) {
      console.log('⚠️  High response times detected. Consider optimizing database queries and caching.');
    }
    
    if (avgErrorRate > 5) {
      console.log('⚠️  High error rate detected. Check rate limiting and resource availability.');
    }
    
    if (avgRPS < 10) {
      console.log('⚠️  Low throughput detected. Consider scaling horizontally or optimizing bottlenecks.');
    }
    
    if (avgResponseTime < 500 && avgErrorRate < 2 && avgRPS > 20) {
      console.log('✅ Excellent performance! System is handling load well.');
    }

  } catch (error) {
    console.error('Load test failed:', error);
    throw error;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'http://localhost:3001';
  const authToken = args[1] || 'your-jwt-token-here';
  const scenario = (args[2] as keyof typeof loadTestScenarios) || 'medium';

  console.log(`Running load test with scenario: ${scenario}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Auth Token: ${authToken.substring(0, 20)}...`);

  runLoadTests(baseUrl, authToken, scenario)
    .then(() => {
      console.log('\n✅ Load tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Load tests failed:', error);
      process.exit(1);
    });
}
