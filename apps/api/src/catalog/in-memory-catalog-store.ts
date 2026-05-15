/* eslint-disable @typescript-eslint/require-await */
/**
 * In-memory implementation of CatalogStore for testing.
 *
 * Provides a simple Map-based store that enforces the same constraints
 * as the PostgreSQL implementation (unique name+namespace).
 */

import type { CatalogEntity, CatalogEntityVersion, DependencyEdge } from '@idp/shared';

import type { CatalogStore } from './catalog-store';
import { DuplicateEntityError } from './catalog-store';

/**
 * In-memory catalog store for unit and property-based testing.
 */
export class InMemoryCatalogStore implements CatalogStore {
  private entities: Map<string, CatalogEntity> = new Map();
  private dependencies: DependencyEdge[] = [];
  private versions: Map<string, CatalogEntityVersion[]> = new Map();

  async insert(entity: CatalogEntity): Promise<void> {
    // Enforce unique constraint on (name, namespace)
    const duplicate = this.findByNameAndNamespace(entity.name, entity.namespace);
    if (duplicate) {
      throw new DuplicateEntityError(entity.name, entity.namespace);
    }
    this.entities.set(entity.id, { ...entity });
  }

  async existsByNameAndNamespace(name: string, namespace: string): Promise<boolean> {
    return this.findByNameAndNamespace(name, namespace) !== undefined;
  }

  async getById(id: string): Promise<CatalogEntity | null> {
    const entity = this.entities.get(id);
    return entity ? { ...entity } : null;
  }

  async search(query: string, limit: number = 50): Promise<CatalogEntity[]> {
    const lowerQuery = query.toLowerCase();
    const results: CatalogEntity[] = [];

    for (const entity of this.entities.values()) {
      if (results.length >= limit) break;

      const nameMatch = entity.name.toLowerCase().includes(lowerQuery);
      const ownerMatch = entity.owner.toLowerCase().includes(lowerQuery);
      const tagMatch = entity.tags.some((tag: string) => tag.toLowerCase().includes(lowerQuery));

      if (nameMatch || ownerMatch || tagMatch) {
        results.push({ ...entity });
      }
    }

    return results;
  }

  async insertDependency(edge: DependencyEdge): Promise<void> {
    this.dependencies.push({ ...edge });
  }

  async getDependencies(entityId: string): Promise<DependencyEdge[]> {
    return this.dependencies
      .filter((edge) => edge.sourceEntityId === entityId)
      .map((edge) => ({ ...edge }));
  }

  async removeDependency(sourceEntityId: string, targetEntityId: string): Promise<boolean> {
    const index = this.dependencies.findIndex(
      (edge) => edge.sourceEntityId === sourceEntityId && edge.targetEntityId === targetEntityId,
    );
    if (index === -1) return false;
    this.dependencies.splice(index, 1);
    return true;
  }

  async updateEntity(entity: CatalogEntity): Promise<void> {
    if (!this.entities.has(entity.id)) {
      throw new Error(`Entity with id '${entity.id}' not found`);
    }
    this.entities.set(entity.id, { ...entity });
  }

  async saveVersion(version: CatalogEntityVersion): Promise<void> {
    const entityVersions = this.versions.get(version.entityId) ?? [];
    entityVersions.push({ ...version, data: { ...version.data } });
    this.versions.set(version.entityId, entityVersions);
  }

  async getVersionHistory(entityId: string, limit: number = 50): Promise<CatalogEntityVersion[]> {
    const entityVersions = this.versions.get(entityId) ?? [];
    // Return sorted by version descending, limited
    return entityVersions
      .slice()
      .sort((a, b) => b.version - a.version)
      .slice(0, limit)
      .map((v) => ({ ...v, data: { ...v.data } }));
  }

  async pruneVersions(entityId: string, retain: number = 50): Promise<void> {
    const entityVersions = this.versions.get(entityId) ?? [];
    if (entityVersions.length <= retain) return;

    // Sort by version descending and keep only the most recent `retain` versions
    const sorted = entityVersions.slice().sort((a, b) => b.version - a.version);
    this.versions.set(entityId, sorted.slice(0, retain));
  }

  /**
   * Helper: find an entity by name and namespace (case-sensitive match for uniqueness).
   */
  private findByNameAndNamespace(name: string, namespace: string): CatalogEntity | undefined {
    for (const entity of this.entities.values()) {
      if (entity.name === name && entity.namespace === namespace) {
        return entity;
      }
    }
    return undefined;
  }

  /**
   * Get all stored entities (useful for test assertions).
   */
  getAll(): CatalogEntity[] {
    return Array.from(this.entities.values()).map((e) => ({ ...e }));
  }

  /**
   * Clear all stored entities (useful for test setup/teardown).
   */
  clear(): void {
    this.entities.clear();
    this.dependencies = [];
    this.versions.clear();
  }

  /**
   * Get the count of stored entities.
   */
  size(): number {
    return this.entities.size;
  }

  /**
   * Get the count of version history entries for an entity (useful for test assertions).
   */
  getVersionCount(entityId: string): number {
    return (this.versions.get(entityId) ?? []).length;
  }
}
