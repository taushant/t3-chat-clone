# Backend Server Troubleshooting Guide

This document describes common issues when starting the backend server and how to resolve them.

## Issue: Server Not Starting - "Cannot find module dist/main"

### Symptoms

- Server fails to start with error: `Cannot find module '/path/to/apps/api/dist/main'`
- Running `npm start:dev` or `pnpm start:dev` fails immediately
- The `dist` directory is missing or empty

### Root Cause

The issue occurred due to a conflict in the TypeScript configuration. The `apps/api/tsconfig.json` was extending the root `tsconfig.json` which had conflicting compiler options, particularly around the `isolatedModules` and `incremental` settings. This prevented TypeScript from emitting compiled files to the `dist` directory.

Additionally, stale `tsconfig.tsbuildinfo` files can cause incremental compilation issues.

### Solution

#### Permanent Fix (Already Applied)

The `apps/api/tsconfig.json` has been updated to include all necessary compiler options directly instead of extending the root configuration. This ensures consistent builds:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictPropertyInitialization": false,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "noEmit": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

#### If the Issue Recurs

1. **Clean stale build artifacts:**

   ```bash
   cd apps/api
   rm -rf dist
   rm -f tsconfig.tsbuildinfo *.tsbuildinfo
   ```

2. **Rebuild the project:**

   ```bash
   npx nest build
   ```

3. **Verify the dist directory was created:**

   ```bash
   ls -la dist
   ```

4. **Start the server:**
   ```bash
   pnpm start:dev
   ```

### Prevention

To prevent this issue from happening again, use the startup verification script before starting the server:

```bash
cd apps/api
./scripts/verify-startup.sh
```

This script checks:

- ✅ Environment configuration (`.env` file)
- ✅ Required environment variables
- ✅ Dependencies installed
- ✅ Docker services running
- ✅ Build artifacts exist
- ✅ Database connectivity

## Other Common Issues

### Issue: Database Connection Failed

**Symptoms:**

- Error: "Can't reach database server"
- Prisma connection errors

**Solution:**

1. Ensure Docker containers are running:

   ```bash
   docker compose ps
   ```

2. Start PostgreSQL if not running:

   ```bash
   docker compose up -d postgres
   ```

3. Verify database URL in `.env`:

   ```
   DATABASE_URL="postgresql://t3_user:t3_password@localhost:5432/t3_chat_clone"
   ```

4. Test connection:
   ```bash
   npx prisma db execute --stdin <<< "SELECT 1;"
   ```

### Issue: Missing Environment Variables

**Symptoms:**

- Warnings about missing API keys
- Configuration errors on startup

**Solution:**

1. Copy environment template:

   ```bash
   cp env.example .env
   ```

2. Edit `.env` and fill in required values:
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` - Secret for JWT tokens
   - `JWT_REFRESH_SECRET` - Secret for refresh tokens
   - `PORT` - Server port (default: 3001)

3. Optional API keys (for LLM features):
   - `OPENAI_API_KEY` - OpenAI API key
   - `ANTHROPIC_API_KEY` - Anthropic API key
   - `OPENROUTER_API_KEY` - OpenRouter API key

### Issue: Port Already in Use

**Symptoms:**

- Error: "Port 3001 is already in use"
- EADDRINUSE error

**Solution:**

1. Check what's using the port:

   ```bash
   lsof -ti:3001
   ```

2. Kill the process:

   ```bash
   kill -9 $(lsof -ti:3001)
   ```

3. Or change the port in `.env`:
   ```
   PORT=3002
   ```

### Issue: Prisma Schema Out of Sync

**Symptoms:**

- Database errors about missing tables or columns
- Migration warnings

**Solution:**

1. Apply pending migrations:

   ```bash
   npx prisma migrate dev
   ```

2. Generate Prisma Client:

   ```bash
   npx prisma generate
   ```

3. Reset database (development only):
   ```bash
   npx prisma migrate reset
   ```

## Quick Health Check

Run this command to verify everything is working:

```bash
curl http://localhost:3001/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "info": { ... },
  "error": {},
  "details": { ... }
}
```

## Getting Help

If you encounter issues not covered in this guide:

1. Check the logs: `tail -f backend.log`
2. Enable verbose logging in `.env`: `NODE_ENV=development`
3. Run the verification script: `./scripts/verify-startup.sh`
4. Review the main README for setup instructions

## Development Workflow

For a smooth development experience, follow this workflow:

1. **First time setup:**

   ```bash
   # Install dependencies
   pnpm install

   # Set up environment
   cp env.example .env
   # Edit .env with your values

   # Start Docker services
   docker compose up -d

   # Run migrations
   npx prisma migrate dev

   # Verify setup
   ./scripts/verify-startup.sh

   # Start development server
   pnpm start:dev
   ```

2. **Daily development:**

   ```bash
   # Ensure Docker is running
   docker compose ps

   # Optional: Verify prerequisites
   ./scripts/verify-startup.sh

   # Start development server
   pnpm start:dev
   ```

3. **After pulling new code:**

   ```bash
   # Install any new dependencies
   pnpm install

   # Apply new migrations
   npx prisma migrate dev

   # Rebuild
   npx nest build

   # Start server
   pnpm start:dev
   ```

## Related Documentation

- [Project Setup Guide](../../spec/project-setup-guide.md)
- [WebSocket Implementation](./websocket-implementation-summary.md)
- [LLM Integration Guide](./llm-integration-guide.md)
- [Testing Guide](./testing-and-performance-guide.md)
