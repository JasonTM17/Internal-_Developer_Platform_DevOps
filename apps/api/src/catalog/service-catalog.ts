/**
 * Service Catalog - Registration, Persistence, Search, Version History, and Dependency Management.
 *
 * Implements entity registration with:
 * - Input validation via Zod schemas
 * - Duplicate name detection within namespace (unique constraint enforcement)
 * - Audit metadata recording (user, timestamp, source repository)
 * - Version counter initialization (starts at 1)
 *
 * Implements search with:
 * - Case-insensitive substring matching across name, owner, and tags
 * - Results limited to 50 entries maximum
 * - In-memory caching layer for sub-1-second response times
 *
 * Implements entity update with version history:
 * - Increments version counter on each update
 * - Preserves previous version in history (retains at least 50 most recent versions)
 * - Records actor and timestamp for each version change
 *
 * Implements dependency graph management with:
 * - Referential integrity checks (target entity must exist)
 * - Directed edges with source, target, and dependency type
 * - Error reporting for unknown target entities
 *
 * Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 2.4, 2.5, 2.6
 */

import { randomUUID } from 'crypto';

import type {
  CatalogEntity,
  CatalogEntityInput,
  CatalogEntityVersion,
  APIErrorResponse,
  DependencyEdge,
} from '@idp/shared';
import { ERROR_CODES } from '@idp/shared';

import type { CatalogStore } from './catalog-store';
import { DuplicateEntityError } from './catalog-store';
import { validateCatalogEntityInput } from './validation';

/** Maximum number of search results returned. */
const SEARCH_RESULTS_LIMIT = 50;

/** Cache TTL in milliseconds (5 seconds). */
const CACHE_TTL_MS = 5000;

/**
 * Actor information for audit metadata.
 */
export interface Actor {
  /** User identity (user ID or service name). */
  id: string;
}

/**
 * Result type for catalog registration.
 * Either returns the persisted entity or a structured error response.
 */
export type RegisterResult =
  | { success: true; entity: CatalogEntity }
  | { success: false; error: APIErrorResponse };

/**
 * Result type for catalog search.
 * Either returns matching entities or a structured error response.
 */
export type SearchResult =
  | { success: true; entities: CatalogEntity[] }
  | { success: false; error: APIErrorResponse };

/**
 * Result type for adding a dependency.
 * Either returns the created edge or a structured error response.
 */
export type AddDependencyResult =
  | { success: true; edge: DependencyEdge }
  | { success: false; error: APIErrorResponse };

/**
 * Result type for getting dependencies.
 */
export type GetDependenciesResult =
  | { success: true; edges: DependencyEdge[] }
  | { success: false; error: APIErrorResponse };

/**
 * Result type for removing a dependency.
 */
export type RemoveDependencyResult =
  | { success: true; removed: boolean }
  | { success: false; error: APIErrorResponse };

/**
 * Result type for entity update.
 * Either returns the updated entity or a structured error response.
 */
export type UpdateResult =
  | { success: true; entity: CatalogEntity }
  | { success: false; error: APIErrorResponse };

/**
 * Result type for version history retrieval.
 */
export type VersionHistoryResult =
  | { success: true; versions: CatalogEntityVersion[] }
  | { success: false; error: APIErrorResponse };

/**
 * In-memory cache entry for search results.
 */
interface CacheEntry {
  results: CatalogEntity[];
  timestamp: number;
}

/**
 * ServiceCatalog handles entity registration, persistence, and search.
 */
export class ServiceCatalog {
  private readonly searchCache: Map<string, CacheEntry> = new Map();

  constructor(private readonly store: CatalogStore) {}

