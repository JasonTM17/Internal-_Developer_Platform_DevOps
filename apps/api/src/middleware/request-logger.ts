/**
 * Structured JSON Request Logger Middleware
 *
 * Produces structured JSON logs for every HTTP request with:
 * - Request/response timing (duration in ms)
 * - Correlation ID tracking (X-Request-ID)
 * - HTTP method, path, status code, content length
 * - Client IP and user agent
 * - Configurable body logging (disabled in production)
 * - Log level based on response status code
 * - Redaction of sensitive headers (Authorization, Cookie)
 */

import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

/** Log entry structure for request/response pairs. */
export interface RequestLogEntry {
  level: string;
  message: string;
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  query?: Record<string, unknown>;
  statusCode: number;
  durationMs: number;
  contentLength?: number;
  ip: string;
  userAgent?: string;
  userId?: string;
  requestBody?: unknown;
  responseSize?: number;
  error?: string;
}

/** Configuration for the request logger. */
export interface RequestLoggerOptions {
  /** Whether to log request bodies (disable in production) */
  logBody?: boolean;
  /** Maximum body size to log (in characters) */
  maxBodyLogSize?: number;
  /** Paths to exclude from logging (e.g., health checks) */
  excludePaths?: string[];
  /** Headers to redact from logs */
  redactHeaders?: string[];
  /** Custom log output function */
  output?: (entry: RequestLogEntry) => void;
  /** Whether to generate request IDs if not present */
  generateRequestId?: boolean;
  /** Whether to log query parameters */
  logQuery?: boolean;
}

/** Default headers to redact from logs. */
const DEFAULT_REDACT_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
];

/** Default paths to exclude from logging. */
const DEFAULT_EXCLUDE_PATHS = ['/health', '/ready', '/metrics'];

/**
 * Default log output function - writes structured JSON to stdout.
 */
function defaultOutput(entry: RequestLogEntry): void {
  const output = JSON.stringify(entry);
  if (entry.level === 'error') {
    process.stderr.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }
}

/**
 * Determine log level based on HTTP status code.
 */
function getLogLevel(statusCode: number): string {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

/**
 * Redact sensitive values from headers.
 */
function redactHeaders(
  headers: Record<string, unknown>,
  redactList: string[],
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (redactList.includes(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * Truncate a value for logging if it exceeds the maximum size.
 */
function truncateBody(body: unknown, maxSize: number): unknown {
  if (body === undefined || body === null) return undefined;
  const serialized = typeof body === 'string' ? body : JSON.stringify(body);
  if (serialized.length <= maxSize) return body;
  return `[truncated: ${serialized.length} chars, showing first ${maxSize}] ${serialized.slice(0, maxSize)}...`;
}

/**
 * Extract client IP address, respecting proxy headers when trusted.
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return first.trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Create the request logger middleware.
 *
 * Attaches a unique request ID to each request (via X-Request-ID header)
 * and logs structured JSON for every completed request.
 */
export function createRequestLogger(options: RequestLoggerOptions = {}) {
  const {
    logBody = false,
    maxBodyLogSize = 1024,
    excludePaths = DEFAULT_EXCLUDE_PATHS,
    redactHeaders: redactList = DEFAULT_REDACT_HEADERS,
    output = defaultOutput,
    generateRequestId = true,
    logQuery = true,
  } = options;

  return function requestLogger(req: Request, res: Response, next: NextFunction): void {
    // Skip excluded paths
    if (excludePaths.some((path) => req.path.startsWith(path))) {
      next();
      return;
    }

    // Generate or extract request ID
    const requestId = (req.headers['x-request-id'] as string) ||
      (generateRequestId ? randomUUID() : 'none');

    // Attach request ID to request and response
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Record start time
    const startTime = process.hrtime.bigint();

    // Capture response finish
    const originalEnd = res.end;
    let responseSize = 0;

    // Override res.end to capture response size
    res.end = function (this: Response, ...args: unknown[]): Response {
      const chunk = args[0];
      if (chunk) {
        if (typeof chunk === 'string') {
          responseSize = Buffer.byteLength(chunk);
        } else if (Buffer.isBuffer(chunk)) {
          responseSize = chunk.length;
        }
      }
      return originalEnd.apply(this, args as Parameters<typeof originalEnd>);
    } as typeof res.end;

    // Log on response finish
    res.on('finish', () => {
      const durationNs = process.hrtime.bigint() - startTime;
      const durationMs = Number(durationNs) / 1_000_000;

      const entry: RequestLogEntry = {
        level: getLogLevel(res.statusCode),
        message: `${req.method} ${req.path} ${res.statusCode} ${durationMs.toFixed(2)}ms`,
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
        responseSize,
      };

      // Add query parameters if configured
      if (logQuery && Object.keys(req.query).length > 0) {
        entry.query = req.query as Record<string, unknown>;
      }

      // Add request body if configured
      if (logBody && req.body && Object.keys(req.body).length > 0) {
        entry.requestBody = truncateBody(req.body, maxBodyLogSize);
      }

      // Add user ID if available (set by auth middleware)
      const userId = (req as Record<string, unknown>).userId as string | undefined;
      if (userId) {
        entry.userId = userId;
      }

      // Add content-length from response headers
      const contentLength = res.getHeader('content-length');
      if (contentLength) {
        entry.contentLength = parseInt(String(contentLength), 10);
      }

      output(entry);
    });

    next();
  };
}

/**
 * Get the request ID from the current request.
 * Useful for passing correlation IDs to downstream services.
 */
export function getRequestId(req: Request): string {
  return (req.headers['x-request-id'] as string) || 'unknown';
}
