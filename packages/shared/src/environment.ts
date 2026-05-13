/**
 * Environment interfaces and types.
 *
 * Defines the environment provisioning model including resource quotas,
 * labels, lifecycle status, and provisioning requests.
 */

/**
 * Environment type determining resource allocation profile.
 */
export type EnvironmentType = 'development' | 'staging' | 'production';

/**
 * Environment lifecycle status.
 */
export type EnvironmentStatus =
  | 'provisioning'
  | 'active'
  | 'expiring'
  | 'deprovisioning'
  | 'deleted';

/**
 * Resource quota limits for an environment.
 */
export interface ResourceQuota {
  /** CPU limit in cores (e.g., "4"). */
  cpuLimit: string;
  /** Memory limit (e.g., "8Gi"). */
  memoryLimit: string;
  /** Storage limit (e.g., "50Gi"). */
  storageLimit: string;
}

/**
 * Standard labels applied to environment namespaces.
 */
export interface EnvironmentLabels {
  /** Team that owns the environment. */
  team: string;
  /** Type of environment (development, staging, production). */
  environmentType: string;
  /** Identity of the user who created the environment. */
  createdBy: string;
  /** Expiry date as ISO date string. */
  expiryDate: string;
}

/**
 * A provisioned environment with its full metadata.
 */
export interface Environment {
  /** Unique identifier (UUID). */
  id: string;
  /** Environment name. */
  name: string;
  /** Environment type determining resource profile. */
  type: EnvironmentType;
  /** Kubernetes namespace name. */
  namespace: string;
  /** Identity of the user who provisioned the environment. */
  owner: string;
  /** Team that owns the environment. */
  team: string;
  /** Current lifecycle status. */
  status: EnvironmentStatus;
  /** Resource quota applied to this environment. */
  resourceQuota: ResourceQuota;
  /** Standard labels applied to the namespace. */
  labels: EnvironmentLabels;
  /** Configured expiry date. */
  expiryDate: Date;
  /** Timestamp of environment creation. */
  createdAt: Date;
  /** Timestamp of last update. */
  updatedAt: Date;
}

/**
 * Input for requesting a new environment.
 */
export interface EnvironmentRequest {
  /** Desired environment name. */
  name: string;
  /** Environment type (determines resource quota profile). */
  type: EnvironmentType;
  /** Team that will own the environment. */
  team: string;
  /** Days until expiry, defaults to 30 if not specified. */
  expiryDays?: number;
}
