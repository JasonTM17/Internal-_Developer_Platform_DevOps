/**
 * Environment Store Interface
 *
 * Data access layer for environment persistence.
 * Defines the contract for storing and retrieving environment records
 * and their associated variables/secrets.
 */

import type { EnvironmentTier, EnvironmentStatus, ResourceQuota } from './environment-manager';

/** Environment record. */
export interface Environment {
  id: string;
  name: string;
  tier: EnvironmentTier;
  status: EnvironmentStatus;
  description: string;
  region: string;
  clusterName: string;
  namespace: string;
  quota: ResourceQuota;
  labels: Record<string, string>;
  autoScaling: boolean;
  ttlHours?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Environment variable record. */
export interface EnvironmentVariable {
  key: string;
  value: string;
  isSecret: boolean;
  environmentId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Filters for listing environments. */
export interface EnvironmentListFilters {
  tier?: EnvironmentTier;
  status?: EnvironmentStatus;
  region?: string;
  createdBy?: string;
  label?: { key: string; value: string };
}

/**
 * Environment Store interface.
 */
export interface EnvironmentStore {
  /** Create a new environment record. */
  create(environment: Environment): Promise<void>;

  /** Get an environment by ID. */
  getById(id: string): Promise<Environment | null>;

  /** Get an environment by name. */
  getByName(name: string): Promise<Environment | null>;

  /** Update an environment record. */
  update(environment: Environment): Promise<void>;

  /** Update the status of an environment. */
  updateStatus(id: string, status: EnvironmentStatus): Promise<void>;

  /** List environments with optional filters. */
  list(filters?: EnvironmentListFilters): Promise<Environment[]>;

  /** Delete an environment record. */
  delete(id: string): Promise<void>;

  /** Set an environment variable. */
  setVariable(environmentId: string, variable: EnvironmentVariable): Promise<void>;

  /** Get all variables for an environment. */
  getVariables(environmentId: string): Promise<EnvironmentVariable[]>;

  /** Delete an environment variable. */
  deleteVariable(environmentId: string, key: string): Promise<void>;
}

/**
 * In-memory implementation of EnvironmentStore for testing.
 */
export class InMemoryEnvironmentStore implements EnvironmentStore {
  private readonly environments: Map<string, Environment> = new Map();
  private readonly variables: Map<string, Map<string, EnvironmentVariable>> = new Map();

  async create(environment: Environment): Promise<void> {
    this.environments.set(environment.id, { ...environment });
    this.variables.set(environment.id, new Map());
  }

  async getById(id: string): Promise<Environment | null> {
    return this.environments.get(id) || null;
  }

  async getByName(name: string): Promise<Environment | null> {
    for (const env of this.environments.values()) {
      if (env.name === name) return env;
    }
    return null;
  }

  async update(environment: Environment): Promise<void> {
    this.environments.set(environment.id, { ...environment });
  }

  async updateStatus(id: string, status: EnvironmentStatus): Promise<void> {
    const env = this.environments.get(id);
    if (env) {
      env.status = status;
      env.updatedAt = new Date();
    }
  }

  async list(filters?: EnvironmentListFilters): Promise<Environment[]> {
    let results = Array.from(this.environments.values());

    if (filters?.tier) {
      results = results.filter((e) => e.tier === filters.tier);
    }
    if (filters?.status) {
      results = results.filter((e) => e.status === filters.status);
    }
    if (filters?.region) {
      results = results.filter((e) => e.region === filters.region);
    }
    if (filters?.createdBy) {
      results = results.filter((e) => e.createdBy === filters.createdBy);
    }
    if (filters?.label) {
      results = results.filter((e) => e.labels[filters.label!.key] === filters.label!.value);
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async delete(id: string): Promise<void> {
    this.environments.delete(id);
    this.variables.delete(id);
  }

  async setVariable(environmentId: string, variable: EnvironmentVariable): Promise<void> {
    if (!this.variables.has(environmentId)) {
      this.variables.set(environmentId, new Map());
    }
    this.variables.get(environmentId)!.set(variable.key, { ...variable });
  }

  async getVariables(environmentId: string): Promise<EnvironmentVariable[]> {
    const vars = this.variables.get(environmentId);
    if (!vars) return [];
    return Array.from(vars.values());
  }

  async deleteVariable(environmentId: string, key: string): Promise<void> {
    const vars = this.variables.get(environmentId);
    if (vars) {
      vars.delete(key);
    }
  }

  /** Clear all data (for testing). */
  clear(): void {
    this.environments.clear();
    this.variables.clear();
  }
}
