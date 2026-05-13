/**
 * Service Catalog interfaces and types.
 *
 * Defines the entity model for catalog services including registration,
 * versioning, and dependency management.
 */

/** Allowed lifecycle stages for a catalog entity. */
export type LifecycleStage = 'experimental' | 'development' | 'production' | 'deprecated';

/** Dependency type between catalog entities. */
export type DependencyType = string;

/**
 * A registered service or component in the Service Catalog.
 */
export interface CatalogEntity {
  /** Unique identifier (UUID). */
  id: string;
  /** Entity name, 1-128 characters, unique within namespace. */
  name: string;
  /** Logical grouping identifier. */
  namespace: string;
  /** Owner identifier, 1-128 characters. */
  owner: string;
  /** Entity description, 1-1024 characters. */
  description: string;
  /** Current lifecycle stage. */
  lifecycleStage: LifecycleStage;
  /** Repository URL in valid URL format. */
  repositoryUrl: string;
  /** Tags for discovery, 0-20 tags each 1-64 characters. */
  tags: string[];
  /** Auto-incremented version counter. */
  version: number;
  /** Timestamp of entity creation. */
  createdAt: Date;
  /** Timestamp of last update. */
  updatedAt: Date;
  /** Identity of the registering user. */
  createdBy: string;
  /** Source repository audit metadata. */
  sourceRepository: string;
}

/**
 * Input for registering or updating a catalog entity.
 * Excludes system-generated fields (id, version, timestamps, createdBy).
 */
export interface CatalogEntityInput {
  /** Entity name, 1-128 characters. */
  name: string;
  /** Logical grouping identifier. */
  namespace: string;
  /** Owner identifier, 1-128 characters. */
  owner: string;
  /** Entity description, 1-1024 characters. */
  description: string;
  /** Lifecycle stage. */
  lifecycleStage: LifecycleStage;
  /** Repository URL in valid URL format. */
  repositoryUrl: string;
  /** Tags for discovery, 0-20 tags each 1-64 characters. */
  tags: string[];
  /** Source repository for audit metadata. */
  sourceRepository: string;
}

/**
 * A historical version snapshot of a catalog entity.
 */
export interface CatalogEntityVersion {
  /** ID of the entity this version belongs to. */
  entityId: string;
  /** Version number at the time of this snapshot. */
  version: number;
  /** Full entity data at this version. */
  data: CatalogEntity;
  /** Identity of the user who made this change. */
  changedBy: string;
  /** Timestamp of the change. */
  changedAt: Date;
}

/**
 * A directed dependency edge between two catalog entities.
 */
export interface DependencyEdge {
  /** ID of the source (dependent) entity. */
  sourceEntityId: string;
  /** ID of the target (dependency) entity. */
  targetEntityId: string;
  /** Type/nature of the dependency. */
  dependencyType: DependencyType;
  /** Timestamp when the dependency was declared. */
  createdAt: Date;
}
