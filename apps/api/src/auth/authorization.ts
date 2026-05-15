/**
 * Role-Based Permission Evaluation Engine
 *
 * Implements team-scoped permission resolution with support for multiple
 * team memberships and independent per-team evaluation.
 *
 * Requirements: 9.2, 9.3, 9.4
 *
 * Role definitions:
 * - viewer: read-only access to resources
 * - developer: read + deploy to non-production + provision environments + manage config
 * - admin: all actions including production deployments and role management
 *
 * Permissions are scoped to team-owned resources. A user with multiple team
 * memberships has their permissions evaluated independently per team.
 */

import { roleHasPermission } from '@idp/config';
import type { AuthenticatedUser, AuthzResult, APIErrorResponse } from '@idp/shared';
import { ERROR_CODES } from '@idp/shared';
import type { Request, Response, NextFunction } from 'express';

import type { AuthenticatedRequest } from './middleware';

/**
 * Describes a resource being accessed, including its owning team.
 */
export interface Resource {
  /** The type of resource (e.g., 'catalog', 'deployment', 'environment', 'config'). */
  type: string;
  /** The team that owns this resource. */
  team: string;
  /** Optional resource identifier. */
  id?: string;
}

/**
 * Describes an action being performed on a resource.
 */
export interface Action {
  /** The action type (e.g., 'read', 'deploy', 'provision', 'manage', 'delete', 'admin'). */
  type: string;
  /** The environment scope for the action (e.g., 'production', 'non-production'). */
  environment?: string;
}

/**
 * Options for the authorization middleware factory.
 */
export interface AuthzMiddlewareOptions {
  /** Function to extract the action from the request. */
  getAction: (req: Request) => Action;
  /** Function to extract the resource from the request. */
  getResource: (req: Request) => Resource;
}

/**
 * Evaluates whether an authenticated user is authorized to perform
 * a given action on a given resource.
 *
 * The evaluation logic:
 * 1. Check if the user has any role assignment for the resource's team.
 * 2. For each role the user holds in that team, check if the role grants
 *    the requested action on the requested resource scope.
 * 3. Admin role with wildcard permissions matches any action/resource.
 * 4. Permissions are team-scoped: a user's role in team A does NOT grant
 *    access to team B's resources.
 *
 * Performance: Evaluation completes within 500ms (synchronous in-memory lookup).
 *
 * @param user - The authenticated user with role assignments
 * @param action - The action being attempted
 * @param resource - The resource being accessed
 * @returns AuthzResult indicating whether access is allowed and denial reason if not
 */
export function evaluatePermission(
  user: AuthenticatedUser,
  action: Action,
  resource: Resource,
): AuthzResult {
  // Find all role assignments for the resource's team
  const teamRoles = user.roles.filter((ra) => ra.team === resource.team);

  // If user has no roles in this team, deny access
  if (teamRoles.length === 0) {
    return {
      allowed: false,
      reason: `User '${user.id}' has no role assignment for team '${resource.team}'`,
    };
  }

  // Determine the resource scope for permission matching
  const resourceScope = resolveResourceScope(action, resource);

  // Check each role assignment for the team
  for (const roleAssignment of teamRoles) {
    if (roleHasPermission(roleAssignment.role, action.type, resourceScope)) {
      return { allowed: true };
    }
  }

  // No matching permission found - build denial reason
  const userRolesInTeam = teamRoles.map((ra) => ra.role).join(', ');
  return {
    allowed: false,
    reason: `User '${user.id}' with role(s) [${userRolesInTeam}] in team '${resource.team}' does not have '${action.type}' permission on '${resourceScope}'`,
  };
}

/**
 * Resolves the resource scope string used for permission matching.
 *
 * For deploy actions, the scope is determined by the environment:
 * - production environments map to 'production' scope
 * - all other environments map to 'non-production' scope
 *
 * For other actions, the resource type is used as the scope.
 */
function resolveResourceScope(action: Action, resource: Resource): string {
  if (action.type === 'deploy') {
    // Deploy actions are scoped by environment type
    if (action.environment === 'production') {
      return 'production';
    }
    return 'non-production';
  }

  if (action.type === 'provision') {
    return 'environment';
  }

  if (action.type === 'manage' && resource.type === 'config') {
    return 'config';
  }

  // For read and other actions, use wildcard matching
  return resource.type;
}

/**
 * Evaluates permissions across all of a user's team memberships.
 *
 * This is used when a resource's team ownership is not yet known,
 * or when checking if a user has ANY team where they can perform an action.
 *
 * @param user - The authenticated user
 * @param action - The action being attempted
 * @param resourceType - The type of resource
 * @returns Array of teams where the user is authorized, with AuthzResult per team
 */
export function evaluatePermissionAcrossTeams(
  user: AuthenticatedUser,
  action: Action,
  resourceType: string,
): Array<{ team: string; result: AuthzResult }> {
  const uniqueTeams = [...new Set(user.roles.map((ra) => ra.team))];

  return uniqueTeams.map((team) => {
    const resource: Resource = { type: resourceType, team };
    const result = evaluatePermission(user, action, resource);
    return { team, result };
  });
}

/**
 * Creates an Express middleware that enforces authorization.
 *
 * The middleware:
 * 1. Extracts the authenticated user from the request (set by auth middleware)
 * 2. Determines the action and resource from the request
 * 3. Evaluates permissions using the role-based engine
 * 4. Returns 403 with denial reason for unauthorized requests
 * 5. Calls next() for authorized requests
 *
 * @param options - Configuration for extracting action and resource from requests
 * @returns Express middleware function
 */
export function createAuthzMiddleware(options: AuthzMiddlewareOptions) {
  return function authzMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void {
    const user = req.user;

    if (!user) {
      const errorResponse: APIErrorResponse = {
        error: 'Authentication required before authorization check.',
        code: ERROR_CODES.AUTHENTICATION_REQUIRED,
        details: [
          {
            message: 'No authenticated user found on request. Ensure auth middleware runs first.',
          },
        ],
      };
      res.status(401).json(errorResponse);
      return;
    }

    const action = options.getAction(req);
    const resource = options.getResource(req);

    const result = evaluatePermission(user, action, resource);

    if (!result.allowed) {
      const errorResponse: APIErrorResponse = {
        error: 'You do not have permission to perform this action.',
        code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        details: [
          {
            message: result.reason ?? 'Insufficient permissions',
          },
        ],
      };
      res.status(403).json(errorResponse);
      return;
    }

    next();
  };
}

/**
 * Convenience function to create a simple authorization middleware
 * for a fixed action and resource type, extracting team from request params.
 *
 * @param actionType - The action type to check (e.g., 'read', 'deploy')
 * @param resourceType - The resource type (e.g., 'catalog', 'deployment')
 * @param options - Optional overrides for team extraction and environment
 */
export function requirePermission(
  actionType: string,
  resourceType: string,
  options?: {
    /** Parameter name to extract team from (defaults to 'team'). */
    teamParam?: string;
    /** Fixed environment scope (e.g., 'production', 'staging'). */
    environment?: string;
    /** Function to extract team from request (overrides teamParam). */
    getTeam?: (req: Request) => string;
  },
) {
  const teamParam = options?.teamParam ?? 'team';

  return createAuthzMiddleware({
    getAction: () => ({
      type: actionType,
      environment: options?.environment,
    }),
    getResource: (req) => {
      const team = options?.getTeam
        ? options.getTeam(req)
        : (req.params[teamParam] ?? (req.query.team as string) ?? '');
      return {
        type: resourceType,
        team,
      };
    },
  });
}
