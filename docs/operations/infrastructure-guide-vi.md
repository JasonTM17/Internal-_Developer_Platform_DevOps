# Hướng Dẫn Hạ Tầng / Infrastructure Guide

> Tài liệu song ngữ Tiếng Việt - English

---

## Tổng Quan / Overview

**Tiếng Việt:** Hạ tầng của IDP được quản lý hoàn toàn bằng Infrastructure as Code (IaC) với Terraform, triển khai trên AWS sử dụng EKS (Kubernetes), và vận hành theo mô hình GitOps với ArgoCD.

**English:** IDP infrastructure is fully managed with Infrastructure as Code (IaC) using Terraform, deployed on AWS with EKS (Kubernetes), and operated following the GitOps model with ArgoCD.

---

## Terraform Modules

### Danh Sách Module / Module Inventory

| Module      | Đường dẫn / Path                      | Mô tả / Description                                           |
| ----------- | ------------------------------------- | ------------------------------------------------------------- |
| VPC         | `infra/terraform/modules/vpc`         | Virtual Private Cloud với public/private subnets, NAT Gateway |
| EKS         | `infra/terraform/modules/eks`         | Elastic Kubernetes Service cluster với managed node groups    |
| RDS         | `infra/terraform/modules/rds`         | PostgreSQL 16 với Multi-AZ, automated backups                 |
| ElastiCache | `infra/terraform/modules/elasticache` | Redis 7 cluster cho caching và session management             |
| S3          | `infra/terraform/modules/s3`          | Object storage cho artifacts, backups, static assets          |
| IAM         | `infra/terraform/modules/iam`         | IAM roles, policies, IRSA cho Kubernetes service accounts     |
| CloudFront  | `infra/terraform/modules/cloudfront`  | CDN cho portal static assets                                  |
| Route53     | `infra/terraform/modules/route53`     | DNS management và health checks                               |
| ACM         | `infra/terraform/modules/acm`         | TLS certificate management                                    |
| WAF         | `infra/terraform/modules/waf`         | Web Application Firewall rules                                |

### Kiến Trúc Mạng / Network Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         VPC (10.0.0.0/16)                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Public Subnets (10.0.0.0/20)              │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐               │ │
│  │  │    ALB    │  │    NAT    │  │  Bastion  │               │ │
│  │  │  Ingress  │  │  Gateway  │  │   Host    │               │ │
│  │  └───────────┘  └───────────┘  └───────────┘               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Private Subnets (10.0.16.0/20)             │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐               │ │
│  │  │    EKS    │  │    EKS    │  │    EKS    │               │ │
│  │  │  Node 1   │  │  Node 2   │  │  Node 3   │               │ │
│  │  └───────────┘  └───────────┘  └───────────┘               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  Database Subnets (10.0.32.0/20)             │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐               │ │
│  │  │    RDS    │  │    RDS    │  │   Redis   │               │ │
│  │  │  Primary  │  │  Standby  │  │  Cluster  │               │ │
│  │  └───────────┘  └───────────┘  └───────────┘               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Kubernetes Architecture

### Namespace Layout

| Namespace          | Mục đích / Purpose         | Workloads                         |
| ------------------ | -------------------------- | --------------------------------- |
| `idp-production`   | Production services        | API, Portal, Workers              |
| `idp-staging`      | Staging environment        | API, Portal, Workers              |
| `idp-development`  | Development environment    | API, Portal, Workers              |
| `istio-system`     | Service mesh control plane | Istiod, Ingress Gateway           |
| `argocd`           | GitOps controller          | ArgoCD Server, Repo Server        |
| `monitoring`       | Observability stack        | Prometheus, Grafana, Loki, Jaeger |
| `cert-manager`     | TLS automation             | cert-manager controller           |
| `external-secrets` | Secret synchronization     | ESO controller                    |
| `flagger-system`   | Canary deployments         | Flagger controller                |
| `litmus`           | Chaos engineering          | LitmusChaos operator              |

### Kubernetes Resources per Service

```yaml
# Mỗi service bao gồm / Each service includes:
- Deployment (with resource limits, health probes, anti-affinity)
- Service (ClusterIP)
- HorizontalPodAutoscaler (CPU/Memory based)
- PodDisruptionBudget (minAvailable: 2)
- ServiceAccount (with IRSA annotation)
- NetworkPolicy (ingress/egress rules)
- VirtualService (Istio traffic routing)
- DestinationRule (Istio load balancing)
- Canary (Flagger progressive delivery)
```

---

## GitOps với ArgoCD / GitOps with ArgoCD

### Application Structure

```
infra/argocd/
├── projects/
│   ├── idp-platform.yaml       # AppProject definition
│   └── infrastructure.yaml     # Infra AppProject
├── applications/
│   ├── idp-api-dev.yaml        # API → development
│   ├── idp-api-staging.yaml    # API → staging
│   ├── idp-api-production.yaml # API → production
│   ├── idp-portal-dev.yaml     # Portal → development
│   ├── idp-portal-staging.yaml # Portal → staging
│   └── idp-portal-production.yaml # Portal → production
└── applicationsets/
    └── platform-apps.yaml      # ApplicationSet for all envs
```

### Sync Policy

| Môi trường / Environment | Auto Sync | Self Heal | Prune | Approval |
| ------------------------ | --------- | --------- | ----- | -------- |
| Development              | Yes       | Yes       | Yes   | None     |
| Staging                  | Yes       | Yes       | No    | None     |
| Production               | No        | Yes       | No    | Manual   |

