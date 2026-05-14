# Hướng Dẫn CI/CD Pipeline / CI/CD Pipeline Guide

> Tài liệu song ngữ Tiếng Việt - English

---

## Tổng Quan / Overview

**Tiếng Việt:** Hệ thống CI/CD của IDP sử dụng GitHub Actions với 14 workflows tự động hóa toàn bộ quy trình từ code commit đến production deployment.

**English:** The IDP CI/CD system uses GitHub Actions with 14 workflows automating the entire process from code commit to production deployment.

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CI Pipeline (Every Push/PR)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────┐ │
│  │  Detect  │──▶│   Lint   │──▶│   Test   │──▶│  Security Scan   │ │
│  │ Changes  │   │ & Format │   │  & Build │   │  (SARIF Upload)  │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (on tag push v*)
┌─────────────────────────────────────────────────────────────────────┐
│                     Docker Build Pipeline                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────┐ │
│  │  Detect  │──▶│  Build   │──▶│  Trivy   │──▶│  Generate SBOM   │ │
│  │ Services │   │ & Push   │   │   Scan   │   │  & Attestation   │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (on merge to develop/release/main)
┌─────────────────────────────────────────────────────────────────────┐
│                     CD Pipeline (Per Environment)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Development          Staging              Production                 │
│  ┌──────────┐        ┌──────────┐         ┌──────────────────┐      │
│  │  Auto    │        │  Auto    │         │  Manual Approval │      │
│  │  Deploy  │        │  Deploy  │         │  + Canary Deploy │      │
│  │ (Rolling)│        │(Blue-Grn)│         │  + Progressive   │      │
│  └──────────┘        └──────────┘         └──────────────────┘      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Danh Sách Workflows / Workflow Inventory

### Core Workflows

| Workflow        | File                   | Trigger                       | Mô tả / Description                          |
| --------------- | ---------------------- | ----------------------------- | -------------------------------------------- |
| CI              | `ci.yaml`              | Push, PR                      | Lint, test, build, type-check, security scan |
| Docker Build    | `docker-build.yaml`    | Tags `v*`, Dockerfile changes | Multi-service container builds to GHCR       |
| Security Scan   | `security-scan.yaml`   | Weekly + manual               | Trivy, Snyk, CodeQL, TruffleHog, Gitleaks    |
| Release         | `release.yaml`         | Tags `v*`                     | Semantic release with changelog generation   |
| Release Drafter | `release-drafter.yaml` | Push to main                  | Auto-draft release notes from PR labels      |

### Deployment Workflows

| Workflow       | File                 | Trigger             | Mô tả / Description                      |
| -------------- | -------------------- | ------------------- | ---------------------------------------- |
| CD Development | `cd-dev.yaml`        | Push to `develop`   | Auto-deploy to dev environment           |
| CD Staging     | `cd-staging.yaml`    | Push to `release/*` | Deploy to staging with integration tests |
| CD Production  | `cd-production.yaml` | Manual approval     | Blue-green deploy with canary analysis   |

### Infrastructure Workflows

| Workflow        | File                   | Trigger               | Mô tả / Description                   |
| --------------- | ---------------------- | --------------------- | ------------------------------------- |
| Terraform Plan  | `terraform-plan.yaml`  | PR with infra changes | Preview infrastructure changes        |
| Terraform Apply | `terraform-apply.yaml` | Merge to main         | Apply approved infrastructure changes |

### Compliance & Quality

| Workflow          | File                     | Trigger      | Mô tả / Description               |
| ----------------- | ------------------------ | ------------ | --------------------------------- |
| Compliance Audit  | `compliance-audit.yaml`  | Weekly       | License check, SBOM generation    |
| Dependency Review | `dependency-review.yaml` | PR           | Check for vulnerable dependencies |
| Stale Issues      | `stale.yaml`             | Daily        | Auto-close stale issues/PRs       |
| Label Sync        | `label-sync.yaml`        | Push to main | Sync GitHub labels from config    |

---

## CI Pipeline Chi Tiết / CI Pipeline Details

### Detect Changes

**Tiếng Việt:** Sử dụng `dorny/paths-filter` để xác định packages nào thay đổi, chỉ chạy tests cho phần bị ảnh hưởng.

**English:** Uses `dorny/paths-filter` to determine which packages changed, only running tests for affected parts.

```yaml
# Ví dụ / Example: paths-filter configuration
filters:
  api: 'apps/api/**'
  portal: 'apps/portal/**'
  shared: 'packages/shared/**'
  infra: 'infra/**'
```

### Lint & Format

```bash
# Chạy ESLint cho toàn bộ monorepo / Run ESLint across monorepo
pnpm lint

# Kiểm tra formatting với Prettier / Check formatting with Prettier
pnpm format:check

# TypeScript type checking
pnpm typecheck
```

