/**
 * Environment API Routes
 *
 * Express routes for environment management:
 * - POST   /api/v1/environments              - Create environment
 * - GET    /api/v1/environments              - List environments
 * - GET    /api/v1/environments/:id          - Get environment details
 * - PUT    /api/v1/environments/:id          - Update environment
 * - DELETE /api/v1/environments/:id          - Delete environment
 * - POST   /api/v1/environments/:id/promote  - Promote to next tier
 * - GET    /api/v1/environments/:id/variables - Get variables
 * - PUT    /api/v1/environments/:id/variables/:key - Set variable
 * - DELETE /api/v1/environments/:id/variables/:key - Delete variable
 */

import type { Request, Response, Router } from 'express';

import { asyncHandler } from '../middleware/error-handler';

import type { EnvironmentManager, EnvironmentTier } from './environment-manager';
import {
  createEnvironmentSchema,
  updateEnvironmentSchema,
  setVariableSchema,
  promoteEnvironmentSchema,
} from './validation';

/** Request with authenticated user context. */
interface AuthenticatedRequest extends Request {
  userId?: string;
}

/**
 * Register environment routes on the given Express router.
 */
export function registerEnvironmentRoutes(router: Router, manager: EnvironmentManager): void {
  /**
   * POST /api/v1/environments
   * Create a new environment.
   */
  router.post(
    '/api/v1/environments',
    asyncHandler(async (req: Request, res: Response) => {
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.userId || 'anonymous';

      const parsed = createEnvironmentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parsed.error.issues,
          },
        });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      const result = await manager.create(parsed.data as any, actor);

      if (!result.success) {
        res.status(422).json({
          error: { code: 'ENVIRONMENT_CREATE_FAILED', message: result.error },
        });
        return;
      }

      res.status(201).json({
        data: result.environment,
        meta: { createdAt: result.environment!.createdAt },
      });
    }),
  );

  /**
   * GET /api/v1/environments
   * List environments with optional filters.
   */
  router.get(
    '/api/v1/environments',
    asyncHandler(async (req: Request, res: Response) => {
      const filters = {
        tier: req.query.tier as EnvironmentTier | undefined,
        status: req.query.status as string | undefined,
        region: req.query.region as string | undefined,
      };

      const environments = await manager.list(filters as Parameters<typeof manager.list>[0]);

      res.status(200).json({
        data: environments,
        meta: { total: environments.length },
      });
    }),
  );

  /**
   * GET /api/v1/environments/:id
   * Get environment details.
   */
  router.get(
    '/api/v1/environments/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const environment = await manager.getById(id);

      if (!environment) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: `Environment '${id}' not found` },
        });
        return;
      }

      res.status(200).json({ data: environment });
    }),
  );

  /**
   * PUT /api/v1/environments/:id
   * Update an environment.
   */
  router.put(
    '/api/v1/environments/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.userId || 'anonymous';

      const parsed = updateEnvironmentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parsed.error.issues,
          },
        });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      const result = await manager.update(id, parsed.data as any, actor);

      if (!result.success) {
        res.status(422).json({
          error: { code: 'ENVIRONMENT_UPDATE_FAILED', message: result.error },
        });
        return;
      }

      res.status(200).json({ data: result.environment });
    }),
  );

  /**
   * DELETE /api/v1/environments/:id
   * Delete (decommission) an environment.
   */
  router.delete(
    '/api/v1/environments/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.userId || 'anonymous';

      const result = await manager.delete(id, actor);

      if (!result.success) {
        const statusCode = result.error?.includes('not found') ? 404 : 422;
        res.status(statusCode).json({
          error: { code: 'ENVIRONMENT_DELETE_FAILED', message: result.error },
        });
        return;
      }

      res.status(204).end();
    }),
  );

  /**
   * POST /api/v1/environments/:id/promote
   * Promote environment configuration to the next tier.
   */
  router.post(
    '/api/v1/environments/:id/promote',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.userId || 'anonymous';

      const parsed = promoteEnvironmentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parsed.error.issues,
          },
        });
        return;
      }
      const { targetTier } = parsed.data;

      const result = await manager.promote(id, targetTier, actor);

      if (!result.success) {
        res.status(422).json({
          error: { code: 'PROMOTION_FAILED', message: result.error },
        });
        return;
      }

      res.status(201).json({
        data: result.environment,
        meta: { promotedFrom: id, targetTier },
      });
    }),
  );

  /**
   * GET /api/v1/environments/:id/variables
   * Get environment variables (secrets are masked).
   */
  router.get(
    '/api/v1/environments/:id/variables',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const variables = await manager.getVariables(id);

      res.status(200).json({
        data: variables,
        meta: { total: variables.length, environmentId: id },
      });
    }),
  );

  /**
   * PUT /api/v1/environments/:id/variables/:key
   * Set an environment variable.
   */
  router.put(
    '/api/v1/environments/:id/variables/:key',
    asyncHandler(async (req: Request, res: Response) => {
      const { id, key } = req.params;
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.userId || 'anonymous';

      const parsed = setVariableSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parsed.error.issues,
          },
        });
        return;
      }
      const { value, isSecret } = parsed.data;

      const result = await manager.setVariable(id, key, String(value), isSecret === true, actor);

      if (!result.success) {
        res.status(422).json({
          error: { code: 'VARIABLE_SET_FAILED', message: result.error },
        });
        return;
      }

      res.status(200).json({
        data: { key, isSecret: isSecret === true },
        meta: { environmentId: id },
      });
    }),
  );
}
