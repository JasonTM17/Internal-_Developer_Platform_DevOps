/**
 * Authentication and Authorization module.
 *
 * Provides OAuth2/OIDC authentication middleware that validates JWT tokens
 * from an OIDC provider using JWKS endpoint verification, and role-based
 * permission evaluation for team-scoped authorization.
 */

export { authMiddleware, createAuthMiddleware } from './middleware';
export type { AuthMiddlewareConfig, AuthenticatedRequest } from './middleware';

export {
  evaluatePermission,
  evaluatePermissionAcrossTeams,
  createAuthzMiddleware,
  requirePermission,
} from './authorization';
export type { Resource, Action, AuthzMiddlewareOptions } from './authorization';
