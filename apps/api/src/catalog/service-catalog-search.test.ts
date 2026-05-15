/**
 * Unit tests for ServiceCatalog search functionality.
 *
 * Tests:
 * - Case-insensitive substring search across name, owner, and tags
 * - Results limited to 50 entries maximum
 * - Search responds within 1 second (in-memory caching layer)
 * - Query validation (minimum 2 characters)
 * - Cache invalidation on entity registration
 *
 * Requirements: 1.2
 */

import { ERROR_CODES } from '@idp/shared';
import type { CatalogEntityInput } from '@idp/shared';
import { describe, it, expect, beforeEach } from 'vitest';

import { InMemoryCatalogStore } from './in-memory-catalog-store';
import { ServiceCatalog } from './service-catalog';

describe('ServiceCatalog.search()', () => {
  let store: InMemoryCatalogStore;
  let catalog: ServiceCatalog;
  const actor = { id: 'user-123' };

  function makeInput(overrides: Partial<CatalogEntityInput> = {}): CatalogEntityInput {
    return {
      name: 'default-service',
      namespace: 'platform',
      owner: 'team-alpha',
      description: 'A default test service',
      lifecycleStage: 'development',
      repositoryUrl: 'https://github.com/org/default-service',
      tags: ['backend', 'api'],
      sourceRepository: 'https://github.com/org/default-service',
      ...overrides,
    };
  }

  beforeEach(() => {
    store = new InMemoryCatalogStore();
    catalog = new ServiceCatalog(store);
  });

  describe('case-insensitive substring matching', () => {
    it('should match entities by name (case-insensitive)', async () => {
      await catalog.register(makeInput({ name: 'Payment-Service' }), actor);
      await catalog.register(makeInput({ name: 'user-service', namespace: 'ns2' }), actor);

      const result = await catalog.search('payment');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('Payment-Service');
    });

    it('should match entities by owner (case-insensitive)', async () => {
      await catalog.register(
        makeInput({ name: 'svc-1', owner: 'Team-Backend', tags: ['service'] }),
        actor,
      );
      await catalog.register(
        makeInput({ name: 'svc-2', namespace: 'ns2', owner: 'team-frontend', tags: ['service'] }),
        actor,
      );

      const result = await catalog.search('BACKEND');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].owner).toBe('Team-Backend');
    });

    it('should match entities by tag (case-insensitive)', async () => {
      await catalog.register(makeInput({ name: 'svc-1', tags: ['GraphQL', 'api'] }), actor);
      await catalog.register(
        makeInput({ name: 'svc-2', namespace: 'ns2', tags: ['rest', 'http'] }),
        actor,
      );

      const result = await catalog.search('graphql');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('svc-1');
    });

    it('should match substring within name', async () => {
      await catalog.register(makeInput({ name: 'my-payment-gateway' }), actor);

      const result = await catalog.search('payment');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('my-payment-gateway');
    });

    it('should match substring within owner', async () => {
      await catalog.register(makeInput({ name: 'svc-1', owner: 'platform-engineering' }), actor);

      const result = await catalog.search('engineer');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.entities).toHaveLength(1);
    });

    it('should match substring within a tag', async () => {
      await catalog.register(makeInput({ name: 'svc-1', tags: ['microservice'] }), actor);

      const result = await catalog.search('micro');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.entities).toHaveLength(1);
    });

    it('should return entities matching across multiple fields', async () => {
      // Entity matches on name
      await catalog.register(makeInput({ name: 'api-gateway' }), actor);
      // Entity matches on owner
      await catalog.register(
        makeInput({ name: 'svc-2', namespace: 'ns2', owner: 'api-team' }),
        actor,
      );
      // Entity matches on tag
      await catalog.register(makeInput({ name: 'svc-3', namespace: 'ns3', tags: ['api'] }), actor);

      const result = await catalog.search('api');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.entities).toHaveLength(3);
    });

    it('should return empty array when no entities match', async () => {
      await catalog.register(makeInput({ name: 'payment-service' }), actor);

      const result = await catalog.search('nonexistent');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.entities).toHaveLength(0);
    });
  });

  describe('result limit', () => {
    it('should limit results to 50 entries maximum', async () => {
      // Register 60 entities that all match the search query
      for (let i = 0; i < 60; i++) {
        await catalog.register(
          makeInput({
            name: `matching-service-${i}`,
            namespace: `ns-${i}`,
          }),
          actor,
        );
      }

      const result = await catalog.search('matching');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.entities).toHaveLength(50);
    });
  });

  describe('query validation', () => {
    it('should reject queries shorter than 2 characters', async () => {
      const result = await catalog.search('a');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.details[0].field).toBe('query');
    });

    it('should reject empty query string', async () => {
      const result = await catalog.search('');

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('should accept queries of exactly 2 characters', async () => {
      await catalog.register(makeInput({ name: 'ab-service' }), actor);

      const result = await catalog.search('ab');

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.entities).toHaveLength(1);
    });
  });

  describe('caching behavior', () => {
    it('should respond within 1 second for cached results', async () => {
      // Register some entities
      for (let i = 0; i < 30; i++) {
        await catalog.register(makeInput({ name: `service-${i}`, namespace: `ns-${i}` }), actor);
      }

      // First search populates cache
      await catalog.search('service');

      // Second search should use cache and be fast
      const start = Date.now();
      const result = await catalog.search('service');
      const elapsed = Date.now() - start;

      expect(result.success).toBe(true);
      expect(elapsed).toBeLessThan(1000);
    });

    it('should invalidate cache when a new entity is registered', async () => {
      await catalog.register(makeInput({ name: 'first-service' }), actor);

      // Populate cache
      const firstResult = await catalog.search('service');
      expect(firstResult.success).toBe(true);
      if (!firstResult.success) return;
      expect(firstResult.entities).toHaveLength(1);

      // Register a new entity that matches the query
      await catalog.register(makeInput({ name: 'second-service', namespace: 'ns2' }), actor);

      // Search should reflect the new entity (cache invalidated)
      const secondResult = await catalog.search('service');
      expect(secondResult.success).toBe(true);
      if (!secondResult.success) return;
      expect(secondResult.entities).toHaveLength(2);
    });
  });
});
