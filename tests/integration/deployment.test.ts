import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { GenericContainer, StartedTestContainer, Network } from 'testcontainers';
import { setupTestApp, TestApp } from './setup';

describe('Deployment Integration Tests', () => {
  let app: TestApp;
  let postgresContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;
  let network: Network;

  beforeAll(async () => {
    network = await new Network().start();

    postgresContainer = await new GenericContainer('postgres:15-alpine')
      .withNetwork(network)
      .withNetworkAliases('postgres')
      .withEnvironment({
        POSTGRES_DB: 'idp_test',
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
      })
      .withExposedPorts(5432)
      .start();

    redisContainer = await new GenericContainer('redis:7-alpine')
      .withNetwork(network)
      .withNetworkAliases('redis')
      .withExposedPorts(6379)
      .start();

    const dbUrl = `postgresql://test:test@${postgresContainer.getHost()}:${postgresContainer.getMappedPort(5432)}/idp_test`;
    const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;

    app = await setupTestApp({ databaseUrl: dbUrl, redisUrl });
  }, 90_000);

  afterAll(async () => {
    await app?.close();
    await redisContainer?.stop();
    await postgresContainer?.stop();
    await network?.stop();
  });

  beforeEach(async () => {
    await app.resetDatabase();
  });

  describe('POST /api/v1/deployments', () => {
    it('should create a new deployment', async () => {
      // First create a service and environment
      await app.request('POST', '/api/v1/catalog/services', {
        name: 'deploy-test-service',
        description: 'Test service',
        owner: 'platform',
        repository: 'https://github.com/org/deploy-test',
      });

      const deployment = {
        serviceName: 'deploy-test-service',
        environment: 'staging',
        version: '1.2.3',
        strategy: 'canary',
        commitSha: 'abc123def456',
        branch: 'main',
      };

      const response = await app.request('POST', '/api/v1/deployments', deployment);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        serviceName: 'deploy-test-service',
        environment: 'staging',
        version: '1.2.3',
        status: 'pending',
        strategy: 'canary',
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should reject deployment to non-existent service', async () => {
      const response = await app.request('POST', '/api/v1/deployments', {
        serviceName: 'non-existent-service',
        environment: 'staging',
        version: '1.0.0',
        strategy: 'rolling',
        commitSha: 'abc123',
        branch: 'main',
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Service not found');
    });

    it('should prevent concurrent deployments to same environment', async () => {
      await app.request('POST', '/api/v1/catalog/services', {
        name: 'concurrent-test',
        description: 'Test',
        owner: 'platform',
        repository: 'https://github.com/org/concurrent',
      });

      // First deployment
      await app.request('POST', '/api/v1/deployments', {
        serviceName: 'concurrent-test',
        environment: 'production',
        version: '1.0.0',
        strategy: 'canary',
        commitSha: 'abc123',
        branch: 'main',
      });

      // Second concurrent deployment should be rejected
      const response = await app.request('POST', '/api/v1/deployments', {
        serviceName: 'concurrent-test',
        environment: 'production',
        version: '1.1.0',
        strategy: 'canary',
        commitSha: 'def456',
        branch: 'main',
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('in progress');
    });
  });

  describe('GET /api/v1/deployments', () => {
    beforeEach(async () => {
      await app.request('POST', '/api/v1/catalog/services', {
        name: 'list-deploy-svc',
        description: 'Test',
        owner: 'platform',
        repository: 'https://github.com/org/list-deploy',
      });

      // Create multiple deployments
      for (let i = 1; i <= 5; i++) {
        await app.request('POST', '/api/v1/deployments', {
          serviceName: 'list-deploy-svc',
          environment: i <= 3 ? 'staging' : 'production',
          version: `1.0.${i}`,
          strategy: 'rolling',
          commitSha: `sha${i}`,
          branch: 'main',
        });
      }
    });

    it('should list deployments with pagination', async () => {
      const response = await app.request('GET', '/api/v1/deployments?limit=3');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(3);
      expect(response.body.total).toBe(5);
    });

    it('should filter deployments by environment', async () => {
      const response = await app.request('GET', '/api/v1/deployments?environment=production');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(2);
      expect(response.body.items.every((d: { environment: string }) => d.environment === 'production')).toBe(true);
    });

    it('should filter deployments by service', async () => {
      const response = await app.request('GET', '/api/v1/deployments?serviceName=list-deploy-svc');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(5);
    });
  });

  describe('POST /api/v1/deployments/:id/rollback', () => {
    it('should rollback a completed deployment', async () => {
      await app.request('POST', '/api/v1/catalog/services', {
        name: 'rollback-svc',
        description: 'Test',
        owner: 'platform',
        repository: 'https://github.com/org/rollback',
      });

      const deployResponse = await app.request('POST', '/api/v1/deployments', {
        serviceName: 'rollback-svc',
        environment: 'staging',
        version: '2.0.0',
        strategy: 'rolling',
        commitSha: 'abc123',
        branch: 'main',
      });

      // Simulate completion
      await app.request('PATCH', `/api/v1/deployments/${deployResponse.body.id}`, {
        status: 'completed',
      });

      const rollbackResponse = await app.request(
        'POST',
        `/api/v1/deployments/${deployResponse.body.id}/rollback`,
        { reason: 'Performance regression detected' },
      );

      expect(rollbackResponse.status).toBe(200);
      expect(rollbackResponse.body.status).toBe('rolling_back');
      expect(rollbackResponse.body.rollbackReason).toBe('Performance regression detected');
    });
  });
});