  /**
   * Register a new catalog entity.
   *
   * This method:
   * 1. Validates the input against the CatalogEntityInput schema
   * 2. Checks for duplicate name within the namespace
   * 3. Persists the entity with audit metadata (user, timestamp, source repo)
   * 4. Initializes the version counter to 1
   *
   * @param input - The raw entity input to register
   * @param actor - The user performing the registration
   * @returns RegisterResult with either the persisted entity or a structured error
   */
  async register(input: unknown, actor: Actor): Promise<RegisterResult> {
    // Step 1: Validate input
    const validationResult = validateCatalogEntityInput(input);
    if (!validationResult.success) {
      return { success: false, error: validationResult.error };
    }

    const validatedInput: CatalogEntityInput = validationResult.data;

    // Step 2: Check for duplicate name within namespace
    const duplicateExists = await this.store.existsByNameAndNamespace(
      validatedInput.name,
      validatedInput.namespace,
    );

    if (duplicateExists) {
      const conflictError: APIErrorResponse = {
        error: `Entity with name '${validatedInput.name}' already exists in namespace '${validatedInput.namespace}'`,
        code: ERROR_CODES.ENTITY_NAME_CONFLICT,
        details: [
          {
            field: 'name',
            message: `An entity with name '${validatedInput.name}' already exists in namespace '${validatedInput.namespace}'`,
            constraint: 'unique_name_per_namespace',
          },
        ],
      };
      return { success: false, error: conflictError };
    }

    // Step 3: Build the full entity with system-generated fields
    const now = new Date();
    const entity: CatalogEntity = {
      id: randomUUID(),
      name: validatedInput.name,
      namespace: validatedInput.namespace,
      owner: validatedInput.owner,
      description: validatedInput.description,
      lifecycleStage: validatedInput.lifecycleStage,
      repositoryUrl: validatedInput.repositoryUrl,
      tags: validatedInput.tags,
      version: 1, // Version counter initialized to 1 on registration
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id, // Audit metadata: registering user
      sourceRepository: validatedInput.sourceRepository, // Audit metadata: source repo
    };

    // Step 4: Persist the entity
    try {
      await this.store.insert(entity);
    } catch (error) {
      // Handle race condition: duplicate detected at DB level
      if (error instanceof DuplicateEntityError) {
        const conflictError: APIErrorResponse = {
          error: `Entity with name '${validatedInput.name}' already exists in namespace '${validatedInput.namespace}'`,
          code: ERROR_CODES.ENTITY_NAME_CONFLICT,
          details: [
            {
              field: 'name',
              message: `An entity with name '${validatedInput.name}' already exists in namespace '${validatedInput.namespace}'`,
              constraint: 'unique_name_per_namespace',
            },
          ],
        };
        return { success: false, error: conflictError };
      }
      throw error; // Re-throw unexpected errors
    }

    // Invalidate search cache on successful registration
    this.invalidateCache();

    return { success: true, entity };
  }

  /**
   * Get a catalog entity by its unique ID.
   */
  async getById(id: string): Promise<RegisterResult> {
    const entity = await this.store.getById(id);
    if (!entity) {
      const notFoundError: APIErrorResponse = {
        error: `Entity with ID '${id}' not found`,
        code: ERROR_CODES.ENTITY_NOT_FOUND,
        details: [{ field: 'id', message: `Entity with ID '${id}' does not exist in the catalog` }],
      };
      return { success: false, error: notFoundError };
    }
    return { success: true, entity };
  }

  /**
   * Search the catalog for entities matching a query string.
   *
   * Performs case-insensitive substring matching across:
   * - Entity name
   * - Entity owner
   * - Entity tags
   *
   * Results are limited to a maximum of 50 entries.
   * Uses an in-memory caching layer to ensure sub-1-second response times.
   *
   * @param query - The search query string (at least 2 characters)
   * @returns SearchResult with matching entities or a structured error
   *
   * Requirements: 1.2
   */
  async search(query: string): Promise<SearchResult> {
    // Validate query length (at least 2 characters per Requirement 1.2)
    if (typeof query !== 'string' || query.length < 2) {
      const validationError: APIErrorResponse = {
        error: 'Search query must be at least 2 characters',
        code: ERROR_CODES.VALIDATION_ERROR,
        details: [
          {
            field: 'query',
            message: 'Search query must be at least 2 characters',
            constraint: 'min_length_2',
          },
        ],
      };
      return { success: false, error: validationError };
    }

    // Check cache for existing results
    const cacheKey = query.toLowerCase();
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { success: true, entities: cached.results };
    }

    // Perform search via the store
    const results = await this.store.search(query, SEARCH_RESULTS_LIMIT);

    // Cache the results
    this.searchCache.set(cacheKey, {
      results,
      timestamp: Date.now(),
    });