---

## Service Mesh (Istio)

### Traffic Management

```yaml
# Canary routing example
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: idp-api
spec:
  hosts:
    - idp-api
  http:
    - route:
        - destination:
            host: idp-api
            subset: stable
          weight: 90
        - destination:
            host: idp-api
            subset: canary
          weight: 10
```

### Security Features

| Feature               | Mô tả / Description                                                       |
| --------------------- | ------------------------------------------------------------------------- |
| mTLS                  | Tự động mã hóa traffic giữa pods / Automatic encryption between pods      |
| AuthorizationPolicy   | Kiểm soát truy cập service-to-service / Service-to-service access control |
| PeerAuthentication    | Yêu cầu mTLS cho namespace / Require mTLS for namespace                   |
| RequestAuthentication | Xác thực JWT tại mesh level / JWT validation at mesh level                |

---

## Monitoring Infrastructure

### Prometheus Stack

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Prometheus  │────▶│  Grafana     │     │ AlertManager │
│  (Metrics)   │     │  (Dashboards)│     │  (Routing)   │
└──────┬───────┘     └──────────────┘     └──────┬───────┘
       │                                          │
       │ scrape                                   │ alerts
       │                                          │
┌──────▼───────┐     ┌──────────────┐     ┌──────▼───────┐
│  Service     │     │    Loki      │     │    Slack     │
│  Endpoints   │     │   (Logs)     │     │  PagerDuty   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                     ┌──────▼───────┐
                     │   Promtail   │
                     │ (Log shipper)│
                     └──────────────┘
```

### Grafana Dashboards

| Dashboard          | UID                 | Mô tả / Description                            |
| ------------------ | ------------------- | ---------------------------------------------- |
| Platform Overview  | `platform-overview` | Tổng quan toàn hệ thống / System-wide overview |
| API Performance    | `api-performance`   | Request rate, latency, errors                  |
| Deployment Metrics | `deployments`       | Deploy frequency, success rate, lead time      |
| Infrastructure     | `infrastructure`    | Node CPU, memory, disk, network                |
| SLO Overview       | `slo-overview`      | Error budget burn rate                         |
| Kubernetes         | `kubernetes`        | Pod status, resource usage                     |

---

## Disaster Recovery

### RTO/RPO Targets

| Component | RTO    | RPO           | Chiến lược / Strategy                |
| --------- | ------ | ------------- | ------------------------------------ |
| API       | 5 min  | 0 (stateless) | Multi-AZ, auto-scaling               |
| Database  | 15 min | 1 min         | Multi-AZ RDS, point-in-time recovery |
| Redis     | 5 min  | 5 min         | ElastiCache Multi-AZ with replicas   |
| Portal    | 5 min  | 0 (static)    | CloudFront CDN, S3 origin            |
| Secrets   | 10 min | 0             | AWS Secrets Manager (multi-region)   |

### Backup Strategy

| Data            | Tần suất / Frequency              | Lưu trữ / Retention | Vị trí / Location  |
| --------------- | --------------------------------- | ------------------- | ------------------ |
| PostgreSQL      | Continuous (WAL) + Daily snapshot | 30 days             | S3 Cross-Region    |
| Redis           | Hourly snapshot                   | 7 days              | S3 Same-Region     |
| Terraform State | On every apply                    | Versioned           | S3 + DynamoDB lock |
| Kubernetes etcd | Daily                             | 14 days             | S3 Cross-Region    |
| Audit Logs      | Continuous                        | 1 year              | S3 Glacier         |

---

## Chi Phí Ước Tính / Cost Estimation

### Production Environment (Monthly)

| Resource           | Spec                    | Chi phí / Cost (USD) |
| ------------------ | ----------------------- | -------------------- |
| EKS Cluster        | 1 cluster               | ~$73                 |
| EC2 (3x m5.xlarge) | Worker nodes            | ~$460                |
| RDS PostgreSQL     | db.r5.large, Multi-AZ   | ~$380                |
| ElastiCache Redis  | cache.r5.large, 2 nodes | ~$290                |
| ALB                | 1 load balancer         | ~$25                 |
| NAT Gateway        | 1 per AZ (3)            | ~$100                |
| S3 + CloudFront    | Storage + CDN           | ~$30                 |
| Route53            | Hosted zone + queries   | ~$5                  |
| **Total**          |                         | **~$1,363/month**    |

---

## Lệnh Terraform / Terraform Commands

```bash
# Khởi tạo / Initialize
cd infra/terraform/environments/dev
terraform init

# Xem trước thay đổi / Preview changes
terraform plan -out=tfplan

# Áp dụng thay đổi / Apply changes
terraform apply tfplan

# Xem state hiện tại / View current state
terraform state list

# Import resource hiện có / Import existing resource
terraform import aws_instance.example i-1234567890abcdef0

# Destroy (cẩn thận! / careful!)
terraform destroy
```

---

## Tài Liệu Liên Quan / Related Documentation

- [Architecture Overview](../architecture/README.md) — Kiến trúc tổng quan
- [ADR-004: EKS over ECS](../adr/004-eks-over-ecs.md) — Lý do chọn EKS
- [ADR-010: External Secrets](../adr/010-external-secrets-operator.md) — Quản lý secrets
- [Deployment Diagram](../architecture/deployment-diagram.md) — Sơ đồ triển khai
- [Network Topology](../architecture/network-topology.md) — Topology mạng
- [Capacity Planning](../architecture/capacity-planning.md) — Quy hoạch dung lượng
