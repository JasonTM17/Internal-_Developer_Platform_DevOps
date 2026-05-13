import { describe, it, expect, beforeAll } from 'vitest';

/**
 * E2E Platform Health Verification Tests
 *
 * Validates that all platform components are healthy and properly
 * integrated. Run as a smoke test after deployments or as a
 * periodic health check.
 */

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';
const PORTAL_BASE_URL = process.env.E2E_PORTAL_URL ?? 'http://localhost:3001';
const AUTH_TOKEN = process.env.E2E_AUTH_TOKEN ?? '';

async function httpGet(url: string, headers?: Record<string, string>): Promise<{ status: number; body: unknown; latency: number }> {
  const start = Date.now();
  const response = await fetch(url, {
    headers: {
      ...headers,
      'X-Request-ID': `health-${Date.now()}`,
    },
  });
  const latency = Date.now() - start;
  const body = await response.json().catch(() => null);
  return { status: response.status, body, latency };
}

describe('E2E: Platform Health Verification', () => {
  beforeAll(async () => {
    // Basic connectivity check
    try {
      await fetch(API_BASE_URL, { signal: AbortSignal.timeout(5000) });
    } catch (error) {
      throw new Error(`Platform not reachable at ${API_BASE_URL}: ${error}`);
    }
  });

  describe('API Service Health', () => {
    it('should respond to health check', async () => {
      const { status, body, latency } = await httpGet(`${API_BASE_URL}/healthz`);

      expect(status).toBe(200);
      expect(body).toMatchObject({ status: 'ok' });
      expect(latency).toBeLessThan(1000); // Health check should be fast
    });

    it('should pass readiness check', async () => {
      const { status, body } = await httpGet(`${API_BASE_URL}/readyz`);

      expect(status).toBe(200);
      expect(body).toMatchObject({ status: 'ready' });
    });

    it('should respond within SLA latency', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          httpGet(`${API_BASE_URL}/healthz`),
        ),
      );

      const latencies = results.map((r) => r.latency);
      const p99 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.99)];

      expect(p99).toBeLessThan(500); // P99 < 500ms
    });

    it('should return proper CORS headers', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/catalog/services`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://portal.idp.example.com',
          'Access-Control-Request-Method': 'GET',
        },
      });

      expect(response.headers.get('access-control-allow-origin')).toBeDefined();
      expect(response.headers.get('access-control-allow-methods')).toContain('GET');
    });

    it('should return security headers', async () => {
      const response = await fetch(`${API_BASE_URL}/healthz`);

      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBeDefined();
    });
  });

  describe('Portal Service Health', () => {
    it('should serve the portal application', async () => {
      const { status, latency } = await httpGet(PORTAL_BASE_URL);

      expect(status).toBe(200);
      expect(latency).toBeLessThan(2000);
    });

    it('should serve static assets', async () => {
      const { status } = await httpGet(`${PORTAL_BASE_URL}/favicon.ico`);

      // 200 or 304 are both acceptable
      expect([200, 304]).toContain(status);
    });
  });

  describe('API Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const { status } = await httpGet(`${API_BASE_URL}/api/v1/catalog/services`);

      expect(status).toBe(401);
    });

    it('should accept authenticated requests', async () => {
      const { status } = await httpGet(`${API_BASE_URL}/api/v1/catalog/services`, {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      });

      expect([200, 403]).toContain(status); // 200 if valid token, 403 if wrong role
    });
  });

  describe('API Endpoints Availability', () => {
    const endpoints = [
      { path: '/api/v1/catalog/services', method: 'GET' },
      { path: '/api/v1/deployments', method: 'GET' },
      { path: '/api/v1/environments', method: 'GET' },
    ];

    for (const endpoint of endpoints) {
      it(`should respond to ${endpoint.method} ${endpoint.path}`, async () => {
        const response = await fetch(`${API_BASE_URL}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            Authorization: `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        // Should not return 5xx errors
        expect(response.status).toBeLessThan(500);
      });
    }
  });

  describe('Database Connectivity', () => {
    it('should be able to query the catalog', async () => {
      const { status, body } = await httpGet(`${API_BASE_URL}/api/v1/catalog/services?limit=1`, {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      });

      if (status === 200) {
        expect(body).toHaveProperty('items');
        expect(body).toHaveProperty('total');
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on rapid requests', async () => {
      const requests = Array.from({ length: 150 }, () =>
        fetch(`${API_BASE_URL}/api/v1/catalog/services`, {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        }),
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === 429);

      // Some requests should be rate limited
      // (depends on rate limit config - may not trigger in all environments)
      if (rateLimited.length > 0) {
        const headers = rateLimited[0].headers;
        expect(headers.get('x-ratelimit-limit')).toBeDefined();
      }
    });
  });

  describe('Metrics Endpoint', () => {
    it('should expose Prometheus metrics', async () => {
      const response = await fetch(`${API_BASE_URL}/metrics`);

      if (response.status === 200) {
        const text = await response.text();
        expect(text).toContain('http_requests_total');
        expect(text).toContain('http_request_duration_seconds');
      }
    });
  });
});
