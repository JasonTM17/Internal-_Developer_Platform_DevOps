/**
 * RBAC (Role-Based Access Control) interfaces and types.
 *
 * Defines the authentication and authorization model including
 * roles, permissions, team-scoped access, and session management.
 */

/**
 * Platform roles with hierarchical permissions.
 */
export type Role = 'viewer' | 'developer' | 'admin';

/**
 * A role assignment binding a user to a role within a team scope.
 */
export interface RoleAssignment {
  /** ID of the user assigned the role. */
  userId: string;
  /** The assigned role. */
  role: Role;
  /** Team scope for this role assignment. */
  team: string;
  /** Identity of the user who made this assignment. */
  assignedBy: string;
  /** Timestamp of the assignment. */
  assignedAt: Date;
}

/**
 * A permission definition specifying allowed actions on resources.
 */
export interface Permission {
  /** The action being permitted (e.g., 'read', 'deploy', '*'). */
  action: string;
  /** The resource scope (e.g., '*', 'non-production', 'environment'). */
  resource: string;
  /** Additional conditions for the permission. */
  conditions?: Record<string, unknown>;
}

/**
 * An authenticated user with resolved roles and session info.
 */
export interface AuthenticatedUser {
  /** Unique user identifier. */
  id: string;
  /** User's email address. */
  email: string;
  /** Teams the user belongs to. */
  teams: string[];
  /** All role assignments for this user. */
  roles: RoleAssignment[];
  /** Session expiry timestamp. */
  sessionExpiry: Date;
}

/**
 * Result of an authorization check.
 */
export interface AuthzResult {
  /** Whether the action is allowed. */
  allowed: boolean;
  /** Reason for denial (if not allowed). */
  reason?: string;
}
