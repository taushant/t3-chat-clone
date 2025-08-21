# Project Setup Guide

## 🚀 Getting Started

This guide will walk you through setting up your development environment for the T3 Chat Clone project. We'll set up everything step by step, ensuring you have a solid foundation to begin development.

---

## 📋 Prerequisites

### Required Software
- **Node.js** v20+ (LTS version recommended)
- **pnpm** (recommended) or npm/yarn
- **Git** for version control
- **PostgreSQL** 14+ for database
- **Redis** 6+ for caching and sessions
- **Docker** (optional, for containerized development)

### Development Tools
- **VS Code** (recommended) or your preferred editor
- **Postman** or **Insomnia** for API testing
- **pgAdmin** or **DBeaver** for database management
- **Redis CLI** or **RedisInsight** for Redis management

---

## 🛠️ Environment Setup

### 1. Node.js Installation

#### macOS (using Homebrew)
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Verify installation
node --version  # Should be v20+
npm --version   # Should be 8+
```

#### Windows
1. Download Node.js LTS from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow the setup wizard
3. Verify installation in Command Prompt or PowerShell

#### Linux (Ubuntu/Debian)
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 2. pnpm Installation

#### Global Installation
```bash
# Using npm
npm install -g pnpm

# Using Homebrew (macOS)
brew install pnpm

# Verify installation
pnpm --version
```

#### Why pnpm?
- **Faster**: Parallel package installation
- **Efficient**: Shared dependencies between projects
- **Monorepo Support**: Excellent workspace management
- **Security**: Stricter dependency resolution

### 3. Git Setup

#### Initial Configuration
```bash
# Set your identity
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default branch name
git config --global init.defaultBranch main

# Verify configuration
git config --list
```

#### SSH Key Setup (for GitHub)
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Start SSH agent
eval "$(ssh-agent -s)"

# Add SSH key to agent
ssh-add ~/.ssh/id_ed25519

# Copy public key to clipboard (macOS)
pbcopy < ~/.ssh/id_ed25519.pub

# Copy public key to clipboard (Linux)
cat ~/.ssh/id_ed25519.pub | xclip -selection clipboard

# Copy public key to clipboard (Windows)
clip < ~/.ssh/id_ed25519.pub
```

Add the SSH key to your GitHub account:
1. Go to GitHub Settings → SSH and GPG keys
2. Click "New SSH key"
3. Paste your public key and save

---

## 🗄️ Database Setup

### 1. PostgreSQL Installation

#### macOS (using Homebrew)
```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Create database user
createuser -s postgres

# Create database
createdb t3_chat_clone

# Access PostgreSQL
psql postgres
```

#### Windows
1. Download PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run the installer
3. Remember the password you set for the postgres user
4. Use pgAdmin for database management

#### Linux (Ubuntu/Debian)
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Switch to postgres user
sudo -i -u postgres

# Access PostgreSQL
psql

# Create database and user
CREATE DATABASE t3_chat_clone;
CREATE USER t3_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE t3_chat_clone TO t3_user;
\q
```

#### PostgreSQL Extensions
```sql
-- Connect to your database
\c t3_chat_clone

-- Install required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Verify extensions
\dx
```

### 2. Redis Installation

#### macOS (using Homebrew)
```bash
# Install Redis
brew install redis

# Start Redis service
brew services start redis

# Test Redis connection
redis-cli ping  # Should return PONG
```

#### Windows
1. Download Redis for Windows from [github.com/microsoftarchive/redis](https://github.com/microsoftarchive/redis)
2. Run the installer
3. Start Redis service from Windows Services

#### Linux (Ubuntu/Debian)
```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Start Redis service
sudo systemctl start redis-server

# Enable Redis to start on boot
sudo systemctl enable redis-server

# Test Redis connection
redis-cli ping
```

---

## 🐳 Docker Setup (Optional)

### Docker Installation

#### macOS
1. Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)
2. Install and start Docker Desktop
3. Verify installation: `docker --version`

#### Windows
1. Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)
2. Install and start Docker Desktop
3. Enable WSL 2 if prompted

#### Linux
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Verify installation
docker --version
```

### Docker Compose Setup
```bash
# Create docker-compose.yml for development
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: t3_chat_clone
      POSTGRES_USER: t3_user
      POSTGRES_PASSWORD: t3_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    command: >
      postgres
      -c shared_preload_libraries=vector
      -c max_connections=100

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
EOF

# Start services
docker-compose up -d

# Verify services
docker-compose ps
```

---

## 📁 Project Structure Setup

