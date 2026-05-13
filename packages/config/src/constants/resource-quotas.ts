/**
 * Environment type to resource quota mappings.
 *
 * Defines the resource limits for each environment type as specified
 * in Requirement 6.5.
 *
 * Validates: Requirements 6.5
 */

import type { ResourceQuota, EnvironmentType } from '../schemas/environment';

/**
 * Resource quota profiles for each environment type.
 *
 * - development: CPU limit 4 cores, memory limit 8 GiB, storage limit 50 GiB
 * - staging: CPU limit 8 cores, memory limit 16 GiB, storage limit 100 GiB
 * - production: CPU limit 16 cores, memory limit 32 GiB, storage limit 200 GiB
 */
export const ENVIRONMENT_RESOURCE_QUOTAS: Record<EnvironmentType, ResourceQuota> = {
  development: {
    cpuLimit: '4',
    memoryLimit: '8Gi',
    storageLimit: '50Gi',
  },
  staging: {
    cpuLimit: '8',
    memoryLimit: '16Gi',
    storageLimit: '100Gi',
  },
  production: {
    cpuLimit: '16',
    memoryLimit: '32Gi',
    storageLimit: '200Gi',
  },
} as const;

/**
 * Get the resource quota for a given environment type.
 */
export function getResourceQuotaForType(type: EnvironmentType): ResourceQuota {
  return ENVIRONMENT_RESOURCE_QUOTAS[type];
}
