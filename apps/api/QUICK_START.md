# Quick Start Guide

## Starting the Backend Server

### Option 1: With Verification (Recommended)

```bash
cd apps/api

# Run verification script
./scripts/verify-startup.sh

# If all checks pass, start the server
pnpm start:dev
```

### Option 2: Direct Start

```bash
cd apps/api
pnpm start:dev
```

### Option 3: From Project Root

```bash
# From project root
pnpm dev:api
```

## Common Commands

```bash
# Development with hot-reload
pnpm start:dev

# Production build
pnpm build
pnpm start:prod

# Run tests
pnpm test

# Run e2e tests
pnpm test:e2e

# Database operations
pnpm db:migrate    # Run migrations
pnpm db:studio     # Open Prisma Studio

# Health check
curl http://localhost:3001/api/v1/health
```

## First Time Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp env.example .env
# Edit .env with your configuration

# 3. Start Docker services
docker compose up -d

# 4. Run database migrations
pnpm db:migrate

# 5. Verify setup
./scripts/verify-startup.sh

# 6. Start development server
pnpm start:dev
```

## Troubleshooting

If the server doesn't start:

1. **Run the verification script:**

   ```bash
   ./scripts/verify-startup.sh
   ```

2. **Check if Docker containers are running:**

   ```bash
   docker compose ps
   ```

3. **Clean and rebuild:**

   ```bash
   rm -rf dist *.tsbuildinfo
   npx nest build
   ```

4. **Check logs:**
   ```bash
   tail -f backend.log
   ```

For detailed troubleshooting, see [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)

## API Access

- **API Base URL:** http://localhost:3001/api/v1
- **API Documentation:** http://localhost:3001/api/docs
- **Health Check:** http://localhost:3001/api/v1/health

## Environment Variables

Required:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `PORT` - Server port (default: 3001)

Optional (for LLM features):

- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key
- `OPENROUTER_API_KEY` - OpenRouter API key

See `env.example` for all available options.

## Development Workflow

### Daily Development

```bash
# 1. Ensure Docker is running
docker compose ps

# 2. Start server
pnpm start:dev

# 3. Make changes (hot-reload enabled)

# 4. Test changes
curl http://localhost:3001/api/v1/health
```

### After Pulling New Code

```bash
# 1. Install new dependencies (if any)
pnpm install

# 2. Run new migrations (if any)
pnpm db:migrate

# 3. Rebuild
npx nest build

# 4. Start server
pnpm start:dev
```

## Need Help?

- 📖 [Full Documentation](./docs/)
- 🔧 [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)
- 🐛 [Startup Issue Resolution](../../STARTUP_FIX_SUMMARY.md)
- 🌐 [WebSocket API](./docs/websocket-api.md)
- 🤖 [LLM Integration](./docs/llm-integration-guide.md)
