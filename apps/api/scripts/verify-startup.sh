#!/bin/bash

# Backend Startup Verification Script
# This script checks all prerequisites before starting the backend server

set -e

echo "🔍 Verifying backend startup prerequisites..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if .env file exists
echo ""
echo "1️⃣  Checking environment configuration..."
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    echo "   Please copy env.example to .env and configure it"
    exit 1
fi
print_success ".env file exists"

# Check required environment variables
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "JWT_REFRESH_SECRET" "PORT")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env 2>/dev/null || [ -z "$(grep "^${var}=" .env | cut -d'=' -f2-)" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    exit 1
fi
print_success "All required environment variables are set"

# Check if node_modules exists
echo ""
echo "2️⃣  Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_error "node_modules directory not found!"
    echo "   Please run: pnpm install"
    exit 1
fi
print_success "Dependencies are installed"

# Check if Docker containers are running
echo ""
echo "3️⃣  Checking Docker services..."
if ! command -v docker &> /dev/null; then
    print_warning "Docker not found. Skipping container checks."
else
    if docker ps | grep -q "postgres"; then
        print_success "PostgreSQL container is running"
    else
        print_error "PostgreSQL container is not running!"
        echo "   Please run: docker compose up -d postgres"
        exit 1
    fi

    if docker ps | grep -q "redis"; then
        print_success "Redis container is running"
    else
        print_warning "Redis container is not running (optional)"
    fi
fi

# Check if dist directory exists and contains main.js
echo ""
echo "4️⃣  Checking build artifacts..."
if [ ! -d "dist" ] || [ ! -f "dist/main.js" ]; then
    print_warning "Build artifacts not found. Building project..."
    if npx nest build; then
        print_success "Project built successfully"
    else
        print_error "Build failed!"
        exit 1
    fi
else
    print_success "Build artifacts exist"
fi

# Check database connectivity
echo ""
echo "5️⃣  Checking database connectivity..."
if npx prisma db execute --stdin <<< "SELECT 1;" &> /dev/null; then
    print_success "Database is accessible"
else
    print_error "Cannot connect to database!"
    echo "   Please check your DATABASE_URL and ensure PostgreSQL is running"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ All checks passed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "You can now start the server with:"
echo "  pnpm run start:dev"
echo ""

