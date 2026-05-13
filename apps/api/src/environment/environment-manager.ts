/**
 * Environment Manager
 *
 * Manages environment provisioning and lifecycle:
 * - Create, update, and delete environments
 * - Environment promotion (dev → staging → production)
 * - Resource quota management
 * - Environment variable management with secret masking
 * - Environment health monitoring
 * - Namespace isolation enforcement
 */

import { randomUUID } from 'crypto';
import type { EnvironmentStore, Environment, EnvironmentVariable } from './environment-store';

/** Environment tier determines resource limits and policies. */
export type EnvironmentTier = 'development' | 'staging' | 'production' | 'preview';

/** Environment status. */
export type EnvironmentStatus = 'provisioning' | 'active' | 'degraded' | 'maintenance' | 'decommissioning' | 'deleted';

/** Resource quota configuration. */
export interface ResourceQuota {
  /** Maximum CPU cores */
  maxCpuCores: number;
  /** Maximum memory in MB */
  maxMemoryMb: number;
  /** Maximum storage in GB */
  maxStorageGb: number;
  /** Maximum number of pods/containers */
  maxInstances: number;
  /** Maximum number of services */
  maxServices: number;
}

/** Default resource quotas per tier. */
const DEFAULT_QUOTAS: Record<EnvironmentTier, ResourceQuota> = {
  development: {
    maxCpuCores: 4,
    maxMemoryMb: 8192,
    maxStorageGb: 50,
    maxInstances: 10,
    maxServices: 20,
  },
  staging: {
    maxCpuCores: 8,
    maxMemoryMb: 16384,
    maxStorageGb: 100,
    maxInstances: 20,
    maxServices: 50,
  },
  production: {
    maxCpuCores: 32,
    maxMemoryMb: 65536,
    maxStorageGb: 500,
    maxInstances: 100,
    maxServices: 200,
  },
  preview: {
    maxCpuCores: 2,
    maxMemoryMb: 4096,
    maxStorageGb: 20,
    maxInstances: 5,
    maxServices: 10,
  },
};

/** Environment creation request. */
export interface CreateEnvironmentRequest {
  name: string;
  tier: EnvironmentTier;
  description?: string;
  region?: string;
  clusterName?: string;
  namespace?: string;
  quota?: Partial<ResourceQuota>;
  variables?: Array<{ key: string; value: string; isSecret?: boolean }>;
  labels?: Record<string, string>;
  autoScaling?: boolean;
  ttlHours?: number; // For preview environments
}

/** Environment update request. */
export interface UpdateEnvironmentRequest {
  description?: string;
  quota?: Partial<ResourceQuota>;
  labels?: Record<string, string>;
  autoScaling?: boolean;
  status?: EnvironmentStatus;
}

/** Result type for environment operations. */
export interface EnvironmentResult {
  success: boolean;
  environment?: Environment;
  error?: string;
}

/**
 * Environment Manager - handles environment lifecycle operations.
 */
export class EnvironmentManager {
  constructor(private readonly store: EnvironmentStore) {}

