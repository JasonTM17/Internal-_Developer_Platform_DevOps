/**
 * Express Server Setup
 *
 * Configures and starts the Express HTTP server with:
 * - All middleware (logging, CORS, rate limiting, metrics, auth)
 * - API route registration
 * - Health check endpoints
 * - Graceful shutdown handling
 * - Uncaught exception/rejection handlers
 * - Request timeout enforcement
 */

import express from 'express';
import type { Express } from 'express';
import helmet from 'helmet';

import { createAuthMiddleware } from './auth/middleware';
import { getConfig } from './config/index';
import { openApiSpec } from './docs/openapi';
import { logger } from './lib/logger';
import { createCorsMiddleware, buildCorsOptions } from './middleware/cors';
import { createErrorHandler, notFoundHandler } from './middleware/error-handler';
import { HealthCheckRegistry, registerHealthEndpoints } from './middleware/health';
import {
  createMetricsMiddleware,
  createMetricsEndpoint,
  getMetricsCollector,
} from './middleware/metrics';
import { createRateLimiter, RATE_LIMIT_PRESETS } from './middleware/rate-limiter';
import { createRequestLogger } from './middleware/request-logger';
import { createSanitizeMiddleware } from './middleware/sanitize';
import { registerApiRoutes } from './routes/index';

/** Server instance with shutdown capability. */
export interface ServerInstance {
  app: Express;
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Create and configure the Express application.
 */
export function createApp(): Express {
  const config = getConfig();
  const app = express();

  // Trust proxy in production (for correct IP detection behind load balancer)
  if (config.trustProxy) {
    app.set('trust proxy', true);
  }

  // Disable X-Powered-By header for security
  app.disable('x-powered-by');

  // Body parsing
  app.use(express.json({ limit: config.maxBodySize }));
  app.use(express.urlencoded({ extended: true, limit: config.maxBodySize }));

  // Input sanitization (after body parsing, before routes)
  app.use(createSanitizeMiddleware());

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Request ID and structured logging
  app.use(
    createRequestLogger({
      logBody: config.logRequestBody,
      excludePaths: ['/health', '/ready', '/metrics'],
    }),
  );

  // CORS
  const corsOptions = buildCorsOptions({
    origins: config.corsOrigins,
    env: config.env,
  });
  app.use(createCorsMiddleware(corsOptions));

  // Prometheus metrics collection
  const metricsCollector = getMetricsCollector();
  app.use(createMetricsMiddleware(metricsCollector));

  // Rate limiting (global)
  app.use(
    createRateLimiter(null, {
      ...RATE_LIMIT_PRESETS.standard,
      maxRequests: config.rateLimitMax,
      windowMs: config.rateLimitWindowMs,
    }),
  );

  // Health check endpoints
  const healthRegistry = new HealthCheckRegistry(config.serviceName, config.version);
  const healthRouter = express.Router();
  registerHealthEndpoints(healthRouter, healthRegistry);
  app.use(healthRouter);

  // Metrics endpoint
  app.get('/metrics', createMetricsEndpoint(metricsCollector));

  // Swagger API documentation
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const swaggerUi: {
      serve: express.RequestHandler[];
      setup: (spec: object, opts?: object) => express.RequestHandler;
    } = require('swagger-ui-express');
    app.use(
      '/api-docs',
      ...swaggerUi.serve,
      swaggerUi.setup(openApiSpec, {
        customSiteTitle: 'IDP API Documentation',
        customCss: '.swagger-ui .topbar { display: none }',
      }),
    );
  } catch {
    app.get('/api-docs', (_req, res) => res.json(openApiSpec));
  }

  // Auth middleware for API routes (skip in dev if AUTH_DISABLED=true)
  const authDisabled =
    process.env.AUTH_DISABLED === 'true' ||
    (config.env !== 'production' && process.env.AUTH_DISABLED !== 'false');
  if (!authDisabled) {
    const authMw = createAuthMiddleware({
      jwksUri: process.env.OIDC_JWKS_URI || 'https://auth.example.com/.well-known/jwks.json',
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
      sessionTimeoutMinutes: 60,
    });
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    app.use('/api', authMw);
  }

  // API routes
  const apiRouter = express.Router();
  registerApiRoutes(apiRouter);
  app.use(apiRouter);

  // 404 handler for unmatched routes
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(
    createErrorHandler({
      includeStackTrace: config.env !== 'production',
      includeDetails: config.env !== 'production',
    }),
  );

  return app;
}

/**
 * Create a server instance with lifecycle management.
 */
export function createServer(): ServerInstance {
  const config = getConfig();
  const app = createApp();
  let httpServer: ReturnType<typeof app.listen> | null = null;
  let isShuttingDown = false;

  return {
    app,

    async start(): Promise<void> {
      return new Promise((resolve, reject) => {
        httpServer = app.listen(config.port, config.host, () => {
          logger.info(
            { environment: config.env, version: config.version },
            `Server started on ${config.host}:${config.port}`,
          );
          resolve();
        });

        httpServer.on('error', (error: NodeJS.ErrnoException) => {
          logger.error({ err: error }, `Port ${config.port} bind failed`);
          reject(error);
        });

        // Set server timeouts
        httpServer.keepAliveTimeout = 65000; // Slightly higher than ALB idle timeout
        httpServer.headersTimeout = 66000;

        // Request timeout
        httpServer.setTimeout(config.requestTimeoutMs);
      });
    },

    async stop(): Promise<void> {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.info('Graceful shutdown initiated');

      // Stop accepting new connections
      if (httpServer) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            logger.warn('Shutdown timeout reached, forcing close');
            resolve();
          }, config.shutdownTimeoutMs);

          httpServer!.close(() => {
            clearTimeout(timeout);
            logger.info('Server closed gracefully');
            resolve();
          });
        });
      }
    },
  };
}

/**
 * Bootstrap the server with signal handlers.
 * This is the main entry point for running the server.
 */
export async function bootstrap(): Promise<void> {
  // Initialize OpenTelemetry if enabled
  if (process.env.OTEL_ENABLED === 'true') {
    try {
      const { initTracing } = await import('./tracing/otel');
      initTracing({
        serviceName: 'idp-api',
        serviceVersion: process.env.VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        exporterUrl: process.env.OTEL_EXPORTER_URL,
        enabled: true,
      });
    } catch {
      logger.warn('OpenTelemetry packages not installed, tracing disabled');
    }
  }

  const server = createServer();

  // Graceful shutdown on SIGTERM/SIGINT
  const shutdown = async (signal: string) => {
    logger.info({ signal }, `Received ${signal}, starting graceful shutdown`);
    await server.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  // Uncaught exception handler
  process.on('uncaughtException', (error: Error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    process.exit(1);
  });

  // Unhandled rejection handler
  process.on('unhandledRejection', (reason: unknown) => {
    logger.fatal(
      { err: reason instanceof Error ? reason : new Error(String(reason)) },
      'Unhandled promise rejection',
    );
    process.exit(1);
  });

  await server.start();
}
