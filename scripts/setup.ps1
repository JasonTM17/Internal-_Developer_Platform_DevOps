# =============================================================================
# IDP Platform - Windows Developer Environment Setup
# =============================================================================
# Usage: .\scripts\setup.ps1
# Requires: PowerShell 7+, Windows 11 with WSL2
# =============================================================================

$ErrorActionPreference = "Stop"

function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Blue }
function Write-Ok { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }

function Test-Command {
    param([string]$Command)
    $exists = Get-Command $Command -ErrorAction SilentlyContinue
    if ($exists) {
        Write-Ok "$Command is installed ($($exists.Source))"
        return $true
    } else {
        Write-Err "$Command is not installed"
        return $false
    }
}

Write-Host ""
Write-Host "=============================================="
Write-Host "  IDP Platform - Windows Development Setup"
Write-Host "=============================================="
Write-Host ""

# Step 1: Check prerequisites
Write-Info "Checking prerequisites..."

$missing = $false
if (-not (Test-Command "node")) { $missing = $true }
if (-not (Test-Command "npm")) { $missing = $true }
if (-not (Test-Command "docker")) { $missing = $true }
if (-not (Test-Command "git")) { $missing = $true }

# Optional tools
Test-Command "kubectl" | Out-Null
Test-Command "helm" | Out-Null
Test-Command "aws" | Out-Null

if ($missing) {
    Write-Err "Required tools are missing."
    Write-Host ""
    Write-Host "Install with winget:"
    Write-Host "  winget install OpenJS.NodeJS.LTS"
    Write-Host "  winget install Docker.DockerDesktop"
    Write-Host "  winget install Git.Git"
    Write-Host "  winget install Kubernetes.kubectl"
    Write-Host "  winget install Helm.Helm"
    Write-Host "  winget install Amazon.AWSCLI"
    exit 1
}

# Check Node version
$nodeVersion = (node --version) -replace 'v', ''
$major = [int]($nodeVersion.Split('.')[0])
if ($major -ge 20) {
    Write-Ok "Node.js version $nodeVersion (>= 20 required)"
} else {
    Write-Warn "Node.js version $nodeVersion is below required 20.x"
}

Write-Host ""

# Step 2: Install dependencies
Write-Info "Installing npm dependencies..."
Set-Location $PSScriptRoot\..
npm ci --prefer-offline
Write-Ok "Dependencies installed"

# Step 3: Setup environment file
Write-Info "Setting up environment configuration..."
if (-not (Test-Path ".env.local")) {
    Copy-Item ".env.example" ".env.local"
    Write-Ok "Created .env.local from template"
    Write-Warn "Please review and update .env.local with your settings"
} else {
    Write-Ok ".env.local already exists"
}

# Step 4: Setup git hooks
Write-Info "Setting up git hooks..."
npx husky install
Write-Ok "Git hooks configured"

# Step 5: Start Docker services
Write-Info "Starting Docker services..."
try {
    docker info | Out-Null
    docker compose up -d postgres redis
    Write-Ok "Docker services started"

    # Wait for PostgreSQL
    Write-Info "Waiting for PostgreSQL to be ready..."
    $retries = 30
    do {
        Start-Sleep -Seconds 1
        $retries--
        $ready = docker compose exec -T postgres pg_isready -U idp -d idp_dev 2>$null
    } while (-not $ready -and $retries -gt 0)

    if ($retries -gt 0) {
        Write-Ok "PostgreSQL is ready"
    } else {
        Write-Warn "PostgreSQL may not be ready yet"
    }
} catch {
    Write-Warn "Docker is not running. Start Docker Desktop and run: docker compose up -d"
}

# Step 6: Build packages
Write-Info "Building shared packages..."
npx turbo build --filter='./packages/*'
Write-Ok "Packages built"

# Step 7: Verify setup
Write-Info "Verifying TypeScript compilation..."
try {
    npx turbo typecheck 2>$null
    Write-Ok "TypeScript compilation OK"
} catch {
    Write-Warn "TypeScript errors found - run 'npx turbo typecheck' for details"
}

Write-Host ""
Write-Host "=============================================="
Write-Host "  Setup Complete!"
Write-Host "=============================================="
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Review .env.local and update settings"
Write-Host "  2. Start all services: docker compose up -d"
Write-Host "  3. Run tests: npm test"
Write-Host "  4. Start development: npm run dev"
Write-Host ""
Write-Host "Access:"
Write-Host "  Portal: http://localhost:5173"
Write-Host "  API:    http://localhost:3000"
Write-Host ""
