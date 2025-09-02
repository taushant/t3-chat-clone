# T3 Chat Clone — README

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

### 🔄 In Progress

- **Frontend Development**: Next.js application with chat interface

### 📋 Upcoming

- **LLM Integration**: Provider adapters and streaming responses
- **File Processing**: Upload, OCR, and vector embeddings
- **Advanced Features**: Syntax highlighting, file attachments, RAG implementation

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

---

## 🚀 Current Status

**Week 1**: ✅ **COMPLETED** - All foundation tasks completed successfully
**Week 2**: ✅ **COMPLETED** - Database setup, authentication, and enhanced user management  
**Week 3**: ✅ **COMPLETED** - Core API endpoints, chat & message management, comprehensive testing
**Week 4**: ✅ **COMPLETED** - WebSocket implementation with real-time communication, presence management, and monitoring
**Next Milestone**: Week 5 - LLM provider integration and streaming responses

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
