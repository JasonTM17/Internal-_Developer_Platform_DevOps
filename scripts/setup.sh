#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# IDP Platform - Developer Environment Setup
# =============================================================================
# This script sets up a complete local development environment.
# Usage: ./scripts/setup.sh
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_command() {
  if command -v "$1" &> /dev/null; then
    log_success "$1 is installed ($(command -v "$1"))"
    return 0
  else
    log_error "$1 is not installed"
    return 1
  fi
}

check_version() {
  local cmd=$1
  local required=$2
  local current
  current=$($cmd --version 2>/dev/null | grep -oP '\d+\.\d+' | head -1)
  
  if [[ "$(printf '%s\n' "$required" "$current" | sort -V | head -n1)" == "$required" ]]; then
    log_success "$cmd version $current (>= $required required)"
  else
    log_warn "$cmd version $current is below required $required"
  fi
}

echo ""
echo "=============================================="
echo "  IDP Platform - Development Setup"
echo "=============================================="
echo ""

# Step 1: Check prerequisites
log_info "Checking prerequisites..."

MISSING=0
check_command "node" || MISSING=1
check_command "npm" || MISSING=1
check_command "docker" || MISSING=1
check_command "git" || MISSING=1

# Optional tools
check_command "kubectl" || log_warn "kubectl not found - needed for cluster access"
check_command "helm" || log_warn "helm not found - needed for deployments"
check_command "aws" || log_warn "aws CLI not found - needed for cloud access"

if [[ $MISSING -eq 1 ]]; then
  log_error "Required tools are missing. Please install them first."
  echo ""
  echo "Install with:"
  echo "  macOS:  brew install node docker kubectl helm awscli"
  echo "  Ubuntu: See docs/onboarding/local-development.md"
  exit 1
fi

# Check versions
check_version "node" "20.0"
check_version "docker" "24.0"

echo ""

# Step 2: Install dependencies
log_info "Installing npm dependencies..."
cd "$PROJECT_ROOT"
npm ci --prefer-offline
log_success "Dependencies installed"

# Step 3: Setup environment file
log_info "Setting up environment configuration..."
if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  log_success "Created .env.local from template"
  log_warn "Please review and update .env.local with your settings"
else
  log_success ".env.local already exists"
fi

# Step 4: Setup git hooks
log_info "Setting up git hooks..."
npx husky install
log_success "Git hooks configured"

# Step 5: Start Docker services
log_info "Starting Docker services..."
if docker info &> /dev/null; then
  docker compose up -d postgres redis
  log_success "Docker services started"
  
  # Wait for services to be healthy
  log_info "Waiting for services to be healthy..."
  sleep 5
  
  RETRIES=30
  until docker compose exec -T postgres pg_isready -U idp -d idp_dev &> /dev/null || [[ $RETRIES -eq 0 ]]; do
    RETRIES=$((RETRIES - 1))
    sleep 1
  done
  
  if [[ $RETRIES -gt 0 ]]; then
    log_success "PostgreSQL is ready"
  else
    log_error "PostgreSQL failed to start"
  fi
else
  log_warn "Docker is not running. Start Docker and run: docker compose up -d"
fi

# Step 6: Run database migrations
log_info "Running database migrations..."
npm run db:migrate 2>/dev/null || log_warn "Migration script not configured yet"

# Step 7: Build packages
log_info "Building shared packages..."
npx turbo build --filter='./packages/*'
log_success "Packages built"

# Step 8: Verify setup
log_info "Verifying setup..."
npx turbo typecheck 2>/dev/null && log_success "TypeScript compilation OK" || log_warn "TypeScript errors found"

echo ""
echo "=============================================="
echo "  Setup Complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Review .env.local and update settings"
echo "  2. Start all services: docker compose up -d"
echo "  3. Run tests: npm test"
echo "  4. Start development: npm run dev"
echo ""
echo "Access:"
echo "  Portal: http://localhost:5173"
echo "  API:    http://localhost:3000"
echo "  Docs:   http://localhost:3000/docs"
echo ""
