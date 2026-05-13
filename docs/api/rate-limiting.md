# Rate Limiting

## Overview

The IDP Platform API implements rate limiting to ensure fair usage and protect service stability. Rate limits are applied per-client based on authentication identity.

---

## Rate Limit Tiers

| Tier | Requests/Minute | Burst Capacity | Applies To |
|------|----------------|----------------|------------|
| Free | 60 | 10 | Unauthenticated (health endpoints only) |
| Standard | 300 | 50 | Developer role |
| Professional | 1,000 | 100 | Platform Engineer role |
| Service | 5,000 | 500 | API keys (service-to-service) |
| Admin | 10,000 | 1,000 | Admin role |

---

## Rate Limit Headers

Every API response includes rate limit information:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1705312800
X-RateLimit-Window: 60
```

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in the current window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |
| `X-RateLimit-Window` | Window duration in seconds |

---

## Rate Limit Exceeded

When the rate limit is exceeded, the API returns `429 Too Many Requests`:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 23
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705312800
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 23 seconds.",
    "details": [
      {
        "field": "rate_limit",
        "message": "300 requests per 60 seconds exceeded",
        "code": "LIMIT_REACHED"
      }
    ],
    "requestId": "req_7f8a9b2c"
  }
}
```

---

## Algorithm

The platform uses a **sliding window** rate limiting algorithm with token bucket burst handling:

1. **Sliding Window** — Requests are counted over a rolling 60-second window
2. **Token Bucket** — Burst capacity allows short spikes above the sustained rate
3. **Per-Identity** — Limits are tracked per authenticated user or API key

### How It Works

```
Window: 60 seconds
Limit: 300 requests/minute
Burst: 50 additional requests (refills at 1 token/second)

Timeline:
  t=0s:  300 regular + 50 burst = 350 available
  t=1s:  Burst refills 1 token (if below 50)
  t=60s: Window slides, old requests drop off
```

---

## Endpoint-Specific Limits

Some endpoints have additional limits beyond the tier-based rate:

| Endpoint | Additional Limit | Reason |
|----------|-----------------|--------|
| `POST /deployments` | 10/hour per service | Prevent deployment storms |
| `POST /environments` | 5/hour per user | Resource-intensive operation |
| `POST /templates/*/scaffold` | 3/hour per user | Heavy compute operation |
| `POST /secrets` | 30/minute | Security-sensitive |
| `DELETE /environments/*` | 10/hour per user | Destructive operation |

---

## Handling Rate Limits

### Retry Strategy

Implement exponential backoff with jitter:

```typescript
async function requestWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status !== 429) {
      return response;
    }

    if (attempt === maxRetries) {
      throw new Error('Rate limit exceeded after max retries');
    }

    const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
    const jitter = Math.random() * 1000;
    const delay = retryAfter * 1000 + jitter;

    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

### Proactive Rate Management

Monitor remaining requests and throttle proactively:

```typescript
class RateLimitAwareClient {
  private remaining: number = Infinity;
  private resetAt: number = 0;

  async request(url: string, options: RequestInit) {
    // Wait if we're close to the limit
    if (this.remaining < 5 && Date.now() / 1000 < this.resetAt) {
      const waitMs = (this.resetAt - Date.now() / 1000) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }

    const response = await fetch(url, options);

    // Update tracking from headers
    this.remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
    this.resetAt = parseInt(response.headers.get('X-RateLimit-Reset') || '0');

    return response;
  }
}
```

---

## Rate Limit Exemptions

Certain requests are exempt from rate limiting:

- Health check endpoints (`/health`, `/health/ready`)
- Webhook delivery callbacks
- Internal service mesh traffic (identified by mTLS certificate)

---

## Requesting Higher Limits

If your use case requires higher rate limits:

1. Open a request in the platform portal under **Settings > API Access**
2. Provide justification and expected traffic patterns
3. Platform team reviews within 1 business day
4. Approved increases are applied without service interruption

---

## Monitoring Your Usage

Track your API usage through the platform portal:

```bash
# Check current rate limit status
curl -I https://api.platform.internal/v2/services \
  -H "Authorization: Bearer ${TOKEN}"

# View usage analytics
idp api usage --period 7d
```

The portal dashboard shows:
- Requests per minute over time
- Rate limit hit frequency
- Top endpoints by usage
- Remaining quota percentage
