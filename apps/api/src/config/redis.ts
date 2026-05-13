/**
 * Redis Connection Configuration
 *
 * Redis client configuration for:
 * - Rate limiting token buckets
 * - Session caching
 * - Pub/Sub for real-time notifications
 * - Distributed locking for deployment coordination
 *
 * Supports Redis Sentinel and Cluster modes for high availability.
 */

import type { AppConfig } from './index';

/** Redis connection mode. */
export type RedisMode = 'standalone' | 'sentinel' | 'cluster';

/** Redis TLS configuration. */
export interface RedisTLSConfig {
  /** Whether TLS is enabled */
  enabled: boolean;
  /** Path to CA certificate */
  caCertPath?: string;
  /** Path to client certificate (for mTLS) */
  clientCertPath?: string;
  /** Path to client key (for mTLS) */
  clientKeyPath?: string;
  /** Whether to reject unauthorized certificates */
  rejectUnauthorized: boolean;
}

/** Redis Sentinel configuration. */
export interface RedisSentinelConfig {
  /** Sentinel master name */
  masterName: string;
  /** Sentinel node addresses */
  sentinels: Array<{ host: string; port: number }>;
  /** Sentinel password (if authentication is enabled) */
  sentinelPassword?: string;
}

/** Redis connection configuration. */
export interface RedisConfig {
  /** Connection mode */
  mode: RedisMode;
  /** Redis host (standalone mode) */
  host: string;
  /** Redis port (standalone mode) */
  port: number;
  /** Redis password */
  password?: string;
  /** Redis database index (0-15) */
  database: number;
  /** Key prefix for namespacing */
  keyPrefix: string;
  /** Connection timeout in milliseconds */
  connectTimeoutMs: number;
  /** Command timeout in milliseconds */
  commandTimeoutMs: number;
  /** Maximum number of retries for failed commands */
  maxRetries: number;
  /** Delay between retries in milliseconds */
  retryDelayMs: number;
  /** Maximum retry delay (for exponential backoff) */
  maxRetryDelayMs: number;
  /** Whether to enable offline queue (buffer commands when disconnected) */
  enableOfflineQueue: boolean;
  /** Whether to enable ready check on connection */
  enableReadyCheck: boolean;
  /** Keep-alive interval in milliseconds (0 = disabled) */
  keepAliveMs: number;
  /** TLS configuration */
  tls: RedisTLSConfig;
  /** Sentinel configuration (when mode is 'sentinel') */
  sentinel?: RedisSentinelConfig;
  /** Cluster nodes (when mode is 'cluster') */
  clusterNodes?: Array<{ host: string; port: number }>;
  /** Whether to use read replicas for read operations */
  readFromReplica: boolean;
  /** Connection name for CLIENT SETNAME (useful for monitoring) */
  connectionName: string;
}

/** Redis configuration validation error. */
export class RedisConfigError extends Error {
  constructor(
    public readonly field: string,
    public readonly reason: string,
  ) {
    super(`Redis configuration error: ${field} - ${reason}`);
    this.name = 'RedisConfigError';
  }
}

/**
 * Parse a comma-separated list of host:port pairs.
 */
function parseNodeList(raw: string): Array<{ host: string; port: number }> {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((node) => {
      const [host, portStr] = node.split(':');
      const port = parseInt(portStr || '6379', 10);
      if (!host || isNaN(port)) {
        throw new RedisConfigError('REDIS_NODES', `Invalid node format: '${node}'. Expected host:port`);
      }
      return { host, port };
    });
}

/**
 * Load Redis configuration from environment variables.
 * Validates all required fields and applies environment-appropriate defaults.
 */
