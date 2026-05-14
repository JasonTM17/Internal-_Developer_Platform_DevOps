# Internal Developer Platform (IDP)

**Enterprise-grade platform engineering solution for modern DevOps teams**

[![CI Pipeline](https://github.com/JasonTM17/Internal_Developer_Platform_DevOps/actions/workflows/ci.yaml/badge.svg)](https://github.com/JasonTM17/Internal_Developer_Platform_DevOps/actions/workflows/ci.yaml)
[![Security Scan](https://github.com/JasonTM17/Internal_Developer_Platform_DevOps/actions/workflows/security-scan.yaml/badge.svg)](https://github.com/JasonTM17/Internal_Developer_Platform_DevOps/actions/workflows/security-scan.yaml)
[![License](https://img.shields.io/github/license/JasonTM17/Internal_Developer_Platform_DevOps)](https://github.com/JasonTM17/Internal_Developer_Platform_DevOps/blob/main/LICENSE)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)

---

## About

The Internal Developer Platform (IDP) is a production-ready platform engineering solution designed to streamline the software delivery lifecycle for enterprise teams. It provides a unified self-service interface where developers can provision infrastructure, deploy applications, and manage environments without deep operational expertise.

Built on cloud-native principles, the platform integrates GitOps workflows with Kubernetes orchestration, Terraform infrastructure-as-code, and automated CI/CD pipelines. It abstracts infrastructure complexity while maintaining full auditability, security compliance, and operational visibility through integrated monitoring and alerting.

The IDP follows a monorepo architecture powered by Turborepo, featuring a React-based developer portal, a Node.js API backend, and shared packages for consistent tooling across the stack. It implements enterprise patterns including RBAC, audit logging, real-time notifications, and multi-environment deployment strategies with automated rollbacks.

---

## Portal Preview

> The developer portal provides a self-service UI for managing services, deployments, and environments.
> Run `docker compose up -d` and visit [http://localhost:5173](http://localhost:5173) to explore.

|                     Login                      |                       Dashboard                        |                  Service Catalog                   |
| :--------------------------------------------: | :----------------------------------------------------: | :------------------------------------------------: |
| ![Login](docs/assets/screenshots/01-login.png) | ![Dashboard](docs/assets/screenshots/02-dashboard.png) | ![Catalog](docs/assets/screenshots/03-catalog.png) |

|                        Deployments                         |                Health Monitoring                 |                         Environments                         |
| :--------------------------------------------------------: | :----------------------------------------------: | :----------------------------------------------------------: |
| ![Deployments](docs/assets/screenshots/04-deployments.png) | ![Health](docs/assets/screenshots/05-health.png) | ![Environments](docs/assets/screenshots/06-environments.png) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Developer Portal (React)                         │
│                    Self-Service UI • Service Catalog                      │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ HTTPS/WSS
┌──────────────────────────────────▼──────────────────────────────────────┐
│                          API Gateway (Node.js)                            │
│              Auth • RBAC • Rate Limiting • Audit Logging                  │
└───────┬──────────────┬──────────────┬──────────────┬────────────────────┘
        │              │              │              │
   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
   │ Service │   │  Infra  │   │  Deploy │   │  Config │
   │ Catalog │   │Provision│   │  Engine │   │  Mgmt   │
   └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘
        │              │              │              │
┌───────▼──────────────▼──────────────▼──────────────▼────────────────────┐
│                        Infrastructure Layer                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Kubernetes│  │Terraform │  │  ArgoCD  │  │PostgreSQL│  │  Redis   │  │
│  │  (EKS)  │  │  (IaC)   │  │ (GitOps) │  │   (DB)   │  │ (Cache)  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│                        Observability Stack                                │
│         Prometheus • Grafana • Loki • AlertManager • Jaeger              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Features

| Category                    | Features                                                         |
| --------------------------- | ---------------------------------------------------------------- |
| **Self-Service Portal**     | Service catalog, one-click deployments, environment provisioning |
| **Security and Compliance** | RBAC, audit logging, secret management, vulnerability scanning   |
| **Infrastructure as Code**  | Terraform modules, Kubernetes manifests, GitOps with ArgoCD      |
| **CI/CD Pipelines**         | Multi-stage builds, automated testing, canary deployments        |
| **Observability**           | Prometheus metrics, Grafana dashboards, distributed tracing      |
| **Notifications**           | Real-time WebSocket updates, Slack integration, email alerts     |
| **Multi-Environment**       | Dev, staging, production with automated promotion workflows      |
| **Service Catalog**         | Backstage-inspired catalog with templates and scaffolding        |
| **Performance**             | Turborepo caching, Docker layer optimization, CDN integration    |
| **Testing**                 | Unit, integration, E2E tests with parallel execution             |

---

## Quick Start

### Prerequisites

- Docker and Docker Compose v2.20+
- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/JasonTM17/Internal_Developer_Platform_DevOps.git
cd Internal_Developer_Platform_DevOps

# Copy environment configuration
cp .env.example .env

# Start all services
docker compose up -d

# Access the platform
# Portal:  http://localhost:5173
# API:     http://localhost:3000
# Grafana: http://localhost:3001
```

### Local Development

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Run tests
pnpm test

# Build all packages
pnpm build
```

---

## Tech Stack

| Layer                       | Technology                   | Purpose                        |
| --------------------------- | ---------------------------- | ------------------------------ |
| **Frontend**                | React, TypeScript, Vite      | Developer portal UI            |
| **Backend**                 | Node.js, Express, TypeScript | API server                     |
| **Database**                | PostgreSQL 16                | Primary data store             |
| **Cache**                   | Redis 7                      | Session management, job queues |
| **Container Orchestration** | Kubernetes (EKS)             | Production workloads           |
| **Infrastructure as Code**  | Terraform                    | Cloud resource provisioning    |
| **GitOps**                  | ArgoCD                       | Continuous deployment          |
| **CI/CD**                   | GitHub Actions               | Build, test, deploy pipelines  |
| **Monitoring**              | Prometheus, Grafana          | Metrics and dashboards         |
| **Logging**                 | Loki, Promtail               | Centralized log aggregation    |
| **Tracing**                 | Jaeger                       | Distributed tracing            |
| **Security**                | Trivy, Snyk, CodeQL          | Vulnerability scanning         |
| **Monorepo**                | Turborepo, pnpm              | Build orchestration            |
| **Testing**                 | Vitest, Playwright           | Unit, integration, E2E         |
| **Code Quality**            | ESLint, Prettier, Husky      | Linting and formatting         |

---

## Project Structure

```
├── apps/
│   ├── api/                    # Backend API service (Express + TypeScript)
│   └── portal/                 # Frontend developer portal (React + Vite)
├── packages/
│   ├── shared/                 # Shared utilities and types
│   ├── ui/                     # Shared UI component library
│   └── config/                 # Shared configuration
├── infra/
│   ├── terraform/              # Infrastructure as Code modules
│   ├── kubernetes/             # K8s manifests and Helm charts
│   ├── argocd/                 # GitOps application definitions
│   └── monitoring/             # Prometheus, Grafana, Loki configs
├── docs/
│   ├── adr/                    # Architecture Decision Records
│   ├── api/                    # API documentation
│   ├── architecture/           # Architecture diagrams
│   ├── operations/             # Operational runbooks
│   └── onboarding/             # Developer onboarding guides
├── scripts/                    # Automation and utility scripts
├── tests/                      # Integration and E2E test suites
├── .github/
│   ├── workflows/              # CI/CD pipeline definitions
│   └── ISSUE_TEMPLATE/         # Issue and PR templates
├── docker-compose.yaml         # Local development environment
├── turbo.json                  # Turborepo pipeline configuration
└── pnpm-workspace.yaml         # Monorepo workspace definition
```

---

## Documentation

| Document                                         | Description                          |
| ------------------------------------------------ | ------------------------------------ |
| [Architecture Overview](docs/architecture/)      | System design and component diagrams |
| [API Documentation](docs/api/)                   | REST API reference and examples      |
| [ADR Records](docs/adr/)                         | Architecture Decision Records        |
| [Operations Runbooks](docs/runbooks/)            | Incident response procedures         |
| [Onboarding Guide](docs/onboarding/)             | New developer setup guide            |
| [SLO Definitions](docs/slo/)                     | Service Level Objectives             |
| [Security Policy](SECURITY.md)                   | Vulnerability reporting process      |
| [Contributing Guide](CONTRIBUTING.md)            | How to contribute                    |
| [Changelog](CHANGELOG.md)                        | Release history                      |
| [Release Process](docs/RELEASE_PROCESS.md)       | Versioning and release workflow      |
| [Branching Strategy](docs/BRANCHING_STRATEGY.md) | Git workflow documentation           |

---

## Development Commands

```bash
# Development
pnpm dev                    # Start all services in dev mode
pnpm build                  # Build all packages
pnpm clean                  # Clean build artifacts

# Code Quality
pnpm lint                   # Run ESLint across all packages
pnpm lint:fix               # Auto-fix lint issues
pnpm format                 # Format code with Prettier
pnpm format:check           # Check formatting
pnpm typecheck              # TypeScript type checking

# Testing
pnpm test                   # Run all tests
pnpm test:unit              # Run unit tests only
pnpm test:integration       # Run integration tests

# Infrastructure
make terraform-plan         # Preview infrastructure changes
make terraform-apply        # Apply infrastructure changes
make k8s-deploy             # Deploy to Kubernetes
```

---

## Deployment

### Environments

| Environment | Branch      | URL                    | Auto-Deploy     |
| ----------- | ----------- | ---------------------- | --------------- |
| Development | `develop`   | `dev.idp.internal`     | On push         |
| Staging     | `release/*` | `staging.idp.internal` | On push         |
| Production  | `main`      | `idp.internal`         | Manual approval |

### Deployment Pipeline

```
Code Push → CI Pipeline → Build → Security Scan → Deploy to Dev
                                                        ↓
                                              Integration Tests
                                                        ↓
                                              Promote to Staging
                                                        ↓
                                              E2E Tests + Approval
                                                        ↓
                                              Deploy to Production
```

### Rollback

```bash
# Automatic rollback on failed health checks
# Manual rollback via ArgoCD
argocd app rollback <app-name>

# Or via kubectl
kubectl rollout undo deployment/<deployment-name>
```

---

## Container Images

Published to GitHub Container Registry on every push to `main`:

```
ghcr.io/jasontm17/idp-api:latest
ghcr.io/jasontm17/idp-portal:latest
```

Tagged releases are also available:

```
ghcr.io/jasontm17/idp-api:v1.0.0
ghcr.io/jasontm17/idp-portal:v1.0.0
```

---

## Testing

```bash
# Run full test suite
pnpm test

# Run with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test -- path/to/test.spec.ts

# Run E2E tests
pnpm test:integration
```

### Test Coverage Targets

| Package  | Target |
| -------- | ------ |
| API      | 80%    |
| Portal   | 75%    |
| Packages | 90%    |

---

## Contributing

Contributions are welcome. See the [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `chore:` Maintenance tasks
- `ci:` CI/CD changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `perf:` Performance improvements

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
