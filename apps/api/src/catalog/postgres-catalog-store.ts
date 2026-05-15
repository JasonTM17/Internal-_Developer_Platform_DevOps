/**
 * PostgreSQL implementation of CatalogStore.
 *
 * Provides persistent storage for catalog entities using PostgreSQL.
 * Enforces unique constraint on (name, namespace) at the database level.
 *
 * Requirements: 1.1, 1.3, 1.5, 1.6, 2.4, 2.5, 2.6
 */

import type { CatalogEntity, CatalogEntityVersion, DependencyEdge } from '@idp/shared';

import type { DatabasePool } from '../db';

import type { CatalogStore } from './catalog-store';
import { DuplicateEntityError } from './catalog-store';

/**
 * Row shape returned from the catalog_entities table.
 */
interface CatalogEntityDbRow extends Record<string, unknown> {
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
  created_at: string | Date;
  updated_at: string | Date;
}

/**
 * Row shape returned from the catalog_entity_versions table.
 */
interface CatalogEntityVersionDbRow extends Record<string, unknown> {
  id: string;
  entity_id: string;
  version: number;
  data: CatalogEntity;
  changed_by: string;
  changed_at: string | Date;
}

/**
 * Row shape returned from a dependency edge query.
 */
interface DependencyEdgeDbRow extends Record<string, unknown> {
  source_entity_id: string;
  target_entity_id: string;
  dependency_type: string;
  created_at: string | Date;
}

/**
 * PostgreSQL-backed catalog store implementation.
 *
 * Uses parameterized queries to prevent SQL injection.
 * Relies on the database unique constraint for (name, namespace) enforcement.
 */
export class PostgresCatalogStore implements CatalogStore {
  constructor(private readonly pool: DatabasePool) {}