export function loadRedisConfig(appConfig: AppConfig): RedisConfig {
  const isProduction = appConfig.env === 'production';

  const modeRaw = process.env.REDIS_MODE || 'standalone';
  const validModes: RedisMode[] = ['standalone', 'sentinel', 'cluster'];
  if (!validModes.includes(modeRaw as RedisMode)) {
    throw new RedisConfigError(
      'REDIS_MODE',
      `Invalid mode '${modeRaw}'. Must be one of: ${validModes.join(', ')}`,
    );
  }
  const mode = modeRaw as RedisMode;

  const database = parseInt(process.env.REDIS_DB || '0', 10);
  if (isNaN(database) || database < 0 || database > 15) {
    throw new RedisConfigError('REDIS_DB', 'Database index must be between 0 and 15');
  }

  const password = process.env.REDIS_PASSWORD || undefined;
  if (isProduction && !password) {
    throw new RedisConfigError('REDIS_PASSWORD', 'Redis password is required in production');
  }

  // Parse sentinel configuration
  let sentinel: RedisSentinelConfig | undefined;
  if (mode === 'sentinel') {
    const masterName = process.env.REDIS_SENTINEL_MASTER;
    const sentinelNodes = process.env.REDIS_SENTINEL_NODES;
    if (!masterName) {
      throw new RedisConfigError('REDIS_SENTINEL_MASTER', 'Sentinel master name is required in sentinel mode');
    }
    if (!sentinelNodes) {
      throw new RedisConfigError('REDIS_SENTINEL_NODES', 'Sentinel nodes are required in sentinel mode');
    }
    sentinel = {
      masterName,
      sentinels: parseNodeList(sentinelNodes),
      sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD || undefined,
    };
  }

  // Parse cluster nodes
  let clusterNodes: Array<{ host: string; port: number }> | undefined;
  if (mode === 'cluster') {
    const nodesRaw = process.env.REDIS_CLUSTER_NODES;
    if (!nodesRaw) {
      throw new RedisConfigError('REDIS_CLUSTER_NODES', 'Cluster nodes are required in cluster mode');
    }
    clusterNodes = parseNodeList(nodesRaw);
  }

  const config: RedisConfig = {
    mode,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password,
    database,
    keyPrefix: process.env.REDIS_KEY_PREFIX || `idp:${appConfig.env}:`,
    connectTimeoutMs: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '5000', 10),
    commandTimeoutMs: parseInt(process.env.REDIS_COMMAND_TIMEOUT_MS || '3000', 10),
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    retryDelayMs: parseInt(process.env.REDIS_RETRY_DELAY_MS || '200', 10),
    maxRetryDelayMs: parseInt(process.env.REDIS_MAX_RETRY_DELAY_MS || '5000', 10),
    enableOfflineQueue: process.env.REDIS_OFFLINE_QUEUE !== 'false',
    enableReadyCheck: process.env.REDIS_READY_CHECK !== 'false',
    keepAliveMs: parseInt(process.env.REDIS_KEEP_ALIVE_MS || (isProduction ? '30000' : '0'), 10),
    tls: {
      enabled: process.env.REDIS_TLS_ENABLED === 'true' || isProduction,
      caCertPath: process.env.REDIS_TLS_CA_CERT || undefined,
      clientCertPath: process.env.REDIS_TLS_CLIENT_CERT || undefined,
      clientKeyPath: process.env.REDIS_TLS_CLIENT_KEY || undefined,
      rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
    },
    sentinel,
    clusterNodes,
    readFromReplica: process.env.REDIS_READ_FROM_REPLICA === 'true',
    connectionName: `${appConfig.serviceName}-${appConfig.env}-${process.pid}`,
  };

  return config;
}

/**
 * Build a Redis connection URL from configuration (standalone mode only).
 */
export function buildRedisUrl(config: RedisConfig): string {
  const protocol = config.tls.enabled ? 'rediss' : 'redis';
  const auth = config.password
    ? `:${encodeURIComponent(config.password)}@`
    : '';
  return `${protocol}://${auth}${config.host}:${config.port}/${config.database}`;
}

/**
 * Get Redis health check command configuration.
 */
export function getRedisHealthCheck(): { command: string; expectedResponse: string } {
  return { command: 'PING', expectedResponse: 'PONG' };
}
