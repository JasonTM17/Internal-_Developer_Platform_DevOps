# ADR-001: Monorepo Structure with Turborepo

## Status

Accepted

## Date

2024-01-15

## Context

We need to decide on the repository structure for the Internal Developer Platform. The platform consists of multiple services (API, Portal), shared packages, infrastructure code, and documentation. Options considered:

1. **Polyrepo** - Separate repositories per service
2. **Monorepo with Nx** - Single repo with Nx build system
3. **Monorepo with Turborepo** - Single repo with Turborepo

## Decision

We will use a **monorepo structure managed by Turborepo**.

## Rationale

- **Atomic changes**: Cross-cutting changes (API + Portal + shared types) can be made in a single PR
- **Shared tooling**: ESLint, Prettier, TypeScript configs shared across all packages
- **Dependency management**: Single lockfile, consistent dependency versions
- **Turborepo advantages**: Remote caching, parallel execution, incremental builds
- **CI efficiency**: Only build/test what changed using Turborepo's dependency graph
- **Developer experience**: Single clone, single IDE workspace

### Why Turborepo over Nx?

- Simpler configuration (turbo.json vs nx.json + project.json per package)
- Zero-config for TypeScript projects
- Better integration with npm workspaces (no custom dependency resolution)
- Sufficient for our scale (~5-10 packages)

## Consequences

### Positive

- Faster CI with remote caching (70% cache hit rate observed)
- Easier code sharing between services
- Consistent code quality across all packages
- Simplified dependency updates

### Negative

- Larger clone size (mitigated by shallow clones in CI)
- All teams share the same CI pipeline (mitigated by path-based triggers)
- Learning curve for developers unfamiliar with monorepos

## Structure

```
/
├── apps/
│   ├── api/          # Platform API service
│   └── portal/       # Developer portal (React)
├── packages/
│   ├── shared-types/ # TypeScript type definitions
│   ├── eslint-config/# Shared ESLint configuration
│   └── tsconfig/     # Shared TypeScript configuration
├── infra/            # Infrastructure as Code
├── docs/             # Documentation
└── turbo.json        # Turborepo pipeline configuration
```
