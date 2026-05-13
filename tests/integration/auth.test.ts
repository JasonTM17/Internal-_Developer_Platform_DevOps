import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { setupTestApp, TestApp } from './setup';
import { sign } from 'jsonwebtoken';

describe('Authentication & Authorization Integration Tests', () => {
  let app: TestApp;
  let postgresContainer: StartedTestContainer;
  const JWT_SECRET = 'test-secret-key-for-integration-tests';

  beforeAll(async () => {
    postgresContainer = await new GenericContainer('postgres:15-alpine')
      .withEnvironment({
        POSTGRES_DB: 'idp_test',
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
      })
      .withExposedPorts(5432)
      .start();

    const dbUrl = `postgresql://test:test@${postgresContainer.getHost()}:${postgresContainer.getMappedPort(5432)}/idp_test`;
    app = await setupTestApp({ databaseUrl: dbUrl, jwtSecret: JWT_SECRET });
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await postgresContainer?.stop();
  });

  function generateToken(payload: Record<string, unknown>, expiresIn = '1h'): string {
    return sign(payload, JWT_SECRET, { expiresIn, issuer: 'https://auth.idp.example.com' });
  }

  describe('Authentication', () => {
    it('should reject requests without authorization header', async () => {
      const response = await app.request('GET', '/api/v1/catalog/services', undefined, {
        skipAuth: true,
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('unauthorized');
    });

    it('should reject requests with invalid token', async () => {
      const response = await app.request('GET', '/api/v1/catalog/services', undefined, {
        token: 'invalid-token',
      });

      expect(response.status).toBe(401);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = generateToken(
        { sub: 'user-1', role: 'developer', email: 'dev@example.com' },
        '-1h',
      );

      const response = await app.request('GET', '/api/v1/catalog/services', undefined, {
        token: expiredToken,
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('expired');
    });

    it('should accept valid tokens', async () => {
      const token = generateToken({
        sub: 'user-1',
        role: 'developer',
        email: 'dev@example.com',
        teams: ['platform'],
      });

      const response = await app.request('GET', '/api/v1/catalog/services', undefined, {
        token,
      });

      expect(response.status).toBe(200);
    });

    it('should allow unauthenticated access to health endpoints', async () => {
      const healthResponse = await app.request('GET', '/healthz', undefined, { skipAuth: true });
      const readyResponse = await app.request('GET', '/readyz', undefined, { skipAuth: true });

      expect(healthResponse.status).toBe(200);
      expect(readyResponse.status).toBe(200);
    });
  });

  describe('Authorization - Role-Based Access', () => {
    it('should allow developers to create services', async () => {
      const token = generateToken({
        sub: 'dev-user',
        role: 'developer',
        teams: ['platform'],
      });

      const response = await app.request(
        'POST',
        '/api/v1/catalog/services',
        {
          name: 'dev-created-service',
          description: 'Created by developer',
          owner: 'platform',
          repository: 'https://github.com/org/dev-service',
        },
        { token },
      );

      expect(response.status).toBe(201);
    });

    it('should deny viewers from creating services', async () => {
      const token = generateToken({
        sub: 'viewer-user',
        role: 'viewer',
        teams: ['stakeholders'],
      });

      const response = await app.request(
        'POST',
        '/api/v1/catalog/services',
        {
          name: 'viewer-service',
          description: 'Should fail',
          owner: 'platform',
          repository: 'https://github.com/org/viewer-service',
        },
        { token },
      );

      expect(response.status).toBe(403);
    });

    it('should allow admins to access admin endpoints', async () => {
      const token = generateToken({
        sub: 'admin-user',
        role: 'admin',
        teams: ['platform'],
      });

      const response = await app.request('GET', '/api/v1/admin/users', undefined, { token });

      expect(response.status).toBe(200);
    });

    it('should deny non-admins from admin endpoints', async () => {
      const token = generateToken({
        sub: 'dev-user',
        role: 'developer',
        teams: ['platform'],
      });

      const response = await app.request('GET', '/api/v1/admin/users', undefined, { token });

      expect(response.status).toBe(403);
    });

    it('should restrict production deployments to team leads and admins', async () => {
      const devToken = generateToken({
        sub: 'dev-user',
        role: 'developer',
        teams: ['platform'],
      });

      const leadToken = generateToken({
        sub: 'lead-user',
        role: 'team-lead',
        teams: ['platform'],
      });

      // Developer cannot deploy to production
      const devResponse = await app.request(
        'POST',
        '/api/v1/deployments',
        {
          serviceName: 'test-service',
          environment: 'production',
          version: '1.0.0',
          strategy: 'canary',
          commitSha: 'abc123',
          branch: 'main',
        },
        { token: devToken },
      );

      expect(devResponse.status).toBe(403);

      // Team lead can deploy to production
      // (would need service to exist, but auth check happens first)
      const leadResponse = await app.request(
        'POST',
        '/api/v1/deployments',
        {
          serviceName: 'test-service',
          environment: 'production',
          version: '1.0.0',
          strategy: 'canary',
          commitSha: 'abc123',
          branch: 'main',
        },
        { token: leadToken },
      );

      // 404 because service doesn't exist, but auth passed
      expect(leadResponse.status).toBe(404);
    });
  });

  describe('Authorization - Team-Based Access', () => {
    it('should restrict service updates to owning team', async () => {
      const platformToken = generateToken({
        sub: 'platform-dev',
        role: 'developer',
        teams: ['platform'],
      });

      const otherToken = generateToken({
        sub: 'other-dev',
        role: 'developer',
        teams: ['payments'],
      });

      // Create service owned by platform team
      const createResponse = await app.request(
        'POST',
        '/api/v1/catalog/services',
        {
          name: 'team-owned-service',
          description: 'Owned by platform',
          owner: 'platform',
          repository: 'https://github.com/org/team-owned',
        },
        { token: platformToken },
      );

      const serviceId = createResponse.body.id;

      // Other team cannot update
      const otherResponse = await app.request(
        'PUT',
        `/api/v1/catalog/services/${serviceId}`,
        { description: 'Unauthorized update' },
        { token: otherToken },
      );

      expect(otherResponse.status).toBe(403);

      // Owning team can update
      const ownerResponse = await app.request(
        'PUT',
        `/api/v1/catalog/services/${serviceId}`,
        { description: 'Authorized update' },
        { token: platformToken },
      );

      expect(ownerResponse.status).toBe(200);
    });
  });
});
