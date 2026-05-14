# Getting Started

## Welcome to the Internal Developer Platform

This guide will help you get up and running with the IDP in under 30 minutes.

## Prerequisites

| Tool    | Version  | Purpose         |
| ------- | -------- | --------------- |
| Node.js | 20.x LTS | Runtime         |
| pnpm    | 9.x+     | Package manager |
| Docker  | 24.x+    | Local services  |
| kubectl | 1.28+    | Kubernetes CLI  |
| Helm    | 3.13+    | Package manager |
| AWS CLI | 2.x      | Cloud access    |
| Git     | 2.40+    | Version control |

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/JasonTM17/Internal_Developer_Platform_DevOps.git
cd Internal_Developer_Platform_DevOps
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start Local Environment

```bash
# Start all services (API, Portal, PostgreSQL, Redis, Prometheus, Grafana)
docker compose up -d

# Verify services are running
docker compose ps
curl http://localhost:3000/health
```

### 4. Run Tests

```bash
# Run all tests
pnpm test

# Run specific service tests
pnpm --filter @idp/api test
```

### 5. Access the Platform

| Service    | URL                        | Credentials         |
| ---------- | -------------------------- | ------------------- |
| Portal     | http://localhost:5173      | dev@idp.local / dev |
| API        | http://localhost:3000      | JWT token           |
| API Docs   | http://localhost:3000/docs | -                   |
| Grafana    | http://localhost:3001      | admin / admin       |
| Prometheus | http://localhost:9090      | -                   |

## Project Structure

```
├── apps/
│   ├── api/           # Platform API (Node.js + Express + TypeScript)
│   └── portal/        # Developer Portal (React + Vite + TypeScript)
├── packages/
│   ├── shared/        # Shared utilities and types
│   ├── ui/            # Shared UI component library
│   └── config/        # Shared ESLint, TypeScript, Prettier configs
├── infra/
│   ├── terraform/     # Infrastructure as Code (10 modules)
│   ├── kubernetes/    # K8s manifests and Helm charts
│   ├── argocd/        # GitOps application definitions
│   ├── istio/         # Service mesh configuration
│   ├── flagger/       # Canary deployment automation
│   ├── chaos/         # LitmusChaos experiments
│   └── monitoring/    # Prometheus, Grafana, Loki, Jaeger
├── docs/              # Documentation (ADRs, runbooks, API docs)
├── scripts/           # Automation scripts
└── docker-compose.yaml
```

## Development Workflow

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make changes and write tests
3. Run locally: `docker compose up -d`
4. Verify: `pnpm test && pnpm lint`
5. Commit: `git commit -m "feat(scope): description"`
6. Push and create PR
7. CI runs automatically (lint, test, build, security scan)
8. Get review and merge

## Getting Help

- **Slack**: `#platform-engineering`
- **Documentation**: This docs folder
- **On-call**: Check PagerDuty schedule
- **Architecture questions**: See [ADRs](../adr/)
