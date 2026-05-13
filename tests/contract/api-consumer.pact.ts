import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';

const { like, eachLike, string, integer, timestamp, uuid } = MatchersV3;

const provider = new PactV3({
  consumer: 'IDPPortal',
  provider: 'IDPApi',
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'warn',
});

describe('IDP API Consumer Contract Tests (Portal → API)', () => {
  describe('Catalog Service', () => {
    it('should return a list of services', async () => {
      provider
        .given('services exist in the catalog')
        .uponReceiving('a request to list catalog services')
        .withRequest({
          method: 'GET',
          path: '/api/v1/catalog/services',
          headers: {
            Authorization: 'Bearer valid-token',
            Accept: 'application/json',
          },
          query: { limit: '10', offset: '0' },
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            items: eachLike({
              id: uuid(),
              name: string('payment-service'),
              description: string('Handles payment processing'),
              owner: string('payments-team'),
              repository: string('https://github.com/org/payment-service'),
              language: string('typescript'),
              framework: string('nestjs'),
              tier: string('tier-1'),
              status: string('active'),
              createdAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSXXX"),
              updatedAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSXXX"),
            }),
            total: integer(1),
            limit: integer(10),
            offset: integer(0),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/api/v1/catalog/services?limit=10&offset=0`,
          {
            headers: {
              Authorization: 'Bearer valid-token',
              Accept: 'application/json',
            },
          },
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.items).toBeDefined();
        expect(body.items.length).toBeGreaterThan(0);
        expect(body.items[0].id).toBeDefined();
        expect(body.items[0].name).toBeDefined();
        expect(body.total).toBeGreaterThanOrEqual(1);
      });
    });

    it('should return a single service by ID', async () => {
      const serviceId = '550e8400-e29b-41d4-a716-446655440000';

      provider
        .given('a service with specific ID exists')
        .uponReceiving('a request to get a specific service')
        .withRequest({
          method: 'GET',
          path: `/api/v1/catalog/services/${serviceId}`,
          headers: {
            Authorization: 'Bearer valid-token',
            Accept: 'application/json',
          },
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            id: uuid(serviceId),
            name: string('payment-service'),
            description: string('Handles payment processing'),
            owner: string('payments-team'),
            repository: string('https://github.com/org/payment-service'),
            language: string('typescript'),
            framework: string('nestjs'),
            tier: string('tier-1'),
            status: string('active'),
            dependencies: eachLike(string('user-service')),
            createdAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSXXX"),
            updatedAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSXXX"),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/api/v1/catalog/services/${serviceId}`,
          {
            headers: {
              Authorization: 'Bearer valid-token',
              Accept: 'application/json',
            },
          },
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.id).toBe(serviceId);
      });
    });

    it('should return 404 for non-existent service', async () => {
      provider
        .given('no service exists with given ID')
        .uponReceiving('a request for a non-existent service')
        .withRequest({
          method: 'GET',
          path: '/api/v1/catalog/services/non-existent-id',
          headers: {
            Authorization: 'Bearer valid-token',
          },
        })
        .willRespondWith({
          status: 404,
          headers: { 'Content-Type': 'application/json' },
          body: {
            error: string('Service not found'),
            statusCode: integer(404),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/api/v1/catalog/services/non-existent-id`,
          {
            headers: { Authorization: 'Bearer valid-token' },
          },
        );

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Deployments', () => {
    it('should create a new deployment', async () => {
      provider
        .given('a service exists for deployment')
        .uponReceiving('a request to create a deployment')
        .withRequest({
          method: 'POST',
          path: '/api/v1/deployments',
          headers: {
            Authorization: 'Bearer valid-token',
            'Content-Type': 'application/json',
          },
          body: {
            serviceName: 'payment-service',
            environment: 'staging',
            version: '1.2.3',
            strategy: 'canary',
            commitSha: 'abc123def456',
            branch: 'main',
          },
        })
        .willRespondWith({
          status: 201,
          headers: { 'Content-Type': 'application/json' },
          body: {
            id: uuid(),
            serviceName: string('payment-service'),
            environment: string('staging'),
            version: string('1.2.3'),
            status: string('pending'),
            strategy: string('canary'),
            commitSha: string('abc123def456'),
            branch: string('main'),
            createdAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSXXX"),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/v1/deployments`, {
          method: 'POST',
          headers: {
            Authorization: 'Bearer valid-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serviceName: 'payment-service',
            environment: 'staging',
            version: '1.2.3',
            strategy: 'canary',
            commitSha: 'abc123def456',
            branch: 'main',
          }),
        });

        expect(response.status).toBe(201);
        const body = await response.json();
        expect(body.id).toBeDefined();
        expect(body.status).toBe('pending');
      });
    });

    it('should list recent deployments', async () => {
      provider
        .given('deployments exist')
        .uponReceiving('a request to list deployments')
        .withRequest({
          method: 'GET',
          path: '/api/v1/deployments',
          headers: { Authorization: 'Bearer valid-token' },
          query: { limit: '5', environment: 'staging' },
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            items: eachLike({
              id: uuid(),
              serviceName: string('payment-service'),
              environment: string('staging'),
              version: string('1.2.3'),
              status: string('completed'),
              createdAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSXXX"),
            }),
            total: integer(1),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/api/v1/deployments?limit=5&environment=staging`,
          { headers: { Authorization: 'Bearer valid-token' } },
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.items).toBeDefined();
      });
    });
  });
});
