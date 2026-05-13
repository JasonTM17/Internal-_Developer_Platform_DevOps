# API Authentication Guide

## Overview

The IDP Platform API supports two authentication methods:

1. **OAuth2 Bearer Tokens** — For user-initiated requests via the portal or CLI
2. **API Keys** — For service-to-service communication and automation

All API requests must include valid credentials. Unauthenticated requests receive a `401 Unauthorized` response.

---

## OAuth2 Bearer Tokens

### Token Acquisition

The platform uses OpenID Connect (OIDC) with your organization's identity provider (IdP).

```bash
# Exchange authorization code for tokens
curl -X POST https://auth.platform.internal/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=${AUTH_CODE}" \
  -d "client_id=${CLIENT_ID}" \
  -d "redirect_uri=http://localhost:8080/callback"
```

### Token Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "scope": "openid profile email platform:read platform:write"
}
```

### Using Bearer Tokens

Include the access token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..." \
  https://api.platform.internal/v2/services
```

### Token Refresh

Access tokens expire after 1 hour. Use the refresh token to obtain a new access token:

```bash
curl -X POST https://auth.platform.internal/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=${REFRESH_TOKEN}" \
  -d "client_id=${CLIENT_ID}"
```

### JWT Claims

The platform validates the following JWT claims:

| Claim | Description | Required |
|-------|-------------|----------|
| `sub` | User identifier | Yes |
| `iss` | Token issuer (must match configured IdP) | Yes |
| `aud` | Audience (must include `platform-api`) | Yes |
| `exp` | Expiration time | Yes |
| `iat` | Issued at time | Yes |
| `teams` | Team memberships | No |
| `roles` | Platform roles | No |
| `scope` | Granted scopes | Yes |

---

## API Keys

### Creating an API Key

API keys are managed through the platform portal or API:

```bash
curl -X POST https://api.platform.internal/v2/api-keys \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ci-pipeline-key",
    "scopes": ["services:read", "deployments:write"],
    "expiresIn": "90d"
  }'
```

### Response

```json
{
  "id": "key_2a4f8b3c",
  "name": "ci-pipeline-key",
  "key": "idp_live_k1a2b3c4d5e6f7g8h9i0...",
  "scopes": ["services:read", "deployments:write"],
  "createdAt": "2024-01-15T10:30:00Z",
  "expiresAt": "2024-04-15T10:30:00Z"
}
```

> **Important:** The full API key is only shown once at creation time. Store it securely.

### Using API Keys

Include the API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: idp_live_k1a2b3c4d5e6f7g8h9i0..." \
  https://api.platform.internal/v2/services
```

### Key Rotation

Rotate API keys without downtime using the overlap period:

```bash
# Create new key
NEW_KEY=$(curl -X POST .../api-keys -d '{"name": "ci-pipeline-key-v2", ...}')

# Update consumers to use new key
# ...

# Revoke old key
curl -X DELETE https://api.platform.internal/v2/api-keys/key_2a4f8b3c \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Scopes & Permissions

### Available Scopes

| Scope | Description |
|-------|-------------|
| `platform:read` | Read access to all platform resources |
| `platform:write` | Write access to all platform resources |
| `services:read` | Read service catalog |
| `services:write` | Create/update services |
| `deployments:read` | View deployments |
| `deployments:write` | Trigger deployments |
| `environments:read` | View environments |
| `environments:write` | Provision/destroy environments |
| `secrets:read` | List secret metadata |
| `secrets:write` | Create/update secrets |
| `admin` | Full administrative access |

### Role-Based Access

| Role | Default Scopes |
|------|---------------|
| `viewer` | `platform:read` |
| `developer` | `services:read`, `services:write`, `deployments:read`, `deployments:write`, `environments:read` |
| `platform-engineer` | All scopes except `admin` |
| `admin` | All scopes |

---

## Security Best Practices

1. **Use short-lived tokens** — Access tokens expire in 1 hour by default
2. **Minimize scopes** — Request only the scopes your application needs
3. **Rotate API keys** — Set expiration and rotate keys every 90 days
4. **Use environment variables** — Never hardcode credentials in source code
5. **Enable MFA** — Require multi-factor authentication for all platform users
6. **Audit access** — Review API key usage in the audit log regularly

---

## Error Responses

### 401 Unauthorized

```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Valid authentication credentials are required",
    "requestId": "req_abc123"
  }
}
```

### 403 Forbidden

```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Token does not have the required scope: deployments:write",
    "requestId": "req_abc123"
  }
}
```

### Token Expired

```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Access token has expired. Please refresh your token.",
    "requestId": "req_abc123"
  }
}
```

---

## SDK Authentication

### TypeScript/JavaScript

```typescript
import { PlatformClient } from '@idp/sdk';

// OAuth2 (interactive)
const client = new PlatformClient({
  auth: {
    type: 'oauth2',
    clientId: process.env.IDP_CLIENT_ID,
    issuer: 'https://auth.platform.internal',
  },
});

// API Key (automation)
const client = new PlatformClient({
  auth: {
    type: 'api-key',
    key: process.env.IDP_API_KEY,
  },
});
```

### CLI Authentication

```bash
# Interactive login (opens browser)
idp auth login

# API key for CI/CD
export IDP_API_KEY="idp_live_k1a2b3c4d5e6f7g8h9i0..."
idp services list

# Check current auth status
idp auth status
```
