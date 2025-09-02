# Week 5: LLM Provider Integration - Detailed Plan

## 📋 Current State Assessment

**✅ Completed Foundation:**

- Backend API with NestJS (authentication, chat management, messaging)
- WebSocket real-time communication with 25+ endpoints
- Database schema with users, chats, messages, and API keys
- Security implementation (JWT, RBAC, audit logging, rate limiting)
- Comprehensive testing and documentation

**✅ Week 5 COMPLETED:**

- **Provider Abstraction Layer**: Complete with interfaces, base classes, and registry
- **Multiple LLM Providers**: OpenAI, Anthropic, and OpenRouter fully implemented
- **Streaming Support**: Both REST and WebSocket streaming working
- **API Key Management**: Secure API key storage, validation, and rotation
- **Rate Limiting**: Comprehensive rate limiting with usage tracking
- **Security**: Input validation, error handling, and audit logging
- **Testing**: Unit and integration tests with >90% coverage
- **Documentation**: Complete API documentation and guides

**🎯 Week 5 Goal:** ✅ **ACHIEVED** - Multiple LLM providers integrated with streaming support and secure API key management

---

## 🏗️ Week 5: LLM Provider Integration Plan

### **Phase 1: Provider Abstraction Layer (Days 1-2)**

#### **Day 1: Core Interfaces and Base Classes**

**Learning Objectives:**

- Understanding adapter pattern for API integration
- Designing extensible provider interfaces
- Error handling strategies for external APIs

**Tasks:**

1. **Create Provider Interface** (2-3 hours)

   ```typescript
   // apps/api/src/llm/interfaces/llm-provider.interface.ts
   interface LLMProvider {
     name: string;
     streamChatCompletion(
       request: ChatCompletionRequest
     ): AsyncIterable<ChatCompletionChunk>;
     validateApiKey(apiKey: string): Promise<boolean>;
     getRateLimits(): RateLimitConfig;
   }
   ```

2. **Define Core Types** (1-2 hours)

   ```typescript
   // apps/api/src/llm/types/chat-completion.types.ts
   interface ChatCompletionRequest {
     messages: ChatMessage[];
     model: string;
     temperature?: number;
     maxTokens?: number;
     stream?: boolean;
   }
   ```

3. **Create Base Provider Class** (2-3 hours)

   ```typescript
   // apps/api/src/llm/providers/base-provider.ts
   abstract class BaseLLMProvider implements LLMProvider {
     protected rateLimiter: RateLimiter;
     protected logger: Logger;

     abstract streamChatCompletion(
       request: ChatCompletionRequest
     ): AsyncIterable<ChatCompletionChunk>;
     abstract validateApiKey(apiKey: string): Promise<boolean>;
   }
   ```

**Security Focus:**

- API key validation and sanitization
- Rate limiting per provider
- Error handling without exposing sensitive data

#### **Day 2: Provider Registry and Configuration**

**Learning Objectives:**

- Service registry pattern
- Configuration management for multiple providers
- Dependency injection with NestJS

**Tasks:**

1. **Create Provider Registry** (2-3 hours)

   ```typescript
   // apps/api/src/llm/services/provider-registry.service.ts
   @Injectable()
   export class ProviderRegistryService {
     private providers = new Map<string, LLMProvider>();

     registerProvider(provider: LLMProvider): void;
     getProvider(name: string): LLMProvider;
     listProviders(): string[];
   }
   ```

2. **Provider Configuration** (1-2 hours)

   ```typescript
   // apps/api/src/llm/config/provider.config.ts
   interface ProviderConfig {
     openai: { baseUrl: string; defaultModel: string };
     anthropic: { baseUrl: string; defaultModel: string };
     openrouter: { baseUrl: string; defaultModel: string };
   }
   ```

3. **Module Setup** (1-2 hours)
   ```typescript
   // apps/api/src/llm/llm.module.ts
   @Module({
     providers: [ProviderRegistryService, ...],
     exports: [ProviderRegistryService],
   })
   export class LLMModule {}
   ```

**Deliverables:**

- Provider abstraction layer
- Configuration system
- Service registry
- Core types and interfaces

---

### **Phase 2: Provider Implementations (Days 2-4)**

#### **Day 2-3: OpenAI Adapter**

**Learning Objectives:**

- OpenAI API integration patterns
- Streaming response handling
- Error handling and retry logic

**Tasks:**

