/**
 * Configuration Store Interface
 *
 * Data access layer for configuration persistence with encryption support.
 * Defines the contract for storing, retrieving, and versioning configuration entries.
 */

import type { ConfigScope, ConfigValueType } from './config-service';

/** Configuration entry record. */
export interface ConfigEntry {
  id: string;
  key: string;
  value: string;
  scope: ConfigScope;
  scopeId?: string;
  valueType: ConfigValueType;
  description: string;
  validationSchema?: string;
  tags: string[];
  version: number;
  isEncrypted: boolean;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

/** Configuration version history record. */
export interface ConfigVersion {
  configId: string;
  version: number;
  value: string;
  changedBy: string;
  changedAt: Date;
}

/**
 * Configuration Store interface.
 */
export interface ConfigStore {
  /** Create a new configuration entry. */
  create(entry: ConfigEntry): Promise<void>;

  /** Get a configuration entry by key, scope, and optional scope ID. */
  get(key: string, scope: ConfigScope, scopeId?: string): Promise<ConfigEntry | null>;

  /** Get a configuration entry by its unique ID. */
  getById(id: string): Promise<ConfigEntry | null>;

  /** Update an existing configuration entry. */
  update(entry: ConfigEntry): Promise<void>;

  /** Delete a configuration entry by ID. */
  delete(id: string): Promise<void>;

  /** List all configuration entries for a given scope. */
  listByScope(scope: ConfigScope, scopeId?: string): Promise<ConfigEntry[]>;

  /** Search configuration entries by key pattern. */
  searchByKey(pattern: string, scope?: ConfigScope): Promise<ConfigEntry[]>;

  /** Save a version history record. */
  saveVersion(version: ConfigVersion): Promise<void>;

  /** Get version history for a configuration entry. */
  getVersionHistory(configId: string, limit?: number): Promise<ConfigVersion[]>;

  /** List all configuration entries with optional tag filter. */
  listByTags(tags: string[]): Promise<ConfigEntry[]>;
}

/**
 * In-memory implementation of ConfigStore for testing.
 */
export class InMemoryConfigStore implements ConfigStore {
  private readonly entries: Map<string, ConfigEntry> = new Map();
  private readonly versions: Map<string, ConfigVersion[]> = new Map();

  async create(entry: ConfigEntry): Promise<void> {
    this.entries.set(entry.id, { ...entry });
  }

  async get(key: string, scope: ConfigScope, scopeId?: string): Promise<ConfigEntry | null> {
    for (const entry of this.entries.values()) {
      if (entry.key === key && entry.scope === scope) {
        if (scope === 'global' || entry.scopeId === scopeId) {
          return { ...entry };
        }
      }
    }
    return null;
  }

  async getById(id: string): Promise<ConfigEntry | null> {
    const entry = this.entries.get(id);
    return entry ? { ...entry } : null;
  }

  async update(entry: ConfigEntry): Promise<void> {
    this.entries.set(entry.id, { ...entry });
  }

  async delete(id: string): Promise<void> {
    this.entries.delete(id);
  }

  async listByScope(scope: ConfigScope, scopeId?: string): Promise<ConfigEntry[]> {
    const results: ConfigEntry[] = [];
    for (const entry of this.entries.values()) {
      if (entry.scope === scope) {
        if (scope === 'global' || entry.scopeId === scopeId) {
          results.push({ ...entry });
        }
      }
    }
    return results.sort((a, b) => a.key.localeCompare(b.key));
  }

  async searchByKey(pattern: string, scope?: ConfigScope): Promise<ConfigEntry[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
    const results: ConfigEntry[] = [];
    for (const entry of this.entries.values()) {
      if (regex.test(entry.key)) {
        if (!scope || entry.scope === scope) {
          results.push({ ...entry });
        }
      }
    }
    return results;
  }

  async saveVersion(version: ConfigVersion): Promise<void> {
    if (!this.versions.has(version.configId)) {
      this.versions.set(version.configId, []);
    }
    this.versions.get(version.configId)!.push({ ...version });
  }

  async getVersionHistory(configId: string, limit = 50): Promise<ConfigVersion[]> {
    const history = this.versions.get(configId) || [];
    return history
      .sort((a, b) => b.version - a.version)
      .slice(0, limit);
  }

  async listByTags(tags: string[]): Promise<ConfigEntry[]> {
    const results: ConfigEntry[] = [];
    for (const entry of this.entries.values()) {
      if (tags.some((tag) => entry.tags.includes(tag))) {
        results.push({ ...entry });
      }
    }
    return results;
  }

  /** Clear all data (for testing). */
  clear(): void {
    this.entries.clear();
    this.versions.clear();
  }
}
