import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { setupTestApp, TestApp } from './setup';

describe('Environment Integration Tests', () => {
  let app: TestApp;
  let postgresContainer: StartedTestContainer;

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
    app = await setupTestApp({ databaseUrl: dbUrl });
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await postgresContainer?.stop();
  });

  beforeEach(async () => {
    await app.resetDatabase();
  });

  describe('POST /api/v1/environments', () => {
    it('should create a new environment', async () => {
      const env = {
        name: 'staging-us-east',
        type: 'staging',
        cluster: 'idp-primary',
        namespace: 'idp-staging',
        config: {
          replicas: 2,
          autoscaling: { enabled: true, minReplicas: 2, maxReplicas: 5 },
          resources: { cpu: '500m', memory: '512Mi' },
        },
      };

      const response = await app.request('POST', '/api/v1/environments', env);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'staging-us-east',
        type: 'staging',
        status: 'provisioning',
      });
      expect(response.body.id).toBeDefined();
    });

    it('should enforce naming conventions', async () => {
      const response = await app.request('POST', '/api/v1/environments', {
        name: 'Invalid Name With Spaces',
        type: 'development',
        cluster: 'idp-primary',
        namespace: 'test',
      });

      expect(response.status).toBe(400);
      expect(response.body.errors[0]).toContain('name');
    });

    it('should reject invalid environment types', async () => {
      const response = await app.request('POST', '/api/v1/environments', {
        name: 'test-env',
        type: 'invalid-type',
        cluster: 'idp-primary',
        namespace: 'test',
      });

      expect(response.status).toBe(400);
    });

    it('should prevent duplicate environment names within a cluster', async () => {
      const env = {
        name: 'unique-env',
        type: 'development',
        cluster: 'idp-primary',
        namespace: 'unique-ns',
      };

      await app.request('POST', '/api/v1/environments', env);
      const response = await app.request('POST', '/api/v1/environments', env);

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/v1/environments', () => {
    beforeEach(async () => {
      const environments = [
        { name: 'dev-1', type: 'development', cluster: 'idp-primary', namespace: 'dev-1' },
        { name: 'dev-2', type: 'development', cluster: 'idp-primary', namespace: 'dev-2' },
        { name: 'staging', type: 'staging', cluster: 'idp-primary', namespace: 'staging' },
        { name: 'production', type: 'production', cluster: 'idp-primary', namespace: 'production' },
      ];

      for (const env of environments) {
        await app.request('POST', '/api/v1/environments', env);
      }
    });

    it('should list all environments', async () => {
      const response = await app.request('GET', '/api/v1/environments');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(4);
    });

    it('should filter by type', async () => {
      const response = await app.request('GET', '/api/v1/environments?type=development');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(2);
    });

    it('should filter by cluster', async () => {
      const response = await app.request('GET', '/api/v1/environments?cluster=idp-primary');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(4);
    });
  });

  describe('PATCH /api/v1/environments/:id/scale', () => {
    it('should scale environment replicas', async () => {
      const createResponse = await app.request('POST', '/api/v1/environments', {
        name: 'scale-test',
        type: 'staging',
        cluster: 'idp-primary',
        namespace: 'scale-test',
        config: { replicas: 2 },
      });

      const envId = createResponse.body.id;
      const scaleResponse = await app.request('PATCH', `/api/v1/environments/${envId}/scale`, {
        replicas: 5,
        reason: 'Load testing preparation',
      });

      expect(scaleResponse.status).toBe(200);
      expect(scaleResponse.body.config.replicas).toBe(5);
    });

    it('should reject scaling production without approval', async () => {
      const createResponse = await app.request('POST', '/api/v1/environments', {
        name: 'prod-scale-test',
        type: 'production',
        cluster: 'idp-primary',
        namespace: 'prod-scale',
        config: { replicas: 3 },
      });

      const envId = createResponse.body.id;
      const response = await app.request('PATCH', `/api/v1/environments/${envId}/scale`, {
        replicas: 10,
      });

      // Production scaling requires explicit approval
      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/environments/:id', () => {
    it('should delete a development environment', async () => {
      const createResponse = await app.request('POST', '/api/v1/environments', {
        name: 'delete-test',
        type: 'development',
        cluster: 'idp-primary',
        namespace: 'delete-test',
      });

      const envId = createResponse.body.id;
      const deleteResponse = await app.request('DELETE', `/api/v1/environments/${envId}`);

      expect(deleteResponse.status).toBe(204);
    });

    it('should prevent deletion of production environments', async () => {
      const createResponse = await app.request('POST', '/api/v1/environments', {
        name: 'prod-nodelete',
        type: 'production',
        cluster: 'idp-primary',
        namespace: 'prod-nodelete',
      });

      const envId = createResponse.body.id;
      const response = await app.request('DELETE', `/api/v1/environments/${envId}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('production');
    });
  });
});
