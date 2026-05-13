/**
 * API interfaces, error response types, and error code constants.
 *
 * Defines the consistent error response format used across all API endpoints
 * and machine-readable error code identifiers.
 */

/**
 * A single violation detail within an error response.
 */
export interface APIErrorDetail {
  /** The field that caused the violation (if applicable). */
  field?: string;
  /** Human-readable description of the violation. */
  message: string;
  /** The constraint that was violated (if applicable). */
  constraint?: string;
}

/**
 * Consistent error response format for all API errors.
 * Contains a human-readable error, machine-readable code, and violation details.
 */
export interface APIErrorResponse {
  /** Human-readable description of the failure. */
  error: string;
  /** Machine-readable string identifier for the error type. */
  code: string;
  /** List of specific violations or context items (maximum 50 entries). */
  details: APIErrorDetail[];
}

/**
 * Machine-readable error codes used across the platform API.
 */
export const ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_LIMIT_EXCEEDED: 'RESOURCE_LIMIT_EXCEEDED',

  // Catalog-specific errors
  ENTITY_NAME_CONFLICT: 'ENTITY_NAME_CONFLICT',
  ENTITY_NOT_FOUND: 'ENTITY_NOT_FOUND',
  DEPENDENCY_TARGET_NOT_FOUND: 'DEPENDENCY_TARGET_NOT_FOUND',

  // Deployment errors
  DEPLOYMENT_IN_PROGRESS: 'DEPLOYMENT_IN_PROGRESS',
  DEPLOYMENT_FAILED: 'DEPLOYMENT_FAILED',
  NO_SUCCESSFUL_VERSION: 'NO_SUCCESSFUL_VERSION',
  MANIFEST_GENERATION_FAILED: 'MANIFEST_GENERATION_FAILED',
  GIT_PUSH_FAILED: 'GIT_PUSH_FAILED',

  // Environment errors
  ENVIRONMENT_LIMIT_EXCEEDED: 'ENVIRONMENT_LIMIT_EXCEEDED',
  ENVIRONMENT_PROVISIONING_FAILED: 'ENVIRONMENT_PROVISIONING_FAILED',
  ENVIRONMENT_NOT_FOUND: 'ENVIRONMENT_NOT_FOUND',

  // Configuration errors
  CONFIG_KEY_NOT_FOUND: 'CONFIG_KEY_NOT_FOUND',
  CONFIG_SCHEMA_VALIDATION_FAILED: 'CONFIG_SCHEMA_VALIDATION_FAILED',

  // Authentication and authorization errors
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  OIDC_PROVIDER_UNAVAILABLE: 'OIDC_PROVIDER_UNAVAILABLE',

  // Audit errors
  AUDIT_LOG_FAILURE: 'AUDIT_LOG_FAILURE',

  // Infrastructure errors
  STATE_BACKEND_UNAVAILABLE: 'STATE_BACKEND_UNAVAILABLE',
  TERRAFORM_VALIDATION_FAILED: 'TERRAFORM_VALIDATION_FAILED',

  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

/**
 * Type representing all valid error code values.
 */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
