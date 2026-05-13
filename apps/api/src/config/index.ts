/**
 * Application Configuration
 *
 * Centralized configuration management with environment variable validation.
 * Uses a typed configuration object with sensible defaults and required field enforcement.
 * All configuration is validated at startup to fail fast on misconfiguration.
 */

/** Application environment type. */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/** Log level options. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Complete application configuration interface. */
export interface AppConfig {
  /** Application environment */
  env: Environment;
  /** Server port */
  port: number;
  /** Server host binding */
  host: string;
  /** Application name for logging/metrics */
  serviceName: string;
  /** Application version from package.json or env */
  version: string;
  /** Log level */
  logLevel: LogLevel;
  /** Whether to enable request body logging (disable in production) */
  logRequestBody: boolean;
  /** Base URL for the API */
  baseUrl: string;
  /** Allowed CORS origins */
  corsOrigins: string[];
  /** JWT secret for token verification */
  jwtSecret: string;
  /** JWT issuer */
  jwtIssuer: string;
  /** JWT audience */
  jwtAudience: string;
  /** Token expiration in seconds */
  tokenExpirationSeconds: number;
  /** Rate limit: max requests per window */
  rateLimitMax: number;
  /** Rate limit: window size in milliseconds */
  rateLimitWindowMs: number;
  /** Whether to trust proxy headers (X-Forwarded-For) */
  trustProxy: boolean;
  /** Graceful shutdown timeout in milliseconds */
  shutdownTimeoutMs: number;
  /** Request timeout in milliseconds */
  requestTimeoutMs: number;
  /** Maximum request body size */
  maxBodySize: string;
}

/** Configuration validation error. */
export class ConfigValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly reason: string,
  ) {
    super(`Configuration error: ${field} - ${reason}`);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Parse and validate an environment variable as a required string.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new ConfigValidationError(key, `Required environment variable '${key}' is not set`);
  }
  return value.trim();
}

/**
 * Parse an environment variable as an optional string with a default.
 */
function optionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : defaultValue;
}

/**
 * Parse an environment variable as an integer with validation.
 */
function intEnv(key: string, defaultValue: number, min?: number, max?: number): number {
  const raw = process.env[key];
  if (!raw || raw.trim() === '') return defaultValue;

  const parsed = parseInt(raw.trim(), 10);
  if (isNaN(parsed)) {
    throw new ConfigValidationError(key, `Expected integer value, got '${raw}'`);
  }
  if (min !== undefined && parsed < min) {
    throw new ConfigValidationError(key, `Value ${parsed} is below minimum ${min}`);
  }
  if (max !== undefined && parsed > max) {
    throw new ConfigValidationError(key, `Value ${parsed} exceeds maximum ${max}`);
  }
  return parsed;
}

/**
 * Parse an environment variable as a boolean.
 */
function boolEnv(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (!raw || raw.trim() === '') return defaultValue;
  return ['true', '1', 'yes'].includes(raw.trim().toLowerCase());
}

/**
 * Validate the environment string is a known environment.
 */
function validateEnvironment(value: string): Environment {
  const valid: Environment[] = ['development', 'staging', 'production', 'test'];
  if (!valid.includes(value as Environment)) {
    throw new ConfigValidationError(
      'NODE_ENV',
      `Invalid environment '${value}'. Must be one of: ${valid.join(', ')}`,
    );
  }
  return value as Environment;
}

/**
 * Validate the log level string.
 */
function validateLogLevel(value: string): LogLevel {
  const valid: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  if (!valid.includes(value as LogLevel)) {
    throw new ConfigValidationError(
      'LOG_LEVEL',
      `Invalid log level '${value}'. Must be one of: ${valid.join(', ')}`,
    );
  }
  return value as LogLevel;
}

/**
 * Load and validate the complete application configuration.
 * Throws ConfigValidationError if any required field is missing or invalid.
 */
export function loadConfig(): AppConfig {
  const env = validateEnvironment(optionalEnv('NODE_ENV', 'development'));
  const isProduction = env === 'production';

  // In production, JWT_SECRET is required
  const jwtSecret = isProduction
    ? requireEnv('JWT_SECRET')
    : optionalEnv('JWT_SECRET', 'dev-secret-do-not-use-in-production');

  const config: AppConfig = {
    env,
    port: intEnv('PORT', 3001, 1, 65535),
    host: optionalEnv('HOST', '0.0.0.0'),
    serviceName: optionalEnv('SERVICE_NAME', 'idp-api'),
    version: optionalEnv('APP_VERSION', '0.0.0-dev'),
    logLevel: validateLogLevel(optionalEnv('LOG_LEVEL', isProduction ? 'info' : 'debug')),
    logRequestBody: boolEnv('LOG_REQUEST_BODY', !isProduction),
    baseUrl: optionalEnv('BASE_URL', `http://localhost:${intEnv('PORT', 3001, 1, 65535)}`),
    corsOrigins: optionalEnv('CORS_ORIGINS', 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    jwtSecret,
    jwtIssuer: optionalEnv('JWT_ISSUER', 'idp-platform'),
    jwtAudience: optionalEnv('JWT_AUDIENCE', 'idp-api'),
    tokenExpirationSeconds: intEnv('TOKEN_EXPIRATION_SECONDS', 3600, 60, 86400),
    rateLimitMax: intEnv('RATE_LIMIT_MAX', isProduction ? 100 : 1000, 1, 100000),
    rateLimitWindowMs: intEnv('RATE_LIMIT_WINDOW_MS', 60000, 1000, 3600000),
    trustProxy: boolEnv('TRUST_PROXY', isProduction),
    shutdownTimeoutMs: intEnv('SHUTDOWN_TIMEOUT_MS', 30000, 1000, 120000),
    requestTimeoutMs: intEnv('REQUEST_TIMEOUT_MS', 30000, 1000, 300000),
    maxBodySize: optionalEnv('MAX_BODY_SIZE', '1mb'),
  };

  return config;
}

/** Singleton configuration instance. */
let _config: AppConfig | null = null;

/**
 * Get the application configuration (singleton).
 * Loads and validates on first call, returns cached instance thereafter.
 */
export function getConfig(): AppConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

/**
 * Reset the configuration singleton (for testing).
 */
export function resetConfig(): void {
  _config = null;
}
