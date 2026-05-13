# Pagination Patterns

## Overview

All list endpoints in the IDP Platform API return paginated results. The API uses **offset-based pagination** with consistent response envelopes across all resources.

---

## Request Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `page` | integer | 1 | 1–10,000 | Page number (1-indexed) |
| `pageSize` | integer | 20 | 1–100 | Items per page |
| `sort` | string | `-updatedAt` | varies | Sort field with direction prefix |

### Example Request

```bash
curl "https://api.platform.internal/v2/services?page=2&pageSize=10&sort=-createdAt" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Response Format

All paginated responses follow a consistent envelope:

```json
{
  "data": [
    { "id": "svc_001", "name": "payment-service", "..." : "..." },
    { "id": "svc_002", "name": "auth-service", "..." : "..." }
  ],
  "pagination": {
    "page": 2,
    "pageSize": 10,
    "total": 47,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": true
  }
}
```

### Pagination Object

| Field | Type | Description |
|-------|------|-------------|
| `page` | integer | Current page number |
| `pageSize` | integer | Items per page |
| `total` | integer | Total number of items matching the query |
| `totalPages` | integer | Total number of pages |
| `hasNext` | boolean | Whether a next page exists |
| `hasPrevious` | boolean | Whether a previous page exists |

### Response Headers

```http
HTTP/1.1 200 OK
X-Total-Count: 47
X-Page-Count: 5
Link: <https://api.platform.internal/v2/services?page=3&pageSize=10>; rel="next",
      <https://api.platform.internal/v2/services?page=1&pageSize=10>; rel="prev",
      <https://api.platform.internal/v2/services?page=5&pageSize=10>; rel="last",
      <https://api.platform.internal/v2/services?page=1&pageSize=10>; rel="first"
```

---

## Sorting

Sort results using the `sort` parameter. Prefix with `-` for descending order:

| Value | Description |
|-------|-------------|
| `name` | Sort by name ascending |
| `-name` | Sort by name descending |
| `createdAt` | Sort by creation date ascending |
| `-createdAt` | Sort by creation date descending (newest first) |
| `-updatedAt` | Sort by last update descending (default) |
| `tier` | Sort by service tier |

### Multi-field Sorting

Use comma-separated values for multi-field sorting:

```bash
# Sort by tier (ascending), then by name (ascending)
GET /v2/services?sort=tier,name

# Sort by team (ascending), then newest first
GET /v2/services?sort=team,-createdAt
```

---

## Filtering

Combine pagination with filters for targeted queries:

```bash
# Page 1 of critical services owned by payments-team, sorted by name
GET /v2/services?page=1&pageSize=20&tier=critical&team=payments-team&sort=name
```

### Filter Operators

For advanced filtering, some endpoints support operators:

```bash
# Services created after a specific date
GET /v2/services?createdAt[gte]=2024-01-01T00:00:00Z

# Deployments with status in a set
GET /v2/deployments?status[in]=failed,rolled_back

# Services matching a name pattern
GET /v2/services?name[like]=payment
```

---

## Cursor-Based Pagination (Streaming)

For real-time data or large datasets, some endpoints support cursor-based pagination:

```bash
GET /v2/deployments?cursor=eyJpZCI6ImRlcF8wNDIiLCJ0cyI6MTcwNTMxMjgwMH0&limit=50
```

### Cursor Response

```json
{
  "data": [...],
  "cursors": {
    "next": "eyJpZCI6ImRlcF8wOTIiLCJ0cyI6MTcwNTMxMjkwMH0",
    "previous": "eyJpZCI6ImRlcF8wNDIiLCJ0cyI6MTcwNTMxMjgwMH0",
    "hasMore": true
  }
}
```

> Cursor-based pagination is recommended for:
> - Deployment event streams
> - Audit log queries
> - Any dataset that changes frequently

---

## Best Practices

### Iterating All Pages

```typescript
async function* getAllServices(client: PlatformClient) {
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const response = await client.services.list({ page, pageSize: 100 });
    yield* response.data;
    hasNext = response.pagination.hasNext;
    page++;
  }
}

// Usage
for await (const service of getAllServices(client)) {
  console.log(service.name);
}
```

### Parallel Page Fetching

When you know the total count, fetch pages in parallel:

```typescript
async function fetchAllPages<T>(
  fetcher: (page: number) => Promise<PaginatedResponse<T>>,
  pageSize: number = 100
): Promise<T[]> {
  // First request to get total
  const first = await fetcher(1);
  const results = [...first.data];

  if (first.pagination.totalPages <= 1) return results;

  // Fetch remaining pages in parallel
  const pages = Array.from(
    { length: first.pagination.totalPages - 1 },
    (_, i) => i + 2
  );

  const remaining = await Promise.all(pages.map(p => fetcher(p)));
  for (const page of remaining) {
    results.push(...page.data);
  }

  return results;
}
```

### Handling Empty Results

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| `page` exceeds `totalPages` | Returns empty `data` array with correct pagination metadata |
| `pageSize` > 100 | Clamped to 100 |
| `pageSize` < 1 | Returns 400 Bad Request |
| Negative `page` | Returns 400 Bad Request |
| Items deleted between pages | Some items may be skipped (use cursor pagination for consistency) |
| Concurrent writes | Total count is eventually consistent (±1 second) |

---

## Performance Considerations

- **Default page size (20)** is optimized for portal UI rendering
- **Maximum page size (100)** balances payload size with round-trip overhead
- **Deep pagination** (page > 1000) may have increased latency; prefer cursor-based pagination
- **Count queries** are cached for 1 second to reduce database load
- **Sort on indexed fields** (`name`, `createdAt`, `updatedAt`, `tier`) for best performance
