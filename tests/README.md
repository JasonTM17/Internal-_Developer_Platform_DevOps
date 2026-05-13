# Testing Strategy

Comprehensive testing approach for the Internal Developer Platform, covering all layers from unit to production validation.

## Test Categories

| Category | Directory | Purpose | Runner |
|----------|-----------|---------|--------|
| **Unit** | `apps/*/src/**/*.test.ts` | Isolated function/class testing | Vitest |
| **Integration** | `tests/integration/` | Service interaction testing | Vitest |
| **Contract** | `tests/contract/` | API contract validation (Pact) | Pact |
| **E2E** | `tests/e2e/` | Full user journey testing | Playwright |
| **Performance** | `tests/performance/` | Load and stress testing | k6 |
| **Chaos** | `tests/chaos/` | Resilience and failure testing | Litmus |

## Running Tests

```bash
# Run all unit tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific test category
npm run test:integration
npm run test:e2e
npm run test:contract

# Run tests in watch mode (development)
npm run test:watch

# Run performance tests
npm run test:perf
```

## Test Pyramid

```
        ╱╲
       ╱ E2E ╲         Few, slow, high confidence
      ╱────────╲
     ╱ Contract  ╲      API boundary validation
    ╱──────────────╲
   ╱  Integration    ╲   Service interactions
  ╱────────────────────╲
 ╱       Unit            ╲  Many, fast, isolated
╱──────────────────────────╲
```

## Writing New Tests

### Unit Tests

Place test files adjacent to source files with `.test.ts` suffix:

```typescript
// src/catalog/service-catalog.test.ts
import { describe, it, expect } from 'vitest';
import { ServiceCatalog } from './service-catalog';

describe('ServiceCatalog', () => {
  it('should register a new service', async () => {
    const catalog = new ServiceCatalog(mockStore);
    const service = await catalog.register({ name: 'my-service' });
    expect(service.id).toBeDefined();
  });
});
```

### Integration Tests

Test service interactions with real (or containerized) dependencies:

```typescript
// tests/integration/api-catalog.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../apps/api/src/app';

describe('Catalog API Integration', () => {
  it('should create and retrieve a service', async () => {
    const app = createApp();
    const res = await request(app).post('/api/v1/catalog').send({ name: 'test' });
    expect(res.status).toBe(201);
  });
});
```

### E2E Tests

Full browser-based user journeys:

```typescript
// tests/e2e/catalog-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user can register a service', async ({ page }) => {
  await page.goto('/catalog');
  await page.click('[data-testid="add-service"]');
  await page.fill('[name="serviceName"]', 'my-service');
  await page.click('[type="submit"]');
  await expect(page.locator('.success-toast')).toBeVisible();
});
```

## CI Integration

Tests run automatically in CI:

- **Unit + Integration**: On every push and PR
- **Contract**: On PR to main
- **E2E**: On PR to main and nightly
- **Performance**: Weekly and before releases
- **Chaos**: Monthly in staging environment

## Coverage Requirements

| Category | Minimum Coverage |
|----------|-----------------|
| Unit | 80% line coverage |
| Integration | Critical paths covered |
| E2E | Core user journeys |
