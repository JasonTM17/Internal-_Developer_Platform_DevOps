# Technology Radar

## Overview

This technology radar captures our current technology choices, evaluations, and strategic direction. Updated quarterly by the platform engineering team.

---

## Adopt (Production-ready, recommended for new projects)

### Languages & Runtimes

| Technology     | Use Case                             | Notes                                 |
| -------------- | ------------------------------------ | ------------------------------------- |
| TypeScript 5.x | API services, portal, tooling        | Primary language for all new services |
| Node.js 20 LTS | Runtime for TypeScript services      | Active LTS, performance improvements  |
| Go 1.22        | CLI tools, high-performance services | Used for platform tooling             |
| Python 3.12    | Data pipelines, ML services          | Secondary language                    |

### Frameworks

| Technology | Use Case             | Notes                                |
| ---------- | -------------------- | ------------------------------------ |
| NestJS     | Backend API services | Modular, testable, TypeScript-native |
| React 18   | Portal frontend      | Component-based UI                   |
| Fastify    | Lightweight APIs     | When NestJS is too heavy             |

### Infrastructure

| Technology      | Use Case                   | Notes                   |
| --------------- | -------------------------- | ----------------------- |
| Kubernetes 1.29 | Container orchestration    | EKS managed             |
| Terraform 1.7   | Infrastructure as Code     | All cloud resources     |
| ArgoCD 2.10     | GitOps continuous delivery | Single source of truth  |
| Helm 3          | Kubernetes packaging       | Chart-based deployments |

### Observability

| Technology    | Use Case                   | Notes                          |
| ------------- | -------------------------- | ------------------------------ |
| Prometheus    | Metrics collection         | Time-series database           |
| Grafana 10    | Dashboards & visualization | Unified observability UI       |
| Loki          | Log aggregation            | Label-based log queries        |
| OpenTelemetry | Distributed tracing        | Vendor-neutral instrumentation |

### Data

| Technology    | Use Case                  | Notes                |
| ------------- | ------------------------- | -------------------- |
| PostgreSQL 16 | Primary database          | ACID, JSON support   |
| Redis 7       | Caching, sessions, queues | In-memory data store |

### CI/CD

| Technology       | Use Case          | Notes                      |
| ---------------- | ----------------- | -------------------------- |
| GitHub Actions   | CI pipelines      | Integrated with repository |
| Semantic Release | Versioning        | Automated changelog        |
| Trivy            | Security scanning | Container + IaC scanning   |

---

## Trial (Proven in limited production use, expanding)

| Technology  | Use Case                    | Status          | Notes                        |
| ----------- | --------------------------- | --------------- | ---------------------------- |
| Tempo       | Distributed tracing backend | 2 services      | Replacing Jaeger             |
| Karpenter   | Kubernetes autoscaling      | Staging cluster | Replacing Cluster Autoscaler |
| Crossplane  | Infrastructure from K8s     | 1 team          | Kubernetes-native IaC        |
| Deno        | Edge functions              | Portal edge     | V8-based, secure by default  |
| Biome       | Linting + formatting        | 3 services      | Replacing ESLint + Prettier  |
| Drizzle ORM | Database access             | 2 services      | Type-safe, lightweight       |

---

## Assess (Under evaluation, not yet in production)

| Technology  | Use Case               | Evaluation Status   | Notes                    |
| ----------- | ---------------------- | ------------------- | ------------------------ |
| Talos Linux | Immutable K8s OS       | POC complete        | Minimal attack surface   |
| Cilium      | eBPF networking        | Lab testing         | Replacing kube-proxy     |
| NATS        | Event streaming        | Architecture review | Alternative to Kafka     |
| Pkl         | Configuration language | Prototyping         | Apple's config language  |
| Bun         | JavaScript runtime     | Benchmarking        | Faster than Node.js      |
| Pulumi      | IaC (TypeScript)       | Comparison study    | Alternative to Terraform |

---

## Hold (Do not use for new projects, migrate away)

| Technology            | Reason                   | Migration Path      | Timeline |
| --------------------- | ------------------------ | ------------------- | -------- |
| Express.js            | Inconsistent patterns    | → NestJS or Fastify | Q2 2026  |
| Jenkins               | Maintenance burden       | → GitHub Actions    | Q3 2026  |
| Ansible               | Replaced by Terraform    | → Terraform modules | Complete |
| MongoDB               | Operational complexity   | → PostgreSQL        | Q4 2026  |
| Jaeger                | Consolidating on Tempo   | → Tempo + OTel      | Q2 2026  |
| Docker Compose (prod) | Not production-grade     | → Kubernetes        | Complete |
| Webpack               | Slow builds              | → Vite (portal)     | Q2 2026  |
| Moment.js             | Deprecated, large bundle | → date-fns          | Q1 2026  |

---

## Decision Records

### Recent Decisions

| Date    | Decision            | Rationale                                         |
| ------- | ------------------- | ------------------------------------------------- |
| 2026-01 | Adopt OpenTelemetry | Vendor-neutral, unified observability             |
| 2026-01 | Trial Karpenter     | Better scaling, cost optimization                 |
| 2023-12 | Hold MongoDB        | Operational overhead, PostgreSQL covers use cases |
| 2023-11 | Adopt ArgoCD        | GitOps model, better audit trail                  |
| 2023-10 | Adopt NestJS        | Consistent patterns, dependency injection         |

### Evaluation Criteria

Technologies are evaluated on:

1. **Team expertise** — Can we hire/train for this?
2. **Community health** — Active maintenance, ecosystem
3. **Operational cost** — Total cost of ownership
4. **Security posture** — CVE response time, audit history
5. **Integration** — Works with our existing stack
6. **Performance** — Meets our SLO requirements

---

## Quarterly Review Process

1. Any engineer can propose a technology change via RFC
2. Platform team evaluates against criteria
3. Trial period (1-2 teams, 1 quarter)
4. Adopt/Hold decision with documented rationale
5. Migration plan if moving to Hold
