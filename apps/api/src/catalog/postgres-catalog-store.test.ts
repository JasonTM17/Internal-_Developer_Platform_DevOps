/**
 * Unit tests for PostgresCatalogStore.
 *
 * Tests the PostgreSQL-backed catalog store implementation using a mock database pool.
 * Verifies SQL query construction, parameter passing, row mapping, and error handling.
 *
 * Requirements: 1.1, 1.3, 1.5, 1.6
 */

import type { CatalogEntity, CatalogEntityVersion, DependencyEdge } from '@idp/shared';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { DatabasePool } from '../db';

import { DuplicateEntityError } from './catalog-store';
import { PostgresCatalogStore } from './postgres-catalog-store';

/**
 * Creates a mock database pool for testing.
 */
function createMockPool(queryFn?: DatabasePool['query']): DatabasePool {
  return {
    query: queryFn ?? vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  };
}

/**
 * Creates a valid CatalogEntity for testing.
 */
function createTestEntity(overrides?: Partial<CatalogEntity>): CatalogEntity {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'test-service',
    namespace: 'platform',
    owner: 'team-alpha',
    description: 'A test service',
    lifecycleStage: 'development',
    repositoryUrl: 'https://github.com/org/test-service',
    tags: ['backend', 'api'],
    version: 1,
    sourceRepository: 'https://github.com/org/test-service',
    createdBy: 'user-123',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

describe('PostgresCatalogStore', () => {
  let mockPool: DatabasePool;
  let store: PostgresCatalogStore;

  beforeEach(() => {
    mockPool = createMockPool();
    store = new PostgresCatalogStore(mockPool);
  });

  describe('insert()', () => {
    it('should execute INSERT query with correct parameters', async () => {
      const entity = createTestEntity();
      const querySpy = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      store = new PostgresCatalogStore(createMockPool(querySpy));

      await store.insert(entity);

      expect(querySpy).toHaveBeenCalledTimes(1);
      const [sql, params] = querySpy.mock.calls[0];
      expect(sql).toContain('INSERT INTO catalog_entities');
      expect(params).toEqual([
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
      ]);
    });

    it('should throw DuplicateEntityError on unique constraint violation (code 23505)', async () => {
      const entity = createTestEntity();
      const pgError = Object.assign(new Error('duplicate key'), { code: '23505' });
      const querySpy = vi.fn().mockRejectedValue(pgError);
      store = new PostgresCatalogStore(createMockPool(querySpy));

      await expect(store.insert(entity)).rejects.toThrow(DuplicateEntityError);
      await expect(store.insert(entity)).rejects.toMatchObject({
        name: 'DuplicateEntityError',
      });
    });

    it('should propagate non-unique-violation errors', async () => {
      const entity = createTestEntity();
      const genericError = new Error('Connection refused');
      const querySpy = vi.fn().mockRejectedValue(genericError);
      store = new PostgresCatalogStore(createMockPool(querySpy));

      await expect(store.insert(entity)).rejects.toThrow('Connection refused');
    });
  });

  describe('existsByNameAndNamespace()', () => {
    it('should return true when entity exists', async () => {
      const querySpy = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }], rowCount: 1 });
      store = new PostgresCatalogStore(createMockPool(querySpy));

      const result = await store.existsByNameAndNamespace('test-service', 'platform');

      expect(result).toBe(true);
      expect(querySpy).toHaveBeenCalledTimes(1);
      const [sql, params] = querySpy.mock.calls[0];
      expect(sql).toContain('SELECT 1 FROM catalog_entities');
      expect(params).toEqual(['test-service', 'platform']);
    });

    it('should return false when entity does not exist', async () => {
      const querySpy = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      store = new PostgresCatalogStore(createMockPool(querySpy));

      const result = await store.existsByNameAndNamespace('nonexistent', 'platform');

      expect(result).toBe(false);
    });
  });

  describe('getById()', () => {
    it('should return mapped entity when found', async () => {
      const dbRow = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'test-service',
        namespace: 'platform',
        owner: 'team-alpha',
        description: 'A test service',
        lifecycle_stage: 'development',
        repository_url: 'https://github.com/org/test-service',
        tags: ['backend', 'api'],
        version: 1,
        source_repository: 'https://github.com/org/test-service',
        created_by: 'user-123',
        created_at: '2024-01-15T10:00:00.000Z',
        updated_at: '2024-01-15T10:00:00.000Z',
      };
      const querySpy = vi.fn().mockResolvedValue({ rows: [dbRow], rowCount: 1 });
      store = new PostgresCatalogStore(createMockPool(querySpy));

      const result = await store.getById('550e8400-e29b-41d4-a716-446655440000');

      expect(result).not.toBeNull();
      expect(result!.id).toBe(dbRow.id);
      expect(result!.name).toBe(dbRow.name);
      expect(result!.namespace).toBe(dbRow.namespace);
      expect(result!.owner).toBe(dbRow.owner);
      expect(result!.description).toBe(dbRow.description);
      expect(result!.lifecycleStage).toBe('development');
      expect(result!.repositoryUrl).toBe(dbRow.repository_url);
      expect(result!.tags).toEqual(['backend', 'api']);
      expect(result!.version).toBe(1);
      expect(result!.sourceRepository).toBe(dbRow.source_repository);
      expect(result!.createdBy).toBe(dbRow.created_by);
      expect(result!.createdAt).toBeInstanceOf(Date);
      expect(result!.updatedAt).toBeInstanceOf(Date);
    });

    it('should return null when entity not found', async () => {
      const querySpy = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      store = new PostgresCatalogStore(createMockPool(querySpy));

      const result = await store.getById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('search()', () => {
    it('should execute search query with LIKE pattern and limit', async () => {
      const querySpy = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      store = new PostgresCatalogStore(createMockPool(querySpy));

      await store.search('test', 50);

      expect(querySpy).toHaveBeenCalledTimes(1);
      const [sql, params] = querySpy.mock.calls[0];
      expect(sql).toContain('LOWER(name) LIKE');
      expect(sql).toContain('LOWER(owner) LIKE');
      expect(params![0]).toBe('%test%');
      expect(params![1]).toBe(50);
    });

    it('should map multiple result rows to entities', async () => {
      const rows = [
        {
          id: 'id-1',
          name: 'service-1',
          namespace: 'ns',
          owner: 'owner-1',
          description: 'desc',
          lifecycle_stage: 'development',
          repository_url: 'https://example.com/1',
          tags: ['tag1'],
          version: 1,
          source_repository: 'https://example.com/1',
          created_by: 'user-1',
          created_at: '2024-01-15T10:00:00.000Z',
          updated_at: '2024-01-15T10:00:00.000Z',
        },
        {
          id: 'id-2',
          name: 'service-2',
          namespace: 'ns',
          owner: 'owner-2',
          description: 'desc',
          lifecycle_stage: 'production',
          repository_url: 'https://example.com/2',
          tags: ['tag2'],
          version: 3,
          source_repository: 'https://example.com/2',
          created_by: 'user-2',
          created_at: '2024-01-16T10:00:00.000Z',
          updated_at: '2024-01-16T10:00:00.000Z',
        },
      ];
      const querySpy = vi.fn().mockResolvedValue({ rows, rowCount: 2 });
      store = new PostgresCatalogStore(createMockPool(querySpy));

      const results = await store.search('service');

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('service-1');
      expect(results[1].name).toBe('service-2');
    });
  });

  describe('updateEntity()', () => {
    it('should execute UPDATE query with correct parameters', async () => {
      const entity = createTestEntity({ version: 2, description: 'Updated' });
      const querySpy = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      store = new PostgresCatalogStore(createMockPool(querySpy));

      await store.updateEntity(entity);

      expect(querySpy).toHaveBeenCalledTimes(1);
      const [sql, params] = querySpy.mock.calls[0];
      expect(sql).toContain('UPDATE catalog_entities');
      expect(params![0]).toBe(entity.id);
      expect(params![8]).toBe(2); // version
    });
  });

  describe('saveVersion()', () => {
    it('should insert version snapshot with JSON-serialized data', async () => {
      const entity = createTestEntity();
      const version: CatalogEntityVersion = {
        entityId: entity.id,
        version: 1,
        data: entity,
        changedBy: 'user-123',
        changedAt: new Date('2024-01-15T10:00:00Z'),
      };
      const querySpy = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      store = new PostgresCatalogStore(createMockPool(querySpy));

      await store.saveVersion(version);

      expect(querySpy).toHaveBeenCalledTimes(1);
      const [sql, params] = querySpy.mock.calls[0];
      expect(sql).toContain('INSERT INTO catalog_entity_versions');
      expect(params![0]).toBe(entity.id);
      expect(params![1]).toBe(1);
      expect(typeof params![2]).toBe('string'); // JSON serialized
      expect(JSON.parse(params![2] as string)).toMatchObject({ name: 'test-service' });
    });
  });

  describe('getVersionHistory()', () => {
    it('should return versions ordered by version descending', async () => {
      const rows = [
        {
          entity_id: 'entity-1',
          version: 3,
          data: createTestEntity({ version: 3 }),
          changed_by: 'user-1',
          changed_at: '2024-01-17T10:00:00.000Z',
        },
        {
          entity_id: 'entity-1',
          version: 2,
          data: createTestEntity({ version: 2 }),
          changed_by: 'user-1',
          changed_at: '2024-01-16T10:00:00.000Z',
        },
      ];
      const querySpy = vi.fn().mockResolvedValue({ rows, rowCount: 2 });
      store = new PostgresCatalogStore(createMockPool(querySpy));

      const results = await store.getVersionHistory('entity-1', 50);

      expect(results).toHaveLength(2);
      expect(results[0].version).toBe(3);
      expect(results[1].version).toBe(2);
      expect(results[0].changedAt).toBeInstanceOf(Date);
    });
  });

  describe('insertDependency()', () => {
    it('should insert dependency edge with correct parameters', async () => {
      const edge: DependencyEdge = {
        sourceEntityId: 'source-id',
        targetEntityId: 'target-id',
        dependencyType: 'runtime',
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };
      const querySpy = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      store = new PostgresCatalogStore(createMockPool(querySpy));

      await store.insertDependency(edge);

      expect(querySpy).toHaveBeenCalledTimes(1);
      const [sql, params] = querySpy.mock.calls[0];
      expect(sql).toContain('INSERT INTO catalog_entity_dependencies');
      expect(params).toEqual(['source-id', 'target-id', 'runtime', edge.createdAt]);
    });
  });

  describe('getDependencies()', () => {
    it('should return mapped dependency edges', async () => {
      const rows = [
        {
          source_entity_id: 'source-id',
          target_entity_id: 'target-1',
          dependency_type: 'runtime',
          created_at: '2024-01-15T10:00:00.000Z',
        },
        {
          source_entity_id: 'source-id',
          target_entity_id: 'target-2',
          dependency_type: 'build',
          created_at: '2024-01-16T10:00:00.000Z',
        },
      ];
      const querySpy = vi.fn().mockResolvedValue({ rows, rowCount: 2 });
      store = new PostgresCatalogStore(createMockPool(querySpy));

      const results = await store.getDependencies('source-id');

      expect(results).toHaveLength(2);
      expect(results[0].sourceEntityId).toBe('source-id');
      expect(results[0].targetEntityId).toBe('target-1');
      expect(results[0].dependencyType).toBe('runtime');
      expect(results[0].createdAt).toBeInstanceOf(Date);
    });
  });

  describe('removeDependency()', () => {
    it('should return true when edge was deleted', async () => {
      const querySpy = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      store = new PostgresCatalogStore(createMockPool(querySpy));

      const result = await store.removeDependency('source-id', 'target-id');

      expect(result).toBe(true);
    });

    it('should return false when edge did not exist', async () => {
      const querySpy = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
      store = new PostgresCatalogStore(createMockPool(querySpy));

      const result = await store.removeDependency('source-id', 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('pruneVersions()', () => {
    it('should execute DELETE query retaining specified number of versions', async () => {
      const querySpy = vi.fn().mockResolvedValue({ rows: [], rowCount: 5 });
      store = new PostgresCatalogStore(createMockPool(querySpy));

      await store.pruneVersions('entity-1', 50);

      expect(querySpy).toHaveBeenCalledTimes(1);
      const [sql, params] = querySpy.mock.calls[0];
      expect(sql).toContain('DELETE FROM catalog_entity_versions');
      expect(params).toEqual(['entity-1', 50]);
    });
  });
});
