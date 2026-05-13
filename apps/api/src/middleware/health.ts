/**
 * Health Check Endpoints Middleware
 *
 * Implements Kubernetes-compatible health check endpoints:
 * - /health (liveness probe): Is the process alive and responsive?
 * - /ready (readiness probe): Is the service ready to accept traffic?
 *
 * Readiness checks verify:
 * - Database connectivity
 * - Redis connectivity
 * - Critical dependency availability
 *
 * Follows the health check response format from the IETF draft:
 * https://datatracker.ietf.org/doc/html/draft-inadarei-api-health-check
 */

import type { Request, Response, NextFunction, Router } from 'express';

/** Health status values. */
export type HealthStatus = 'pass' | 'fail' | 'warn';

/** Individual component health check result. */
export interface ComponentHealth {
  /** Component identifier */
  componentId: string;
  /** Component type (e.g., 'datastore', 'cache', 'service') */
  componentType: string;
  /** Health status */
  status: HealthStatus;
  /** Time taken for the check in milliseconds */
  observedValue?: number;
  /** Unit of the observed value */
  observedUnit?: string;
  /** Human-readable output */
  output?: string;
  /** Timestamp of the check */
  time: string;
}

/** Complete health check response. */
export interface HealthCheckResponse {
  /** Overall health status */
  status: HealthStatus;
  /** Service version */
  version: string;
  /** Service description */
  description: string;
  /** Uptime in seconds */
  uptime: number;
  /** Individual component checks */
  checks: Record<string, ComponentHealth[]>;
  /** Response timestamp */
  timestamp: string;
}

/** Health check function signature. */
export type HealthCheckFn = () => Promise<ComponentHealth>;

/** Health check registry for managing component checks. */
export class HealthCheckRegistry {
  private readonly checks: Map<string, HealthCheckFn> = new Map();
  private readonly startTime: number = Date.now();

  constructor(
    private readonly serviceName: string,
    private readonly version: string,
  ) {}

  /**
   * Register a health check for a component.
   */
  register(name: string, check: HealthCheckFn): void {
    this.checks.set(name, check);
  }

  /**
   * Remove a health check.
   */
  unregister(name: string): void {
    this.checks.delete(name);
  }

  /**
   * Run all registered health checks and return the aggregate result.
   */
  async runAll(): Promise<HealthCheckResponse> {
    const results: Record<string, ComponentHealth[]> = {};
    let overallStatus: HealthStatus = 'pass';

    const checkPromises = Array.from(this.checks.entries()).map(
      async ([name, checkFn]) => {
        try {
          const result = await Promise.race([
            checkFn(),
            this.createTimeout(name, 5000),
          ]);
          return { name, result };
        } catch (error) {
          const failResult: ComponentHealth = {
            componentId: name,
            componentType: 'unknown',
            status: 'fail',
            output: error instanceof Error ? error.message : 'Unknown error',
            time: new Date().toISOString(),
          };
          return { name, result: failResult };
        }
      },
    );

    const checkResults = await Promise.allSettled(checkPromises);

    for (const settled of checkResults) {
      if (settled.status === 'fulfilled') {
        const { name, result } = settled.value;
        if (!results[name]) results[name] = [];
        results[name].push(result);

        if (result.status === 'fail') {
          overallStatus = 'fail';
        } else if (result.status === 'warn' && overallStatus !== 'fail') {
          overallStatus = 'warn';
        }
      }
    }

    return {
      status: overallStatus,
      version: this.version,
      description: `${this.serviceName} health status`,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: results,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create a timeout promise for health checks that take too long.
   */
  private createTimeout(name: string, timeoutMs: number): Promise<ComponentHealth> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check '${name}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Get the service uptime in seconds.
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}

/**
 * Create a database health check function.
 */
export function createDatabaseHealthCheck(
  queryFn: () => Promise<void>,
): HealthCheckFn {
  return async (): Promise<ComponentHealth> => {
    const start = Date.now();
    try {
      await queryFn();
      const duration = Date.now() - start;
      return {
        componentId: 'postgresql',
        componentType: 'datastore',
        status: duration > 1000 ? 'warn' : 'pass',
        observedValue: duration,
        observedUnit: 'ms',
        output: duration > 1000 ? 'Slow response time' : undefined,
        time: new Date().toISOString(),
      };
    } catch (error) {
      return {
        componentId: 'postgresql',
        componentType: 'datastore',
        status: 'fail',
        observedValue: Date.now() - start,
        observedUnit: 'ms',
        output: error instanceof Error ? error.message : 'Connection failed',
        time: new Date().toISOString(),
      };
    }
  };
}

/**
 * Create a Redis health check function.
 */
export function createRedisHealthCheck(
  pingFn: () => Promise<string>,
): HealthCheckFn {
  return async (): Promise<ComponentHealth> => {
    const start = Date.now();
    try {
      const response = await pingFn();
      const duration = Date.now() - start;
      return {
        componentId: 'redis',
        componentType: 'cache',
        status: response === 'PONG' ? (duration > 500 ? 'warn' : 'pass') : 'fail',
        observedValue: duration,
        observedUnit: 'ms',
        output: response !== 'PONG' ? `Unexpected response: ${response}` : undefined,
        time: new Date().toISOString(),
      };
    } catch (error) {
      return {
        componentId: 'redis',
        componentType: 'cache',
        status: 'fail',
        observedValue: Date.now() - start,
        observedUnit: 'ms',
        output: error instanceof Error ? error.message : 'Connection failed',
        time: new Date().toISOString(),
      };
    }
  };
}

/**
 * Create health check route handlers.
 *
 * Registers:
 * - GET /health - Liveness probe (always returns 200 if process is running)
 * - GET /ready  - Readiness probe (checks all dependencies)
 */
export function createHealthRoutes(registry: HealthCheckRegistry) {
  return {
    /**
     * Liveness probe handler.
     * Returns 200 if the process is alive and can handle requests.
     * Does NOT check dependencies - that's what readiness is for.
     */
    liveness(_req: Request, res: Response): void {
      res.status(200).json({
        status: 'pass',
        uptime: registry.getUptime(),
        timestamp: new Date().toISOString(),
      });
    },

    /**
     * Readiness probe handler.
     * Checks all registered dependencies and returns aggregate status.
     * Returns 200 if all checks pass, 503 if any check fails.
     */
    async readiness(_req: Request, res: Response, _next: NextFunction): Promise<void> {
      try {
        const health = await registry.runAll();
        const statusCode = health.status === 'pass' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'fail',
          description: 'Health check execution failed',
          output: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    },
  };
}

/**
 * Register health check endpoints on an Express router.
 */
export function registerHealthEndpoints(
  router: Router,
  registry: HealthCheckRegistry,
): void {
  const handlers = createHealthRoutes(registry);
  router.get('/health', handlers.liveness);
  router.get('/ready', handlers.readiness);
}