  /**
   * Create a new environment.
   */
  async create(request: CreateEnvironmentRequest, actor: string): Promise<EnvironmentResult> {
    // Validate the request
    const validation = this.validateCreateRequest(request);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    // Check for duplicate name
    const existing = await this.store.getByName(request.name);
    if (existing) {
      return { success: false, error: `Environment '${request.name}' already exists` };
    }

    // Build the environment record
    const quota: ResourceQuota = {
      ...DEFAULT_QUOTAS[request.tier],
      ...(request.quota || {}),
    };

    const environment: Environment = {
      id: randomUUID(),
      name: request.name,
      tier: request.tier,
      status: 'provisioning',
      description: request.description || '',
      region: request.region || 'us-east-1',
      clusterName: request.clusterName || `cluster-${request.tier}`,
      namespace: request.namespace || `ns-${request.name}`,
      quota,
      labels: request.labels || {},
      autoScaling: request.autoScaling ?? (request.tier === 'production'),
      ttlHours: request.ttlHours,
      createdBy: actor,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Persist the environment
    await this.store.create(environment);

    // Add environment variables if provided
    if (request.variables && request.variables.length > 0) {
      for (const variable of request.variables) {
        await this.store.setVariable(environment.id, {
          key: variable.key,
          value: variable.value,
          isSecret: variable.isSecret || false,
          environmentId: environment.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Mark as active after provisioning
    await this.store.updateStatus(environment.id, 'active');
    environment.status = 'active';

    return { success: true, environment };
  }

  /**
   * Update an existing environment.
   */
  async update(id: string, request: UpdateEnvironmentRequest, actor: string): Promise<EnvironmentResult> {
    const existing = await this.store.getById(id);
    if (!existing) {
      return { success: false, error: `Environment '${id}' not found` };
    }

    if (existing.status === 'deleted') {
      return { success: false, error: 'Cannot update a deleted environment' };
    }

    // Apply updates
    const updated: Environment = {
      ...existing,
      description: request.description ?? existing.description,
      quota: request.quota ? { ...existing.quota, ...request.quota } : existing.quota,
      labels: request.labels ?? existing.labels,
      autoScaling: request.autoScaling ?? existing.autoScaling,
      status: request.status ?? existing.status,
      updatedAt: new Date(),
    };

    await this.store.update(updated);

    return { success: true, environment: updated };
  }

  /**
   * Delete (decommission) an environment.
   */
  async delete(id: string, actor: string): Promise<EnvironmentResult> {
    const existing = await this.store.getById(id);
    if (!existing) {
      return { success: false, error: `Environment '${id}' not found` };
    }

    if (existing.tier === 'production') {
      return { success: false, error: 'Production environments cannot be deleted via API. Use manual decommission process.' };
    }

    if (existing.status === 'deleted') {
      return { success: false, error: 'Environment is already deleted' };
    }

    await this.store.updateStatus(id, 'decommissioning');
    // In a real system, this would trigger resource cleanup
    await this.store.updateStatus(id, 'deleted');

    return { success: true, environment: { ...existing, status: 'deleted' } };
  }

  /**
   * Promote an environment's configuration to the next tier.
   * dev → staging → production
   */
  async promote(sourceId: string, targetTier: EnvironmentTier, actor: string): Promise<EnvironmentResult> {
    const source = await this.store.getById(sourceId);
    if (!source) {
      return { success: false, error: `Source environment '${sourceId}' not found` };
    }

    // Validate promotion path
    const validPromotions: Record<EnvironmentTier, EnvironmentTier[]> = {
      development: ['staging'],
      staging: ['production'],
      production: [],
      preview: ['development'],
    };

    if (!validPromotions[source.tier].includes(targetTier)) {
      return {
        success: false,
        error: `Cannot promote from '${source.tier}' to '${targetTier}'. Valid targets: ${validPromotions[source.tier].join(', ') || 'none'}`,
      };
    }

    // Get non-secret variables from source
    const variables = await this.store.getVariables(sourceId);
    const nonSecretVars = variables
      .filter((v) => !v.isSecret)
      .map((v) => ({ key: v.key, value: v.value, isSecret: false }));

    // Create the promoted environment
    const promotedName = `${source.name}-${targetTier}`;
    return this.create(
      {
        name: promotedName,
        tier: targetTier,
        description: `Promoted from ${source.name} (${source.tier})`,
        region: source.region,
        variables: nonSecretVars,
        labels: { ...source.labels, promotedFrom: source.id },
      },
      actor,
    );
  }

  /**
   * Set an environment variable.
   */
  async setVariable(
    environmentId: string,
    key: string,
    value: string,
    isSecret: boolean,
    actor: string,
  ): Promise<{ success: boolean; error?: string }> {
    const env = await this.store.getById(environmentId);
    if (!env) {
      return { success: false, error: `Environment '${environmentId}' not found` };
    }

    // Validate key format
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
      return { success: false, error: 'Variable key must be uppercase alphanumeric with underscores, starting with a letter' };
    }

    await this.store.setVariable(environmentId, {
      key,
      value,
      isSecret,
      environmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true };
  }

  /**
   * Get environment variables (secrets are masked).
   */
  async getVariables(environmentId: string): Promise<EnvironmentVariable[]> {
    const variables = await this.store.getVariables(environmentId);
    return variables.map((v) => ({
      ...v,
      value: v.isSecret ? '********' : v.value,
    }));
  }

  /**
   * List all environments with optional filters.
   */
  async list(filters?: {
    tier?: EnvironmentTier;
    status?: EnvironmentStatus;
    region?: string;
  }): Promise<Environment[]> {
    return this.store.list(filters);
  }

  /**
   * Get an environment by ID.
   */
  async getById(id: string): Promise<Environment | null> {
    return this.store.getById(id);
  }

  /**
   * Validate a create environment request.
   */
  private validateCreateRequest(request: CreateEnvironmentRequest): { success: boolean; error?: string } {
    if (!request.name || request.name.trim().length < 3) {
      return { success: false, error: 'Environment name must be at least 3 characters' };
    }

    if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(request.name)) {
      return { success: false, error: 'Environment name must be lowercase alphanumeric with hyphens, starting and ending with a letter/number' };
    }

    if (request.name.length > 63) {
      return { success: false, error: 'Environment name must not exceed 63 characters (Kubernetes namespace limit)' };
    }

    const validTiers: EnvironmentTier[] = ['development', 'staging', 'production', 'preview'];
    if (!validTiers.includes(request.tier)) {
      return { success: false, error: `Invalid tier '${request.tier}'. Must be one of: ${validTiers.join(', ')}` };
    }

    if (request.ttlHours !== undefined && request.tier !== 'preview') {
      return { success: false, error: 'TTL is only supported for preview environments' };
    }

    return { success: true };
  }
}