### Test Matrix

| Service | Framework    | Coverage Target | Parallel |
| ------- | ------------ | --------------- | -------- |
| API     | Vitest       | 80% lines       | Yes      |
| Portal  | Vitest + RTL | 70% lines       | Yes      |
| Shared  | Vitest       | 90% lines       | Yes      |

### Security Scan

**Tiếng Việt:** Quét bảo mật chạy song song nhiều công cụ để phát hiện lỗ hổng ở nhiều tầng.

**English:** Security scanning runs multiple tools in parallel to detect vulnerabilities at different layers.

| Tool            | Target             | Output             |
| --------------- | ------------------ | ------------------ |
| Trivy           | Container images   | SARIF report       |
| Snyk            | npm dependencies   | SARIF report       |
| CodeQL          | Source code (SAST) | SARIF report       |
| TruffleHog      | Git history        | Secret findings    |
| Gitleaks        | Current code       | Secret findings    |
| license-checker | npm packages       | License compliance |

---

## Docker Build Chi Tiết / Docker Build Details

### Multi-Stage Build Strategy

```dockerfile
# Stage 1: Dependencies (cached layer)
FROM node:20-alpine AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build (source changes trigger rebuild)
FROM deps AS build
COPY . .
RUN pnpm build

# Stage 3: Production (minimal runtime image)
FROM node:20-alpine AS production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
```

### Image Labels (OCI Standard)

```dockerfile
LABEL org.opencontainers.image.title="IDP API"
LABEL org.opencontainers.image.source="https://github.com/JasonTM17/Internal_Developer_Platform_DevOps"
LABEL org.opencontainers.image.version="${VERSION}"
```

### Container Registry

| Registry | URL                                                     | Purpose          |
| -------- | ------------------------------------------------------- | ---------------- |
| GHCR     | `ghcr.io/jasontm17/internal_developer_platform_devops/` | Primary registry |
| ECR      | `<account>.dkr.ecr.us-east-1.amazonaws.com/`            | Production (AWS) |

---

## Cấu Hình Secrets / Secrets Configuration

### Required Secrets

| Secret                | Workflow      | Mô tả / Description             |
| --------------------- | ------------- | ------------------------------- |
| `GITHUB_TOKEN`        | All           | Auto-provided by GitHub Actions |
| `AWS_DEPLOY_ROLE_ARN` | CD, Terraform | IAM role for AWS deployments    |
| `AWS_ACCOUNT_ID`      | Docker Build  | ECR registry prefix             |
| `SNYK_TOKEN`          | Security Scan | Snyk vulnerability scanning     |
| `SLACK_WEBHOOK_URL`   | Notifications | Slack integration               |
| `NPM_TOKEN`           | Release       | npm publish (if needed)         |

### Optional Secrets

| Secret          | Workflow     | Mô tả / Description                     |
| --------------- | ------------ | --------------------------------------- |
| `BOT_PAT`       | Release      | PAT for triggering downstream workflows |
| `COSIGN_KEY`    | Docker Build | Container image signing                 |
| `PAGERDUTY_KEY` | Alerting     | PagerDuty integration                   |

---

## Troubleshooting

### CI Thất Bại / CI Failures

| Lỗi / Error          | Nguyên nhân / Cause                  | Giải pháp / Solution                           |
| -------------------- | ------------------------------------ | ---------------------------------------------- |
| SARIF upload failed  | GitHub Advanced Security not enabled | `continue-on-error: true` (already configured) |
| pnpm install timeout | Registry connectivity                | Retry or check npm registry status             |
| TypeScript errors    | Type mismatch                        | Run `pnpm typecheck` locally to fix            |
| ESLint errors        | Code style violation                 | Run `pnpm lint:fix` locally                    |
| Test failures        | Logic error or flaky test            | Check test output, re-run if flaky             |

### Docker Build Thất Bại / Docker Build Failures

| Lỗi / Error         | Nguyên nhân / Cause         | Giải pháp / Solution                       |
| ------------------- | --------------------------- | ------------------------------------------ |
| OCI ref parse error | Uppercase in image name     | Use `${GITHUB_REPOSITORY,,}` for lowercase |
| Build timeout       | Large image or slow network | Check Dockerfile layer caching             |
| Push denied         | Token permissions           | Verify `packages: write` permission        |

---

## Tài Liệu Liên Quan / Related Documentation

- [Branching Strategy](../BRANCHING_STRATEGY.md) — Git workflow
- [Release Process](../RELEASE_PROCESS.md) — Versioning and releases
- [Security Architecture](../architecture/security-architecture.md) — Security scanning context
- [Deployment Diagram](../architecture/deployment-diagram.md) — Infrastructure targets
