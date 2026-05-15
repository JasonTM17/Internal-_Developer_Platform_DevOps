# Câu hỏi Thường gặp (FAQ)

> Tổng hợp các câu hỏi thường gặp khi làm việc với Internal Developer Platform.

---

## Mục lục

- [Setup & Cài đặt](#setup--cài-đặt)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)

---

## Setup & Cài đặt

### Q: Tôi cần cài những gì để bắt đầu?

**A:** Tối thiểu cần:

- Node.js >= 20 (khuyến nghị dùng [nvm](https://github.com/nvm-sh/nvm))
- pnpm >= 8 (`npm install -g pnpm`)
- Docker Desktop
- Git

Xem chi tiết tại [Cài đặt Local](onboarding/local-development-vi.md).

### Q: Tôi dùng Windows, có chạy được không?

**A:** Có. Khuyến nghị dùng WSL2 (Windows Subsystem for Linux) để có trải nghiệm tốt nhất. Docker Desktop hỗ trợ WSL2 integration. Nếu không muốn dùng WSL2, bạn vẫn có thể chạy trực tiếp trên Windows với Git Bash.

### Q: Lần đầu clone repo, chạy lệnh gì?

**A:**

```bash
git clone https://github.com/JasonTM17/Internal_Developer_Platform_DevOps.git
cd Internal_Developer_Platform_DevOps
pnpm install
cp .env.example .env
docker compose up -d
pnpm dev
```

### Q: Tại sao dùng pnpm thay vì npm/yarn?

**A:** pnpm nhanh hơn, tiết kiệm disk (dùng hard links), và hỗ trợ monorepo workspace tốt hơn. Turborepo cũng tối ưu cho pnpm.

---

## Development

### Q: Làm sao chạy chỉ 1 service (API hoặc Portal)?

**A:**

```bash
# Chỉ chạy API
pnpm --filter @idp/api dev

# Chỉ chạy Portal
pnpm --filter @idp/portal dev
```

### Q: Làm sao thêm dependency mới?

**A:**

```bash
# Thêm vào package cụ thể
pnpm --filter @idp/api add express-rate-limit

# Thêm dev dependency
pnpm --filter @idp/portal add -D @types/react

# Thêm vào root (shared tooling)
pnpm add -w -D prettier
```

### Q: Code format tự động không?

**A:** Có. Pre-commit hook (Husky + lint-staged) tự động chạy Prettier và ESLint khi bạn commit. Nếu muốn format thủ công:

```bash
pnpm format        # Format tất cả
pnpm lint:fix      # Fix lint errors
```

### Q: Tôi thay đổi shared package, các app khác có tự cập nhật không?

**A:** Trong dev mode (`pnpm dev`), Turborepo watch mode sẽ rebuild shared packages khi có thay đổi. Nếu không thấy cập nhật, chạy:

```bash
pnpm build --filter=@idp/shared
```

---

## Testing

### Q: Chạy test như thế nào?

**A:**

```bash
# Tất cả tests
pnpm test

# Chỉ API tests
pnpm --filter @idp/api test

# Chỉ Portal tests
pnpm --filter @idp/portal test

# Watch mode (chạy lại khi file thay đổi)
pnpm --filter @idp/api test -- --watch
```

### Q: E2E tests chạy thế nào?

**A:** E2E tests dùng Playwright. Cần services đang chạy:

```bash
# Khởi động services trước
pnpm dev

# Chạy E2E (terminal khác)
npx playwright test

# Chạy với UI mode (xem browser)
npx playwright test --ui
```

### Q: Coverage report ở đâu?

**A:** Chạy `pnpm test -- --coverage`, report sẽ ở thư mục `coverage/` của mỗi package.

---

## Deployment

### Q: Làm sao deploy lên môi trường dev?

**A:** Push code lên branch `develop` → CI tự động deploy lên dev environment. Không cần thao tác thủ công.

### Q: Quy trình deploy lên production?

**A:**

1. Merge PR vào `main`
2. CI chạy build + test + security scan
3. Deploy canary (5% traffic)
4. Flagger theo dõi metrics
5. Nếu OK → tự động promote lên 100%
6. Nếu lỗi → tự động rollback

### Q: Làm sao rollback nếu deploy lỗi?

**A:**

```bash
# Qua ArgoCD
argocd app rollback <app-name>

# Qua kubectl
kubectl rollout undo deployment/<deployment-name>

# Flagger tự động rollback nếu metrics xấu
```

### Q: Docker image được publish ở đâu?

**A:** GitHub Container Registry (GHCR):

```
ghcr.io/jasontm17/internal_developer_platform_devops/idp-api:latest
ghcr.io/jasontm17/internal_developer_platform_devops/idp-portal:latest
```

---

## Troubleshooting

### Q: Port 3000 bị chiếm, làm sao?

**A:**

```bash
# Tìm process đang dùng port
lsof -i :3000          # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>
```

### Q: Docker hết dung lượng disk?

**A:**

```bash
# Xóa tất cả unused resources
docker system prune -a

# Xóa volumes không dùng
docker volume prune
```

### Q: TypeScript báo lỗi sau khi pull code mới?

**A:** Shared types có thể đã thay đổi. Rebuild:

```bash
pnpm build --filter=@idp/shared
# Hoặc build tất cả
pnpm build
```

### Q: Database connection refused?

**A:** PostgreSQL container có thể chưa sẵn sàng:

```bash
# Kiểm tra trạng thái
docker compose ps

# Xem logs
docker compose logs postgres

# Restart nếu cần
docker compose restart postgres
```

### Q: Lint/Prettier conflict khi commit?

**A:** Pre-commit hook tự động fix. Nếu vẫn lỗi:

```bash
pnpm format
pnpm lint:fix
git add .
git commit
```

---

## Architecture

### Q: Tại sao dùng monorepo?

**A:** Xem [ADR-001](adr/001-monorepo-structure.md). Tóm tắt: chia sẻ code dễ hơn, CI/CD thống nhất, refactor cross-package an toàn hơn.

### Q: Tại sao chọn EKS thay vì ECS?

**A:** Xem [ADR-004](adr/004-eks-over-ecs.md). Tóm tắt: K8s ecosystem phong phú hơn (Istio, ArgoCD, Helm), portable giữa các cloud, cộng đồng lớn hơn.

### Q: Event-driven architecture hoạt động thế nào?

**A:** Xem [ADR-006](adr/006-event-driven-deployments.md). Hệ thống dùng NATS JetStream:

- Service A publish event (ví dụ: "deployment.started")
- NATS đảm bảo delivery
- Service B, C subscribe và xử lý async
- Không cần gọi trực tiếp giữa services

### Q: RBAC hoạt động ra sao?

**A:** Xem [ADR-007](adr/007-rbac-team-scoped.md). Phân quyền theo team:

- Mỗi user thuộc 1+ teams
- Mỗi team có roles (admin, developer, viewer)
- Permissions gắn với role, không gắn trực tiếp với user

---

## Đóng góp

### Q: Tôi muốn đóng góp, bắt đầu từ đâu?

**A:** Xem [Hướng dẫn Đóng góp](../CONTRIBUTING-vi.md). Tóm tắt:

1. Fork repo
2. Tạo branch (`feature/ten-tinh-nang`)
3. Code + test
4. Mở PR

### Q: Commit message viết thế nào?

**A:** Dùng Conventional Commits:

```
feat(api): thêm endpoint mới cho service catalog
fix(portal): sửa lỗi hiển thị trên mobile
docs: cập nhật hướng dẫn cài đặt
```

### Q: PR cần gì để được merge?

**A:**

- CI pass (lint + test + build)
- Ít nhất 1 approval từ code owner
- Không có lỗi security scan
- Tài liệu cập nhật (nếu cần)

---

> Không tìm thấy câu trả lời? Mở [GitHub Issue](https://github.com/JasonTM17/Internal_Developer_Platform_DevOps/issues/new) để hỏi!
