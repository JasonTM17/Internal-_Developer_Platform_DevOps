# Mục lục Tài liệu

> 🇬🇧 [English version](./README.md)

## Internal Developer Platform — Tài liệu Kỹ thuật

Bộ tài liệu này cung cấp hướng dẫn toàn diện về kiến trúc, vận hành, và quy trình phát triển của IDP. Được cấu trúc phù hợp cho cả việc onboarding kỹ sư mới và làm tài liệu tham khảo cho người vận hành platform có kinh nghiệm.

---

## Mục lục

### Kiến trúc & Thiết kế

| Tài liệu                                                       | Phạm vi                                     | Đối tượng          |
| -------------------------------------------------------------- | ------------------------------------------- | ------------------ |
| [Tổng quan Kiến trúc](architecture/README.md)                  | Thiết kế hệ thống, quyết định công nghệ, C4 | Tất cả kỹ sư       |
| [System Context (C4 L1)](architecture/system-context.md)       | Actors bên ngoài và ranh giới hệ thống      | Architects         |
| [Container Diagram (C4 L2)](architecture/container-diagram.md) | Phân tách container nội bộ                  | Backend engineers  |
| [Deployment Diagram](architecture/deployment-diagram.md)       | Topology hạ tầng                            | SRE / DevOps       |
| [Data Flow](architecture/data-flow.md)                         | Luồng dữ liệu giữa các component            | Backend engineers  |
| [Network Topology](architecture/network-topology.md)           | Phân đoạn mạng, service mesh                | SRE / Security     |
| [Security Architecture](architecture/security-architecture.md) | Defense-in-depth, trust boundaries          | Security engineers |
| [Capacity Planning](architecture/capacity-planning.md)         | Ngưỡng scaling, dự báo tài nguyên           | SRE                |
| [Technology Radar](architecture/technology-radar.md)           | Vòng đời áp dụng công nghệ                  | Tất cả kỹ sư       |
| [Kiến trúc (VI/EN)](architecture/overview-vi.md)               | Tóm tắt kiến trúc song ngữ                  | Kỹ sư Việt Nam     |

### Architecture Decision Records (ADRs)

| ADR                                             | Tiêu đề                                | Trạng thái |
| ----------------------------------------------- | -------------------------------------- | ---------- |
| [ADR-001](adr/001-monorepo-structure.md)        | Monorepo với Turborepo                 | Accepted   |
| [ADR-002](adr/002-typescript-strict.md)         | TypeScript Strict Mode                 | Accepted   |
| [ADR-003](adr/003-gitops-argocd.md)             | GitOps với ArgoCD                      | Accepted   |
| [ADR-004](adr/004-eks-over-ecs.md)              | EKS thay vì ECS                        | Accepted   |
| [ADR-005](adr/005-postgresql-primary-db.md)     | PostgreSQL làm Database chính          | Accepted   |
| [ADR-006](adr/006-event-driven-deployments.md)  | Thông báo Deployment theo Event-Driven | Accepted   |
| [ADR-007](adr/007-rbac-team-scoped.md)          | RBAC theo phạm vi Team                 | Accepted   |
| [ADR-008](adr/008-audit-hash-chain.md)          | Audit Log với Hash-Chain               | Accepted   |
| [ADR-009](adr/009-helm-over-kustomize.md)       | Helm thay vì Kustomize                 | Accepted   |
| [ADR-010](adr/010-external-secrets-operator.md) | External Secrets Operator              | Accepted   |

### Tài liệu API

| Tài liệu                                     | Mô tả                               |
| -------------------------------------------- | ----------------------------------- |
| [OpenAPI Specification](api/openapi.yaml)    | OpenAPI 3.1 spec (machine-readable) |
| [Hướng dẫn API (VI/EN)](api/api-guide-vi.md) | Hướng dẫn sử dụng API song ngữ      |

### Vận hành & Độ tin cậy

| Tài liệu                                                           | Mô tả                                     |
| ------------------------------------------------------------------ | ----------------------------------------- |
| [Hướng dẫn Vận hành](operations/README.md)                         | Quy trình vận hành hàng ngày              |
| [Hướng dẫn CI/CD (VI/EN)](operations/ci-cd-guide-vi.md)            | Kiến trúc pipeline và troubleshooting     |
| [Hướng dẫn Hạ tầng (VI/EN)](operations/infrastructure-guide-vi.md) | Quản lý hạ tầng                           |
| [SLO Definitions](slo/)                                            | Service Level Objectives và error budgets |
| [Incident Response Runbook](runbooks/)                             | Xử lý sự cố từng bước                     |
| [Disaster Recovery](runbooks/)                                     | Mục tiêu RTO/RPO và quy trình phục hồi    |

### Hướng dẫn cho Developer

| Tài liệu                                                 | Mô tả                                       |
| -------------------------------------------------------- | ------------------------------------------- |
| [Bắt đầu Nhanh](onboarding/getting-started.md)           | Setup local trong 30 phút                   |
| [Bắt đầu Nhanh (VI)](onboarding/getting-started-vi.md)   | Hướng dẫn onboarding song ngữ               |
| [Cài đặt Local (VI)](onboarding/local-development-vi.md) | Hướng dẫn chi tiết cài đặt môi trường local |
| [Hướng dẫn Đóng góp](../CONTRIBUTING.md)                 | Tiêu chuẩn code, quy trình PR, commit       |
| [Hướng dẫn Đóng góp (VI)](../CONTRIBUTING-vi.md)         | Bản tiếng Việt                              |
| [Branching Strategy](BRANCHING_STRATEGY.md)              | Git workflow và mapping môi trường          |
| [Release Process](RELEASE_PROCESS.md)                    | Semantic versioning và quy trình release    |

### Compliance & Bảo mật

| Tài liệu                                     | Mô tả                            |
| -------------------------------------------- | -------------------------------- |
| [Chính sách Bảo mật](../SECURITY.md)         | Quy trình báo cáo lỗ hổng        |
| [Chính sách Bảo mật (VI)](../SECURITY-vi.md) | Bản tiếng Việt                   |
| [Compliance Controls](compliance/)           | SOC2 mappings, phân loại dữ liệu |

### Kế hoạch & Tham khảo

| Tài liệu                              | Mô tả                            |
| ------------------------------------- | -------------------------------- |
| [Roadmap](roadmap.md)                 | Lộ trình tính năng và milestones |
| [Glossary](glossary.md)               | Định nghĩa thuật ngữ platform    |
| [Bảng Thuật ngữ (VI)](glossary-vi.md) | Thuật ngữ DevOps Anh-Việt        |
| [FAQ (VI)](faq-vi.md)                 | Câu hỏi thường gặp               |

---

## Tiêu chuẩn Tài liệu

- Tất cả tài liệu tuân theo framework [Diátaxis](https://diataxis.fr/) (tutorials, how-to guides, reference, explanation)
- Tài liệu kiến trúc dùng ký hiệu [C4 Model](https://c4model.com/)
- ADRs theo [template của Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- Các tài liệu chính có bản song ngữ (Tiếng Việt / English)
- Diagrams dùng ASCII art để thân thiện với version control
