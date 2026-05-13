# Error Code Reference

## Overview

The IDP Platform API uses structured error responses with machine-readable error codes. All errors follow a consistent format to simplify client-side error handling.

---

## Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description of the error",
    "details": [
      {
        "field": "name",
        "message": "Service name must be between 3 and 63 characters",
        "code": "STRING_LENGTH"
      }
    ],
    "requestId": "req_7f8a9b2c-d4e5-6f7a-8b9c-0d1e2f3a4b5c"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Machine-readable error code |
| `message` | string | Human-readable error description |
| `details` | array | Field-level validation errors (when applicable) |
| `requestId` | string | Unique request identifier for support tickets |

---

## HTTP Status Codes

| Status | Meaning | When Used |
|--------|---------|-----------|
| 400 | Bad Request | Invalid input, malformed JSON, validation failure |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource already exists or state conflict |
| 422 | Unprocessable Entity | Semantically invalid request |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server failure |
| 502 | Bad Gateway | Upstream service unavailable |
| 503 | Service Unavailable | Platform is in maintenance or overloaded |

---

## Error Codes by Category

### Authentication Errors (401)

| Code | Message | Resolution |
|------|---------|------------|
| `AUTHENTICATION_REQUIRED` | Valid authentication credentials are required | Include Bearer token or API key |
| `TOKEN_EXPIRED` | Access token has expired | Refresh the token using the refresh token |
| `TOKEN_INVALID` | Token signature verification failed | Obtain a new token from the IdP |
| `TOKEN_REVOKED` | Token has been revoked | Re-authenticate |
| `API_KEY_INVALID` | API key is not recognized | Verify the API key value |
| `API_KEY_EXPIRED` | API key has expired | Generate a new API key |

### Authorization Errors (403)

| Code | Message | Resolution |
|------|---------|------------|
| `INSUFFICIENT_PERMISSIONS` | Token does not have the required scope | Request additional scopes |
| `TEAM_ACCESS_DENIED` | User is not a member of the owning team | Request team membership |
| `RESOURCE_LOCKED` | Resource is locked by another operation | Wait for the lock to release |
| `ENVIRONMENT_RESTRICTED` | Production operations require elevated access | Use production-approved credentials |

### Validation Errors (400)

| Code | Message | Resolution |
|------|---------|------------|
| `VALIDATION_ERROR` | Request body failed validation | Check `details` array for specific fields |
| `INVALID_JSON` | Request body is not valid JSON | Fix JSON syntax |
| `MISSING_FIELD` | Required field is missing | Include all required fields |
| `INVALID_FORMAT` | Field value does not match expected format | Check field format requirements |
| `STRING_LENGTH` | String length outside allowed range | Adjust string length |
| `INVALID_ENUM` | Value is not one of the allowed options | Use a valid enum value |
| `INVALID_UUID` | Value is not a valid UUID | Provide a valid UUID v4 |
| `INVALID_URL` | Value is not a valid URL | Provide a valid URL with scheme |

### Resource Errors (404, 409)

| Code | Message | Resolution |
|------|---------|------------|
| `RESOURCE_NOT_FOUND` | The requested resource does not exist | Verify the resource ID |
| `SERVICE_NOT_FOUND` | Service with the given ID does not exist | Check service ID |
| `DEPLOYMENT_NOT_FOUND` | Deployment with the given ID does not exist | Check deployment ID |
| `ENVIRONMENT_NOT_FOUND` | Environment with the given ID does not exist | Check environment ID |
| `RESOURCE_ALREADY_EXISTS` | A resource with this identifier already exists | Use a different name/ID |
| `NAME_CONFLICT` | A service with this name already exists | Choose a unique name |
| `STATE_CONFLICT` | Resource is in a state that prevents this operation | Wait or resolve the conflict |

### Deployment Errors (400, 409, 422)

| Code | Message | Resolution |
|------|---------|------------|
| `DEPLOYMENT_IN_PROGRESS` | A deployment is already running for this service | Wait for current deployment |
| `DEPLOYMENT_LOCKED` | Deployment is locked (manual approval required) | Approve in the portal |
| `INVALID_VERSION` | Version format is not valid semver | Use semantic versioning |
| `VERSION_NOT_FOUND` | Artifact for this version does not exist | Build and push the artifact first |
| `ROLLBACK_UNAVAILABLE` | No previous version available for rollback | Cannot rollback first deployment |
| `CANARY_ANALYSIS_FAILED` | Canary metrics exceeded error thresholds | Fix issues and redeploy |
| `ENVIRONMENT_UNAVAILABLE` | Target environment is not ready | Wait for environment provisioning |