### 1. Clone Repository
```bash
# Clone the repository
git clone https://github.com/yourusername/t3-chat-clone.git
cd t3-chat-clone

# Verify structure
ls -la
```

### 2. Initialize Workspace
```bash
# Initialize pnpm workspace
pnpm init

# Create workspace configuration
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
  - 'workers/*'
EOF
```

### 3. Create Directory Structure
```bash
# Create main directories
mkdir -p apps/api apps/web
mkdir -p packages/ui packages/utils packages/types packages/client-sdk
mkdir -p workers/attachment-worker
mkdir -p infra spec

# Verify structure
tree -L 2
```

### 4. Initialize Applications
```bash
# Initialize backend API
cd apps/api
pnpm init
pnpm add -D typescript @types/node ts-node nodemon
pnpm add @nestjs/core @nestjs/common @nestjs/platform-express reflect-metadata rxjs

# Initialize frontend web app
cd ../web
pnpm init
pnpm add -D typescript @types/node @types/react @types/react-dom
pnpm add next react react-dom
```

---

## 🔧 Configuration Files

### 1. TypeScript Configuration

#### Root tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "incremental": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve"
  },
  "exclude": ["node_modules", "dist", "build"]
}
```

#### Backend tsconfig.json (apps/api/tsconfig.json)
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictPropertyInitialization": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### Frontend tsconfig.json (apps/web/tsconfig.json)
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 2. ESLint Configuration

#### Root .eslintrc.js
```javascript
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  overrides: [
    {
      files: ['apps/web/**/*'],
      env: {
        browser: true,
        es2022: true,
      },
      extends: [
        'next/core-web-vitals',
        'plugin:@typescript-eslint/recommended',
      ],
    },
  ],
};
```

### 3. Environment Configuration

#### Root .env.example
```bash
# Database
DATABASE_URL="postgresql://t3_user:t3_password@localhost:5432/t3_chat_clone"
DATABASE_URL_TEST="postgresql://t3_user:t3_password@localhost:5432/t3_chat_clone_test"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-here"

# OAuth (Google)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OAuth (GitHub)
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# NextAuth
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# API Keys
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
OPENROUTER_API_KEY="your-openrouter-api-key"

# File Storage (S3/R2)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
S3_BUCKET_NAME="your-bucket-name"

# App Configuration
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

#### Create .env files
```bash
# Copy example environment file
cp .env.example .env

# Create environment files for each app
cp .env.example apps/api/.env
cp .env.example apps/web/.env

# Edit .env files with your actual values
# NEVER commit .env files to version control
```

### 4. Package.json Scripts

