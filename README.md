# Internal Developer Platform (IDP)

[![CI Pipeline](https://github.com/org/idp-platform/actions/workflows/ci.yaml/badge.svg)](https://github.com/org/idp-platform/actions/workflows/ci.yaml)
[![Security Scan](https://github.com/org/idp-platform/actions/workflows/security-scan.yaml/badge.svg)](https://github.com/org/idp-platform/actions/workflows/security-scan.yaml)
[![codecov](https://codecov.io/gh/org/idp-platform/branch/main/graph/badge.svg)](https://codecov.io/gh/org/idp-platform)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A self-service platform enabling development teams to provision infrastructure, deploy services, and manage the full software lifecycle without deep infrastructure expertise.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Developer Experience Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Portal    │  │    CLI      │  │   REST API              │  │
│  │   (React)   │  │    (Go)     │  │   (Node.js/Express)     │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
├─────────┼─────────────────┼─────────────────────┼────────────────┤
│         └─────────────────┼─────────────────────┘                │
│                           ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Platform Services                              │  │
│  │  Service Catalog │ Deployment Engine │ RBAC │ Audit Logger  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                           │                                       │
├───────────────────────────┼───────────────────────────────────────┤
│                           ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Infrastructure Layer                           │  │
│  │  EKS │ RDS PostgreSQL │ ElastiCache │ S3 │ Vault          │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Features

- **Service Catalog** - Register, discover, and manage microservices
- **Self-Service Deployments** - GitOps-driven deployments with canary/blue-green strategies
- **Infrastructure Provisioning** - Terraform-based resource provisioning via UI
- **Team-Scoped RBAC** - Fine-grained access control with team isolation
- **Audit Trail** - Tamper-evident hash-chain audit logging
- **Observability** - Integrated metrics, logs, and distributed tracing

## Quick Start

```bash
# Clone the repository
git clone git@github.com:org/idp-platform.git
cd idp-platform

# Install dependencies
npm install

# Start local development environment
docker compose up -d

# Run tests
npm test

# Access the platform
# Portal: http://localhost:5173
# API:    http://localhost:3000
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Backend | Node.js 20, Express, TypeScript |
| Database | PostgreSQL 16 (RDS) |
| Cache | Redis 7 (ElastiCache) |
| Orchestration | Kubernetes (EKS 1.28) |
| GitOps | ArgoCD |
| IaC | Terraform, Helm |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus, Grafana, Loki, Jaeger |
| Security | OPA Gatekeeper, Falco, Vault |

## Project Structure

```
├── apps/
│   ├── api/              # Platform API service
│   └── portal/           # Developer portal (React SPA)
├── packages/             # Shared libraries
├── infra/
│   ├── terraform/        # Infrastructure as Code
│   ├── helm/             # Kubernetes manifests
│   ├── argocd/           # GitOps application definitions
│   ├── monitoring/       # Prometheus, Grafana, Loki configs
│   └── security/         # OPA policies, Falco rules, Vault
├── docs/
│   ├── architecture/     # C4 diagrams, system design
│   ├── adr/              # Architecture Decision Records
│   ├── runbooks/         # Operational procedures
│   └── onboarding/       # Developer guides
├── scripts/              # Automation scripts
├── docker-compose.yaml   # Local development stack
└── turbo.json            # Monorepo build configuration
```

## Documentation

- [Architecture Overview](docs/architecture/README.md)
- [Getting Started](docs/onboarding/getting-started.md)
- [Local Development](docs/onboarding/local-development.md)
- [Contributing](docs/onboarding/contributing.md)
- [Architecture Decision Records](docs/adr/)
- [Runbooks](docs/runbooks/)

## Development

```bash
# Run in development mode (hot reload)
npm run dev

# Run linting
npm run lint

# Run type checking
npx turbo typecheck

# Build all packages
npx turbo build

# Run specific service
npx turbo dev --filter=@idp/api
```

## Deployment

Deployments are managed via GitOps (ArgoCD):

- **Development**: Auto-deploys on push to `develop`
- **Staging**: Auto-deploys on push to `release/*`
- **Production**: Manual trigger with approval gate

See [deployment runbook](docs/runbooks/deployment-rollback.md) for details.

## Contributing

Please read our [Contributing Guidelines](docs/onboarding/contributing.md) before submitting a PR.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