1. **OpenAI Provider Implementation** (3-4 hours)

   ```typescript
   // apps/api/src/llm/providers/openai.provider.ts
   @Injectable()
   export class OpenAIProvider extends BaseLLMProvider {
     private client: OpenAI;

     async streamChatCompletion(
       request: ChatCompletionRequest
     ): AsyncIterable<ChatCompletionChunk> {
       // Implementation with streaming support
     }

     async validateApiKey(apiKey: string): Promise<boolean> {
       // Validate API key with OpenAI
     }
   }
   ```

2. **Streaming Implementation** (2-3 hours)
   - Server-sent events handling
   - Chunk processing and validation
   - Error recovery and retry logic

3. **Rate Limiting** (1-2 hours)
   - OpenAI-specific rate limits
   - Token-based limiting
   - Usage tracking

**Security Focus:**

- API key encryption and storage
- Request/response validation
- Rate limiting enforcement

#### **Day 3-4: Anthropic Adapter**

**Learning Objectives:**

- Anthropic Claude API integration
- Different streaming patterns
- Provider-specific error handling

**Tasks:**

1. **Anthropic Provider Implementation** (3-4 hours)

   ```typescript
   // apps/api/src/llm/providers/anthropic.provider.ts
   @Injectable()
   export class AnthropicProvider extends BaseLLMProvider {
     // Implementation for Claude API
   }
   ```

2. **Message Formatting** (1-2 hours)
   - Anthropic-specific message format
   - System prompt handling
   - Context management

3. **Testing and Validation** (1-2 hours)
   - Unit tests for Anthropic provider
   - Integration tests
   - Error scenario testing

#### **Day 4: OpenRouter Adapter**

**Learning Objectives:**

- Multi-provider aggregation
- Model selection and routing
- Unified API interface

**Tasks:**

1. **OpenRouter Provider Implementation** (3-4 hours)

   ```typescript
   // apps/api/src/llm/providers/openrouter.provider.ts
   @Injectable()
   export class OpenRouterProvider extends BaseLLMProvider {
     // Implementation for OpenRouter API
   }
   ```

2. **Model Management** (1-2 hours)
   - Available models listing
   - Model capabilities mapping
   - Dynamic model selection

3. **Provider Integration** (1-2 hours)
   - Register all providers
   - Configuration validation
   - Health checks

**Deliverables:**

- OpenAI adapter with streaming
- Anthropic adapter with streaming
- OpenRouter adapter with streaming
- Provider registration and configuration

---

### **Phase 3: Chat Completion API (Days 4-5)**

#### **Day 4-5: API Endpoints and Streaming**

**Learning Objectives:**

- RESTful API design for LLM integration
- Server-sent events implementation
- WebSocket integration for real-time responses

**Tasks:**

1. **Chat Completion Controller** (2-3 hours)

   ```typescript
   // apps/api/src/llm/controllers/chat-completion.controller.ts
   @Controller("llm/chat")
   export class ChatCompletionController {
     @Post("completion")
     async createCompletion(@Body() request: ChatCompletionRequestDto) {
       // Handle chat completion request
     }

     @Post("completion/stream")
     async streamCompletion(
       @Body() request: ChatCompletionRequestDto,
       @Res() res: Response
     ) {
       // Handle streaming response
     }
   }
   ```

2. **WebSocket Integration** (2-3 hours)

   ```typescript
   // Integration with existing WebSocket gateway
   @SubscribeMessage('llm:chat-completion')
   async handleLLMChatCompletion(
     @MessageBody() data: LLMChatRequest,
     @ConnectedSocket() client: AuthenticatedSocket,
   ) {
     // Stream LLM response via WebSocket
   }
   ```

3. **Message Processing** (1-2 hours)
   - Context building from chat history
   - Message formatting for different providers
   - Response processing and validation

**Security Focus:**

- Input validation and sanitization
- Rate limiting per user/provider
- Content filtering and moderation

#### **Day 5: API Key Management**

**Learning Objectives:**

- Secure API key storage and management
- User-specific API key handling
- Key rotation and validation

**Tasks:**

1. **API Key Service** (2-3 hours)

   ```typescript
   // apps/api/src/llm/services/api-key.service.ts
   @Injectable()
   export class ApiKeyService {
     async createApiKey(
       userId: string,
       provider: string,
       key: string
     ): Promise<ApiKey>;
     async validateApiKey(userId: string, provider: string): Promise<boolean>;
     async rotateApiKey(apiKeyId: string): Promise<ApiKey>;
   }
   ```

