# API Versioning Strategy

## Overview

The IDP Platform API uses **URL path versioning** as the primary versioning mechanism. This provides clear, explicit version selection and simplifies routing, caching, and documentation.

---

## Versioning Scheme

### URL Path Versioning

```
https://api.platform.internal/v2/services
https://api.platform.internal/v2/deployments
```

The major version is embedded in the URL path. Only major versions that introduce breaking changes result in a new path segment.

### Current Versions

| Version | Status | End of Life |
|---------|--------|-------------|
| v1 | Deprecated | 2024-06-30 |
| v2 | Current (Stable) | — |
| v3 | Beta (Preview) | — |

---

## Version Lifecycle

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Alpha   │───▶│   Beta   │───▶│  Stable  │───▶│Deprecated│───▶│  Sunset  │
│(internal)│    │ (preview)│    │(current) │    │(12 months)│   │ (removed)│
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

| Phase | Description | SLA |
|-------|-------------|-----|
| Alpha | Internal testing only | None |
| Beta | Available with `X-API-Preview: true` header | Best effort |
| Stable | Production-ready, fully supported | 99.9% uptime |
| Deprecated | Still functional, migration recommended | 99.9% uptime |
| Sunset | Removed, returns 410 Gone | N/A |

---

## Breaking vs Non-Breaking Changes

### Non-Breaking Changes (No Version Bump)

These changes are made to the current version without a new major version:

- Adding new endpoints
- Adding optional request parameters
- Adding new fields to response objects
- Adding new enum values (when clients handle unknown values)
- Adding new webhook event types
- Relaxing validation constraints (e.g., increasing max length)
- Adding new HTTP methods to existing resources
- Performance improvements

### Breaking Changes (New Major Version)

These changes require a new major version:

- Removing or renaming endpoints
- Removing or renaming response fields
- Changing field types (e.g., string → integer)
- Changing required fields
- Modifying error response structure
- Changing authentication mechanisms
- Altering pagination format
- Removing enum values
- Tightening validation constraints

---

## Deprecation Policy

### Timeline

1. **Announcement** — Deprecation notice published 12 months before sunset
2. **Migration Guide** — Detailed migration documentation provided
3. **Deprecation Headers** — Deprecated endpoints return warning headers
4. **Usage Monitoring** — Platform team monitors remaining v(N-1) traffic
5. **Final Notice** — 30-day final warning to remaining consumers
6. **Sunset** — Version returns `410 Gone`

### Deprecation Headers

When using a deprecated version, responses include:

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 30 Jun 2024 00:00:00 GMT
Link: <https://api.platform.internal/v2/services>; rel="successor-version"
X-Deprecation-Notice: API v1 is deprecated. Migrate to v2 by 2024-06-30.
```

### Sunset Response

After the sunset date:

```http
HTTP/1.1 410 Gone
Content-Type: application/json

{
  "error": {
    "code": "VERSION_SUNSET",
    "message": "API v1 has been removed. Please use v2.",
    "details": [
      {
        "field": "migration_guide",
        "message": "https://docs.platform.internal/migration/v1-to-v2"
      }
    ]
  }
}
```

---

## Migration Guide (v1 → v2)

### Key Changes

| Area | v1 | v2 |
|------|----|----|
| Pagination | `offset`/`limit` | `page`/`pageSize` with envelope |
| Errors | Flat `{ error: string }` | Structured `{ error: { code, message, details } }` |
| Timestamps | Unix epoch | ISO 8601 |
| IDs | Integer | UUID v4 |
| Auth | Basic Auth | OAuth2 / API Key |
| Naming | camelCase mixed | Consistent camelCase |

### Endpoint Mapping

```
v1                              → v2
GET  /v1/catalog                → GET  /v2/services
POST /v1/catalog/register       → POST /v2/services
GET  /v1/catalog/:id            → GET  /v2/services/:id
POST /v1/deploy                 → POST /v2/deployments
GET  /v1/deploy/:id/status      → GET  /v2/deployments/:id
POST /v1/environments/create    → POST /v2/environments
GET  /v1/environments/list      → GET  /v2/environments
```

---

## Preview API Access (Beta)

Access beta endpoints by including the preview header:

```bash
curl https://api.platform.internal/v3/services \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-API-Preview: true" \
  -H "X-API-Preview-Features: advanced-search,cost-allocation"
```

### Beta Caveats

- No backward compatibility guarantee
- May change without notice
- Not covered by SLA
- Rate limits may be more restrictive
- Must opt-in per request with header

---

## Content Negotiation

For minor version differences within a major version, use the `Accept` header:

```bash
# Request specific minor version behavior
curl https://api.platform.internal/v2/services \
  -H "Accept: application/json; version=2.1"

# Default: latest minor version within v2
curl https://api.platform.internal/v2/services \
  -H "Accept: application/json"
```

---

## SDK Version Compatibility

| SDK Version | API v1 | API v2 | API v3 (Beta) |
|-------------|--------|--------|----------------|
| @idp/sdk@1.x | ✅ | ❌ | ❌ |
| @idp/sdk@2.x | ⚠️ compat | ✅ | ❌ |
| @idp/sdk@3.x | ❌ | ✅ | ✅ (opt-in) |

---

## Best Practices for API Consumers

1. **Pin to a major version** — Always include the version in your base URL
2. **Handle unknown fields** — Ignore unrecognized response fields gracefully
3. **Monitor deprecation headers** — Alert when `Deprecation: true` appears
4. **Test against beta** — Validate your integration against upcoming versions
5. **Subscribe to changelog** — Stay informed about upcoming changes
6. **Use the SDK** — SDKs handle version negotiation automatically
