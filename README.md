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

### 🔄 In Progress (Week 2)

- **Database Setup**: PostgreSQL with Prisma ORM
- **Authentication System**: JWT-based auth with OAuth support
- **User Management**: Registration, login, and profile endpoints

### 📋 Upcoming

- **Real-time Communication**: WebSocket implementation
- **LLM Integration**: Provider adapters and streaming responses
- **Frontend Development**: Next.js application with chat interface
- **File Processing**: Upload, OCR, and vector embeddings

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

## 🧭 Vision

By the end of this project, we will have:

- A **production-quality, full-stack chat app**.
- A **reusable SaaS template** for future ideas.
- Hands-on experience with a **JS-first, API-driven architecture**.

This repo is both a **challenge submission** and a **learning journey** — building the right way, with scalability, modularity, and developer experience in mind.
