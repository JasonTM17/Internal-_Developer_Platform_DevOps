# Hướng Dẫn Bắt Đầu / Getting Started

> Tài liệu song ngữ Tiếng Việt - English

---

## Giới Thiệu / Introduction

**Tiếng Việt:** Internal Developer Platform (IDP) là nền tảng kỹ thuật dành cho các đội phát triển phần mềm, cung cấp giao diện tự phục vụ để triển khai ứng dụng, quản lý hạ tầng, và giám sát hệ thống.

**English:** The Internal Developer Platform (IDP) is a platform engineering solution for software development teams, providing a self-service interface for application deployment, infrastructure management, and system monitoring.

---

## Yêu Cầu Hệ Thống / Prerequisites

| Công cụ / Tool | Phiên bản / Version | Mục đích / Purpose                  |
| -------------- | ------------------- | ----------------------------------- |
| Node.js        | 20.x LTS            | Runtime                             |
| pnpm           | 9.x+                | Quản lý package / Package manager   |
| Docker         | 24.x+               | Dịch vụ local / Local services      |
| Git            | 2.40+               | Quản lý mã nguồn / Version control  |
| kubectl        | 1.28+               | CLI cho Kubernetes / Kubernetes CLI |
| Helm           | 3.13+               | Quản lý chart / Chart manager       |
| AWS CLI        | 2.x                 | Truy cập cloud / Cloud access       |

---

## Khởi Động Nhanh / Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/JasonTM17/Internal_Developer_Platform_DevOps.git
cd Internal_Developer_Platform_DevOps
```

### 2. Cài Đặt Dependencies / Install Dependencies

```bash
pnpm install
```

### 3. Khởi Động Môi Trường Local / Start Local Environment

```bash
# Khởi động tất cả services / Start all services
docker compose up -d

# Kiểm tra trạng thái / Verify status
docker compose ps

# Kiểm tra API health / Check API health
curl http://localhost:3000/health
```

### 4. Chạy Tests / Run Tests

```bash
# Chạy toàn bộ test / Run all tests
pnpm test

# Chạy test cho service cụ thể / Run tests for specific service
pnpm --filter @idp/api test
pnpm --filter @idp/portal test
```

### 5. Truy Cập Nền Tảng / Access the Platform

| Dịch vụ / Service | URL                   | Thông tin đăng nhập / Credentials |
| ----------------- | --------------------- | --------------------------------- |
| Portal            | http://localhost:5173 | dev@idp.local / dev               |
| API               | http://localhost:3000 | JWT token                         |
| Grafana           | http://localhost:3001 | admin / admin                     |
| Prometheus        | http://localhost:9090 | -                                 |

---

## Cấu Trúc Dự Án / Project Structure

```
├── apps/
│   ├── api/           # API Backend (Node.js + Express + TypeScript)
│   └── portal/        # Cổng thông tin / Developer Portal (React + Vite)
├── packages/
│   ├── shared/        # Tiện ích dùng chung / Shared utilities
│   ├── ui/            # Thư viện UI / UI component library
│   └── config/        # Cấu hình chung / Shared configs
├── infra/
│   ├── terraform/     # Hạ tầng dưới dạng mã / Infrastructure as Code
│   ├── kubernetes/    # Manifests K8s và Helm charts
│   ├── argocd/        # Định nghĩa GitOps / GitOps definitions
│   ├── istio/         # Service mesh
│   ├── flagger/       # Triển khai canary / Canary deployments
│   ├── chaos/         # Kỹ thuật chaos / Chaos engineering
│   └── monitoring/    # Giám sát / Observability stack
├── docs/              # Tài liệu / Documentation
├── scripts/           # Scripts tự động hóa / Automation scripts
└── docker-compose.yaml
```

---

## Quy Trình Phát Triển / Development Workflow

1. **Tạo branch:** `git checkout -b feat/my-feature`
2. **Viết code và tests** / Write code and tests
3. **Chạy local:** `docker compose up -d`
4. **Kiểm tra:** `pnpm test && pnpm lint`
5. **Commit:** `git commit -m "feat(scope): mô tả"`
6. **Push và tạo PR** / Push and create PR
7. **CI chạy tự động** / CI runs automatically (lint, test, build, security)
8. **Review và merge** / Get review and merge

---

## Các Lệnh Thường Dùng / Common Commands

```bash
# Phát triển / Development
pnpm dev                    # Khởi động dev servers / Start dev servers
pnpm build                  # Build tất cả packages / Build all packages
pnpm clean                  # Xóa artifacts / Clean build artifacts

# Chất lượng code / Code Quality
pnpm lint                   # Chạy ESLint / Run ESLint
pnpm lint:fix               # Tự sửa lỗi lint / Auto-fix lint issues
pnpm format                 # Format code với Prettier / Format with Prettier
pnpm typecheck              # Kiểm tra TypeScript / TypeScript type checking

# Testing
pnpm test                   # Chạy tất cả tests / Run all tests

# Hạ tầng / Infrastructure
make terraform-plan         # Xem trước thay đổi / Preview changes
make terraform-apply        # Áp dụng thay đổi / Apply changes
```

---

## Hỗ Trợ / Getting Help

- **Slack**: `#platform-engineering`
- **Tài liệu / Docs**: Thư mục `docs/`
- **Kiến trúc / Architecture**: Xem [ADRs](../adr/)
- **Vận hành / Operations**: Xem [Runbooks](../runbooks/)
