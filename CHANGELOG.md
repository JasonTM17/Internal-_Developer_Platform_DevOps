# Changelog

All notable changes to the IDP Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Toast notification system with stacking and auto-dismiss
- Global keyboard shortcuts hook (Ctrl+K search, G>D navigation)
- Comprehensive API documentation index

### Changed

- Rewrote architecture overview with design principles and technology rationale
- Updated .env.example with fully documented variable groups

## [1.0.0] - 2026-05-13

### Added

- Full self-service developer portal (React + TypeScript + MUI)
- Platform API with Express, team-scoped RBAC, and hash-chain audit logging
- Service catalog with templates, lifecycle management, and dependency tracking
- Environment provisioning with promotion workflows (dev → staging → production)
- Deployment orchestration with canary, blue-green, and rolling strategies
- Configuration management with history, diff, and rollback
- Real-time notifications via WebSocket and Slack integration
- CLI tool for programmatic platform access
- API key management with scoped permissions and rotation

### Infrastructure

- Terraform modules for VPC, EKS, RDS, ElastiCache, and S3
- Helm chart for full platform deployment with value overrides per environment
- ArgoCD application definitions with automated sync and self-heal
- Crossplane compositions for developer self-service infrastructure claims
- Multi-environment GitHub Actions workflows (CI, CD-dev, CD-staging, CD-production)
- Preview environments for pull requests with automatic cleanup
- Multi-arch Docker builds (amd64/arm64) with layer caching

### Security

- Team-scoped RBAC with role inheritance and permission boundaries
- OPA Gatekeeper constraints (required labels, restricted privileges, registry allowlist)
- Falco runtime security rules for container threat detection
- HashiCorp Vault integration with dynamic secrets and auto-rotation
- Pod Security Standards enforcement (restricted profile)
- WAF rules with rate limiting, geo-blocking, and bot detection
- cert-manager with automatic TLS certificate provisioning
- Secret scanning in CI (TruffleHog + Gitleaks)
- Container vulnerability scanning (Trivy + Snyk)

### Observability

- Prometheus metrics collection with custom platform metrics
- Grafana dashboards (platform overview, deployment metrics, API performance, SLOs)
- Loki log aggregation with structured logging and label-based queries
- Jaeger distributed tracing with OpenTelemetry instrumentation
- AlertManager with Slack and PagerDuty routing
- SLO definitions with error budget tracking and burn-rate alerts

### Documentation

- Architecture documentation (C4 diagrams, deployment topology, data flows, network)
- Architecture Decision Records (ADR-001 through ADR-010)
- Operational runbooks (incident response, rollback, failover, scaling, DR)
- Developer onboarding guide with local development setup
- API documentation with OpenAPI spec, SDK guide, and webhook reference
- Compliance documentation (SOC2 controls, data classification, encryption standards)

## [0.1.0] - 2024-01-15

### Added

- Initial monorepo structure with Turborepo
- Platform API scaffolding with Express and TypeScript
- Service catalog with basic CRUD operations
- PostgreSQL database with migration framework
- Developer portal scaffolding (React + Vite)
- Shared TypeScript packages (types, utils, config)
- ESLint and Prettier configuration
- Husky pre-commit hooks with lint-staged
- Basic Terraform infrastructure modules (VPC, EKS, RDS)
- Helm chart skeleton for platform deployment
- ArgoCD application definitions

[Unreleased]: https://github.com/JasonTM17/Internal-_Developer_Platform_DevOps/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/JasonTM17/Internal-_Developer_Platform_DevOps/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/JasonTM17/Internal-_Developer_Platform_DevOps/releases/tag/v0.1.0