2. **API Key Controller** (1-2 hours)

   ```typescript
   // apps/api/src/llm/controllers/api-key.controller.ts
   @Controller('llm/api-keys')
   export class ApiKeyController {
     @Post()
     async createApiKey(@Body() request: CreateApiKeyDto);

     @Get()
     async getUserApiKeys(@Request() req: AuthenticatedRequest);

     @Delete(':id')
     async deleteApiKey(@Param('id') id: string);
   }
   ```

3. **Database Integration** (1-2 hours)
   - Update existing ApiKey model
   - Add provider-specific fields
   - Migration for new fields

**Deliverables:**

- Chat completion API endpoints
- Streaming response implementation
- WebSocket integration
- API key management system

---

### **Phase 4: Security and Monitoring (Day 5)**

#### **Day 5: Rate Limiting and Monitoring**

**Learning Objectives:**

- Advanced rate limiting strategies
- Usage monitoring and analytics
- Security monitoring and alerting

**Tasks:**

1. **Rate Limiting Service** (2-3 hours)

   ```typescript
   // apps/api/src/llm/services/rate-limit.service.ts
   @Injectable()
   export class LLMRateLimitService {
     async checkRateLimit(userId: string, provider: string): Promise<boolean>;
     async recordUsage(
       userId: string,
       provider: string,
       tokens: number
     ): Promise<void>;
     async getUsageStats(userId: string): Promise<UsageStats>;
   }
   ```

2. **Usage Tracking** (1-2 hours)
   - Token usage tracking
   - Cost calculation
   - Usage analytics

3. **Security Monitoring** (1-2 hours)
   - API key usage monitoring
   - Suspicious activity detection
   - Audit logging for LLM requests

**Security Focus:**

- Comprehensive rate limiting
- Usage monitoring and abuse prevention
- Security event logging

---

## 🧪 Testing Strategy

### **Unit Tests (Day 5)**

- Provider interface tests
- Individual provider implementations
- API key management tests
- Rate limiting tests

### **Integration Tests (Day 5)**

- End-to-end chat completion flow
- WebSocket streaming tests
- API key validation tests
- Error handling scenarios

### **Test Coverage Goals**

- Provider implementations: >90%
- API endpoints: >85%
- Security features: >95%

---

## 📚 Documentation Updates

### **API Documentation**

- Update Swagger/OpenAPI specs
- Add LLM endpoint documentation
- Include streaming examples
- Document rate limits and usage

### **Implementation Guide**

- Provider integration guide
- API key management guide
- Streaming implementation guide
- Security best practices

---

## 🔒 Security Considerations

### **API Key Security**

- Encryption at rest and in transit
- Secure key rotation
- Access control and audit logging

### **Rate Limiting**

- User-based limits
- Provider-specific limits
- Abuse prevention and monitoring

### **Content Security**

- Input validation and sanitization
- Response content filtering
- Malicious content detection

---

## 📊 Success Metrics

### **Functional Requirements**

- [x] Multiple LLM providers integrated (OpenAI, Anthropic, OpenRouter) ✅
- [x] Streaming responses working via REST and WebSocket ✅
- [x] API key management system functional ✅
- [x] Rate limiting and monitoring implemented ✅

### **Performance Requirements**

- [x] Response streaming latency < 100ms ✅
- [x] API key validation < 50ms ✅
- [x] Rate limiting checks < 10ms ✅

### **Security Requirements**

- [x] API keys encrypted and secure ✅
- [x] Rate limiting prevents abuse ✅
- [x] Comprehensive audit logging ✅
- [x] Input validation and sanitization ✅

---

## 🚀 Next Steps After Week 5

1. **Week 6**: ✅ **COMPLETED** - Streaming & Response Processing
   - ✅ Server-sent events optimization
   - ✅ Markdown parsing and rendering
   - ✅ Code block highlighting
   - ✅ Content moderation

2. **Week 7**: Frontend Development
   - Next.js application setup
   - Authentication integration
   - Chat interface development

3. **Week 8**: Production Deployment
   - End-to-end integration testing
   - Performance optimization
   - Production monitoring setup

**Week 5 Status: ✅ COMPLETED SUCCESSFULLY**

This plan has been successfully implemented, building a robust, secure, and scalable LLM integration system that handles multiple providers with streaming support while maintaining the high security standards established in previous weeks.
