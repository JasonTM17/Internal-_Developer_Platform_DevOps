# Hướng Dẫn API / API Guide

> Tài liệu song ngữ Tiếng Việt - English

---

## Tổng Quan / Overview

**Tiếng Việt:** API của IDP tuân theo chuẩn RESTful, sử dụng JSON cho request/response, và được bảo vệ bởi JWT authentication.

**English:** The IDP API follows RESTful standards, uses JSON for request/response, and is protected by JWT authentication.

---

## Base URL

| Môi trường / Environment | URL                                      |
| ------------------------ | ---------------------------------------- |
| Development              | `http://localhost:3000/api/v1`           |
| Staging                  | `https://api.staging.idp.example.com/v1` |
| Production               | `https://api.idp.example.com/v1`         |

---

## Xác Thực / Authentication

### Đăng Nhập / Login

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "dev@idp.local",
  "password": "your-password"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600
}
```

### Sử Dụng Token / Using Token

```bash
# Thêm header Authorization / Add Authorization header
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/services
```

### Làm Mới Token / Refresh Token

```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## Rate Limiting

| Loại / Tier        | Requests | Cửa sổ / Window |
| ------------------ | -------- | --------------- |
| Mặc định / Default | 1000     | 1 phút / minute |
| Đã xác thực / Auth | 5000     | 1 phút / minute |
| Service Account    | 10000    | 1 phút / minute |

**Response Headers:**

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 997
X-RateLimit-Reset: 1700000060
```

---

## Endpoints Chính / Main Endpoints

### Service Catalog

| Method | Endpoint        | Mô tả / Description                |
| ------ | --------------- | ---------------------------------- |
| GET    | `/services`     | Danh sách services / List services |
| GET    | `/services/:id` | Chi tiết service / Service details |
| POST   | `/services`     | Tạo service mới / Create service   |
| PUT    | `/services/:id` | Cập nhật service / Update service  |
| DELETE | `/services/:id` | Xóa service / Delete service       |

### Deployments

| Method | Endpoint                    | Mô tả / Description                      |
| ------ | --------------------------- | ---------------------------------------- |
| GET    | `/deployments`              | Danh sách deployments / List deployments |
| GET    | `/deployments/:id`          | Chi tiết deployment / Deployment details |
| POST   | `/deployments`              | Tạo deployment mới / Create deployment   |
| POST   | `/deployments/:id/rollback` | Rollback deployment                      |
| POST   | `/deployments/:id/promote`  | Promote canary                           |

### Environments

| Method | Endpoint            | Mô tả / Description                        |
| ------ | ------------------- | ------------------------------------------ |
| GET    | `/environments`     | Danh sách environments / List environments |
| GET    | `/environments/:id` | Chi tiết environment / Environment details |
| POST   | `/environments`     | Tạo environment / Create environment       |
| PUT    | `/environments/:id` | Cập nhật environment / Update environment  |

### Health & Monitoring

| Method | Endpoint          | Mô tả / Description                 |
| ------ | ----------------- | ----------------------------------- |
| GET    | `/health`         | Kiểm tra sức khỏe / Health check    |
| GET    | `/health/details` | Chi tiết sức khỏe / Detailed health |
| GET    | `/metrics`        | Prometheus metrics                  |

---

## Mã Lỗi / Error Codes

| Mã / Code | Ý nghĩa / Meaning                     |
| --------- | ------------------------------------- |
| 400       | Yêu cầu không hợp lệ / Bad Request    |
| 401       | Chưa xác thực / Unauthorized          |
| 403       | Không có quyền / Forbidden            |
| 404       | Không tìm thấy / Not Found            |
| 409       | Xung đột / Conflict                   |
| 429       | Quá nhiều yêu cầu / Too Many Requests |
| 500       | Lỗi server / Internal Server Error    |

**Error Response Format:**

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "retryAfter": 30
  }
}
```

---

## Pagination

```bash
GET /api/v1/services?page=1&limit=20&sort=name&order=asc
```

**Response:**

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## Ví Dụ / Examples

### Tạo Deployment Mới / Create New Deployment

```bash
curl -X POST http://localhost:3000/api/v1/deployments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceName": "user-service",
    "version": "v1.2.3",
    "environment": "staging",
    "strategy": "canary",
    "canaryWeight": 10
  }'
```

### Rollback Deployment

```bash
curl -X POST http://localhost:3000/api/v1/deployments/dep-123/rollback \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "High error rate detected"
  }'
```
