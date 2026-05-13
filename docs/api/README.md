# API Documentation

## Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:3000/api/v1` |
| Staging | `https://api.staging.idp.example.com/v1` |
| Production | `https://api.idp.example.com/v1` |

All endpoints are prefixed with `/api/v1`. The API follows REST conventions and returns JSON responses.

## Authentication

The API uses Bearer token authentication via JWT.

```
Authorization: Bearer <token>
```

Tokens are obtained through the `/auth/login` endpoint or via OIDC SSO flow. Tokens expire after 1 hour by default and can be refreshed using the `/auth/refresh` endpoint.

See [Authentication Guide](./authentication.md) for detailed flows including OIDC integration.

## Rate Limiting

| Tier | Requests | Window |
|------|----------|--------|
| Default | 1000 | 1 minute |
| Authenticated | 5000 | 1 minute |
| Service Account | 10000 | 1 minute |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 997
X-RateLimit-Reset: 1700000060
```

When rate limited, the API returns `429 Too Many Requests`. See [Rate Limiting](./rate-limiting.md) for details.

## Available Endpoints

### Service Catalog

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/catalog/services` | List all services |
| POST | `/catalog/services` | Register a new service |
| GET | `/catalog/services/:id` | Get service details |
| PUT | `/catalog/services/:id` | Update service metadata |
| DELETE | `/catalog/services/:id` | Deregister a service |
| GET | `/catalog/templates` | List service templates |

### Environments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/environments` | List environments |
| POST | `/environments` | Create an environment |
| GET | `/environments/:id` | Get environment details |
| DELETE | `/environments/:id` | Destroy an environment |
| POST | `/environments/:id/promote` | Promote to next stage |

### Deployments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/deployments` | List deployments |
| POST | `/deployments` | Trigger a deployment |
| GET | `/deployments/:id` | Get deployment status |
| POST | `/deployments/:id/rollback` | Rollback a deployment |
| GET | `/deployments/:id/logs` | Stream deployment logs |

### Teams & RBAC

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/teams` | List teams |
| POST | `/teams` | Create a team |
| GET | `/teams/:id/members` | List team members |
| POST | `/teams/:id/members` | Add team member |
| PUT | `/teams/:id/members/:userId` | Update member role |

### Configuration Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/config/:service` | Get service configuration |
| PUT | `/config/:service` | Update configuration |
| GET | `/config/:service/history` | Configuration change history |
| POST | `/config/:service/rollback` | Rollback configuration |

### Audit & Compliance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/audit/events` | Query audit log |
| GET | `/audit/events/:id` | Get audit event detail |
| POST | `/audit/verify` | Verify hash chain integrity |

### Health & Observability

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/health/ready` | Readiness probe |
| GET | `/metrics` | Prometheus metrics |

## Error Response Format

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Service with ID 'svc-123' not found",
    "status": 404,
    "requestId": "req_abc123def456",
    "timestamp": "2026-05-13T10:30:00.000Z",
    "details": []
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Machine-readable error code |
| `message` | string | Human-readable description |
| `status` | number | HTTP status code |
| `requestId` | string | Unique request identifier for support |
| `timestamp` | string | ISO 8601 timestamp |
| `details` | array | Optional validation errors or context |

See [Error Codes](./error-codes.md) for the full list of error codes.

## Pagination

List endpoints support cursor-based pagination:

```
GET /api/v1/catalog/services?limit=20&cursor=eyJpZCI6MTAwfQ
```

Response includes pagination metadata:

```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "hasMore": true,
    "nextCursor": "eyJpZCI6MTIwfQ",
    "total": 156
  }
}
```

See [Pagination Guide](./pagination.md) for details on cursor handling.

## Additional Resources

- [OpenAPI Specification](./openapi.yaml) — Full machine-readable API spec
- [SDK Guide](./sdk-guide.md) — Using the TypeScript and Go SDKs
- [Webhooks](./webhooks.md) — Event webhook configuration
- [Versioning Policy](./versioning.md) — API versioning and deprecation
