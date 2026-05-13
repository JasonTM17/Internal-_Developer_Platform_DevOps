/**
 * Role permission matrix constants.
 *
 * Defines the permissions granted to each platform role as specified
 * in Requirement 9.2.
 *
 * Validates: Requirements 9.2
 *
 * Role definitions:
 * - viewer: read-only access to resources
 * - developer: read access + deploy to non-production environments + provision environments + manage config
 * - admin: all actions including production deployments and role management
 */

import type { Role } from '@idp/shared';

/**
 * A permission entry defining an allowed action on a resource scope.
 */
export interface RolePermission {
  /** The action being permitted (e.g., 'read', 'deploy', '*'). */
  action: string;
  /** The resource scope (e.g., '*', 'non-production', 'environment', 'config'). */
  resource: string;
}

/**
 * Role permission matrix mapping each role to its allowed permissions.
 *
 * - viewer: read-only access to all resources
 * - developer: read + deploy to non-production + provision environments + manage config
 * - admin: all actions on all resources (wildcard)
 */
export const ROLE_PERMISSIONS: Record<Role, RolePermission[]> = {
  viewer: [
    { action: 'read', resource: '*' },
  ],
  developer: [
    { action: 'read', resource: '*' },
    { action: 'deploy', resource: 'non-production' },
    { action: 'provision', resource: 'environment' },
    { action: 'manage', resource: 'config' },
  ],
  admin: [
    { action: '*', resource: '*' },
  ],
} as const;

/**
 * All available platform actions.
 */
export const PLATFORM_ACTIONS = [
  'read',
  'deploy',
  'provision',
  'manage',
  'delete',
  'admin',
] as const;

/**
 * All available resource scopes.
 */
export const RESOURCE_SCOPES = [
  '*',
  'non-production',
  'production',
  'environment',
  'config',
  'catalog',
  'deployment',
  'audit',
  'role',
] as const;

/**
 * Check if a role has a specific permission for a given action and resource.
 *
 * Admin role with wildcard action/resource matches everything.
 * Exact matches are checked for action and resource.
 * Wildcard '*' in the permission matches any action or resource.
 */
export function roleHasPermission(role: Role, action: string, resource: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.some(
    (perm) =>
      (perm.action === '*' || perm.action === action) &&
      (perm.resource === '*' || perm.resource === resource),
  );
}

/**
 * Get all permissions for a given role.
 */
export function getPermissionsForRole(role: Role): RolePermission[] {
  return ROLE_PERMISSIONS[role];
}

/**
 * All defined roles in the platform.
 */
export const PLATFORM_ROLES: Role[] = ['viewer', 'developer', 'admin'];
