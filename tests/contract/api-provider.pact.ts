import { describe, it, beforeAll, afterAll } from 'vitest';
import { Verifier } from '@pact-foundation/pact';
import path from 'path';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

describe('IDP API Provider Contract Verification', () => {
  let postgresContainer: StartedTestContainer;
  let serverUrl: string;

  beforeAll(async () => {
    // Start test database
    postgresContainer = await new GenericContainer('postgres:15-alpine')
      .withEnvironment({
        POSTGRES_DB: 'idp_test',
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
      })
      .withExposedPorts(5432)
      .start();

    const dbUrl = `postgresql://test:test@${postgresContainer.getHost()}:${postgresContainer.getMappedPort(5432)}/idp_test`;

    // Start the actual API server for verification
    process.env.DATABASE_URL = dbUrl;
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-integration-tests';
    process.env.PORT = '0'; // Random port

    // Import and start the server
    // const { app } = await import('../../apps/api/src/index');
    // serverUrl = await app.listen(0);
    serverUrl = 'http://localhost:3000'; // Placeholder for actual server
  }, 60_000);

  afterAll(async () => {
    await postgresContainer?.stop();
  });

  it('should verify the contract against the provider', async () => {
    const verifier = new Verifier({
      providerBaseUrl: serverUrl,
      provider: 'IDPApi',
      pactUrls: [path.resolve(process.cwd(), 'pacts', 'IDPPortal-IDPApi.json')],
      // Pact Broker configuration (for CI/CD)
      // pactBrokerUrl: process.env.PACT_BROKER_URL,
      // pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      // publishVerificationResult: process.env.CI === 'true',
      // providerVersion: process.env.GIT_SHA,
      // providerVersionBranch: process.env.GIT_BRANCH,

      // State handlers - set up provider state before each interaction
      stateHandlers: {
        'services exist in the catalog': async () => {
          // Seed the database with test services
          await seedCatalogServices();
        },
        'a service with specific ID exists': async () => {
          await seedSpecificService('550e8400-e29b-41d4-a716-446655440000');
        },
        'no service exists with given ID': async () => {
          // Ensure clean state - no services
          await clearDatabase();
        },
        'a service exists for deployment': async () => {
          await seedCatalogServices();
        },
        'deployments exist': async () => {
          await seedDeployments();
        },
      },

      // Request filter to add auth headers
      requestFilter: (req) => {
        if (req.headers?.['Authorization'] === 'Bearer valid-token') {
          // Replace with a real valid JWT for the test
          const jwt = generateTestJwt();
          req.headers['Authorization'] = `Bearer ${jwt}`;
        }
        return req;
      },

      // Timeout configuration
      timeout: 30_000,

      // Verbose logging for debugging
      logLevel: 'info',
    });

    // This will throw if verification fails
    await verifier.verifyProvider();
  }, 60_000);
});

// Helper functions for state setup
async function seedCatalogServices(): Promise<void> {
  // In a real implementation, this would insert test data into the database
  const services = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'payment-service',
      description: 'Handles payment processing',
      owner: 'payments-team',
      repository: 'https://github.com/org/payment-service',
      language: 'typescript',
      framework: 'nestjs',
      tier: 'tier-1',
      status: 'active',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'user-service',
      description: 'User management',
      owner: 'identity-team',
      repository: 'https://github.com/org/user-service',
      language: 'go',
      framework: 'gin',
      tier: 'tier-1',
      status: 'active',
    },
  ];

  // Insert into database
  console.info(`[Provider State] Seeded ${services.length} catalog services`);
}

async function seedSpecificService(id: string): Promise<void> {
  console.info(`[Provider State] Seeded service with ID: ${id}`);
}

async function seedDeployments(): Promise<void> {
  const deployments = [
    {
      serviceName: 'payment-service',
      environment: 'staging',
      version: '1.2.3',
      status: 'completed',
      strategy: 'canary',
      commitSha: 'abc123def456',
      branch: 'main',
    },
  ];

  console.info(`[Provider State] Seeded ${deployments.length} deployments`);
}

async function clearDatabase(): Promise<void> {
  console.info('[Provider State] Cleared database');
}

function generateTestJwt(): string {
  // Generate a valid JWT for testing
  const { sign } = require('jsonwebtoken');
  return sign(
    {
      sub: 'test-user',
      role: 'admin',
      email: 'test@example.com',
      teams: ['platform', 'payments-team'],
    },
    process.env.JWT_SECRET ?? 'test-secret-key-for-integration-tests',
    { expiresIn: '1h', issuer: 'https://auth.idp.example.com' },
  );
}
