# Architecture Overview

## System Overview

The Internal Developer Platform (IDP) is a self-service platform that abstracts infrastructure complexity and enables development teams to provision resources, deploy services, and manage the full software lifecycle through a unified interface. It follows a layered architecture with clear separation between the developer experience layer, platform services, and infrastructure primitives.

The platform serves as the single pane of glass for engineering teams — consolidating service catalog management, environment provisioning, deployment orchestration, and observability into one cohesive product backed by GitOps principles.

## Architecture Documents

| Document | Description |
|----------|-------------|
| [System Context](./system-context.md) | C4 Level 1 — External actors and system boundaries |
| [Container Diagram](./container-diagram.md) | C4 Level 2 — Internal container decomposition |
| [Deployment Diagram](./deployment-diagram.md) | Infrastructure topology and deployment targets |
| [Data Flow](./data-flow.md) | Data flow between components and external systems |
| [Network Topology](./network-topology.md) | Network segmentation, ingress, and service mesh |
| [Security Architecture](./security-architecture.md) | Defense-in-depth layers and trust boundaries |
| [Capacity Planning](./capacity-planning.md) | Scaling thresholds and resource projections |
| [Technology Radar](./technology-radar.md) | Technology adoption lifecycle and evaluations |

## Key Design Principles

1. **Self-Service First** — Developers provision and manage resources without filing tickets or waiting on platform teams. The portal and CLI expose safe, guardrailed operations.

2. **GitOps-Driven** — Every change to infrastructure and application state flows through Git. ArgoCD reconciles desired state from the repository, providing full audit trail and easy rollback.

3. **Security by Default** — RBAC is team-scoped, network policies enforce least-privilege communication, secrets are managed through Vault with automatic rotation, and OPA Gatekeeper enforces policy at admission time.

4. **Observable from Day One** — Every service emits structured logs (Loki), metrics (Prometheus), and traces (OpenTelemetry/Jaeger). Grafana dashboards and SLO-based alerting provide visibility without manual instrumentation.

5. **Extensible Plugin Architecture** — New service templates, deployment targets, and integrations can be added without modifying core platform code. The catalog supports custom entity kinds and lifecycle hooks.

6. **Immutable Infrastructure** — Containers are built once and promoted across environments. Infrastructure changes are applied through Terraform plans with mandatory review.

## Technology Decisions Summary

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Monorepo | Turborepo | Fast incremental builds, shared packages, single CI pipeline |
| Frontend | React + TypeScript + MUI | Type safety, component library, large ecosystem |
| API | Node.js + Express | Team expertise, shared language with frontend, async I/O |
| Database | PostgreSQL 16 | ACID compliance, JSON support, mature ecosystem |
| Cache | Redis 7 | Session store, pub/sub for real-time, rate limiting backend |
| Orchestration | EKS (Kubernetes 1.28) | Industry standard, rich ecosystem, managed control plane |
| GitOps | ArgoCD | Declarative, multi-cluster, excellent UI for drift detection |
| IaC | Terraform + Crossplane | Terraform for base infra, Crossplane for self-service claims |
| CI/CD | GitHub Actions | Native integration, marketplace actions, matrix builds |
| Monitoring | Prometheus + Grafana | De facto standard, PromQL flexibility, rich dashboards |
| Logging | Loki + Promtail | Label-based, cost-effective, Grafana-native |
| Tracing | Jaeger + OpenTelemetry | Vendor-neutral instrumentation, distributed context propagation |
| Secrets | HashiCorp Vault + ESO | Dynamic secrets, auto-rotation, Kubernetes-native sync |
| Policy | OPA Gatekeeper + Falco | Admission control + runtime threat detection |

For detailed rationale on each decision, see the [Architecture Decision Records](../adr/).

## Related Documentation

- [Architecture Decision Records](../adr/) — ADR-001 through ADR-010 covering key choices
- [Operational Runbooks](../runbooks/) — Incident response, rollback, failover, scaling
- [Onboarding Guide](../onboarding/) — Getting started for new team members
- [SLO Definitions](../slo/) — Service level objectives and indicators
- [Compliance Controls](../compliance/) — SOC2 mappings and security controls

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Developer Experience                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐   │
│  │   IDP Portal │    │   CLI Tool   │    │   API (Programmatic)     │   │
│  │   (React)    │    │   (Go)       │    │   (REST + GraphQL)       │   │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬───────────────┘   │
│         │                   │                       │                    │
├─────────┼───────────────────┼───────────────────────┼────────────────────┤
│         └───────────────────┼───────────────────────┘                    │
│                             ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     IDP API Gateway                               │   │
│  │              (Kong / AWS API Gateway)                              │   │
│  └──────────────────────────┬───────────────────────────────────────┘   │
│                             │                                            │
├─────────────────────────────┼────────────────────────────────────────────┤
│                    Platform Services                                      │
│                             │                                            │
│  ┌──────────┐  ┌──────────┴──────────┐  ┌──────────────────────────┐   │
│  │ Service  │  │  Deployment Engine  │  │   Infrastructure         │   │
│  │ Catalog  │  │  (ArgoCD + Helm)    │  │   Provisioner            │   │
│  │          │  │                     │  │   (Terraform + Crossplane)│   │
│  └────┬─────┘  └─────────┬──────────┘  └──────────┬───────────────┘   │
│       │                   │                        │                    │
│  ┌────┴─────┐  ┌─────────┴──────────┐  ┌─────────┴────────────────┐   │
│  │ RBAC &   │  │  Audit & Compliance│  │   Secret Management      │   │
│  │ AuthZ    │  │  (Hash Chain)      │  │   (Vault + ESO)          │   │
│  └──────────┘  └────────────────────┘  └──────────────────────────┘   │
│                                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                                    │
│                                                                           │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │   EKS    │  │  RDS         │  │  ElastiC │  │   S3 / CloudFront│   │
│  │  Cluster │  │  PostgreSQL  │  │  ache    │  │                  │   │
│  └──────────┘  └──────────────┘  └──────────┘  └──────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```
