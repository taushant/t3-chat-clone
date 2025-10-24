# T3 Chat Clone — README

> **⚠️ Important Notice (Oct 23, 2025):** If you're experiencing issues with the backend server not starting, please see [STARTUP_FIX_SUMMARY.md](./STARTUP_FIX_SUMMARY.md) for the resolution.

## 🚀 Purpose

This repository is our attempt to build a **T3 Chat clone** as part of the [T3 Chat Cloneathon](https://cloneathon.t3.chat/) challenge. The project is not just about replicating functionality — it's also about learning and applying a **modern JS-first SaaS tech stack** that can scale for real-world use.

We aim to:

- Deliver a **chat app with real-time streaming**, syntax highlighting, and attachment support.
- Provide a clean **API-first backend** that can support both **web** and future **mobile** clients.
- Learn and practice building **scalable SaaS architectures** with modern tooling.

---

## 🎯 Goals

- **Core Features**: Auth, chat creation, multiple LLM providers, streaming responses.
- **Bonus Features**: Syntax highlighting for code blocks, file attachments (PDFs, images), shareable chat links, branching conversations.
- **BYOK Support**: Allow users to bring their own API keys (including OpenRouter).
- **Cross-Platform Ready**: Designed so that mobile can be added later without major rewrites.

---

## 🛠️ Tech Stack (JS-first)

**Frontend (Web)**

- Next.js (React 18, App Router)
- Tailwind CSS + shadcn/ui + Radix UI
- TanStack Query
- react-markdown + Shiki/Prism for syntax highlighting
- react-dropzone for file uploads
- NextAuth.js for OAuth (Google, GitHub)
- WebSockets for real-time token streaming

**Backend**

- NestJS (Node.js + TypeScript)
- REST + WebSocket Gateway
- Prisma ORM (PostgreSQL)
- Redis + BullMQ for caching, sessions, and queues
- Provider adapters (OpenAI, Anthropic, OpenRouter)
- Attachment service (S3 storage + OCR + embeddings)
- OpenAPI docs (Swagger) with client SDK generation

**Workers**

- Node.js workers for background jobs
- Attachment pipeline: scan → extract → embed → store vectors

**Infra**

- PostgreSQL (pgvector for embeddings)
- Redis (pub/sub, queues, cache)
- Object storage (S3-compatible, e.g. Cloudflare R2)
- Vercel (frontend), Fly.io/Render/Railway (API)
- GitHub Actions for CI/CD

---

## 📂 Repository Structure

```
/t3-chat-clone
├── apps/
│   ├── web/        # Next.js frontend
│   └── api/        # NestJS backend (REST + WebSockets)
│
├── packages/
│   ├── ui/         # Shared React components
│   ├── utils/      # Shared helpers
│   ├── types/      # Shared Zod schemas & TS types
│   └── client-sdk/ # Auto-generated API clients (OpenAPI → TS)
│
├── workers/
│   └── attachment-worker/  # File scanning, OCR, embeddings
│
├── infra/          # Infra-as-code, CI/CD, Docker, Terraform
├── spec/           # Specs, PRDs, architecture diagrams
└── README.md
```

---

## 🚦 Getting Started

### Prerequisites

- **Node.js** v20+
- **pnpm** (recommended) or yarn
- PostgreSQL, Redis, and S3-compatible storage (local or cloud)

### Installation

```bash
# Clone the repo
git clone https://github.com/taushant/t3-chat-clone.git
cd t3-chat-clone

# Install dependencies
pnpm install
```

### Running Locally

```bash
# Start the backend API (recommended for development)
pnpm dev:api

# Alternative: Start with direct TypeScript execution
cd apps/api && pnpm dev:ts

# Start the frontend web app
pnpm dev:web

# Start workers (attachment pipeline)
pnpm --filter attachment-worker dev
```

---

## 📊 Development Progress

### ✅ Completed (Week 1)

- **Project Foundation**: Monorepo setup with pnpm workspaces
- **Backend Core**: NestJS application with proper TypeScript configuration
- **Security Foundation**: CORS, Helmet, rate limiting, input validation
- **Health Checks**: Comprehensive health monitoring endpoints
- **API Documentation**: Swagger/OpenAPI setup
- **Environment Management**: Secure configuration handling

### ✅ Completed (Week 2)

- **Database Setup**: PostgreSQL with Prisma ORM and migrations
- **Authentication System**: JWT-based auth with Local Strategy
- **User Management**: Registration, login, and profile endpoints
- **Security Implementation**: Role-based access control, account lockouts, audit logging
- **Enhanced User Management**: Password reset, profile updates, user search with filtering

### ✅ Completed (Week 3)

- **Chat Management System**: Complete CRUD operations for chats with role-based permissions
- **Message System**: Full messaging functionality with chat-based access control
- **Participant Management**: Add, remove, and update participant roles in chats
- **Advanced Features**: Filtering, pagination, search across chats and messages
- **Comprehensive Testing**: Unit tests (33+ test cases) and integration tests for all endpoints
- **API Security**: Input validation, access control, and error handling
- **Documentation**: OpenAPI/Swagger documentation for all endpoints

### ✅ Completed (Week 4)

- **WebSocket Implementation**: Complete real-time communication system with Socket.io
- **Room Management**: Join/leave chat rooms with real-time participant tracking
- **Real-time Messaging**: Live message broadcasting with delivery and read confirmations
- **Typing Indicators**: Real-time typing status for all room participants
- **Presence Management**: Online/offline status with user activity tracking
- **Connection Recovery**: Token-based session recovery with message queuing
- **Connection Monitoring**: Comprehensive monitoring with health status and analytics
- **Rate Limiting**: Advanced rate limiting for connections and messages
- **Security Features**: JWT authentication, origin validation, and abuse prevention
- **Testing & Documentation**: Unit tests, integration tests, and comprehensive API documentation

### ✅ Completed (Week 5-6)

- **LLM Provider Integration**: Multi-provider support for OpenAI, Anthropic, and OpenRouter
- **Streaming Responses**: Real-time AI chat with Server-Sent Events and WebSocket streaming
- **Chat Completion API**: Non-streaming and streaming completion endpoints with full error handling
- **API Key Management**: Secure BYOK (Bring Your Own Key) system with validation and provider detection
- **Enhanced Streaming**: Optimized SSE streaming with connection management and buffering
- **Content Processing**: Advanced markdown processing with syntax highlighting (31 languages, 4 themes)
- **Content Moderation**: Real-time content filtering with 4 security rules and 3 moderation systems
- **Response Enhancement**: Comprehensive response processing pipeline with caching and optimization
- **Performance Monitoring**: Real-time metrics collection and optimization with detailed analytics
- **Rate Limiting**: Advanced provider-specific rate limiting with usage tracking and abuse prevention
- **Security Implementation**: Content filtering, API key security, and comprehensive audit logging

### ✅ Completed (Week 7-9)

- **Frontend Development**: Complete Next.js application with modern chat interface
- **Authentication Integration**: NextAuth.js with JWT and OAuth providers
- **Real-time Chat Interface**: WebSocket-powered messaging with typing indicators
- **File Upload System**: Drag-and-drop file sharing with progress tracking
- **Markdown Rendering**: Rich text support with syntax highlighting
- **Advanced UI Features**: Toast notifications, modals, loading states
- **Responsive Design**: Mobile-first, accessible interface

### 📋 Upcoming

- **File Processing**: OCR and vector embeddings for uploaded files
- **RAG Implementation**: Retrieval-Augmented Generation with file context
- **Advanced Features**: Voice messages, video calls, advanced search

---

## 🐛 Known Issues & Solutions

### NestJS Build Issues (Resolved ✅)

**Problem**: TypeScript compilation conflicts prevented the app from starting
**Solution**:

- Fixed module resolution conflicts in `tsconfig.json`
- Added `dev:ts` script for direct TypeScript execution
- Resolved missing `@nestjs/axios` dependency

**Current Status**: Application runs successfully on port 3001

---

## 🔐 Current API Endpoints

### Authentication & User Management

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password with token
- `POST /api/v1/auth/validate-reset-token` - Validate reset token

### User Profile Management

- `GET /api/v1/users/profile` - Get current user profile
- `PUT /api/v1/users/profile` - Update user profile
- `PUT /api/v1/users/change-password` - Change password

### User Administration (Role-Based)

- `GET /api/v1/users/search` - **Admin/Moderator** - Search and filter users
- `GET /api/v1/users/admin/users` - **Admin only** - Get all users
- `GET /api/v1/users/moderator/active-users` - **Admin/Moderator** - Get active users

### Chat Management (NEW ✨)

- `POST /api/v1/chats` - Create a new chat
- `GET /api/v1/chats` - Get all accessible chats with filtering and pagination
- `GET /api/v1/chats/my` - Get user's chats
- `GET /api/v1/chats/public` - Get public chats
- `GET /api/v1/chats/:id` - Get specific chat details
- `PATCH /api/v1/chats/:id` - Update chat (Owner/Admin only)
- `DELETE /api/v1/chats/:id` - Delete chat (Owner only)

### Participant Management (NEW ✨)

- `POST /api/v1/chats/:id/participants` - Add participant to chat
- `PATCH /api/v1/chats/:id/participants/:participantId/role` - Update participant role
- `DELETE /api/v1/chats/:id/participants/:participantId` - Remove participant

### Message Management (NEW ✨)

- `POST /api/v1/messages` - Create a new message
- `GET /api/v1/messages` - Get all accessible messages with filtering
- `GET /api/v1/messages/my` - Get user's messages
- `GET /api/v1/messages/search` - Search messages across accessible chats
- `GET /api/v1/messages/chat/:chatId` - Get messages for specific chat
- `GET /api/v1/messages/:id` - Get specific message details
- `PATCH /api/v1/messages/:id` - Update message (Author/Admin only)
- `DELETE /api/v1/messages/:id` - Delete message (Author/Admin only)

### Public Endpoints

- `GET /api/v1/users/public/stats` - Public user statistics
- `GET /api/v1/health` - Health checks

### WebSocket Endpoints (NEW ✨)

**Real-time Communication via WebSocket Gateway (`/chat` namespace):**

- **Room Management**: `join:chat`, `leave:chat`, `room:info`, `room:list`, `room:online`
- **Real-time Messaging**: `message:send`, `message:typing`, `message:delivered`, `message:read`
- **Presence Management**: `presence:update-status`, `presence:online-users`, `presence:user-status`
- **Connection Recovery**: `connection:create-session`, `connection:recover`, `connection:session-info`
- **Connection Monitoring**: `monitoring:metrics`, `monitoring:events`, `monitoring:health`

**WebSocket Features:**

- Real-time message broadcasting with delivery/read confirmations
- Typing indicators and presence status
- Connection recovery with message queuing
- Comprehensive monitoring and analytics
- Advanced rate limiting and security
- Multi-room support with participant tracking

**Documentation**: See [`docs/websocket-api.md`](docs/websocket-api.md) for complete WebSocket API documentation.

### LLM Integration Endpoints (NEW ✨)

**Large Language Model Integration:**

- **Chat Completion**: `POST /api/v1/llm/chat/completion` - Non-streaming completion
- **Streaming Completion**: `POST /api/v1/llm/chat/completion/stream` - Real-time streaming
- **Enhanced Streaming**: `POST /api/v1/llm/stream/completion/optimized` - Optimized SSE streaming
- **API Key Management**: `POST /api/v1/llm/api-keys` - Create, validate, and manage API keys
- **Provider Information**: `GET /api/v1/llm/api-keys/providers` - Available providers and models

**Supported Providers:**

- **OpenAI**: GPT-3.5-turbo, GPT-4, GPT-4-turbo with full streaming support
- **Anthropic**: Claude-3-sonnet, Claude-3-haiku, Claude-3-opus with message conversion
- **OpenRouter**: Access to 100+ models from various providers with unified API

**LLM Features:**

- Multi-provider support with automatic provider detection
- Real-time streaming responses via Server-Sent Events and WebSockets
- Comprehensive rate limiting and usage tracking
- Secure API key management and validation
- Advanced error handling and retry logic
- Provider health monitoring and failover

**Documentation**: See [`docs/llm-integration-guide.md`](docs/llm-integration-guide.md) for complete LLM API documentation.

### Streaming & Response Processing Endpoints (NEW ✨)

**Enhanced Streaming & Processing:**

- **WebSocket Streaming**: `WebSocket /llm` - Real-time WebSocket streaming gateway
- **Markdown Processing**: `POST /api/v1/llm/markdown/parse` - Parse and render markdown
- **Code Block Processing**: `POST /api/v1/llm/markdown/code-block/process` - Process code blocks with syntax highlighting
- **Content Moderation**: `POST /api/v1/llm/moderation/moderate` - Real-time content moderation
- **Content Filtering**: `POST /api/v1/llm/moderation/filter` - Advanced content filtering
- **Response Processing**: `POST /api/v1/llm/response/process` - End-to-end response processing pipeline

**Streaming & Processing Features:**

- Enhanced SSE streaming with connection management
- WebSocket streaming for real-time LLM responses
- Advanced markdown processing with syntax highlighting
- Real-time content moderation and filtering
- Response processing pipeline with enhancement and caching
- Comprehensive testing and monitoring

**Documentation**: See [`docs/week6-streaming-response-guide.md`](docs/week6-streaming-response-guide.md) for complete streaming and processing API documentation.

### Frontend Application (NEW ✨)

**Modern Web Application:**

- **Home Page**: `GET /` - Landing page with feature overview and authentication links
- **Authentication**: `/auth/login`, `/auth/register` - User authentication pages
- **Dashboard**: `/dashboard` - User dashboard with chat overview and quick actions
- **Chat Interface**: `/chat` - Full-featured chat application with real-time messaging

**Frontend Features:**

- **Real-time Chat**: WebSocket-powered messaging with typing indicators and presence status
- **File Upload**: Drag-and-drop file sharing with progress tracking and preview
- **Markdown Support**: Rich text rendering with syntax highlighting for code blocks
- **Responsive Design**: Mobile-first, accessible interface that works on all devices
- **Toast Notifications**: User feedback system for actions and errors
- **Chat Management**: Create, update, delete chats with privacy controls
- **Authentication**: NextAuth.js integration with JWT and OAuth providers
- **State Management**: TanStack Query for efficient data fetching and caching

**Technology Stack:**

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript with full type safety
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state
- **Real-time**: Socket.io Client for WebSocket communication
- **Authentication**: NextAuth.js with multiple providers
- **File Handling**: react-dropzone for file uploads
- **Markdown**: react-markdown with syntax highlighting

**Documentation**: See [`apps/web/README.md`](apps/web/README.md) for complete frontend documentation.

---

## 🚀 Current Status

**Week 1**: ✅ **COMPLETED** - All foundation tasks completed successfully
**Week 2**: ✅ **COMPLETED** - Database setup, authentication, and enhanced user management  
**Week 3**: ✅ **COMPLETED** - Core API endpoints, chat & message management, comprehensive testing
**Week 4**: ✅ **COMPLETED** - WebSocket implementation with real-time communication, presence management, and monitoring
**Week 5**: ✅ **COMPLETED** - LLM provider integration with multi-provider support, streaming, and rate limiting
**Week 6**: ✅ **COMPLETED** - Streaming & Response Processing with enhanced SSE, WebSocket streaming, markdown processing, content moderation, and response pipeline
**Week 7**: ✅ **COMPLETED** - Frontend Foundation & Authentication with Next.js, NextAuth.js, and UI components
**Week 8**: ✅ **COMPLETED** - Chat Interface & Real-time Updates with WebSocket integration and responsive design
**Week 9**: ✅ **COMPLETED** - Advanced Features & Polish with file upload, markdown rendering, and toast notifications

### 🎯 **Recent Achievement**: Complete LLM Module Integration

- ✅ **Property Initialization Issues**: Fixed TypeScript strict mode errors across all LLM DTOs
- ✅ **Dependency Injection**: Resolved EventEmitter2 and JwtService dependencies in LLM module
- ✅ **Server Startup**: Full server operation with ALL modules enabled including complete LLM functionality
- ✅ **Production Ready**: 45+ LLM endpoints, 6 LLM services, comprehensive testing and monitoring

**Next Milestone**: Phase 4 - File Processing & Advanced Features

## 🤖 LLM Integration & API Key Configuration

### Global API Key System (Current Implementation)

The T3 Chat Clone uses a **global API key system** for LLM providers. All users share the same API keys configured at the system level.

#### Required Environment Variables

Add these to your `apps/api/.env` file:

```bash
# LLM Provider API Keys (Required for AI chat functionality)
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
OPENROUTER_API_KEY="your-openrouter-api-key"
```

#### Supported Providers

- **OpenAI**: GPT-4, GPT-3.5-turbo, GPT-4-turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Haiku, Claude 3 Opus
- **OpenRouter**: 100+ models including free options (Llama, Mistral, etc.)

#### Getting API Keys

1. **OpenAI**: https://platform.openai.com/api-keys
   - Cost: ~$0.03-0.06 per conversation
   - Recommended for best quality

2. **Anthropic**: https://console.anthropic.com/
   - Cost: ~$0.15-0.75 per 1K tokens
   - Excellent for reasoning tasks

3. **OpenRouter**: https://openrouter.ai/keys
   - Cost: Variable (includes free models)
   - Access to multiple providers through one API

#### Configuration Priority

1. Set **at least one** API key to enable AI chat functionality
2. **OpenAI** is used as the default provider for new chats
3. Users can select different models through the chat interface
4. Missing API keys will show clear error messages

### Future Enhancement: Hybrid Approach (Planned)

The system is designed to support a **hybrid approach** in the future:

- **Global API keys** (current): Shared across all users, managed by system admin
- **User API keys** (planned): Users can bring their own keys for specific models
- **Quota management**: Per-user usage limits and billing integration
- **Model selection**: User preference for default models and providers

This design allows for:

- **Free tier**: Users use global keys with usage limits
- **Pro tier**: Users bring their own keys for unlimited usage
- **Enterprise**: Custom API keys and dedicated resources

### Testing Without API Keys

For development and testing without real API keys, you can:

1. **Mock mode**: Set `LLM_MOCK_MODE=true` in `.env` for fake responses
2. **OpenRouter free models**: Use free models with OpenRouter API key
3. **Local LLM**: Set up Ollama for local model inference (advanced)

### Security Features Implemented

- ✅ **JWT Authentication** with proper token validation
- ✅ **Role-Based Access Control** with granular permissions
- ✅ **Account Lockout** after multiple failed attempts
- ✅ **Comprehensive Audit Logging** for security events
- ✅ **Input Validation** with class-validator
- ✅ **Password Hashing** with bcrypt
- ✅ **Rate Limiting** for API endpoints
- ✅ **CORS Protection** with configurable origins
- ✅ **Security Headers** with Helmet middleware

---

## 🧭 Vision

By the end of this project, we will have:

- A **production-quality, full-stack chat app**.
- A **reusable SaaS template** for future ideas.
- Hands-on experience with a **JS-first, API-driven architecture**.

This repo is both a **challenge submission** and a **learning journey** — building the right way, with scalability, modularity, and developer experience in mind.
