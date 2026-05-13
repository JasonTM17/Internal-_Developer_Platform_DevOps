# Webhook Integration Guide

## Overview

The IDP Platform sends webhook notifications for key events such as deployments, environment changes, and service updates. Webhooks enable real-time integration with external systems like Slack, PagerDuty, and custom automation.

---

## Registering a Webhook

```bash
curl -X POST https://api.platform.internal/v2/webhooks \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-service.example.com/webhooks/idp",
    "events": ["deployment.succeeded", "deployment.failed", "environment.created"],
    "secret": "whsec_your_signing_secret_here",
    "active": true,
    "description": "Production deployment notifications"
  }'
```

### Response

```json
{
  "id": "wh_a1b2c3d4",
  "url": "https://your-service.example.com/webhooks/idp",
  "events": ["deployment.succeeded", "deployment.failed", "environment.created"],
  "active": true,
  "description": "Production deployment notifications",
  "createdAt": "2024-01-15T10:30:00Z",
  "lastDelivery": null
}
```

---

## Available Events

### Deployment Events

| Event | Description |
|-------|-------------|
| `deployment.created` | New deployment initiated |
| `deployment.started` | Deployment execution began |
| `deployment.succeeded` | Deployment completed successfully |
| `deployment.failed` | Deployment failed |
| `deployment.rolled_back` | Deployment was rolled back |
| `deployment.approved` | Manual approval granted |
| `deployment.rejected` | Manual approval rejected |

### Environment Events

| Event | Description |
|-------|-------------|
| `environment.created` | Environment provisioning started |
| `environment.ready` | Environment is active and ready |
| `environment.updated` | Environment configuration changed |
| `environment.destroying` | Environment teardown initiated |
| `environment.destroyed` | Environment fully removed |
| `environment.failed` | Environment provisioning failed |

### Service Events

| Event | Description |
|-------|-------------|
| `service.created` | New service registered |
| `service.updated` | Service metadata updated |
| `service.deleted` | Service deregistered |
| `service.health_changed` | Service health status changed |

### Pipeline Events

| Event | Description |
|-------|-------------|
| `pipeline.started` | Pipeline run started |
| `pipeline.succeeded` | Pipeline run completed |
| `pipeline.failed` | Pipeline run failed |

### Security Events

| Event | Description |
|-------|-------------|
| `secret.rotated` | Secret was automatically rotated |
| `secret.expiring` | Secret approaching expiration (7 days) |
| `vulnerability.detected` | New vulnerability found in a service |

---

## Webhook Payload Format

All webhook payloads follow a consistent structure:

```json
{
  "id": "evt_f8a9b2c3d4e5",
  "type": "deployment.succeeded",
  "timestamp": "2024-01-15T14:30:00Z",
  "version": "1",
  "data": {
    "deployment": {
      "id": "dep_001",
      "serviceId": "svc_abc123",
      "serviceName": "payment-service",
      "version": "2.3.1",
      "environment": "production",
      "strategy": "canary",
      "duration_seconds": 342,
      "initiatedBy": "jane.doe@company.com"
    }
  },
  "metadata": {
    "team": "payments-team",
    "cluster": "prod-us-east-1"
  }
}
```

---

## Signature Verification

All webhook deliveries include a signature header for payload verification. **Always verify signatures** before processing webhooks.

### Headers

```http
POST /webhooks/idp HTTP/1.1
Content-Type: application/json
X-IDP-Webhook-Id: evt_f8a9b2c3d4e5
X-IDP-Webhook-Timestamp: 1705312200
X-IDP-Webhook-Signature: v1=5a4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a...
User-Agent: IDP-Webhooks/2.1
```

### Verification Algorithm

The signature is computed as HMAC-SHA256 of the timestamp and payload:

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  // Reject if timestamp is older than 5 minutes (replay protection)
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp));
  if (age > 300) {
    return false;
  }

  // Compute expected signature
  const signedContent = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedContent)
    .digest('hex');

  const expected = `v1=${expectedSignature}`;

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Express.js Middleware Example

```typescript
import express from 'express';

const app = express();

app.post('/webhooks/idp', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-idp-webhook-signature'] as string;
  const timestamp = req.headers['x-idp-webhook-timestamp'] as string;
  const payload = req.body.toString();

  if (!verifyWebhookSignature(payload, signature, timestamp, process.env.WEBHOOK_SECRET!)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(payload);

  switch (event.type) {
    case 'deployment.succeeded':
      handleDeploymentSuccess(event.data);
      break;
    case 'deployment.failed':
      handleDeploymentFailure(event.data);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Respond quickly with 200 to acknowledge receipt
  res.status(200).json({ received: true });
});
```

---

## Delivery Behavior

### Retry Policy

Failed deliveries are retried with exponential backoff:

| Attempt | Delay | Total Elapsed |
|---------|-------|---------------|
| 1 | Immediate | 0s |
| 2 | 30 seconds | 30s |
| 3 | 2 minutes | 2.5 min |
| 4 | 10 minutes | 12.5 min |
| 5 | 30 minutes | 42.5 min |
| 6 | 1 hour | 1h 42min |
| 7 | 4 hours | 5h 42min |
| 8 (final) | 8 hours | 13h 42min |

### Success Criteria

A delivery is considered successful when:
- Your endpoint responds with HTTP 2xx within 30 seconds
- Any non-2xx response triggers a retry

### Automatic Disabling

Webhooks are automatically disabled after:
- 8 consecutive failed delivery attempts for a single event
- 95% failure rate over a 24-hour period (minimum 10 deliveries)

You'll receive an email notification when a webhook is disabled.

---

## Managing Webhooks

### List Webhooks

```bash
curl https://api.platform.internal/v2/webhooks \
  -H "Authorization: Bearer ${TOKEN}"
```

### Update a Webhook

```bash
curl -X PATCH https://api.platform.internal/v2/webhooks/wh_a1b2c3d4 \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "events": ["deployment.succeeded", "deployment.failed"],
    "active": true
  }'
```

### View Delivery History

```bash
curl https://api.platform.internal/v2/webhooks/wh_a1b2c3d4/deliveries \
  -H "Authorization: Bearer ${TOKEN}"
```

### Test a Webhook

Send a test event to verify your endpoint:

```bash
curl -X POST https://api.platform.internal/v2/webhooks/wh_a1b2c3d4/test \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"event": "deployment.succeeded"}'
```

---

## Best Practices

1. **Respond quickly** — Return 200 immediately, process asynchronously
2. **Verify signatures** — Always validate the HMAC signature
3. **Handle duplicates** — Use the event `id` for idempotency
4. **Monitor delivery** — Set up alerts for webhook failures
5. **Use HTTPS** — Webhook URLs must use TLS 1.2+
6. **Implement timeouts** — Process webhooks within 30 seconds
7. **Queue processing** — Push events to a queue for reliable processing
