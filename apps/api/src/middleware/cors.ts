/**
 * CORS Configuration Middleware
 *
 * Cross-Origin Resource Sharing configuration with:
 * - Environment-specific origin allowlists
 * - Preflight request caching
 * - Credential support for authenticated requests
 * - Configurable exposed headers for client access
 * - Wildcard subdomain matching for preview environments
 */

import type { Request, Response, NextFunction } from 'express';

/** CORS configuration options. */
export interface CorsOptions {
  /** Allowed origins (exact match or regex patterns) */
  allowedOrigins: (string | RegExp)[];
  /** Allowed HTTP methods */
  allowedMethods: string[];
  /** Allowed request headers */
  allowedHeaders: string[];
  /** Headers exposed to the client */
  exposedHeaders: string[];
  /** Whether to allow credentials (cookies, auth headers) */
  credentials: boolean;
  /** Preflight cache duration in seconds */
  maxAge: number;
  /** Whether to pass preflight to the next handler */
  preflightContinue: boolean;
  /** Success status code for OPTIONS requests */
  optionsSuccessStatus: number;
}

/** Default CORS configuration. */
const DEFAULT_CORS_OPTIONS: CorsOptions = {
  allowedOrigins: [],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-Correlation-ID',
    'X-API-Key',
    'Accept',
    'Accept-Language',
    'Cache-Control',
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Total-Count',
    'X-Page-Count',
    'Link',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

/**
 * Check if an origin is allowed based on the configured allowlist.
 * Supports exact string matching and regex patterns.
 */
function isOriginAllowed(origin: string, allowedOrigins: (string | RegExp)[]): boolean {
  for (const allowed of allowedOrigins) {
    if (typeof allowed === 'string') {
      if (allowed === '*' || allowed === origin) return true;
    } else if (allowed instanceof RegExp) {
      if (allowed.test(origin)) return true;
    }
  }
  return false;
}

/**
 * Build CORS options from environment configuration.
 * Parses comma-separated origin lists and supports wildcard patterns.
 */
export function buildCorsOptions(options: {
  origins: string[];
  env: string;
}): CorsOptions {
  const { origins, env } = options;

  const allowedOrigins: (string | RegExp)[] = origins.map((origin) => {
    // Support wildcard subdomain patterns like *.example.com
    if (origin.includes('*')) {
      const escaped = origin
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '[a-zA-Z0-9-]+');
      return new RegExp(`^${escaped}$`);
    }
    return origin;
  });

  // In development, allow localhost on any port
  if (env === 'development' || env === 'test') {
    allowedOrigins.push(/^https?:\/\/localhost(:\d+)?$/);
    allowedOrigins.push(/^https?:\/\/127\.0\.0\.1(:\d+)?$/);
  }

  return {
    ...DEFAULT_CORS_OPTIONS,
    allowedOrigins,
    // Shorter cache in development for easier debugging
    maxAge: env === 'development' ? 0 : DEFAULT_CORS_OPTIONS.maxAge,
  };
}

/**
 * Create CORS middleware with the given configuration.
 *
 * Handles both simple requests and preflight (OPTIONS) requests.
 * Sets appropriate headers based on the request origin.
 */
export function createCorsMiddleware(options: Partial<CorsOptions> = {}) {
  const config: CorsOptions = { ...DEFAULT_CORS_OPTIONS, ...options };

  return function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
    const origin = req.headers.origin;

    // If no origin header, this is a same-origin or non-browser request
    if (!origin) {
      next();
      return;
    }

    // Check if the origin is allowed
    const allowed = isOriginAllowed(origin, config.allowedOrigins);

    if (!allowed) {
      // Origin not allowed - don't set CORS headers
      if (req.method === 'OPTIONS') {
        res.status(403).json({
          error: {
            code: 'CORS_ORIGIN_DENIED',
            message: `Origin '${origin}' is not allowed`,
          },
        });
        return;
      }
      next();
      return;
    }

    // Set CORS headers for allowed origins
    // Use the specific origin (not *) when credentials are enabled
    res.setHeader('Access-Control-Allow-Origin', config.credentials ? origin : '*');

    if (config.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Expose headers to the client
    if (config.exposedHeaders.length > 0) {
      res.setHeader('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', config.allowedMethods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
      res.setHeader('Access-Control-Max-Age', String(config.maxAge));

      // Vary header for proper caching of preflight responses
      res.setHeader('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');

      if (!config.preflightContinue) {
        res.status(config.optionsSuccessStatus).end();
        return;
      }
    } else {
      // For non-preflight requests, set Vary: Origin for caching
      res.setHeader('Vary', 'Origin');
    }

    next();
  };
}

/**
 * Create a restrictive CORS policy that only allows same-origin requests.
 * Useful for admin endpoints or internal APIs.
 */
export function createRestrictiveCors() {
  return createCorsMiddleware({
    allowedOrigins: [],
    credentials: false,
  });
}

/**
 * Create a permissive CORS policy for public APIs.
 * Allows any origin but does not support credentials.
 */
export function createPublicCors() {
  return createCorsMiddleware({
    allowedOrigins: ['*'],
    credentials: false,
    allowedMethods: ['GET', 'OPTIONS'],
    maxAge: 86400,
  });
}
