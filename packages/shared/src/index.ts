/**
 * @idp/shared - Shared TypeScript interfaces, types, and utilities
 *
 * This package contains all shared type definitions used across
 * the Internal Developer Platform monorepo.
 */

// Service Catalog types
export type {
  CatalogEntity,
  CatalogEntityInput,
  CatalogEntityVersion,
  DependencyEdge,
  DependencyType,
  LifecycleStage,
} from './catalog';

// Deployment types
export type {
  Deployment,
  DeploymentAction,
  DeploymentError,
  DeploymentPhase,
  DeploymentPhaseRecord,
  DeploymentStatus,
  DeploymentType,
} from './deployment';

// Environment types
export type {
  Environment,
  EnvironmentLabels,
  EnvironmentRequest,
  EnvironmentStatus,
  EnvironmentType,
  ResourceQuota,
} from './environment';

// Configuration types
export type {
  ConfigEntry,
  ConfigFieldSchema,
  ConfigFieldType,
  ConfigSchema,
} from './config';

// Audit types
export type {
  AuditEntry,
  AuditLogEntry,
  AuditOutcome,
  AuditQueryFilters,
  PaginatedAuditResult,
} from './audit';

// RBAC types
export type {
  AuthenticatedUser,
  AuthzResult,
  Permission,
  Role,
  RoleAssignment,
} from './rbac';

// API types
export type {
  APIErrorDetail,
  APIErrorResponse,
  ErrorCode,
} from './api';
export { ERROR_CODES } from './api';

// GitOps and Manifest types
export type {
  HealthStatus,
  KubernetesManifest,
  ManifestSet,
  SyncStatus,
} from './gitops';
