/**
 * In-memory implementation of CatalogStore for testing.
 *
 * Provides a simple Map-based store that enforces the same constraints
 * as the PostgreSQL implementation (unique name+namespace).
 */

import type { CatalogEntity } from '@idp/shared';
import type { CatalogStore } from './catalog-store';
import { DuplicateEntityError } from './catalog-store';

/**
 * In-memory catalog store for unit and property-based testing.
 */
export class InMemoryCatalogStore implements CatalogStore {
  private entities: Map<string, CatalogEntity> = new Map();

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
  }

  /**
   * Get the count of stored entities.
   */
  size(): number {
    return this.entities.size;
  }
}
