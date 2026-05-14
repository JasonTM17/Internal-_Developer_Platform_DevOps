# SDK Usage Guide

## Overview

The IDP Platform provides official SDKs for TypeScript/JavaScript, Python, and Go. SDKs handle authentication, pagination, retries, and type safety automatically.

---

## Installation

### TypeScript / JavaScript

```bash
# pnpm
pnpm add @idp/sdk

# yarn
yarn add @idp/sdk
```

### Python

```bash
pip install idp-platform-sdk
```

### Go

```bash
go get github.com/company/idp-sdk-go
```

---

## Quick Start

### TypeScript

```typescript
import { PlatformClient } from '@idp/sdk';

const client = new PlatformClient({
  baseUrl: 'https://api.platform.internal/v2',
  auth: {
    type: 'api-key',
    key: process.env.IDP_API_KEY!,
  },
});

// List services
const services = await client.services.list({
  page: 1,
  pageSize: 20,
  tier: 'critical',
});

console.log(`Found ${services.pagination.total} critical services`);

for (const service of services.data) {
  console.log(`${service.name} (${service.team})`);
}
```

### Python

```python
from idp_sdk import PlatformClient

client = PlatformClient(
    base_url="https://api.platform.internal/v2",
    api_key=os.environ["IDP_API_KEY"],
)

# List services
services = client.services.list(tier="critical", page_size=20)

for service in services.data:
    print(f"{service.name} ({service.team})")
```

### Go

```go
package main

import (
    "context"
    "fmt"
    "os"

    idp "github.com/company/idp-sdk-go"
)

func main() {
    client := idp.NewClient(
        idp.WithBaseURL("https://api.platform.internal/v2"),
        idp.WithAPIKey(os.Getenv("IDP_API_KEY")),
    )

    services, err := client.Services.List(context.Background(), &idp.ListServicesParams{
        Tier:     idp.TierCritical,
        PageSize: 20,
    })
    if err != nil {
        panic(err)
    }

    for _, svc := range services.Data {
        fmt.Printf("%s (%s)\n", svc.Name, svc.Team)
    }
}
```

---

## Authentication

### OAuth2 (Interactive)

```typescript
const client = new PlatformClient({
  auth: {
    type: 'oauth2',
    clientId: process.env.IDP_CLIENT_ID!,
    issuer: 'https://auth.platform.internal',
    scopes: ['platform:read', 'platform:write'],
    // Token refresh is handled automatically
    onTokenRefresh: (newToken) => {
      // Optionally persist the new token
    },
  },
});
```

### API Key (Automation)

```typescript
const client = new PlatformClient({
  auth: {
    type: 'api-key',
    key: process.env.IDP_API_KEY!,
  },
});
```

### Service Account (mTLS)

```typescript
const client = new PlatformClient({
  auth: {
    type: 'mtls',
    cert: fs.readFileSync('/etc/certs/client.crt'),
    key: fs.readFileSync('/etc/certs/client.key'),
    ca: fs.readFileSync('/etc/certs/ca.crt'),
  },
});
```

---

## Service Catalog

### Create a Service

```typescript
const service = await client.services.create({
  name: 'order-processor',
  description: 'Processes incoming orders from the queue',
  team: 'commerce-team',
  tier: 'critical',
  repository: 'https://github.com/company/order-processor',
  language: 'typescript',
  framework: 'nestjs',
});

console.log(`Created service: ${service.id}`);
```

### Update a Service

```typescript
await client.services.update('svc_abc123', {
  tier: 'critical',
  lifecycle: 'production',
  metadata: {
    oncall: 'commerce-oncall',
    runbook: 'https://wiki.internal/runbooks/order-processor',
  },
});
```

### Search Services

```typescript
const results = await client.services.list({
  team: 'commerce-team',
  lifecycle: 'production',
  sort: '-updatedAt',
});
```

---

## Deployments

### Trigger a Deployment

```typescript
const deployment = await client.deployments.create({
  serviceId: 'svc_abc123',
  version: '2.4.0',
  environment: 'production',
  strategy: 'canary',
  canaryWeight: 10,
  autoPromote: false,
  requireApproval: true,
});

console.log(`Deployment ${deployment.id} status: ${deployment.status}`);
```

### Watch Deployment Progress

