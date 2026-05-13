/**
 * Database Connection Configuration
 *
 * PostgreSQL connection pool configuration with support for:
 * - Connection pooling with configurable pool sizes
 * - SSL/TLS connections for production environments
 * - Connection timeouts and idle management
 * - Health check queries for readiness probes
 * - Automatic reconnection with exponential backoff
 */

import type { AppConfig } from './index';

/** SSL mode options for PostgreSQL connections. */
export type SSLMode = 'disable' | 'require' | 'verify-ca' | 'verify-full';

/** Database connection configuration. */
export interface DatabaseConfig {
  /** PostgreSQL connection host */
  host: string;
  /** PostgreSQL connection port */
  port: number;
  /** Database name */
  database: string;
  /** Database user */
  user: string;
  /** Database password */
  password: string;
  /** SSL mode for the connection */
  sslMode: SSLMode;
  /** Path to CA certificate for SSL verification */
  sslCaCert?: string;
  /** Minimum number of connections in the pool */
  poolMin: number;
  /** Maximum number of connections in the pool */
  poolMax: number;
  /** Connection acquisition timeout in milliseconds */
  acquireTimeoutMs: number;
  /** Idle connection timeout in milliseconds */
  idleTimeoutMs: number;
  /** Connection creation timeout in milliseconds */
  createTimeoutMs: number;
  /** Maximum connection lifetime in milliseconds (for rotation) */
  maxLifetimeMs: number;
  /** Statement timeout in milliseconds (0 = no limit) */
  statementTimeoutMs: number;
  /** Whether to log queries (development only) */
  logQueries: boolean;
  /** Schema to use for migrations and queries */
  schema: string;
  /** Application name sent to PostgreSQL for monitoring */
  applicationName: string;
}

/** Database configuration validation error. */
export class DatabaseConfigError extends Error {
  constructor(
    public readonly field: string,
    public readonly reason: string,
  ) {
    super(`Database configuration error: ${field} - ${reason}`);
    this.name = 'DatabaseConfigError';
  }
}

/**
 * Load database configuration from environment variables.
 * Validates all required fields and applies environment-appropriate defaults.
 */
export function loadDatabaseConfig(appConfig: AppConfig): DatabaseConfig {
  const isProduction = appConfig.env === 'production';
  const isTest = appConfig.env === 'test';

  const host = process.env.DB_HOST || (isTest ? 'localhost' : 'localhost');
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_NAME || (isTest ? 'idp_test' : 'idp');
  const user = process.env.DB_USER || 'idp';
  const password = process.env.DB_PASSWORD || '';

  if (isProduction && !process.env.DB_PASSWORD) {
    throw new DatabaseConfigError('DB_PASSWORD', 'Database password is required in production');
  }

  if (isNaN(port) || port < 1 || port > 65535) {
    throw new DatabaseConfigError('DB_PORT', `Invalid port number: ${process.env.DB_PORT}`);
  }

  const sslModeRaw = process.env.DB_SSL_MODE || (isProduction ? 'verify-full' : 'disable');
  const validSSLModes: SSLMode[] = ['disable', 'require', 'verify-ca', 'verify-full'];
  if (!validSSLModes.includes(sslModeRaw as SSLMode)) {
    throw new DatabaseConfigError(
      'DB_SSL_MODE',
      `Invalid SSL mode '${sslModeRaw}'. Must be one of: ${validSSLModes.join(', ')}`,
    );
  }

  const poolMax = parseInt(process.env.DB_POOL_MAX || (isProduction ? '20' : '5'), 10);
  const poolMin = parseInt(process.env.DB_POOL_MIN || (isProduction ? '5' : '1'), 10);

  if (poolMin > poolMax) {
    throw new DatabaseConfigError(
      'DB_POOL_MIN',
      `Pool minimum (${poolMin}) cannot exceed pool maximum (${poolMax})`,
    );
  }

  const config: DatabaseConfig = {
    host,
    port,
    database,
    user,
    password,
    sslMode: sslModeRaw as SSLMode,
    sslCaCert: process.env.DB_SSL_CA_CERT || undefined,
    poolMin,
    poolMax,
    acquireTimeoutMs: parseInt(process.env.DB_ACQUIRE_TIMEOUT_MS || '10000', 10),
    idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
    createTimeoutMs: parseInt(process.env.DB_CREATE_TIMEOUT_MS || '5000', 10),
    maxLifetimeMs: parseInt(process.env.DB_MAX_LIFETIME_MS || '1800000', 10), // 30 minutes
    statementTimeoutMs: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000', 10),
    logQueries: !isProduction && (process.env.DB_LOG_QUERIES === 'true'),
    schema: process.env.DB_SCHEMA || 'public',
    applicationName: `${appConfig.serviceName}-${appConfig.env}`,
  };

  return config;
}

/**
 * Build a PostgreSQL connection string from the database configuration.
 * Useful for tools that accept a connection URL (e.g., migration runners).
 */
export function buildConnectionString(config: DatabaseConfig): string {
  const auth = config.password
    ? `${encodeURIComponent(config.user)}:${encodeURIComponent(config.password)}`
    : encodeURIComponent(config.user);

  const params = new URLSearchParams();
  params.set('schema', config.schema);
  params.set('application_name', config.applicationName);
  params.set('connect_timeout', String(Math.ceil(config.createTimeoutMs / 1000)));

  if (config.sslMode !== 'disable') {
    params.set('sslmode', config.sslMode);
    if (config.sslCaCert) {
      params.set('sslrootcert', config.sslCaCert);
    }
  }

  return `postgresql://${auth}@${config.host}:${config.port}/${config.database}?${params.toString()}`;
}

/**
 * Get the health check query for database readiness probes.
 */
export function getHealthCheckQuery(): string {
  return 'SELECT 1 AS health_check';
}

/**
 * Calculate connection pool settings based on available resources.
 * Useful for auto-tuning in containerized environments.
 */
export function calculatePoolSize(options: {
  availableMemoryMb: number;
  cpuCores: number;
  maxConnectionsPerCore?: number;
}): { min: number; max: number } {
  const connectionsPerCore = options.maxConnectionsPerCore || 4;
  const max = Math.min(
    options.cpuCores * connectionsPerCore,
    Math.floor(options.availableMemoryMb / 50), // ~50MB per connection overhead estimate
    100, // Hard upper limit
  );
  const min = Math.max(1, Math.floor(max / 4));

  return { min, max };
}
