/**
 * Deployment API Routes
 *
 * Express routes for deployment management:
 * - POST   /api/v1/deployments           - Create a new deployment
 * - GET    /api/v1/deployments           - List deployments
 * - GET    /api/v1/deployments/:id       - Get deployment details
 * - POST   /api/v1/deployments/:id/approve - Approve a pending deployment
 * - POST   /api/v1/deployments/:id/cancel  - Cancel a deployment
 * - POST   /api/v1/deployments/:id/rollback - Trigger rollback
 * - GET    /api/v1/deployments/:id/events  - Get deployment events
 */

import type { Request, Response, Router } from 'express';

import { asyncHandler } from '../middleware/error-handler';

import type { DeploymentEngine, DeploymentRequest } from './deployment-engine';
import type { DeploymentState } from './state-machine';
import { createDeploymentSchema, cancelDeploymentSchema } from './validation';

/** Request with authenticated user context. */
interface AuthenticatedRequest extends Request {
  userId?: string;
}

/**
 * Register deployment routes on the given Express router.
 */
export function registerDeploymentRoutes(router: Router, engine: DeploymentEngine): void {
  /**
   * POST /api/v1/deployments
   * Create and initiate a new deployment.
   */
  router.post(
    '/api/v1/deployments',
    asyncHandler(async (req: Request, res: Response) => {
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.userId || 'anonymous';

      const parsed = createDeploymentSchema.safeParse(req.body);
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

      const request: DeploymentRequest = parsed.data;

      const result = await engine.deploy(request, actor);

      if (!result.success) {
        res.status(422).json({
          error: {
            code: 'DEPLOYMENT_FAILED',
            message: result.error,
          },
        });
        return;
      }

      res.status(201).json({
        data: result.deployment,
        meta: {
          state: result.deployment!.state,
          createdAt: result.deployment!.createdAt,
        },
      });
    }),
  );

  /**
   * GET /api/v1/deployments
   * List deployments with optional filters.
   * Query params: serviceId, environment, state, limit, offset
   */
  router.get(
    '/api/v1/deployments',
    asyncHandler(async (req: Request, res: Response) => {
      const filters = {
        serviceId: req.query.serviceId as string | undefined,
        environment: req.query.environment as string | undefined,
        state: req.query.state as DeploymentState | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
      };

      const { deployments, total } = await engine.list(filters);

      res.status(200).json({
        data: deployments,
        meta: {
          total,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: filters.offset + deployments.length < total,
        },
      });
    }),
  );

  /**
   * GET /api/v1/deployments/:id
   * Get deployment details by ID.
   */
  router.get(
    '/api/v1/deployments/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const deployment = await engine.getStatus(id);

      if (!deployment) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Deployment '${id}' not found`,
          },
        });
        return;
      }

      res.status(200).json({ data: deployment });
    }),
  );

  /**
   * POST /api/v1/deployments/:id/approve
   * Approve a deployment that is pending approval.
   */
  router.post(
    '/api/v1/deployments/:id/approve',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.userId || 'anonymous';

      const result = await engine.approve(id, actor);

      if (!result.success) {
        res.status(422).json({
          error: {
            code: 'APPROVAL_FAILED',
            message: result.error,
          },
        });
        return;
      }

      res.status(200).json({
        data: result.deployment,
        meta: { approvedBy: actor, approvedAt: new Date().toISOString() },
      });
    }),
  );

  /**
   * POST /api/v1/deployments/:id/cancel
   * Cancel an active deployment.
   */
  router.post(
    '/api/v1/deployments/:id/cancel',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.userId || 'anonymous';

      const parsed = cancelDeploymentSchema.safeParse(req.body);
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
      const { reason } = parsed.data;

      const result = await engine.cancel(id, actor, reason);

      if (!result.success) {
        res.status(422).json({
          error: {
            code: 'CANCELLATION_FAILED',
            message: result.error,
          },
        });
        return;
      }

      res.status(200).json({
        data: result.deployment,
        meta: { cancelledBy: actor, reason },
      });
    }),
  );

  /**
   * POST /api/v1/deployments/:id/rollback
   * Trigger a rollback for a failed deployment.
   */
  router.post(
    '/api/v1/deployments/:id/rollback',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.userId || 'anonymous';

      const result = await engine.rollback(id, actor);

      if (!result.success) {
        res.status(422).json({
          error: {
            code: 'ROLLBACK_FAILED',
            message: result.error,
          },
        });
        return;
      }

      res.status(200).json({
        data: result.deployment,
        meta: { rolledBackBy: actor },
      });
    }),
  );

  /**
   * GET /api/v1/deployments/:id/events
   * Get the event log for a deployment.
   */
  router.get(
    '/api/v1/deployments/:id/events',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const deployment = await engine.getStatus(id);

      if (!deployment) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Deployment '${id}' not found`,
          },
        });
        return;
      }

      res.status(200).json({
        data: deployment.events,
        meta: {
          total: deployment.events.length,
          deploymentId: id,
          currentState: deployment.state,
        },
      });
    }),
  );
}
