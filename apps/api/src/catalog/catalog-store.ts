/**
 * Catalog Store interface for database persistence.
 *
 * Defines the contract for the data access layer used by the ServiceCatalog.
 * This allows for dependency injection and testability.
 *
 * Requirements: 1.1, 1.3, 1.5, 1.6, 2.4, 2.5, 2.6
 */

import type { CatalogEntity, CatalogEntityVersion, DependencyEdge } from '@idp/shared';

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

  /**
   * Search entities by case-insensitive substring match across name, owner, and tags.
   * @param query - The search query string (at least 2 characters)
   * @param limit - Maximum number of results to return (default 50)
   * @returns Matching entities up to the specified limit
   */
  search(query: string, limit?: number): Promise<CatalogEntity[]>;

  /**
   * Store a directed dependency edge between two entities.
   */
  insertDependency(edge: DependencyEdge): Promise<void>;

  /**
   * Retrieve all dependency edges where the given entity is the source.
   */
  getDependencies(entityId: string): Promise<DependencyEdge[]>;

  /**
   * Remove a dependency edge between source and target entities.
   * @returns true if the edge was found and removed, false if it didn't exist
   */
  removeDependency(sourceEntityId: string, targetEntityId: string): Promise<boolean>;

  /**
   * Update an existing entity in the store.
   * Replaces the entity data with the provided entity (which should have an incremented version).
   */
  updateEntity(entity: CatalogEntity): Promise<void>;

  /**
   * Save a version history snapshot for an entity.
   */
  saveVersion(version: CatalogEntityVersion): Promise<void>;

  /**
   * Retrieve version history for an entity, ordered by version descending.
   * @param entityId - The entity ID to get history for
   * @param limit - Maximum number of versions to return (default 50)
   * @returns Array of version snapshots, most recent first
   */
  getVersionHistory(entityId: string, limit?: number): Promise<CatalogEntityVersion[]>;

  /**
   * Prune old versions for an entity, retaining only the most recent `retain` versions.
   * @param entityId - The entity ID to prune versions for
   * @param retain - Number of most recent versions to retain (default 50)
   */
  pruneVersions(entityId: string, retain?: number): Promise<void>;
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
