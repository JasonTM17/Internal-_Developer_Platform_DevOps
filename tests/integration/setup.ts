import { sign } from 'jsonwebtoken';

export interface TestAppConfig {
  databaseUrl: string;
  redisUrl?: string;
  natsUrl?: string;
  jwtSecret?: string;
  port?: number;
}

export interface RequestOptions {
  token?: string;
  skipAuth?: boolean;
  headers?: Record<string, string>;
}

export interface TestResponse {
  status: number;
  body: Record<string, unknown> & { items?: unknown[]; total?: number; limit?: number; offset?: number; errors?: string[]; error?: string };
  headers: Record<string, string>;
}

export interface TestApp {
  request(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<TestResponse>;
  close(): Promise<void>;
  resetDatabase(): Promise<void>;
  getBaseUrl(): string;
}

const DEFAULT_JWT_SECRET = 'test-secret-key-for-integration-tests';

export async function setupTestApp(config: TestAppConfig): Promise<TestApp> {
  const port = config.port ?? Math.floor(Math.random() * 10000) + 30000;
  const jwtSecret = config.jwtSecret ?? DEFAULT_JWT_SECRET;

  // Set environment variables for the app
  process.env.DATABASE_URL = config.databaseUrl;
  process.env.REDIS_URL = config.redisUrl ?? '';
  process.env.NATS_URL = config.natsUrl ?? '';
  process.env.JWT_SECRET = jwtSecret;
  process.env.PORT = String(port);
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';

  // Run database migrations
  await runMigrations(config.databaseUrl);

  const baseUrl = `http://localhost:${port}`;

  // Start the application server
  const server = await startServer(port);

  // Generate a default admin token for authenticated requests
  const defaultToken = sign(
    {
      sub: 'test-admin',
      role: 'admin',
      email: 'admin@test.com',
      teams: ['platform'],
    },
    jwtSecret,
    { expiresIn: '1h', issuer: 'https://auth.idp.example.com' },
  );

  return {
    async request(
      method: string,
      path: string,
      body?: unknown,
      options?: RequestOptions,
    ): Promise<TestResponse> {
      const url = `${baseUrl}${path}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Request-ID': `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ...options?.headers,
      };

      if (!options?.skipAuth) {
        const token = options?.token ?? defaultToken;
        headers['Authorization'] = `Bearer ${token}`;
      }

      const fetchOptions: RequestInit = {
        method,
        headers,
      };

      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody: Record<string, unknown> = {};
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseBody = (await response.json()) as Record<string, unknown>;
      }

      return {
        status: response.status,
        body: responseBody as TestResponse['body'],
        headers: responseHeaders,
      };
    },

    async close(): Promise<void> {
      if (server) {
        await server.close();
      }
    },

    async resetDatabase(): Promise<void> {
      await truncateAllTables(config.databaseUrl);
    },

    getBaseUrl(): string {
      return baseUrl;
    },
  };
}

async function runMigrations(databaseUrl: string): Promise<void> {
  // In a real implementation, this would run Prisma/Knex/TypeORM migrations
  // For testing, we create the schema directly
  const { Client } = await import('pg');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      owner VARCHAR(255) NOT NULL,
      repository VARCHAR(500),
      language VARCHAR(50),
      framework VARCHAR(50),
      tier VARCHAR(20) DEFAULT 'tier-3',
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS deployments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      service_name VARCHAR(255) NOT NULL,
      environment VARCHAR(50) NOT NULL,
      version VARCHAR(100) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      strategy VARCHAR(50) DEFAULT 'rolling',
      commit_sha VARCHAR(100),
      branch VARCHAR(255),
      triggered_by VARCHAR(255),
      rollback_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS environments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      cluster VARCHAR(255) NOT NULL,
      namespace VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'provisioning',
      config JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      UNIQUE(name, cluster)
    );

    CREATE INDEX IF NOT EXISTS idx_services_owner ON services(owner);
    CREATE INDEX IF NOT EXISTS idx_services_language ON services(language);
    CREATE INDEX IF NOT EXISTS idx_deployments_service ON deployments(service_name);
    CREATE INDEX IF NOT EXISTS idx_deployments_env ON deployments(environment);
    CREATE INDEX IF NOT EXISTS idx_environments_type ON environments(type);
  `);

  await client.end();
}

async function truncateAllTables(databaseUrl: string): Promise<void> {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  await client.query(`
    TRUNCATE TABLE services, deployments, environments CASCADE;
  `);

  await client.end();
}

async function startServer(port: number): Promise<{ close: () => Promise<void> }> {
  // This would import and start the actual application
  // For the test setup, we create a minimal mock server
  const { createServer } = await import('http');

  const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({
        close: () => new Promise<void>((res) => server.close(() => res())),
      });
    });
  });
}
