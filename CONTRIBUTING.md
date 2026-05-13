# Contributing to the Internal Developer Platform

Thank you for your interest in contributing to the IDP! This guide covers everything you need to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Architecture Decisions](#architecture-decisions)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive experience for everyone. Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## Getting Started

### Prerequisites

- Node.js 20 LTS
- pnpm 8+
- Docker Desktop
- kubectl configured for local cluster
- Terraform 1.7+

### Setup

```bash
# Clone the repository
git clone https://github.com/company/internal-developer-platform.git
cd internal-developer-platform

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start local development environment
docker compose up -d

# Run database migrations
pnpm db:migrate

# Start all services in development mode
pnpm dev
```

### Project Structure

```
├── apps/
│   ├── api/          # Platform API (NestJS)
│   └── portal/       # Developer Portal (React)
├── packages/
│   ├── shared/       # Shared types and utilities
│   ├── config/       # Shared configuration
│   └── testing/      # Test utilities
├── infra/
│   ├── terraform/    # Infrastructure as Code
│   ├── argocd/       # GitOps configurations
│   └── monitoring/   # Observability stack
├── docs/             # Documentation
└── tools/            # Developer tooling
```

---

## Development Workflow

### Branch Strategy

```
main (protected)
  └── feature/IDP-123-add-service-templates
  └── fix/IDP-456-deployment-timeout
  └── chore/update-dependencies
```

### Workflow Steps

1. Create a branch from `main`: `git checkout -b feature/IDP-123-description`
2. Make your changes with atomic commits
3. Push and open a Pull Request
4. Address review feedback
5. Merge after approval (squash merge)

### Running Locally

```bash
# Run all services
pnpm dev

# Run specific service
pnpm --filter @idp/api dev
pnpm --filter @idp/portal dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix
```

---

## Coding Standards

### TypeScript

- Strict mode enabled (`strict: true`)
- No `any` types (use `unknown` and type guards)
- Prefer `interface` over `type` for object shapes
- Use barrel exports (`index.ts`) for public APIs
- Maximum file length: 300 lines (split if larger)

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case | `service-catalog.ts` |
| Classes | PascalCase | `ServiceCatalog` |
| Interfaces | PascalCase (no I prefix) | `CatalogStore` |
| Functions | camelCase | `createService()` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Environment vars | UPPER_SNAKE_CASE | `DATABASE_URL` |

### Code Organization

```typescript
// 1. Imports (external, then internal)
import { Injectable } from '@nestjs/common';
import { CatalogStore } from './catalog-store';

// 2. Types/Interfaces
interface CreateServiceInput { ... }

// 3. Constants
const MAX_NAME_LENGTH = 63;

// 4. Implementation
@Injectable()
export class ServiceCatalog { ... }
```

---

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes nor adds |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, dependencies |
| `ci` | CI/CD configuration |

### Scopes

| Scope | Description |
|-------|-------------|
| `api` | Platform API |
| `portal` | Developer Portal |
| `terraform` | Infrastructure code |
| `monitoring` | Observability stack |
| `argocd` | GitOps configuration |
| `deps` | Dependency updates |

### Examples

```
feat(api): add service dependency graph endpoint
fix(portal): resolve pagination reset on filter change
docs(api): update authentication guide with MFA section
chore(deps): update NestJS to v10.3
ci(workflows): add integration test workflow
```

---

## Pull Request Process

### PR Requirements

- [ ] Descriptive title following commit conventions
- [ ] Description explaining what and why
- [ ] Tests added/updated for changes
- [ ] Documentation updated if needed
- [ ] No linting errors (`pnpm lint`)
- [ ] Type checks pass (`pnpm typecheck`)
- [ ] All tests pass (`pnpm test`)

### PR Template

PRs automatically use our [template](.github/pull_request_template.md).

### Review Process

1. **Automated checks** — CI must pass (lint, test, build, security scan)
2. **Code review** — Minimum 1 approval from code owner
3. **Platform review** — Required for infrastructure changes
4. **Security review** — Required for auth/secrets changes

### Merge Strategy

- **Squash merge** for feature branches (clean history)
- **Merge commit** for release branches (preserve history)
- Delete branch after merge

---

## Architecture Decisions

### Proposing Changes

For significant architectural changes, create an RFC:

1. Copy `docs/rfcs/000-template.md`
2. Fill in the proposal
3. Open a PR for discussion
4. Present at architecture review meeting
5. Decision recorded in ADR format

### When is an RFC Needed?

- New service or major component
- Technology choice (new language, framework, database)
- Breaking API changes
- Security model changes
- Changes affecting multiple teams

---

## Testing Requirements

### Coverage Expectations

| Type | Minimum Coverage | Scope |
|------|-----------------|-------|
| Unit tests | 80% line coverage | All business logic |
| Integration tests | Key paths | API endpoints, DB queries |
| E2E tests | Critical flows | Deployment, provisioning |
| Contract tests | All API consumers | Pact-based |

### Test Structure

```
src/
  catalog/
    catalog.service.ts
    catalog.service.test.ts      # Unit tests (co-located)
    catalog.integration.test.ts  # Integration tests
test/
  e2e/
    deployment-flow.e2e.test.ts  # E2E tests
  contracts/
    portal-api.pact.test.ts      # Contract tests
```

### Running Tests

```bash
# Unit tests
pnpm test

# Integration tests (requires Docker)
pnpm test:integration

# E2E tests (requires running services)
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

---

## Documentation

### When to Document

- New features → Update relevant docs
- API changes → Update OpenAPI spec
- Configuration changes → Update setup guide
- Architecture decisions → Create ADR

### Documentation Location

| Content | Location |
|---------|----------|
| API reference | `docs/api/` |
| Architecture | `docs/architecture/` |
| Operations | `docs/operations/` |
| Runbooks | Wiki (linked from docs) |
| Code docs | JSDoc in source files |

---

## Getting Help

- **Slack:** #platform-dev (development questions)
- **Slack:** #platform-support (issues and requests)
- **Office hours:** Tuesdays 14:00 UTC (open Q&A)
- **Documentation:** https://docs.platform.internal
