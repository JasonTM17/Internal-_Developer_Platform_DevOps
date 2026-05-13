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
});
