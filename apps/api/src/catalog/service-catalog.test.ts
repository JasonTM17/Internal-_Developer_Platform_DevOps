/**
 * Unit tests for ServiceCatalog registration and persistence.
 *
 * Tests:
 * - Successful registration with audit metadata
 * - Duplicate name detection within namespace
 * - Version counter initialization
 * - Validation error propagation
 * - Race condition handling (DB-level duplicate detection)
 *
 * Requirements: 1.1, 1.3, 1.5, 1.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceCatalog } from './service-catalog';
import { InMemoryCatalogStore } from './in-memory-catalog-store';
import { DuplicateEntityError } from './catalog-store';
import { ERROR_CODES } from '@idp/shared';
import type { CatalogEntityInput } from '@idp/shared';

describe('ServiceCatalog', () => {
  let store: InMemoryCatalogStore;
  let catalog: ServiceCatalog;

  const validInput: CatalogEntityInput = {
    name: 'my-service',
    namespace: 'platform',
    owner: 'team-alpha',
    description: 'A test service for the platform',
    lifecycleStage: 'development',
    repositoryUrl: 'https://github.com/org/my-service',
    tags: ['backend', 'api'],
    sourceRepository: 'https://github.com/org/my-service',
  };

  const actor = { id: 'user-123' };

  beforeEach(() => {
    store = new InMemoryCatalogStore();
    catalog = new ServiceCatalog(store);
  });

  describe('register()', () => {
    it('should persist a valid entity with all provided fields', async () => {
      const result = await catalog.register(validInput, actor);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.entity.name).toBe(validInput.name);
      expect(result.entity.namespace).toBe(validInput.namespace);
      expect(result.entity.owner).toBe(validInput.owner);
      expect(result.entity.description).toBe(validInput.description);
      expect(result.entity.lifecycleStage).toBe(validInput.lifecycleStage);
      expect(result.entity.repositoryUrl).toBe(validInput.repositoryUrl);
      expect(result.entity.tags).toEqual(validInput.tags);
    });

    it('should generate a UUID id for the entity', async () => {
      const result = await catalog.register(validInput, actor);

      expect(result.success).toBe(true);
      if (!result.success) return;

      // UUID v4 format
      expect(result.entity.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('should record the registering user as audit metadata (Requirement 1.5)', async () => {
      const result = await catalog.register(validInput, actor);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.entity.createdBy).toBe('user-123');
    });

    it('should record the timestamp as audit metadata (Requirement 1.5)', async () => {
      const before = new Date();
      const result = await catalog.register(validInput, actor);
      const after = new Date();

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.entity.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.entity.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(result.entity.updatedAt.getTime()).toEqual(result.entity.createdAt.getTime());
    });

    it('should record the source repository as audit metadata (Requirement 1.5)', async () => {
      const result = await catalog.register(validInput, actor);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.entity.sourceRepository).toBe(validInput.sourceRepository);
    });

    it('should initialize version counter to 1 on registration', async () => {
      const result = await catalog.register(validInput, actor);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.entity.version).toBe(1);
    });

    it('should persist the entity in the store', async () => {
      const result = await catalog.register(validInput, actor);

      expect(result.success).toBe(true);
      if (!result.success) return;

      const stored = await store.getById(result.entity.id);
      expect(stored).not.toBeNull();
      expect(stored!.name).toBe(validInput.name);
      expect(stored!.namespace).toBe(validInput.namespace);
    });

    it('should return conflict error for duplicate name within same namespace (Requirement 1.3, 1.6)', async () => {
      // Register first entity
      await catalog.register(validInput, actor);

      // Attempt to register with same name+namespace
      const duplicateInput = { ...validInput, owner: 'different-owner' };
      const result = await catalog.register(duplicateInput, actor);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.code).toBe(ERROR_CODES.ENTITY_NAME_CONFLICT);
      expect(result.error.details).toHaveLength(1);
      expect(result.error.details[0].field).toBe('name');
      expect(result.error.details[0].constraint).toBe('unique_name_per_namespace');
    });

    it('should allow same name in different namespaces', async () => {
      // Register in namespace 'platform'
      await catalog.register(validInput, actor);

      // Register same name in different namespace
      const differentNamespace = { ...validInput, namespace: 'other-team' };
      const result = await catalog.register(differentNamespace, actor);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.entity.name).toBe(validInput.name);
      expect(result.entity.namespace).toBe('other-team');
    });

    it('should not modify existing entity when duplicate is detected (Requirement 1.6)', async () => {
      // Register first entity
      const firstResult = await catalog.register(validInput, actor);
      expect(firstResult.success).toBe(true);
      if (!firstResult.success) return;

      const originalEntity = await store.getById(firstResult.entity.id);

      // Attempt duplicate registration
      const duplicateInput = { ...validInput, description: 'Modified description' };
      await catalog.register(duplicateInput, actor);

      // Verify original entity is unchanged
      const afterAttempt = await store.getById(firstResult.entity.id);
      expect(afterAttempt).toEqual(originalEntity);
    });

    it('should return validation error for invalid input', async () => {
      const invalidInput = {
        name: '', // Too short
        namespace: 'platform',
        owner: 'team-alpha',
        description: 'A test service',
        lifecycleStage: 'development',
        repositoryUrl: 'https://github.com/org/service',
        tags: ['backend'],
        sourceRepository: 'https://github.com/org/service',
      };

      const result = await catalog.register(invalidInput, actor);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.details.length).toBeGreaterThan(0);
    });

    it('should not persist entity when validation fails', async () => {
      const invalidInput = { name: '' }; // Missing required fields

      await catalog.register(invalidInput, actor);

      expect(store.size()).toBe(0);
    });

    it('should handle race condition with DB-level duplicate detection', async () => {
      // Create a store that passes the existsByNameAndNamespace check
      // but throws DuplicateEntityError on insert (simulating a race condition)
      const racyStore: InMemoryCatalogStore = new InMemoryCatalogStore();
      const originalInsert = racyStore.insert.bind(racyStore);

      let firstCall = true;
      racyStore.insert = async (entity) => {
        if (firstCall) {
          firstCall = false;
          return originalInsert(entity);
        }
        throw new DuplicateEntityError(entity.name, entity.namespace);
      };

      const racyCatalog = new ServiceCatalog(racyStore);

      // First registration succeeds
      await racyCatalog.register(validInput, actor);

      // Simulate race: existsByNameAndNamespace returns false but insert throws
      racyStore.existsByNameAndNamespace = async () => false;

      const result = await racyCatalog.register(
        { ...validInput, owner: 'another-owner' },
        actor,
      );

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.code).toBe(ERROR_CODES.ENTITY_NAME_CONFLICT);
    });

    it('should propagate unexpected errors from the store', async () => {
      const failingStore: InMemoryCatalogStore = new InMemoryCatalogStore();
      failingStore.insert = async () => {
        throw new Error('Database connection lost');
      };
      failingStore.existsByNameAndNamespace = async () => false;

      const failingCatalog = new ServiceCatalog(failingStore);

      await expect(failingCatalog.register(validInput, actor)).rejects.toThrow(
        'Database connection lost',
      );
    });
  });

  describe('addDependency()', () => {
    it('should store a dependency edge when target entity exists (Requirement 2.5)', async () => {
      // Register source and target entities
      const sourceResult = await catalog.register(validInput, actor);
      expect(sourceResult.success).toBe(true);
      if (!sourceResult.success) return;

      const targetInput = { ...validInput, name: 'target-service' };
      const targetResult = await catalog.register(targetInput, actor);
      expect(targetResult.success).toBe(true);
      if (!targetResult.success) return;

      const result = await catalog.addDependency(
        sourceResult.entity.id,
        targetResult.entity.id,
        'runtime',
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.edge.sourceEntityId).toBe(sourceResult.entity.id);
      expect(result.edge.targetEntityId).toBe(targetResult.entity.id);
      expect(result.edge.dependencyType).toBe('runtime');
      expect(result.edge.createdAt).toBeInstanceOf(Date);
    });

    it('should return error when target entity does not exist (Requirement 2.6)', async () => {
      // Register only the source entity
      const sourceResult = await catalog.register(validInput, actor);
      expect(sourceResult.success).toBe(true);
      if (!sourceResult.success) return;

      const nonExistentTargetId = 'non-existent-id';
      const result = await catalog.addDependency(
        sourceResult.entity.id,
        nonExistentTargetId,
        'runtime',
      );

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error.code).toBe(ERROR_CODES.DEPENDENCY_TARGET_NOT_FOUND);
      expect(result.error.error).toContain(nonExistentTargetId);
      expect(result.error.details).toHaveLength(1);
      expect(result.error.details[0].field).toBe('targetEntityId');
      expect(result.error.details[0].constraint).toBe('referential_integrity');
    });

    it('should store directed edges with source, target, and dependency type', async () => {
      const sourceResult = await catalog.register(validInput, actor);
      expect(sourceResult.success).toBe(true);
      if (!sourceResult.success) return;

      const targetInput = { ...validInput, name: 'database-service' };
      const targetResult = await catalog.register(targetInput, actor);
      expect(targetResult.success).toBe(true);
      if (!targetResult.success) return;

      const result = await catalog.addDependency(
        sourceResult.entity.id,
        targetResult.entity.id,
        'database',
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      // Verify the edge has all required fields
      expect(result.edge).toHaveProperty('sourceEntityId');
      expect(result.edge).toHaveProperty('targetEntityId');
      expect(result.edge).toHaveProperty('dependencyType');
      expect(result.edge).toHaveProperty('createdAt');
    });

    it('should allow multiple dependencies from the same source', async () => {
      const sourceResult = await catalog.register(validInput, actor);
      expect(sourceResult.success).toBe(true);
      if (!sourceResult.success) return;

      const target1Input = { ...validInput, name: 'target-1' };
      const target1Result = await catalog.register(target1Input, actor);
      expect(target1Result.success).toBe(true);
      if (!target1Result.success) return;

      const target2Input = { ...validInput, name: 'target-2' };
      const target2Result = await catalog.register(target2Input, actor);
      expect(target2Result.success).toBe(true);
      if (!target2Result.success) return;

      await catalog.addDependency(sourceResult.entity.id, target1Result.entity.id, 'runtime');
      await catalog.addDependency(sourceResult.entity.id, target2Result.entity.id, 'build');

      const deps = await catalog.getDependencies(sourceResult.entity.id);
      expect(deps.success).toBe(true);
      if (!deps.success) return;

      expect(deps.edges).toHaveLength(2);
    });
  });

  describe('getDependencies()', () => {
    it('should return all dependencies for a given entity', async () => {
      const sourceResult = await catalog.register(validInput, actor);
      expect(sourceResult.success).toBe(true);
      if (!sourceResult.success) return;

      const targetInput = { ...validInput, name: 'dep-service' };
      const targetResult = await catalog.register(targetInput, actor);
      expect(targetResult.success).toBe(true);
      if (!targetResult.success) return;

      await catalog.addDependency(sourceResult.entity.id, targetResult.entity.id, 'runtime');

      const result = await catalog.getDependencies(sourceResult.entity.id);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].sourceEntityId).toBe(sourceResult.entity.id);
      expect(result.edges[0].targetEntityId).toBe(targetResult.entity.id);
      expect(result.edges[0].dependencyType).toBe('runtime');
    });

    it('should return empty array when entity has no dependencies', async () => {
      const sourceResult = await catalog.register(validInput, actor);
      expect(sourceResult.success).toBe(true);
      if (!sourceResult.success) return;

      const result = await catalog.getDependencies(sourceResult.entity.id);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.edges).toHaveLength(0);
    });

    it('should only return dependencies where entity is the source', async () => {
      const entity1Result = await catalog.register(validInput, actor);
      expect(entity1Result.success).toBe(true);
      if (!entity1Result.success) return;

      const entity2Input = { ...validInput, name: 'entity-2' };
      const entity2Result = await catalog.register(entity2Input, actor);
      expect(entity2Result.success).toBe(true);
      if (!entity2Result.success) return;

      // entity1 depends on entity2
      await catalog.addDependency(entity1Result.entity.id, entity2Result.entity.id, 'runtime');

      // entity2 should have no outgoing dependencies
      const result = await catalog.getDependencies(entity2Result.entity.id);
      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.edges).toHaveLength(0);
    });
  });

  describe('removeDependency()', () => {
    it('should remove an existing dependency edge', async () => {
      const sourceResult = await catalog.register(validInput, actor);
      expect(sourceResult.success).toBe(true);
      if (!sourceResult.success) return;

      const targetInput = { ...validInput, name: 'removable-dep' };
      const targetResult = await catalog.register(targetInput, actor);
      expect(targetResult.success).toBe(true);
      if (!targetResult.success) return;

      await catalog.addDependency(sourceResult.entity.id, targetResult.entity.id, 'runtime');

      const removeResult = await catalog.removeDependency(
        sourceResult.entity.id,
        targetResult.entity.id,
      );

      expect(removeResult.success).toBe(true);
      if (!removeResult.success) return;
      expect(removeResult.removed).toBe(true);

      // Verify it's actually gone
      const deps = await catalog.getDependencies(sourceResult.entity.id);
      expect(deps.success).toBe(true);
      if (!deps.success) return;
      expect(deps.edges).toHaveLength(0);
    });

    it('should return removed=false when dependency does not exist', async () => {
      const result = await catalog.removeDependency('non-existent-source', 'non-existent-target');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.removed).toBe(false);
    });

    it('should only remove the specified edge, leaving others intact', async () => {
      const sourceResult = await catalog.register(validInput, actor);
      expect(sourceResult.success).toBe(true);
      if (!sourceResult.success) return;

      const target1Input = { ...validInput, name: 'keep-dep' };
      const target1Result = await catalog.register(target1Input, actor);
      expect(target1Result.success).toBe(true);
      if (!target1Result.success) return;

      const target2Input = { ...validInput, name: 'remove-dep' };
      const target2Result = await catalog.register(target2Input, actor);
      expect(target2Result.success).toBe(true);
      if (!target2Result.success) return;

      await catalog.addDependency(sourceResult.entity.id, target1Result.entity.id, 'runtime');
      await catalog.addDependency(sourceResult.entity.id, target2Result.entity.id, 'build');

      // Remove only the second dependency
      await catalog.removeDependency(sourceResult.entity.id, target2Result.entity.id);

      const deps = await catalog.getDependencies(sourceResult.entity.id);
      expect(deps.success).toBe(true);
      if (!deps.success) return;

      expect(deps.edges).toHaveLength(1);
      expect(deps.edges[0].targetEntityId).toBe(target1Result.entity.id);
    });
  });
});
