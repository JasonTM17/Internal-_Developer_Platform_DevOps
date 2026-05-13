# Container Diagram (C4 Level 2)

## Overview

The Container diagram decomposes the IDP into its constituent containers (deployable units).

## Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Internal Developer Platform                            │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Ingress Layer                                 │    │
│  │                                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │    │
│  │  │ AWS ALB      │  │ WAF          │  │ Cert Manager             │  │    │
│  │  │ (L7 LB)     │  │ (Protection) │  │ (TLS)                    │  │    │
│  │  └──────┬───────┘  └──────────────┘  └──────────────────────────┘  │    │
│  └─────────┼────────────────────────────────────────────────────────────┘    │
│            │                                                                  │
│  ┌─────────┼────────────────────────────────────────────────────────────┐    │
│  │         ▼           Frontend Containers                               │    │
│  │                                                                       │    │
│  │  ┌──────────────────────────────────────────────────────────────┐    │    │
│  │  │  IDP Portal (React SPA)                                       │    │    │
│  │  │  - Service catalog browser                                    │    │    │
│  │  │  - Deployment dashboard                                       │    │    │
│  │  │  - Infrastructure provisioning UI                             │    │    │
│  │  │  - Team management                                            │    │    │
│  │  │  Technology: React 18, TypeScript, Vite                       │    │    │
│  │  │  Deployment: Nginx container on EKS                           │    │    │
│  │  └──────────────────────────────────────────────────────────────┘    │    │
│  └───────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐    │
│  │                    API Containers                                      │    │
│  │                                                                       │    │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────┐  │    │
│  │  │  Platform API       │  │  Deployment Engine │  │  Provisioner  │  │    │
│  │  │                     │  │                    │  │               │  │    │
│  │  │  - REST API         │  │  - GitOps sync     │  │  - Terraform  │  │    │
│  │  │  - Service catalog  │  │  - Helm releases   │  │  - Crossplane │  │    │
│  │  │  - RBAC engine      │  │  - Rollbacks       │  │  - Resource   │  │    │
│  │  │  - Audit logging    │  │  - Canary/B-G      │  │    lifecycle  │  │    │
│  │  │                     │  │                    │  │               │  │    │
│  │  │  Node.js/Express    │  │  ArgoCD + Custom   │  │  Go + gRPC   │  │    │
│  │  └─────────┬──────────┘  └─────────┬──────────┘  └───────┬───────┘  │    │
│  └────────────┼────────────────────────┼─────────────────────┼───────────┘    │
│               │                        │                     │                │
│  ┌────────────┼────────────────────────┼─────────────────────┼───────────┐    │
│  │            ▼        Data Layer      ▼                     ▼           │    │
│  │                                                                       │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  │    │
│  │  │  PostgreSQL    │  │  Redis         │  │  S3                    │  │    │
│  │  │  (RDS)         │  │  (ElastiCache) │  │  (Object Storage)     │  │    │
│  │  │                │  │                │  │                        │  │    │
│  │  │  - Catalog     │  │  - Sessions    │  │  - Terraform state     │  │    │
│  │  │  - Audit logs  │  │  - Cache       │  │  - Artifacts           │  │    │
│  │  │  - RBAC data   │  │  - Pub/Sub     │  │  - Backups             │  │    │
│  │  └────────────────┘  └────────────────┘  └────────────────────────┘  │    │
│  └───────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐    │
│  │                    Observability Layer                                 │    │
│  │                                                                       │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐  │    │
│  │  │ Prometheus   │  │ Grafana      │  │ Loki         │  │ Jaeger  │  │    │
│  │  │ (Metrics)    │  │ (Dashboards) │  │ (Logs)       │  │ (Traces)│  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └─────────┘  │    │
│  └───────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Container Responsibilities

| Container | Technology | Responsibility | Scaling |
|-----------|-----------|---------------|---------|
| IDP Portal | React/Nginx | User interface | HPA (CPU 70%) |
| Platform API | Node.js/Express | Core business logic | HPA (CPU 60%, RPS) |
| Deployment Engine | ArgoCD | GitOps deployments | Single leader + HA |
| Provisioner | Go/gRPC | Infrastructure lifecycle | Queue-based |
| PostgreSQL | RDS Multi-AZ | Persistent data | Vertical + Read replicas |
| Redis | ElastiCache | Caching & pub/sub | Cluster mode |
| S3 | AWS S3 | Object storage | Managed |

## Communication Patterns

| From | To | Protocol | Pattern |
|------|-----|----------|---------|
| Portal | Platform API | HTTPS/REST | Synchronous |
| Platform API | PostgreSQL | TCP/5432 | Connection pool |
| Platform API | Redis | TCP/6379 | Pub/Sub + Cache |
| Platform API | Provisioner | gRPC | Async (queue) |
| Deployment Engine | Kubernetes API | HTTPS | Watch + Reconcile |
| Provisioner | AWS APIs | HTTPS | Async with retry |
