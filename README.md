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

### 🔄 In Progress

- **Core API Endpoints**: Chat functionality and messaging system
- **Real-time Communication**: WebSocket implementation
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

### Public Endpoints
- `GET /api/v1/users/public/stats` - Public user statistics
- `GET /api/v1/health` - Health checks

---

## 🚀 Current Status

**Week 1**: ✅ **COMPLETED** - All foundation tasks completed successfully
**Week 2**: ✅ **COMPLETED** - Database setup, authentication, and enhanced user management
**Next Milestone**: Week 3 - Core API endpoints and chat functionality

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