#### Root package.json
```json
{
  "name": "t3-chat-clone",
  "version": "1.0.0",
  "description": "T3 Chat Clone - A modern chat application",
  "private": true,
  "scripts": {
    "dev": "pnpm run --parallel dev",
    "build": "pnpm run --recursive build",
    "test": "pnpm run --recursive test",
    "lint": "pnpm run --recursive lint",
    "lint:fix": "pnpm run --recursive lint:fix",
    "clean": "pnpm run --recursive clean",
    "db:migrate": "cd apps/api && pnpm prisma migrate dev",
    "db:studio": "cd apps/api && pnpm prisma studio",
    "db:seed": "cd apps/api && pnpm prisma db seed"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

#### Backend package.json (apps/api/package.json)
```json
{
  "name": "@t3-chat-clone/api",
  "version": "1.0.0",
  "description": "Backend API for T3 Chat Clone",
  "main": "dist/main.js",
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "prisma db seed"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/websockets": "^10.0.0",
    "@nestjs/platform-socket.io": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/throttler": "^5.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@prisma/client": "^5.0.0",
    "bcrypt": "^5.1.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "helmet": "^7.0.0",
    "passport": "^0.6.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "socket.io": "^4.7.0",
    "zod": "^3.22.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.2",
    "@types/node": "^20.3.1",
    "@types/passport-jwt": "^3.0.8",
    "@types/passport-local": "^1.0.35",
    "@types/supertest": "^2.0.12",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.42.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "jest": "^29.5.0",
    "prettier": "^3.0.0",
    "prisma": "^5.0.0",
    "source-map-support": "^0.5.21",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0",
    "ts-loader": "^9.4.3",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.1",
    "typescript": "^5.1.3"
  }
}
```

#### Frontend package.json (apps/web/package.json)
```json
{
  "name": "@t3-chat-clone/web",
  "version": "1.0.0",
  "description": "Frontend web app for T3 Chat Clone",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "next-auth": "^4.24.0",
    "@next-auth/prisma-adapter": "^1.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@radix-ui/react-slot": "^1.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.294.0",
    "socket.io-client": "^4.7.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "rehype-highlight": "^7.0.0",
    "react-dropzone": "^14.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "14.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 🔒 Security Setup

### 1. Git Hooks (Pre-commit)
```bash
# Install husky for Git hooks
cd apps/api
pnpm add -D husky lint-staged

# Initialize husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"

# Create lint-staged configuration
cat > .lintstagedrc.js << 'EOF'
module.exports = {
  '*.{js,ts}': [
    'eslint --fix',
    'prettier --write'
  ],
  '*.{json,md}': [
    'prettier --write'
  ]
};
EOF
```

### 2. Environment Security
```bash
# Add .env to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore

# Verify .gitignore
cat .gitignore
```

### 3. Dependencies Security
```bash
# Install security tools
pnpm add -D @snyk/protect

# Add security scripts to package.json
# "security:audit": "npm audit",
# "security:fix": "npm audit fix",
# "security:monitor": "snyk monitor"
```

---

## 🧪 Testing Setup

### 1. Jest Configuration (Backend)
```bash
# Create Jest configuration
cat > apps/api/jest.config.js << 'EOF'
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
EOF

# Create test directory structure
mkdir -p apps/api/test
mkdir -p apps/api/src/__tests__
```

### 2. Testing Dependencies
```bash
# Add testing dependencies to backend
cd apps/api
pnpm add -D jest @types/jest ts-jest supertest @types/supertest
```

---

## 📱 Development Tools

### 1. VS Code Extensions
```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "ms-vscode.vscode-json",
    "prisma.prisma",
    "ms-vscode.vscode-docker",
    "ms-vscode.vscode-github",
    "ms-vscode.vscode-git-graph"
  ]
}
```

### 2. VS Code Settings
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

---

## 🚀 First Run

### 1. Install Dependencies
```bash
# Install all dependencies
pnpm install

# Verify installation
pnpm list --depth=0
```

### 2. Database Setup
```bash
# Run database migrations
pnpm db:migrate

# Seed database (if seed script exists)
pnpm db:seed

# Open Prisma Studio to verify data
pnpm db:studio
```

### 3. Start Development Servers
```bash
# Start backend API
cd apps/api
pnpm start:dev

# In another terminal, start frontend
cd apps/web
pnpm dev

# Or start both from root
cd ../..
pnpm dev
```

### 4. Verify Setup
- Backend API: http://localhost:3001
- Frontend Web: http://localhost:3000
- Prisma Studio: http://localhost:5555
- Database: localhost:5432
- Redis: localhost:6379

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
lsof -i :3001
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### 2. Database Connection Issues
```bash
# Check PostgreSQL status
brew services list | grep postgresql
sudo systemctl status postgresql

# Check Redis status
brew services list | grep redis
sudo systemctl status redis
```

#### 3. Permission Issues
```bash
# Fix npm permissions
sudo chown -R $USER:$GROUP ~/.npm
sudo chown -R $USER:$GROUP ~/.config
```

#### 4. TypeScript Errors
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
pnpm install

# Check TypeScript version compatibility
npx tsc --version
```

---

## 📚 Next Steps

### 1. Complete Setup Verification
- [ ] All services running (PostgreSQL, Redis)
- [ ] Backend API accessible
- [ ] Frontend web app loading
- [ ] Database connection working
- [ ] Environment variables configured

### 2. Begin Development
- [ ] Review the development plan
- [ ] Start with Phase 1: Backend Foundation
- [ ] Set up basic NestJS application
- [ ] Implement health check endpoints

### 3. Security Review
- [ ] Verify .env files are in .gitignore
- [ ] Check all dependencies are up to date
- [ ] Review security configurations
- [ ] Set up security monitoring

### 4. Learning Path
- [ ] Read the technology learning guide
- [ ] Complete NestJS fundamentals
- [ ] Practice with small examples
- [ ] Build incrementally

---

## 🆘 Getting Help

### Resources
- **Documentation**: Check the spec/ directory for detailed guides
- **GitHub Issues**: Report bugs and request features
- **Community**: Join Discord servers for NestJS, Next.js
- **Stack Overflow**: Search for solutions to common problems

### Support Channels
- **Project Issues**: GitHub Issues page
- **Technical Questions**: Stack Overflow with #t3-chat-clone tag
- **Security Issues**: Private security reporting

Remember: This setup is the foundation for your development journey. Take your time to understand each component and don't hesitate to ask questions. Security and best practices are built into this setup from the beginning.
