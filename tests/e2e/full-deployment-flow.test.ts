import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * End-to-End Deployment Flow Test
 *
 * Tests the complete deployment lifecycle from service creation
 * through deployment, canary analysis, and promotion/rollback.
 * Requires a running platform environment (staging or dedicated E2E).
 */

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';
const AUTH_TOKEN = process.env.E2E_AUTH_TOKEN ?? '';

interface ApiResponse<T = unknown> {
  status: number;
  data: T;
}

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'X-Request-ID': `e2e-${Date.now()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, data };
}

async function waitForCondition(
  check: () => Promise<boolean>,
  timeoutMs = 60_000,
  intervalMs = 2000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

describe('E2E: Full Deployment Flow', () => {
  const testServiceName = `e2e-test-svc-${Date.now()}`;
  let serviceId: string;
  let deploymentId: string;

  beforeAll(async () => {
    // Verify platform is accessible
    const health = await apiRequest('GET', '/healthz');
    expect(health.status).toBe(200);
  });

  afterAll(async () => {
    // Cleanup: delete test service
    if (serviceId) {
      await apiRequest('DELETE', `/api/v1/catalog/services/${serviceId}`);
    }
  });

  describe('Step 1: Service Registration', () => {
    it('should register a new service in the catalog', async () => {
      const response = await apiRequest<{ id: string; name: string; status: string }>(
        'POST',
        '/api/v1/catalog/services',
        {
          name: testServiceName,
          description: 'E2E test service for deployment flow validation',
          owner: 'platform',
          repository: 'https://github.com/org/e2e-test',
          language: 'typescript',
          framework: 'express',
          tier: 'tier-3',
        },
      );

      expect(response.status).toBe(201);
      expect(response.data.name).toBe(testServiceName);
      serviceId = response.data.id;
    });

    it('should verify service appears in catalog', async () => {
      const response = await apiRequest<{ items: Array<{ id: string }> }>(
        'GET',
        `/api/v1/catalog/services?search=${testServiceName}`,
      );

      expect(response.status).toBe(200);
      expect(response.data.items).toHaveLength(1);
      expect(response.data.items[0].id).toBe(serviceId);
    });
  });

  describe('Step 2: Deployment Creation', () => {
    it('should create a deployment to staging', async () => {
      const response = await apiRequest<{ id: string; status: string }>(
        'POST',
        '/api/v1/deployments',
        {
          serviceName: testServiceName,
          environment: 'staging',
          version: '1.0.0-e2e',
          strategy: 'rolling',
          commitSha: 'e2e123abc',
          branch: 'main',
        },
      );

      expect(response.status).toBe(201);
      expect(response.data.status).toBe('pending');
      deploymentId = response.data.id;
    });

    it('should transition deployment to running state', async () => {
      await waitForCondition(async () => {
        const response = await apiRequest<{ status: string }>(
          'GET',
          `/api/v1/deployments/${deploymentId}`,
        );
        return response.data.status === 'running' || response.data.status === 'completed';
      }, 30_000);

      const response = await apiRequest<{ status: string }>(
        'GET',
        `/api/v1/deployments/${deploymentId}`,
      );
      expect(['running', 'completed']).toContain(response.data.status);
    });
  });

  describe('Step 3: Deployment Verification', () => {
    it('should complete deployment successfully', async () => {
      await waitForCondition(async () => {
        const response = await apiRequest<{ status: string }>(
          'GET',
          `/api/v1/deployments/${deploymentId}`,
        );
        return response.data.status === 'completed';
      }, 120_000);

      const response = await apiRequest<{ status: string; version: string }>(
        'GET',
        `/api/v1/deployments/${deploymentId}`,
      );
      expect(response.data.status).toBe('completed');
      expect(response.data.version).toBe('1.0.0-e2e');
    });

    it('should record deployment in history', async () => {
      const response = await apiRequest<{ items: Array<{ id: string }> }>(
        'GET',
        `/api/v1/deployments?serviceName=${testServiceName}&environment=staging`,
      );

      expect(response.status).toBe(200);
      expect(response.data.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Step 4: Canary Deployment', () => {
    let canaryDeploymentId: string;

    it('should create a canary deployment', async () => {
      const response = await apiRequest<{ id: string; status: string; strategy: string }>(
        'POST',
        '/api/v1/deployments',
        {
          serviceName: testServiceName,
          environment: 'staging',
          version: '1.1.0-e2e-canary',
          strategy: 'canary',
          commitSha: 'e2e456def',
          branch: 'feature/canary-test',
        },
      );

      expect(response.status).toBe(201);
      expect(response.data.strategy).toBe('canary');
      canaryDeploymentId = response.data.id;
    });

    it('should progress through canary stages', async () => {
      // Wait for canary to start receiving traffic
      await waitForCondition(async () => {
        const response = await apiRequest<{ status: string; canaryWeight?: number }>(
          'GET',
          `/api/v1/deployments/${canaryDeploymentId}`,
        );
        return (
          response.data.status === 'canary_progressing' ||
          response.data.status === 'completed'
        );
      }, 60_000);
    });
  });

  describe('Step 5: Rollback', () => {
    it('should rollback to previous version', async () => {
      const response = await apiRequest<{ status: string; rollbackReason: string }>(
        'POST',
        `/api/v1/deployments/${deploymentId}/rollback`,
        { reason: 'E2E test rollback verification' },
      );

      expect(response.status).toBe(200);
      expect(response.data.rollbackReason).toBe('E2E test rollback verification');
    });
  });
});