  /**
   * Insert a new catalog entity.
   * @throws {DuplicateEntityError} if unique constraint on (name, namespace) is violated
   */
  async insert(entity: CatalogEntity): Promise<void> {
    const sql = `
      INSERT INTO catalog_entities (
        id, name, namespace, owner, description, lifecycle_stage,
        repository_url, tags, version, source_repository, created_by,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;

    const params = [
      entity.id,
      entity.name,
      entity.namespace,
      entity.owner,
      entity.description,
      entity.lifecycleStage,
      entity.repositoryUrl,
      entity.tags,
      entity.version,
      entity.sourceRepository,
      entity.createdBy,
      entity.createdAt,
      entity.updatedAt,
    ];

    try {
      await this.pool.query(sql, params);
    } catch (error: unknown) {
      // PostgreSQL unique violation error code: 23505
      if (this.isUniqueViolation(error)) {
        throw new DuplicateEntityError(entity.name, entity.namespace);
      }
      throw error;
    }
  }

  /**
   * Check if an entity with the given name exists in the specified namespace.
   */
  async existsByNameAndNamespace(name: string, namespace: string): Promise<boolean> {
    const sql = `
      SELECT 1 FROM catalog_entities
      WHERE name = $1 AND namespace = $2
      LIMIT 1
    `;

    const result = await this.pool.query(sql, [name, namespace]);
    return result.rowCount > 0;
  }

  /**
   * Retrieve an entity by its unique ID.
   */
  async getById(id: string): Promise<CatalogEntity | null> {
    const sql = `
      SELECT id, name, namespace, owner, description, lifecycle_stage,
             repository_url, tags, version, source_repository, created_by,
             created_at, updated_at
      FROM catalog_entities
      WHERE id = $1
    `;

    const result = await this.pool.query<CatalogEntityDbRow>(sql, [id]);
    if (result.rowCount === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows[0]);
  }

  /**
   * Search entities by case-insensitive substring match across name, owner, and tags.
   */
  async search(query: string, limit: number = 50): Promise<CatalogEntity[]> {
    const lowerQuery = `%${query.toLowerCase()}%`;

    const sql = `
      SELECT id, name, namespace, owner, description, lifecycle_stage,
             repository_url, tags, version, source_repository, created_by,
             created_at, updated_at
      FROM catalog_entities
      WHERE LOWER(name) LIKE $1
         OR LOWER(owner) LIKE $1
         OR EXISTS (
           SELECT 1 FROM unnest(tags) AS tag
           WHERE LOWER(tag) LIKE $1
         )
      LIMIT $2
    `;

    const result = await this.pool.query<CatalogEntityDbRow>(sql, [lowerQuery, limit]);
    return result.rows.map((row) => this.mapRowToEntity(row));
  }

  /**
   * Store a directed dependency edge between two entities.
   */
  async insertDependency(edge: DependencyEdge): Promise<void> {
    const sql = `
      INSERT INTO catalog_entity_dependencies (
        source_entity_id, target_entity_id, dependency_type, created_at
      ) VALUES ($1, $2, $3, $4)
    `;

    await this.pool.query(sql, [
      edge.sourceEntityId,
      edge.targetEntityId,
      edge.dependencyType,
      edge.createdAt,
    ]);
  }

  /**
   * Retrieve all dependency edges where the given entity is the source.
   */
  async getDependencies(entityId: string): Promise<DependencyEdge[]> {
    const sql = `
      SELECT source_entity_id, target_entity_id, dependency_type, created_at
      FROM catalog_entity_dependencies
      WHERE source_entity_id = $1
    `;

    const result = await this.pool.query<DependencyEdgeDbRow>(sql, [entityId]);
    return result.rows.map((row) => this.mapRowToDependencyEdge(row));
  }

  /**
   * Remove a dependency edge between source and target entities.
   */
  async removeDependency(sourceEntityId: string, targetEntityId: string): Promise<boolean> {
    const sql = `
      DELETE FROM catalog_entity_dependencies
      WHERE source_entity_id = $1 AND target_entity_id = $2
    `;

    const result = await this.pool.query(sql, [sourceEntityId, targetEntityId]);
    return result.rowCount > 0;
  }

  /**
   * Update an existing entity in the store.
   */
  async updateEntity(entity: CatalogEntity): Promise<void> {
    const sql = `
      UPDATE catalog_entities
      SET name = $2, namespace = $3, owner = $4, description = $5,
          lifecycle_stage = $6, repository_url = $7, tags = $8,
          version = $9, source_repository = $10, updated_at = $11
      WHERE id = $1
    `;

    const params = [
      entity.id,
      entity.name,
      entity.namespace,
      entity.owner,
      entity.description,
      entity.lifecycleStage,
      entity.repositoryUrl,
      entity.tags,
      entity.version,
      entity.sourceRepository,
      entity.updatedAt,
    ];

    await this.pool.query(sql, params);
  }

  /**
   * Save a version history snapshot for an entity.
   */
  async saveVersion(version: CatalogEntityVersion): Promise<void> {
    const sql = `
      INSERT INTO catalog_entity_versions (
        entity_id, version, data, changed_by, changed_at
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    await this.pool.query(sql, [
      version.entityId,
      version.version,
      JSON.stringify(version.data),
      version.changedBy,
      version.changedAt,
    ]);
  }

  /**
   * Retrieve version history for an entity, ordered by version descending.
   */
  async getVersionHistory(entityId: string, limit: number = 50): Promise<CatalogEntityVersion[]> {
    const sql = `
      SELECT entity_id, version, data, changed_by, changed_at
      FROM catalog_entity_versions
      WHERE entity_id = $1
      ORDER BY version DESC
      LIMIT $2
    `;

    const result = await this.pool.query<CatalogEntityVersionDbRow>(sql, [entityId, limit]);
    return result.rows.map((row) => this.mapRowToVersion(row));
  }

  /**
   * Prune old versions for an entity, retaining only the most recent `retain` versions.
   */
  async pruneVersions(entityId: string, retain: number = 50): Promise<void> {
    const sql = `
      DELETE FROM catalog_entity_versions
      WHERE entity_id = $1
        AND version NOT IN (
          SELECT version FROM catalog_entity_versions
          WHERE entity_id = $1
          ORDER BY version DESC
          LIMIT $2
        )
    `;

    await this.pool.query(sql, [entityId, retain]);
  }

  /**
   * Map a database row to a CatalogEntity domain object.
   */
  private mapRowToEntity(row: CatalogEntityDbRow): CatalogEntity {
    return {
      id: row.id,
      name: row.name,
      namespace: row.namespace,
      owner: row.owner,
      description: row.description,
      lifecycleStage: row.lifecycle_stage as CatalogEntity['lifecycleStage'],
      repositoryUrl: row.repository_url,
      tags: row.tags,
      version: row.version,
      sourceRepository: row.source_repository,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map a database row to a CatalogEntityVersion domain object.
   */
  private mapRowToVersion(row: CatalogEntityVersionDbRow): CatalogEntityVersion {
    return {
      entityId: row.entity_id,
      version: row.version,
      data: row.data,
      changedBy: row.changed_by,
      changedAt: new Date(row.changed_at),
    };
  }

  /**
   * Map a database row to a DependencyEdge domain object.
   */
  private mapRowToDependencyEdge(row: DependencyEdgeDbRow): DependencyEdge {
    return {
      sourceEntityId: row.source_entity_id,
      targetEntityId: row.target_entity_id,
      dependencyType: row.dependency_type,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Check if an error is a PostgreSQL unique constraint violation (error code 23505).
   */
  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === '23505'
    );
  }
}