### Environment Errors (400, 422)

| Code | Message | Resolution |
|------|---------|------------|
| `QUOTA_EXCEEDED` | Team has reached maximum environment count | Delete unused environments |
| `INSUFFICIENT_RESOURCES` | Cluster does not have enough resources | Reduce resource request or scale cluster |
| `TEMPLATE_NOT_FOUND` | Environment template does not exist | Use a valid template name |
| `TTL_EXPIRED` | Environment has exceeded its time-to-live | Extend TTL or recreate |
| `PROVISIONING_FAILED` | Environment provisioning encountered an error | Check provisioning logs |

### Rate Limiting Errors (429)

| Code | Message | Resolution |
|------|---------|------------|
| `RATE_LIMIT_EXCEEDED` | Request rate limit exceeded | Wait and retry with backoff |
| `BURST_LIMIT_EXCEEDED` | Burst capacity exhausted | Spread requests over time |
| `ENDPOINT_LIMIT_EXCEEDED` | Endpoint-specific limit reached | Wait for the endpoint limit to reset |

### Server Errors (500, 502, 503)

| Code | Message | Resolution |
|------|---------|------------|
| `INTERNAL_ERROR` | An unexpected error occurred | Retry; contact support if persistent |
| `DATABASE_ERROR` | Database operation failed | Retry; platform team is notified |
| `UPSTREAM_TIMEOUT` | Upstream service did not respond in time | Retry after a brief delay |
| `SERVICE_UNAVAILABLE` | Platform is temporarily unavailable | Check status page; retry later |
| `MAINTENANCE_MODE` | Platform is undergoing scheduled maintenance | Wait for maintenance window to end |

---

## Error Handling Best Practices

### Client-Side Error Handling

```typescript
import { PlatformError } from '@idp/sdk';

try {
  await client.services.create({ name: 'my-service', team: 'backend' });
} catch (error) {
  if (error instanceof PlatformError) {
    switch (error.code) {
      case 'NAME_CONFLICT':
        console.error('Service name already taken');
        break;
      case 'VALIDATION_ERROR':
        for (const detail of error.details) {
          console.error(`${detail.field}: ${detail.message}`);
        }
        break;
      case 'RATE_LIMIT_EXCEEDED':
        await sleep(error.retryAfter * 1000);
        // Retry the request
        break;
      default:
        console.error(`Unexpected error: ${error.message}`);
        // Include requestId in support tickets
        console.error(`Request ID: ${error.requestId}`);
    }
  }
}
```

### Retry Decision Matrix

| Error Code | Retryable | Strategy |
|-----------|-----------|----------|
| `RATE_LIMIT_EXCEEDED` | Yes | Wait for `Retry-After` header |
| `INTERNAL_ERROR` | Yes | Exponential backoff (max 3 retries) |
| `UPSTREAM_TIMEOUT` | Yes | Retry after 2–5 seconds |
| `DATABASE_ERROR` | Yes | Retry after 1–3 seconds |
| `SERVICE_UNAVAILABLE` | Yes | Retry after 30–60 seconds |
| `VALIDATION_ERROR` | No | Fix request and resubmit |
| `RESOURCE_NOT_FOUND` | No | Verify resource exists |
| `AUTHENTICATION_REQUIRED` | No | Re-authenticate first |
| `DEPLOYMENT_IN_PROGRESS` | Conditional | Poll until deployment completes |

---

## Debugging with Request IDs

Every response includes a `X-Request-Id` header and errors include a `requestId` field. Use this when contacting support:

```bash
# The request ID is in the response header
curl -v https://api.platform.internal/v2/services 2>&1 | grep X-Request-Id

# Include in support tickets
"I received error DEPLOYMENT_IN_PROGRESS with requestId: req_7f8a9b2c-d4e5-6f7a-8b9c-0d1e2f3a4b5c"
```
