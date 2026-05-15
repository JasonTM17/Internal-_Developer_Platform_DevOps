# Local Development Setup

> 🇻🇳 [Phiên bản Tiếng Việt](./local-development-vi.md)

## System Requirements

- **OS**: macOS 13+, Ubuntu 22.04+, Windows 11 (WSL2)
- **RAM**: 16GB minimum (8GB allocated to Docker)
- **Disk**: 20GB free space
- **CPU**: 4+ cores recommended

## Setup Script

```bash
# macOS / Linux
./scripts/setup.sh

# Windows (PowerShell)
.\scripts\setup.ps1
```

## Manual Setup

### 1. Install Tools

**macOS (Homebrew):**

```bash
brew install node@20 docker kubectl helm awscli jq yq
brew install --cask docker
```

**Ubuntu:**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs docker.io
```

### 2. Configure AWS Access

```bash
aws configure --profile idp-dev
# AWS Access Key ID: (from your IAM user)
# AWS Secret Access Key: (from your IAM user)
# Default region: us-east-1
# Default output format: json

# Set profile
export AWS_PROFILE=idp-dev
```

### 3. Configure kubectl

```bash
aws eks update-kubeconfig --name idp-dev --region us-east-1
kubectl get nodes  # Verify access
```

### 4. Environment Variables

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

## Docker Compose Services

### Start Everything

```bash
docker compose up -d
```

### Start Specific Services

```bash
# Just API + dependencies
docker compose up -d api postgres redis

# Add monitoring stack
docker compose -f docker-compose.yaml -f docker-compose.monitoring.yaml up -d
```

### View Logs

```bash
docker compose logs -f api
docker compose logs -f --tail=50 postgres
```

### Reset Data

```bash
docker compose down -v  # Remove volumes
docker compose up -d    # Fresh start
```

## Running Without Docker

If you prefer running services natively:

```bash
# 1. Start PostgreSQL and Redis locally
# (or use Docker just for data services)
docker compose up -d postgres redis

# 2. Run API in development mode
cd apps/api
pnpm dev

# 3. Run Portal in development mode
cd apps/portal
pnpm dev
```

## IDE Setup

### VS Code Extensions

- ESLint
- Prettier
- TypeScript Importer
- Docker
- Kubernetes
- GitLens

### Recommended Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

## Debugging

### API Debugging (VS Code)

```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to API",
  "port": 9229,
  "restart": true,
  "sourceMaps": true
}
```

### Database Access

```bash
# Connect via psql
docker compose exec postgres psql -U idp -d idp_dev

# Or use pgAdmin at http://localhost:5050
```

## Common Issues

| Issue                        | Solution                                           |
| ---------------------------- | -------------------------------------------------- |
| Port 3000 in use             | `lsof -i :3000` then kill the process              |
| Docker out of space          | `docker system prune -a`                           |
| Node modules issues          | `rm -rf node_modules && pnpm install`              |
| TypeScript errors after pull | `pnpm turbo build --filter=@idp/shared-types`      |
| Database connection refused  | Wait for postgres healthcheck: `docker compose ps` |
