# Architecture Overview

## Internal Developer Platform (IDP)

The IDP is a self-service platform that enables development teams to provision infrastructure, deploy services, and manage the full software lifecycle without deep infrastructure expertise.

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

## Key Design Principles

1. **Self-Service First** - Developers can provision and manage resources without tickets
2. **GitOps-Driven** - All changes flow through Git with full audit trail
3. **Security by Default** - RBAC, network policies, and secrets management built-in
4. **Observable** - Full metrics, logs, and traces for every component
5. **Extensible** - Plugin architecture for custom integrations

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + TypeScript | Developer portal UI |
| API | Node.js + Express | Platform API services |
| Database | PostgreSQL 16 | Primary data store |
| Cache | Redis 7 | Session & query cache |
| Container Orchestration | EKS (Kubernetes 1.28) | Workload management |
| GitOps | ArgoCD | Continuous deployment |
| IaC | Terraform + Crossplane | Infrastructure provisioning |
| CI/CD | GitHub Actions | Build and test automation |
| Monitoring | Prometheus + Grafana | Metrics and dashboards |
| Logging | Loki + Promtail | Log aggregation |
| Tracing | Jaeger + OpenTelemetry | Distributed tracing |
| Secrets | HashiCorp Vault + ESO | Secret management |
| Security | OPA Gatekeeper + Falco | Policy enforcement & runtime security |

## Documentation Index

- [System Context](./system-context.md) - C4 Level 1: System boundaries
- [Container Diagram](./container-diagram.md) - C4 Level 2: Container decomposition
- [Deployment Diagram](./deployment-diagram.md) - Infrastructure topology
- [Data Flow](./data-flow.md) - Data flow between components
- [Network Topology](./network-topology.md) - Network architecture and segmentation

## Related Documents

- [Architecture Decision Records](../adr/) - Key architectural decisions
- [Runbooks](../runbooks/) - Operational procedures
- [Onboarding](../onboarding/) - Getting started guides
