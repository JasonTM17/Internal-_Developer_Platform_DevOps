# Tổng Quan Kiến Trúc / Architecture Overview

> Tài liệu song ngữ Tiếng Việt - English

---

## Tổng Quan Hệ Thống / System Overview

**Tiếng Việt:** IDP được xây dựng theo kiến trúc microservices với monorepo, sử dụng event-driven architecture cho giao tiếp bất đồng bộ giữa các thành phần.

**English:** IDP is built with a microservices architecture in a monorepo, using event-driven architecture for asynchronous communication between components.

---

## Sơ Đồ Kiến Trúc / Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Cổng Thông Tin / Developer Portal (React)             │
│                    Giao diện tự phục vụ / Self-Service UI                │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ HTTPS/WSS
┌──────────────────────────────────▼──────────────────────────────────────┐
│                       API Gateway (Node.js + Express)                     │
│         Xác thực / Auth • RBAC • Rate Limiting • Audit Logging           │
└───────┬──────────────┬──────────────┬──────────────┬────────────────────┘
        │              │              │              │
   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
   │ Catalog │   │  Infra  │   │  Deploy │   │  Config │
   │ Dịch vụ │   │ Hạ tầng │   │Triển khai│   │ Cấu hình│
   └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘
        │              │              │              │
┌───────▼──────────────▼──────────────▼──────────────▼────────────────────┐
│                    Tầng Hạ Tầng / Infrastructure Layer                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Kubernetes│  │Terraform │  │  ArgoCD  │  │PostgreSQL│  │  Redis   │  │
│  │  (EKS)  │  │  (IaC)   │  │ (GitOps) │  │   (DB)   │  │ (Cache)  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│                    Giám Sát / Observability Stack                         │
│         Prometheus • Grafana • Loki • AlertManager • Jaeger              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Các Thành Phần Chính / Core Components

### 1. Developer Portal (React + TypeScript)

**Tiếng Việt:**

- Giao diện web cho developer tự phục vụ
- Quản lý service catalog, deployments, environments
- Hỗ trợ dark/light theme và đa ngôn ngữ (EN/VI)
- Real-time updates qua WebSocket

**English:**

- Self-service web interface for developers
- Manage service catalog, deployments, environments
- Dark/light theme and bilingual support (EN/VI)
- Real-time updates via WebSocket

### 2. API Gateway (Node.js + Express)

**Tiếng Việt:**

- RESTful API với OpenAPI 3.1 specification
- Xác thực JWT + OIDC SSO
- Rate limiting với Redis sliding window
- Audit logging cho mọi thao tác
- Helmet security headers

**English:**

- RESTful API with OpenAPI 3.1 specification
- JWT + OIDC SSO authentication
- Rate limiting with Redis sliding window
- Audit logging for all operations
- Helmet security headers

### 3. Event Bus (NATS JetStream)

**Tiếng Việt:**

- Pub/sub messaging cho deployment events
- Durable subscriptions đảm bảo không mất message
- Dead letter queue cho failed messages
- Notification routing (Slack, PagerDuty, Email)

**English:**

- Pub/sub messaging for deployment events
- Durable subscriptions ensure no message loss
- Dead letter queue for failed messages
- Notification routing (Slack, PagerDuty, Email)

### 4. Job Queue (BullMQ + Redis)

**Tiếng Việt:**

- Background job processing với concurrency control
- Scheduled jobs (cron) cho recurring tasks
- Retry với exponential backoff
- Dead letter queue cho failed jobs

**English:**

- Background job processing with concurrency control
- Scheduled jobs (cron) for recurring tasks
- Retry with exponential backoff
- Dead letter queue for failed jobs

---

## Deployment Architecture

### Chiến Lược Triển Khai / Deployment Strategy

| Môi trường / Environment | Chiến lược / Strategy | Trigger             |
| ------------------------ | --------------------- | ------------------- |
| Development              | Rolling update        | Push to `develop`   |
| Staging                  | Blue-green            | Push to `release/*` |
| Production               | Canary (Flagger)      | Manual approval     |

### GitOps Flow

```
Developer Push → GitHub Actions CI → Build Container Image → Push to GHCR
                                                                    ↓
                                                          Update ArgoCD manifest
                                                                    ↓
                                                          ArgoCD syncs to K8s
                                                                    ↓
                                                          Flagger canary analysis
                                                                    ↓
                                                          Progressive traffic shift
```

---

## Bảo Mật / Security

| Tầng / Layer   | Giải pháp / Solution                            |
| -------------- | ----------------------------------------------- |
| Network        | Istio mTLS, Network Policies                    |
| Authentication | JWT + OIDC, Token rotation                      |
| Authorization  | Team-scoped RBAC                                |
| Secrets        | External Secrets Operator + AWS Secrets Manager |
| Scanning       | Trivy (containers), Snyk (deps), CodeQL (SAST)  |
| Audit          | Hash-chain audit log, tamper-evident            |
| Compliance     | SOC2 controls, data classification              |

---

## Giám Sát / Observability

| Thành phần / Component | Công cụ / Tool  | Mục đích / Purpose                    |
| ---------------------- | --------------- | ------------------------------------- |
| Metrics                | Prometheus      | Thu thập metrics / Metrics collection |
| Dashboards             | Grafana         | Trực quan hóa / Visualization         |
| Logging                | Loki + Promtail | Log tập trung / Centralized logging   |
| Tracing                | Jaeger + OTel   | Distributed tracing                   |
| Alerting               | AlertManager    | Cảnh báo / Alert routing              |

---

## SLOs (Service Level Objectives)

| Dịch vụ / Service | Metric        | Mục tiêu / Target |
| ----------------- | ------------- | ----------------- |
| API               | Availability  | 99.9%             |
| API               | Latency (p99) | < 500ms           |
| Portal            | Availability  | 99.5%             |
| Deployments       | Success rate  | > 95%             |
| Deployments       | Lead time     | < 15 minutes      |
