/**
 * Configuration Management API Routes
 *
 * Express routes for configuration management:
 * - POST   /api/v1/config                    - Set a config value
 * - GET    /api/v1/config/:key               - Get a config value
 * - DELETE /api/v1/config/:key               - Delete a config value
 * - GET    /api/v1/config/:key/history       - Get version history
 * - POST   /api/v1/config/:key/rollback      - Rollback to a version
 * - POST   /api/v1/config/bulk               - Bulk set config values
 * - GET    /api/v1/config/resolve/:serviceId - Resolve config for a service
 */

import type { Request, Response, Router } from 'express';
import type { ConfigService, ConfigScope } from './config-service';
import { asyncHandler, BadRequestError } from '../middleware/error-handler';

/** Request with authenticated user context. */
interface AuthenticatedRequest extends Request {
  userId?: string;
}

/**
 * Register configuration management routes on the given Express router.
 */
export function registerConfigRoutes(router: Router, configService: ConfigService): void {
  /**
   * POST /api/v1/config
   * Set a configuration value.
   */
  router.post(
    '/api/v1/config',
    asyncHandler(async (req: Request, res: Response) => {
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.userId || 'anonymous';

      const { key, value, scope, scopeId, valueType, description, tags } = req.body;

      if (!key || !value || !scope || !valueType) {
        throw new BadRequestError('key, value, scope, and valueType are required');
      }

      const result = await configService.set(
        { key, value, scope, scopeId, valueType, description, tags },
        actor,
      );

      if (!result.success) {
        res.status(422).json({
          error: { code: 'CONFIG_SET_FAILED', message: result.error },
        });
        return;
      }

      res.status(200).json({
        data: result.entry,
        meta: { version: result.entry!.version },
      });
    }),
  );

  /**
   * GET /api/v1/config/:key
   * Get a configuration value.
   * Query params: scope, scopeId
   */
  router.get(
    '/api/v1/config/:key',
    asyncHandler(async (req: Request, res: Response) => {
      const { key } = req.params;
      const scope = (req.query.scope as ConfigScope) || 'global';
      const scopeId = req.query.scopeId as string | undefined;

      const entry = await configService.get(key, scope, scopeId);

      if (!entry) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: `Configuration '${key}' not found in scope '${scope}'` },
        });
        return;
      }

      res.status(200).json({ data: entry });
    }),
  );

  /**
   * DELETE /api/v1/config/:key
   * Delete a configuration value.
   * Query params: scope, scopeId
   */
  router.delete(
    '/api/v1/config/:key',
    asyncHandler(async (req: Request, res: Response) => {
      const { key } = req.params;
      const scope = (req.query.scope as ConfigScope) || 'global';
      const scopeId = req.query.scopeId as string | undefined;
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.userId || 'anonymous';

      const result = await configService.delete(key, scope, scopeId, actor);

      if (!result.success) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: result.error },
        });
        return;
      }

      res.status(204).end();
    }),
  );

  /**
   * GET /api/v1/config/:key/history
   * Get version history for a configuration entry.
   * Query params: scope, scopeId
   */
  router.get(
    '/api/v1/config/:key/history',
    asyncHandler(async (req: Request, res: Response) => {
      const { key } = req.params;
      const scope = (req.query.scope as ConfigScope) || 'global';
      const scopeId = req.query.scopeId as string | undefined;

      const history = await configService.getHistory(key, scope, scopeId);

      res.status(200).json({
        data: history,
        meta: { total: history.length, key, scope },
      });
    }),
  );

  /**
   * POST /api/v1/config/:key/rollback
   * Rollback a configuration entry to a previous version.
   * Body: { version: number }
   */
  router.post(
    '/api/v1/config/:key/rollback',
    asyncHandler(async (req: Request, res: Response) => {
      const { key } = req.params;
      const { version, scope, scopeId } = req.body;
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.userId || 'anonymous';

      if (version === undefined || typeof version !== 'number') {
        throw new BadRequestError('version (number) is required');
      }

      const result = await configService.rollback(
        key,
        scope || 'global',
        scopeId,
        version,
        actor,
      );

      if (!result.success) {
        res.status(422).json({
          error: { code: 'ROLLBACK_FAILED', message: result.error },
        });
        return;
      }

      res.status(200).json({
        data: result.entry,
        meta: { rolledBackTo: version, newVersion: result.entry!.version },
      });
    }),
  );

  /**
   * POST /api/v1/config/bulk
   * Bulk set multiple configuration values.
   */
  router.post(
    '/api/v1/config/bulk',
    asyncHandler(async (req: Request, res: Response) => {
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.userId || 'anonymous';
      const { entries } = req.body;

      if (!Array.isArray(entries) || entries.length === 0) {
        throw new BadRequestError('entries array is required and must not be empty');
      }

      if (entries.length > 100) {
        throw new BadRequestError('Maximum 100 entries per bulk operation');
      }

      const result = await configService.bulkSet(entries, actor);

      res.status(result.success ? 200 : 207).json({
        data: {
          applied: result.applied,
          failed: result.failed,
        },
        meta: {
          total: entries.length,
          successCount: result.applied,
          failureCount: result.failed.length,
        },
      });
    }),
  );

  /**
   * GET /api/v1/config/resolve/:serviceId
   * Resolve effective configuration for a service in an environment.
   * Query params: environment (required)
   */
  router.get(
    '/api/v1/config/resolve/:serviceId',
    asyncHandler(async (req: Request, res: Response) => {
      const { serviceId } = req.params;
      const environment = req.query.environment as string;

      if (!environment) {
        throw new BadRequestError('environment query parameter is required');
      }

      const resolved = await configService.resolve(serviceId, environment);

      res.status(200).json({
        data: resolved,
        meta: {
          serviceId,
          environment,
          total: resolved.length,
        },
      });
    }),
  );
}
