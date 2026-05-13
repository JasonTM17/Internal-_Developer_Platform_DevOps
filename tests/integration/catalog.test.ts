import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { setupTestApp, TestApp } from './setup';

describe('Catalog Integration Tests', () => {
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
      .withStartupTimeout(30_000)
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

  describe('POST /api/v1/catalog/services', () => {
    it('should create a new service in the catalog', async () => {
      const service = {
        name: 'payment-service',
        description: 'Handles payment processing',
        owner: 'payments-team',
        repository: 'https://github.com/org/payment-service',
        language: 'typescript',
        framework: 'nestjs',
        tier: 'tier-1',
      };

      const response = await app.request('POST', '/api/v1/catalog/services', service);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'payment-service',
        owner: 'payments-team',
        status: 'active',
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should reject duplicate service names', async () => {
      const service = {
        name: 'duplicate-service',
        description: 'First instance',
        owner: 'team-a',
        repository: 'https://github.com/org/dup-service',
      };

      await app.request('POST', '/api/v1/catalog/services', service);
      const response = await app.request('POST', '/api/v1/catalog/services', service);

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await app.request('POST', '/api/v1/catalog/services', {
        description: 'Missing name',
      });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/v1/catalog/services', () => {
    beforeEach(async () => {
      // Seed test data
      const services = [
        { name: 'api-gateway', owner: 'platform', language: 'go', tier: 'tier-1' },
        { name: 'user-service', owner: 'identity', language: 'typescript', tier: 'tier-1' },
        { name: 'notification-service', owner: 'platform', language: 'python', tier: 'tier-2' },
        { name: 'analytics-worker', owner: 'data', language: 'python', tier: 'tier-3' },
      ];

      for (const svc of services) {
        await app.request('POST', '/api/v1/catalog/services', {
          ...svc,
          description: `${svc.name} description`,
          repository: `https://github.com/org/${svc.name}`,
        });
      }
    });

    it('should list all services with pagination', async () => {
      const response = await app.request('GET', '/api/v1/catalog/services?limit=2&offset=0');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(2);
      expect(response.body.total).toBe(4);
      expect(response.body.limit).toBe(2);
      expect(response.body.offset).toBe(0);
    });

    it('should filter services by owner', async () => {
      const response = await app.request('GET', '/api/v1/catalog/services?owner=platform');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(2);
      expect(response.body.items.every((s: { owner: string }) => s.owner === 'platform')).toBe(true);
    });

    it('should filter services by language', async () => {
      const response = await app.request('GET', '/api/v1/catalog/services?language=python');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(2);
    });

    it('should search services by name', async () => {
      const response = await app.request('GET', '/api/v1/catalog/services?search=gateway');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].name).toBe('api-gateway');
    });
  });

  describe('PUT /api/v1/catalog/services/:id', () => {
    it('should update an existing service', async () => {
      const createResponse = await app.request('POST', '/api/v1/catalog/services', {
        name: 'update-test-service',
        description: 'Original description',
        owner: 'team-a',
        repository: 'https://github.com/org/update-test',
      });

      const serviceId = createResponse.body.id;
      const updateResponse = await app.request('PUT', `/api/v1/catalog/services/${serviceId}`, {
        description: 'Updated description',
        tier: 'tier-1',
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.description).toBe('Updated description');
      expect(updateResponse.body.tier).toBe('tier-1');
      expect(updateResponse.body.updatedAt).toBeDefined();
    });

    it('should return 404 for non-existent service', async () => {
      const response = await app.request('PUT', '/api/v1/catalog/services/non-existent-id', {
        description: 'Update',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/catalog/services/:id', () => {
    it('should soft-delete a service', async () => {
      const createResponse = await app.request('POST', '/api/v1/catalog/services', {
        name: 'delete-test-service',
        description: 'To be deleted',
        owner: 'team-a',
        repository: 'https://github.com/org/delete-test',
      });

      const serviceId = createResponse.body.id;
      const deleteResponse = await app.request('DELETE', `/api/v1/catalog/services/${serviceId}`);

      expect(deleteResponse.status).toBe(204);

      // Verify it's no longer listed
      const listResponse = await app.request('GET', '/api/v1/catalog/services');
      expect(listResponse.body.items.find((s: { id: string }) => s.id === serviceId)).toBeUndefined();
    });
  });
});
