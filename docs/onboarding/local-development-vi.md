# Cài đặt Môi trường Phát triển Local

> 🇬🇧 [English version](./local-development.md)

## Yêu cầu Hệ thống

- **OS**: macOS 13+, Ubuntu 22.04+, Windows 11 (WSL2)
- **RAM**: Tối thiểu 16GB (8GB cấp cho Docker)
- **Disk**: 20GB trống
- **CPU**: Khuyến nghị 4+ cores

## Script Cài đặt Tự động

```bash
# macOS / Linux
./scripts/setup.sh

# Windows (PowerShell)
.\scripts\setup.ps1
```

## Cài đặt Thủ công

### 1. Cài đặt Công cụ

**macOS (Homebrew):**

```bash
brew install node@20 docker kubectl helm awscli jq yq
brew install --cask docker
```

**Ubuntu:**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs docker.io
```

**Windows (WSL2):**

```bash
# Cài Docker Desktop cho Windows, bật WSL2 integration
# Trong WSL2 terminal:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pnpm
```

### 2. Cấu hình AWS Access

```bash
aws configure --profile idp-dev
# AWS Access Key ID: (từ IAM user của bạn)
# AWS Secret Access Key: (từ IAM user của bạn)
# Default region: us-east-1
# Default output format: json

# Đặt profile
export AWS_PROFILE=idp-dev
```

### 3. Cấu hình kubectl

```bash
aws eks update-kubeconfig --name idp-dev --region us-east-1
kubectl get nodes  # Xác nhận kết nối
```

### 4. Biến Môi trường

```bash
cp .env.example .env.local
# Chỉnh sửa .env.local với giá trị của bạn
```

## Docker Compose Services

### Khởi động Tất cả

```bash
docker compose up -d
```

### Khởi động Service Cụ thể

```bash
# Chỉ API + dependencies
docker compose up -d api postgres redis

# Thêm monitoring stack
docker compose -f docker-compose.yaml -f docker-compose.monitoring.yaml up -d
```

### Xem Logs

```bash
docker compose logs -f api
docker compose logs -f --tail=50 postgres
```

### Reset Dữ liệu

```bash
docker compose down -v  # Xóa volumes
docker compose up -d    # Khởi động lại từ đầu
```

## Chạy Không dùng Docker

Nếu bạn muốn chạy services trực tiếp:

```bash
# 1. Khởi động PostgreSQL và Redis local
# (hoặc dùng Docker chỉ cho data services)
docker compose up -d postgres redis

# 2. Chạy API ở chế độ development
cd apps/api
pnpm dev

# 3. Chạy Portal ở chế độ development
cd apps/portal
pnpm dev
```

## Cài đặt IDE

### VS Code Extensions (Khuyến nghị)

- ESLint
- Prettier
- TypeScript Importer
- Docker
- Kubernetes
- GitLens

### Cấu hình Khuyến nghị

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

## Debugging

### Debug API (VS Code)

```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to API",
  "port": 9229,
  "restart": true,
  "sourceMaps": true
}
```

### Truy cập Database

```bash
# Kết nối qua psql
docker compose exec postgres psql -U idp -d idp_dev

# Hoặc dùng pgAdmin tại http://localhost:5050
```

## Lỗi Thường gặp

| Vấn đề                      | Giải pháp                                     |
| --------------------------- | --------------------------------------------- |
| Port 3000 đang bị dùng      | `lsof -i :3000` rồi kill process              |
| Docker hết dung lượng       | `docker system prune -a`                      |
| Lỗi node_modules            | `rm -rf node_modules && pnpm install`         |
| TypeScript errors sau pull  | `pnpm turbo build --filter=@idp/shared-types` |
| Database connection refused | Đợi postgres healthcheck: `docker compose ps` |

## Truy cập Services

| Service    | URL                            | Mô tả                 |
| ---------- | ------------------------------ | --------------------- |
| Portal     | http://localhost:5173          | Developer Portal UI   |
| API        | http://localhost:3000          | Backend API           |
| API Docs   | http://localhost:3000/api-docs | Swagger UI            |
| Grafana    | http://localhost:3001          | Monitoring dashboards |
| pgAdmin    | http://localhost:5050          | Database management   |
| Prometheus | http://localhost:9090          | Metrics               |
