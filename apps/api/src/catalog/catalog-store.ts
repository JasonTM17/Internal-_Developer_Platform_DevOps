/**
 * Catalog Store interface for database persistence.
 *
 * Defines the contract for the data access layer used by the ServiceCatalog.
 * This allows for dependency injection and testability.
 *
 * Requirements: 1.1, 1.3, 1.5, 1.6
 */

import type { CatalogEntity } from '@idp/shared';

/**
 * Row representation of a catalog entity as stored in the database.
 */
export interface CatalogEntityRow {
  id: string;
  name: string;
  namespace: string;
  owner: string;
  description: string;
  lifecycle_stage: string;
  repository_url: string;
  tags: string[];
  version: number;
  source_repository: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface for the database layer that the ServiceCatalog depends on.
 * Implementations can use PostgreSQL, in-memory stores for testing, etc.
 */
export interface CatalogStore {
  /**
   * Insert a new catalog entity into the store.
   * @throws {DuplicateEntityError} if an entity with the same name+namespace already exists
   */
  insert(entity: CatalogEntity): Promise<void>;

  /**
   * Check if an entity with the given name exists in the specified namespace.
   * @returns true if a duplicate exists, false otherwise
   */
  existsByNameAndNamespace(name: string, namespace: string): Promise<boolean>;

  /**
   * Retrieve an entity by its unique ID.
   * @returns The entity or null if not found
   */
  getById(id: string): Promise<CatalogEntity | null>;
}

/**
 * Error thrown when attempting to insert a duplicate entity (same name+namespace).
 */
export class DuplicateEntityError extends Error {
  constructor(
    public readonly name: string,
    public readonly namespace: string,
  ) {
    super(`Entity with name '${name}' already exists in namespace '${namespace}'`);
    this.name = 'DuplicateEntityError';
  }
}