```typescript
const deployment = await client.deployments.waitForCompletion('dep_xyz789', {
  pollInterval: 5000, // 5 seconds
  timeout: 600000, // 10 minutes
  onProgress: (status) => {
    console.log(`Status: ${status.status}, Phase: ${status.phase}`);
  },
});

if (deployment.status === 'succeeded') {
  console.log(`Deployed in ${deployment.duration_seconds}s`);
} else {
  console.error(`Deployment failed: ${deployment.failureReason}`);
}
```

### Rollback

```typescript
const rollback = await client.deployments.rollback('dep_xyz789', {
  reason: 'Elevated error rate detected post-deploy',
});
```

---

## Environments

### Provision an Environment

```typescript
const env = await client.environments.create({
  name: 'preview-pr-142',
  type: 'preview',
  services: ['svc_abc123', 'svc_def456'],
  ttl: '48h',
  resources: {
    cpu_cores: 2,
    memory_gb: 4,
    storage_gb: 10,
  },
});

// Wait for provisioning
const ready = await client.environments.waitForReady(env.id, {
  timeout: 300000, // 5 minutes
});

console.log(`Environment ready at: ${ready.endpoints.api}`);
```

### Tear Down

```typescript
await client.environments.delete('env_abc123');
```

---

## Pagination Helpers

### Auto-Pagination

```typescript
// Iterate all services without manual pagination
for await (const service of client.services.listAll({ tier: 'critical' })) {
  console.log(service.name);
}
```

### Collect All Results

```typescript
const allServices = await client.services.listAll({ team: 'backend' }).toArray();
console.log(`Total: ${allServices.length} services`);
```

---

## Error Handling

```typescript
import { PlatformError, RateLimitError, NotFoundError } from '@idp/sdk';

try {
  await client.services.get('svc_nonexistent');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Service not found');
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof PlatformError) {
    console.error(`API error [${error.code}]: ${error.message}`);
    console.error(`Request ID: ${error.requestId}`);
  }
}
```

---

## Configuration

### Custom HTTP Client

```typescript
const client = new PlatformClient({
  auth: { type: 'api-key', key: process.env.IDP_API_KEY! },
  // Custom configuration
  timeout: 30000, // 30 second timeout
  retries: 3, // Retry failed requests up to 3 times
  retryDelay: 1000, // Initial retry delay (exponential backoff)
  userAgent: 'my-ci-tool/1.0',
  // Custom headers
  headers: {
    'X-Correlation-Id': correlationId,
  },
});
```

### Logging

```typescript
const client = new PlatformClient({
  auth: { type: 'api-key', key: process.env.IDP_API_KEY! },
  logger: {
    level: 'debug',
    // Or provide a custom logger
    custom: myWinstonLogger,
  },
});
```

### Middleware / Interceptors

```typescript
const client = new PlatformClient({
  auth: { type: 'api-key', key: process.env.IDP_API_KEY! },
  middleware: [
    // Add tracing headers
    async (request, next) => {
      request.headers.set('X-Trace-Id', generateTraceId());
      const response = await next(request);
      console.log(`${request.method} ${request.url} → ${response.status}`);
      return response;
    },
  ],
});
```

---

## CLI Integration

The SDK powers the `idp` CLI tool:

```bash
# Install CLI
pnpm install -g @idp/cli

# Authenticate
idp auth login

# Service operations
idp services list --tier critical --format table
idp services create --name my-service --team backend --tier standard
idp services get svc_abc123

# Deployments
idp deploy --service payment-service --version 2.4.0 --env production --strategy canary
idp deploy status dep_xyz789 --watch
idp deploy rollback dep_xyz789 --reason "error rate spike"

# Environments
idp env create --name preview-pr-142 --type preview --ttl 48h
idp env list --type preview
idp env delete env_abc123
```

---

## TypeScript Types

The SDK exports all types for use in your applications:

```typescript
import type {
  Service,
  Deployment,
  Environment,
  CreateServiceRequest,
  CreateDeploymentRequest,
  PaginatedResponse,
  DeploymentStatus,
  ServiceTier,
} from '@idp/sdk';

function processDeployment(deployment: Deployment): void {
  if (deployment.status === 'succeeded') {
    notifyTeam(deployment.serviceId, deployment.version);
  }
}
```
