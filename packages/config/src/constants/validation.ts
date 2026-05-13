/**
 * Validation constraints for the Internal Developer Platform.
 *
 * These constants define field lengths, allowed values, URL patterns,
 * and other validation rules used across the platform.
 *
 * Validates: Requirements 2.1, 15.1
 */

/**
 * Validation constraints for all entity and request fields.
 */
export const VALIDATION_CONSTRAINTS = {
  /** CatalogEntity name: 1-128 characters */
  name: {
    minLength: 1,
    maxLength: 128,
  },

  /** CatalogEntity namespace: 1-128 characters */
  namespace: {
    minLength: 1,
    maxLength: 128,
  },

  /** CatalogEntity owner: 1-128 characters */
  owner: {
    minLength: 1,
    maxLength: 128,
  },

  /** CatalogEntity description: 1-1024 characters */
  description: {
    minLength: 1,
    maxLength: 1024,
  },

  /** Tags array: 0-20 tags */
  tags: {
    minCount: 0,
    maxCount: 20,
  },

  /** Individual tag: 1-64 characters */
  tag: {
    minLength: 1,
    maxLength: 64,
  },

  /** Service version string */
  version: {
    minLength: 1,
    maxLength: 128,
  },

  /** Environment name */
  environmentName: {
    minLength: 1,
    maxLength: 128,
  },

  /** Configuration key */
  configKey: {
    minLength: 1,
    maxLength: 256,
  },

  /** Configuration field description */
  configDescription: {
    maxLength: 512,
  },

  /** Kubernetes namespace (RFC 1123 subdomain) */
  kubernetesNamespace: {
    maxLength: 253,
  },

  /** Actor/user identifier */
  actor: {
    minLength: 1,
    maxLength: 128,
  },

  /** API error response details limit */
  apiErrorDetails: {
    maxItems: 50,
  },

  /** Deployment history limit */
  deploymentHistory: {
    maxItems: 50,
  },

  /** Search results limit */
  searchResults: {
    maxItems: 50,
  },

  /** Search query minimum length */
  searchQuery: {
    minLength: 2,
  },

  /** Audit log query results limit */
  auditLogResults: {
    maxItems: 1000,
  },

  /** Entity version history retention */
  versionHistory: {
    minRetained: 50,
  },

  /** Environment limits */
  environment: {
    maxPerDeveloper: 5,
    defaultExpiryDays: 30,
    minExpiryDays: 1,
    maxExpiryDays: 365,
    expiryWarningDays: 7,
  },
} as const;

/**
 * Allowed lifecycle stages for catalog entities.
 * Requirement 2.2: lifecycle stage must be one of these values.
 */
export const LIFECYCLE_STAGES = [
  'experimental',
  'development',
  'production',
  'deprecated',
] as const;

/**
 * Allowed deployment statuses.
 */
export const DEPLOYMENT_STATUSES = [
  'pending',
  'in_progress',
  'success',
  'failed',
  'rollback_failed',
] as const;

/**
 * Allowed deployment phases.
 */
export const DEPLOYMENT_PHASES = [
  'pending',
  'validating',
  'generating_manifests',
  'committing',
  'syncing',
  'health_checking',
  'success',
  'failed',
  'rollback_failed',
] as const;

/**
 * Allowed environment types.
 */
export const ENVIRONMENT_TYPES = ['development', 'staging', 'production'] as const;

/**
 * Allowed environment statuses.
 */
export const ENVIRONMENT_STATUSES = [
  'provisioning',
  'active',
  'expiring',
  'deprovisioning',
  'deleted',
] as const;

/**
 * Allowed configuration field types.
 */
export const CONFIG_FIELD_TYPES = ['string', 'number', 'boolean', 'url', 'email'] as const;

/**
 * URL pattern for basic URL validation (used in addition to Zod's built-in URL validation).
 */
export const URL_PATTERN = /^https?:\/\/.+/;

/**
 * Kubernetes namespace naming pattern (RFC 1123 subdomain).
 */
export const KUBERNETES_NAMESPACE_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