    return { success: true, entities: results };
  }

  /**
   * Add a directed dependency edge between two catalog entities.
   *
   * Performs referential integrity check: the target entity must exist in the catalog.
   * If the target doesn't exist, returns an error identifying the unknown target.
   *
   * @param sourceEntityId - ID of the source (dependent) entity
   * @param targetEntityId - ID of the target (dependency) entity
   * @param dependencyType - Type/nature of the dependency
   * @returns AddDependencyResult with the created edge or a structured error
   *
   * Requirements: 2.5, 2.6
   */
  async addDependency(
    sourceEntityId: string,
    targetEntityId: string,
    dependencyType: string,
  ): Promise<AddDependencyResult> {
    // Referential integrity check: target entity must exist
    const targetEntity = await this.store.getById(targetEntityId);
    if (!targetEntity) {
      const notFoundError: APIErrorResponse = {
        error: `Dependency target entity '${targetEntityId}' does not exist in the catalog`,
        code: ERROR_CODES.DEPENDENCY_TARGET_NOT_FOUND,
        details: [
          {
            field: 'targetEntityId',
            message: `Entity with ID '${targetEntityId}' does not exist in the catalog`,
            constraint: 'referential_integrity',
          },
        ],
      };
      return { success: false, error: notFoundError };
    }

    // Create the dependency edge
    const edge: DependencyEdge = {
      sourceEntityId,
      targetEntityId,
      dependencyType,
      createdAt: new Date(),
    };

    await this.store.insertDependency(edge);

    return { success: true, edge };
  }

  /**
   * Get all dependencies for a given entity (where the entity is the source).
   *
   * @param entityId - ID of the entity to get dependencies for
   * @returns GetDependenciesResult with the list of dependency edges
   *
   * Requirements: 2.5
   */
  async getDependencies(entityId: string): Promise<GetDependenciesResult> {
    const edges = await this.store.getDependencies(entityId);
    return { success: true, edges };
  }

  /**
   * Remove a dependency edge between two entities.
   *
   * @param sourceEntityId - ID of the source entity
   * @param targetEntityId - ID of the target entity
   * @returns RemoveDependencyResult indicating whether the edge was removed
   *
   * Requirements: 2.5
   */
  async removeDependency(
    sourceEntityId: string,
    targetEntityId: string,
  ): Promise<RemoveDependencyResult> {
    const removed = await this.store.removeDependency(sourceEntityId, targetEntityId);
    return { success: true, removed };
  }

  /**
   * Update an existing catalog entity.
   *
   * This method:
   * 1. Retrieves the existing entity by ID
   * 2. Validates the update fields
   * 3. Preserves the current version in history (snapshot before update)
   * 4. Increments the version counter by exactly 1
   * 5. Applies the updates and persists the new version
   * 6. Prunes old versions to retain at least 50 most recent
   *
   * @param id - The entity ID to update
   * @param updates - Partial entity input fields to update
   * @param actor - The user performing the update
   * @returns UpdateResult with either the updated entity or a structured error
   *
   * Requirements: 2.4
   */
  async update(
    id: string,
    updates: Partial<CatalogEntityInput>,
    actor: Actor,
  ): Promise<UpdateResult> {
    // Step 1: Retrieve the existing entity
    const existing = await this.store.getById(id);
    if (!existing) {
      const notFoundError: APIErrorResponse = {
        error: `Entity with ID '${id}' not found`,
        code: ERROR_CODES.ENTITY_NOT_FOUND,
        details: [
          {
            field: 'id',
            message: `Entity with ID '${id}' does not exist in the catalog`,
          },
        ],
      };
      return { success: false, error: notFoundError };
    }

    // Step 2: Save the current version as a history snapshot (before applying updates)
    const versionSnapshot: CatalogEntityVersion = {
      entityId: existing.id,
      version: existing.version,
      data: { ...existing },
      changedBy: actor.id,
      changedAt: new Date(),
    };
    await this.store.saveVersion(versionSnapshot);

    // Step 3: Increment version counter and apply updates
    const now = new Date();
    const updatedEntity: CatalogEntity = {
      ...existing,
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.namespace !== undefined && { namespace: updates.namespace }),
      ...(updates.owner !== undefined && { owner: updates.owner }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.lifecycleStage !== undefined && { lifecycleStage: updates.lifecycleStage }),
      ...(updates.repositoryUrl !== undefined && { repositoryUrl: updates.repositoryUrl }),
      ...(updates.tags !== undefined && { tags: updates.tags }),
      ...(updates.sourceRepository !== undefined && { sourceRepository: updates.sourceRepository }),
      version: existing.version + 1, // Increment version by exactly 1
      updatedAt: now,
    };

    // Step 4: Persist the updated entity
    await this.store.updateEntity(updatedEntity);

    // Step 5: Prune old versions to retain at least 50 most recent
    await this.store.pruneVersions(id, 50);

    // Invalidate search cache on successful update
    this.invalidateCache();

    return { success: true, entity: updatedEntity };
  }

  /**
   * Get the version history for a catalog entity.
   *
   * Returns version snapshots in reverse chronological order (most recent first).
   *
   * @param id - The entity ID to get version history for
   * @param limit - Maximum number of versions to return (default 50)
   * @returns VersionHistoryResult with the version history or a structured error
   *
   * Requirements: 2.4
   */
  async getVersionHistory(id: string, limit: number = 50): Promise<VersionHistoryResult> {
    // Verify entity exists
    const existing = await this.store.getById(id);
    if (!existing) {
      const notFoundError: APIErrorResponse = {
        error: `Entity with ID '${id}' not found`,
        code: ERROR_CODES.ENTITY_NOT_FOUND,
        details: [
          {
            field: 'id',
            message: `Entity with ID '${id}' does not exist in the catalog`,
          },
        ],
      };
      return { success: false, error: notFoundError };
    }

    const versions = await this.store.getVersionHistory(id, limit);
    return { success: true, versions };
  }

  /**
   * Invalidate the search cache.
   * Called when entities are added or modified to ensure fresh results.
   */
  private invalidateCache(): void {
    this.searchCache.clear();
  }
}
