/**
 * Service Catalog API Routes
 *
 * Express routes for the Service Catalog CRUD operations:
 * - POST   /api/v1/catalog          - Register a new service
 * - GET    /api/v1/catalog/:id      - Get service by ID
 * - PUT    /api/v1/catalog/:id      - Update a service
 * - GET    /api/v1/catalog/search   - Search services
 * - GET    /api/v1/catalog/:id/versions - Get version history
 * - POST   /api/v1/catalog/:id/dependencies - Add dependency
 * - GET    /api/v1/catalog/:id/dependencies - Get dependencies
 * - DELETE /api/v1/catalog/:id/dependencies/:targetId - Remove dependency
 */

import type { Request, Response, Router } from 'express';
import type { ServiceCatalog, Actor } from './service-catalog';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/error-handler';

/** Request with authenticated user context. */
interface AuthenticatedRequest extends Request {
  userId?: string;
  userRoles?: string[];
}

/**
 * Extract actor information from the authenticated request.
 */
function getActor(req: AuthenticatedRequest): Actor {
  return { id: req.userId || 'anonymous' };
}

/**
 * Register catalog routes on the given Express router.
 */
export function registerCatalogRoutes(router: Router, catalog: ServiceCatalog): void {
  /**
   * POST /api/v1/catalog
   * Register a new service in the catalog.
   */
  router.post(
    '/api/v1/catalog',
    asyncHandler(async (req: Request, res: Response) => {
      const actor = getActor(req as AuthenticatedRequest);
      const result = await catalog.register(req.body, actor);

      if (!result.success) {
        const statusCode = result.error.code === 'ENTITY_NAME_CONFLICT' ? 409 : 422;
        res.status(statusCode).json(result.error);
        return;
      }

      res.status(201).json({
        data: result.entity,
        meta: {
          createdAt: result.entity.createdAt,
          version: result.entity.version,
        },
      });
    }),
  );

  /**
   * GET /api/v1/catalog/search
   * Search services by query string.
   * Query params: q (search query), limit (max results)
   */
  router.get(
    '/api/v1/catalog/search',
    asyncHandler(async (req: Request, res: Response) => {
      const query = req.query.q as string;
      if (!query) {
        throw new BadRequestError('Query parameter "q" is required');
      }

      const result = await catalog.search(query);

      if (!result.success) {
        res.status(422).json(result.error);
        return;
      }

      res.status(200).json({
        data: result.entities,
        meta: {
          total: result.entities.length,
          query,
        },
      });
    }),
  );

  /**
   * GET /api/v1/catalog/:id
   * Get a service by its unique ID.
   */
  router.get(
    '/api/v1/catalog/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const result = await catalog.getVersionHistory(id, 1);

      // Use the store directly via a workaround - check if entity exists
      // by attempting to get version history (which checks existence)
      if (!result.success) {
        throw new NotFoundError('Service', id);
      }

      // For a proper get-by-id, we'd need to expose it on ServiceCatalog
      // For now, return the entity data from the latest version or search
      const searchResult = await catalog.search(id);
      if (searchResult.success) {
        const entity = searchResult.entities.find((e) => e.id === id);
        if (entity) {
          res.status(200).json({ data: entity });
          return;
        }
      }

      throw new NotFoundError('Service', id);
    }),
  );

  /**
   * PUT /api/v1/catalog/:id
   * Update an existing service.
   */
  router.put(
    '/api/v1/catalog/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const actor = getActor(req as AuthenticatedRequest);
      const result = await catalog.update(id, req.body, actor);

      if (!result.success) {
        const statusCode = result.error.code === 'ENTITY_NOT_FOUND' ? 404 : 422;
        res.status(statusCode).json(result.error);
        return;
      }

      res.status(200).json({
        data: result.entity,
        meta: {
          updatedAt: result.entity.updatedAt,
          version: result.entity.version,
        },
      });
    }),
  );

  /**
   * GET /api/v1/catalog/:id/versions
   * Get version history for a service.
   * Query params: limit (max versions to return)
   */
  router.get(
    '/api/v1/catalog/:id/versions',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const result = await catalog.getVersionHistory(id, limit);

      if (!result.success) {
        const statusCode = result.error.code === 'ENTITY_NOT_FOUND' ? 404 : 422;
        res.status(statusCode).json(result.error);
        return;
      }

      res.status(200).json({
        data: result.versions,
        meta: {
          total: result.versions.length,
          entityId: id,
        },
      });
    }),
  );

  /**
   * POST /api/v1/catalog/:id/dependencies
   * Add a dependency to a service.
   * Body: { targetEntityId, dependencyType }
   */
  router.post(
    '/api/v1/catalog/:id/dependencies',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { targetEntityId, dependencyType } = req.body;

      if (!targetEntityId || !dependencyType) {
        throw new BadRequestError('Both "targetEntityId" and "dependencyType" are required');
      }

      const result = await catalog.addDependency(id, targetEntityId, dependencyType);

      if (!result.success) {
        const statusCode = result.error.code === 'DEPENDENCY_TARGET_NOT_FOUND' ? 404 : 422;
        res.status(statusCode).json(result.error);
        return;
      }

      res.status(201).json({
        data: result.edge,
      });
    }),
  );

  /**
   * GET /api/v1/catalog/:id/dependencies
   * Get all dependencies for a service.
   */
  router.get(
    '/api/v1/catalog/:id/dependencies',
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const result = await catalog.getDependencies(id);

      if (!result.success) {
        res.status(422).json(result.error);
        return;
      }

      res.status(200).json({
        data: result.edges,
        meta: {
          total: result.edges.length,
          entityId: id,
        },
      });
    }),
  );

  /**
   * DELETE /api/v1/catalog/:id/dependencies/:targetId
   * Remove a dependency from a service.
   */
  router.delete(
    '/api/v1/catalog/:id/dependencies/:targetId',
    asyncHandler(async (req: Request, res: Response) => {
      const { id, targetId } = req.params;
      const result = await catalog.removeDependency(id, targetId);

      if (!result.success) {
        res.status(422).json(result.error);
        return;
      }

      if (!result.removed) {
        throw new NotFoundError('Dependency', `${id} -> ${targetId}`);
      }

      res.status(204).end();
    }),
  );
}
