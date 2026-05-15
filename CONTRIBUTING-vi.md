# Hướng dẫn Đóng góp cho Internal Developer Platform

> 🇬🇧 [English version](./CONTRIBUTING.md)

Cảm ơn bạn đã quan tâm đến dự án IDP! Đây là hướng dẫn đầy đủ để bạn bắt đầu đóng góp.

---

## Mục lục

- [Quy tắc Ứng xử](#quy-tắc-ứng-xử)
- [Bắt đầu](#bắt-đầu)
- [Quy trình Phát triển](#quy-trình-phát-triển)
- [Tiêu chuẩn Code](#tiêu-chuẩn-code)
- [Quy ước Commit](#quy-ước-commit)
- [Quy trình Pull Request](#quy-trình-pull-request)
- [Quyết định Kiến trúc](#quyết-định-kiến-trúc)
- [Yêu cầu Testing](#yêu-cầu-testing)
- [Tài liệu](#tài-liệu)

---

## Quy tắc Ứng xử

Chúng tôi cam kết tạo môi trường thân thiện và hòa nhập cho tất cả mọi người. Vui lòng đọc và tuân thủ [Quy tắc Ứng xử](./CODE_OF_CONDUCT.md).

---

## Bắt đầu

### Yêu cầu

- Node.js >= 18.0.0 (LTS)
- pnpm 8+
- Docker Desktop
- kubectl đã cấu hình cho cluster local
- Terraform 1.7+

### Cài đặt

```bash
# Clone repository
git clone https://github.com/JasonTM17/Internal_Developer_Platform_DevOps.git
cd Internal_Developer_Platform_DevOps

# Cài đặt dependencies
pnpm install

# Sao chép biến môi trường
cp .env.example .env

# Khởi động môi trường phát triển
docker compose up -d

# Chạy database migrations
pnpm db:migrate

# Khởi động tất cả services ở chế độ development
pnpm dev
```

### Cấu trúc Dự án

```
├── apps/
│   ├── api/          # Platform API (Express + TypeScript)
│   └── portal/       # Developer Portal (React + Vite)
├── packages/
│   ├── shared/       # Types và utilities dùng chung
│   ├── config/       # Cấu hình ESLint và Prettier
│   ├── ui/           # Thư viện UI component dùng chung
│   └── cli/          # Công cụ CLI
├── infra/
│   ├── terraform/    # Infrastructure as Code
│   ├── argocd/       # Cấu hình GitOps
│   └── monitoring/   # Observability stack
├── docs/             # Tài liệu
└── tools/            # Công cụ phát triển
```

---

## Quy trình Phát triển

### Chiến lược Nhánh

```
main (protected)
  └── feature/IDP-123-add-service-templates
  └── fix/IDP-456-deployment-timeout
  └── chore/update-dependencies
```

### Các bước Thực hiện

1. Tạo nhánh từ `main`: `git checkout -b feature/IDP-123-mo-ta`
2. Thực hiện thay đổi với các commit nhỏ, rõ ràng
3. Push và mở Pull Request
4. Xử lý feedback từ review
5. Merge sau khi được approve (squash merge)

### Chạy Local

```bash
# Chạy tất cả services
pnpm dev

# Chạy service cụ thể
pnpm --filter @idp/api dev
pnpm --filter @idp/portal dev

# Chạy tests
pnpm test

# Chạy tests ở chế độ watch
pnpm test:watch

# Kiểm tra types
pnpm typecheck

# Kiểm tra lint
pnpm lint
pnpm lint:fix
```

---

## Tiêu chuẩn Code

### TypeScript

- Bật strict mode (`strict: true`)
- Không dùng `any` (dùng `unknown` và type guards)
- Ưu tiên `interface` hơn `type` cho object shapes
- Dùng barrel exports (`index.ts`) cho public APIs
- Độ dài file tối đa: 300 dòng (tách nếu dài hơn)

### Quy ước Đặt tên

| Phần tử          | Quy ước              | Ví dụ                |
| ---------------- | -------------------- | -------------------- |
| Files            | kebab-case           | `service-catalog.ts` |
| Classes          | PascalCase           | `ServiceCatalog`     |
| Interfaces       | PascalCase (không I) | `CatalogStore`       |
| Functions        | camelCase            | `createService()`    |
| Constants        | UPPER_SNAKE_CASE     | `MAX_RETRY_COUNT`    |
| Environment vars | UPPER_SNAKE_CASE     | `DATABASE_URL`       |

### Tổ chức Code

```typescript
// 1. Imports (external trước, internal sau)
import { Injectable } from '@nestjs/common';
import { CatalogStore } from './catalog-store';

// 2. Types/Interfaces
interface CreateServiceInput { ... }

// 3. Constants
const MAX_NAME_LENGTH = 63;

// 4. Implementation
@Injectable()
export class ServiceCatalog { ... }
```

---

## Quy ước Commit

Dự án sử dụng [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <mô tả>

[body tùy chọn]

[footer tùy chọn]
```

### Types

| Type       | Mô tả                                    |
| ---------- | ---------------------------------------- |
| `feat`     | Tính năng mới                            |
| `fix`      | Sửa lỗi                                  |
| `docs`     | Chỉ thay đổi tài liệu                    |
| `style`    | Định dạng, không thay đổi code           |
| `refactor` | Thay đổi code không sửa lỗi hay thêm mới |
| `perf`     | Cải thiện hiệu năng                      |
| `test`     | Thêm hoặc cập nhật tests                 |
| `chore`    | Build process, tooling, dependencies     |
| `ci`       | Cấu hình CI/CD                           |

### Scopes

| Scope        | Mô tả               |
| ------------ | ------------------- |
| `api`        | Platform API        |
| `portal`     | Developer Portal    |
| `terraform`  | Infrastructure code |
| `monitoring` | Observability stack |
| `argocd`     | Cấu hình GitOps     |
| `deps`       | Cập nhật dependency |

### Ví dụ

```
feat(api): thêm endpoint dependency graph cho service
fix(portal): sửa lỗi reset pagination khi thay đổi filter
docs(api): cập nhật hướng dẫn authentication với phần MFA
chore(deps): cập nhật NestJS lên v10.3
ci(workflows): thêm workflow integration test
```

---

## Quy trình Pull Request

### Yêu cầu PR

- [ ] Tiêu đề mô tả rõ ràng theo quy ước commit
- [ ] Mô tả giải thích cái gì và tại sao
- [ ] Tests đã thêm/cập nhật cho thay đổi
- [ ] Tài liệu đã cập nhật nếu cần
- [ ] Không có lỗi lint (`pnpm lint`)
- [ ] Type checks pass (`pnpm typecheck`)
- [ ] Tất cả tests pass (`pnpm test`)

### Quy trình Review

1. **Kiểm tra tự động** — CI phải pass (lint, test, build, security scan)
2. **Code review** — Tối thiểu 1 approval từ code owner
3. **Platform review** — Bắt buộc cho thay đổi infrastructure
4. **Security review** — Bắt buộc cho thay đổi auth/secrets

### Chiến lược Merge

- **Squash merge** cho feature branches (lịch sử sạch)
- **Merge commit** cho release branches (giữ lịch sử)
- Xóa branch sau khi merge

---

## Quyết định Kiến trúc

### Đề xuất Thay đổi

Với thay đổi kiến trúc quan trọng, tạo RFC:

1. Copy `docs/rfcs/000-template.md`
2. Điền đề xuất
3. Mở PR để thảo luận
4. Trình bày tại cuộc họp architecture review
5. Quyết định được ghi lại dưới dạng ADR

### Khi nào cần RFC?

- Service hoặc component lớn mới
- Lựa chọn công nghệ (ngôn ngữ, framework, database mới)
- Thay đổi API breaking
- Thay đổi mô hình bảo mật
- Thay đổi ảnh hưởng nhiều team

---

## Yêu cầu Testing

### Kỳ vọng Coverage

| Loại              | Coverage tối thiểu   | Phạm vi                   |
| ----------------- | -------------------- | ------------------------- |
| Unit tests        | 80% line coverage    | Tất cả business logic     |
| Integration tests | Key paths            | API endpoints, DB queries |
| E2E tests         | Critical flows       | Deployment, provisioning  |
| Contract tests    | Tất cả API consumers | Pact-based                |

### Cấu trúc Test

```
src/
  catalog/
    catalog.service.ts
    catalog.service.test.ts      # Unit tests (cùng thư mục)
    catalog.integration.test.ts  # Integration tests
test/
  e2e/
    deployment-flow.e2e.test.ts  # E2E tests
  contracts/
    portal-api.pact.test.ts      # Contract tests
```

### Chạy Tests

```bash
# Unit tests
pnpm test

# Integration tests (cần Docker)
pnpm test:integration

# E2E tests (cần services đang chạy)
pnpm test:e2e

# Báo cáo coverage
pnpm test:coverage
```

---

## Tài liệu

### Khi nào cần Viết tài liệu

- Tính năng mới → Cập nhật docs liên quan
- Thay đổi API → Cập nhật OpenAPI spec
- Thay đổi cấu hình → Cập nhật setup guide
- Quyết định kiến trúc → Tạo ADR

### Vị trí Tài liệu

| Nội dung      | Vị trí                  |
| ------------- | ----------------------- |
| API reference | `docs/api/`             |
| Architecture  | `docs/architecture/`    |
| Operations    | `docs/operations/`      |
| Runbooks      | Wiki (link từ docs)     |
| Code docs     | JSDoc trong source code |

---

## Cần Hỗ trợ?

- **GitHub Issues:** Mở issue nếu gặp vấn đề hoặc có đề xuất
- **Pull Request:** Đóng góp trực tiếp qua PR
- **Tài liệu:** Xem thêm tại thư mục `docs/`
