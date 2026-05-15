/**
 * Unit tests for CatalogEntity validation logic.
 *
 * Tests: Requirements 1.4, 2.1, 2.2, 2.3
 */
import { describe, it, expect } from 'vitest';

import { validateCatalogEntityInput } from './validation';

/**
 * Helper to create a valid CatalogEntityInput for testing.
 */
function validInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'my-service',
    namespace: 'platform',
    owner: 'team-alpha',
    description: 'A service that does things',
    lifecycleStage: 'production',
    repositoryUrl: 'https://github.com/org/repo',
    tags: ['backend', 'api'],
    sourceRepository: 'https://github.com/org/repo',
    ...overrides,
  };
}

describe('validateCatalogEntityInput', () => {
  describe('valid inputs', () => {
    it('should accept a fully valid input', () => {
      const result = validateCatalogEntityInput(validInput());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('my-service');
        expect(result.data.owner).toBe('team-alpha');
        expect(result.data.lifecycleStage).toBe('production');
      }
    });

    it('should accept input with zero tags', () => {
      const result = validateCatalogEntityInput(validInput({ tags: [] }));
      expect(result.success).toBe(true);
    });

    it('should accept input with 20 tags', () => {
      const tags = Array.from({ length: 20 }, (_, i) => `tag-${i}`);
      const result = validateCatalogEntityInput(validInput({ tags }));
      expect(result.success).toBe(true);
    });

    it('should accept all valid lifecycle stages', () => {
      const stages = ['experimental', 'development', 'production', 'deprecated'];
      for (const stage of stages) {
        const result = validateCatalogEntityInput(validInput({ lifecycleStage: stage }));
        expect(result.success).toBe(true);
      }
    });

    it('should accept name at boundary lengths (1 and 128 chars)', () => {
      const result1 = validateCatalogEntityInput(validInput({ name: 'a' }));
      expect(result1.success).toBe(true);

      const result128 = validateCatalogEntityInput(validInput({ name: 'a'.repeat(128) }));
      expect(result128.success).toBe(true);
    });

    it('should accept description at boundary lengths (1 and 1024 chars)', () => {
      const result1 = validateCatalogEntityInput(validInput({ description: 'x' }));
      expect(result1.success).toBe(true);

      const result1024 = validateCatalogEntityInput(validInput({ description: 'x'.repeat(1024) }));
      expect(result1024.success).toBe(true);
    });
  });

  describe('name validation', () => {
    it('should reject empty name', () => {
      const result = validateCatalogEntityInput(validInput({ name: '' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.details.some((d) => d.field === 'name')).toBe(true);
      }
    });

    it('should reject name exceeding 128 characters', () => {
      const result = validateCatalogEntityInput(validInput({ name: 'a'.repeat(129) }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.some((d) => d.field === 'name')).toBe(true);
      }
    });

    it('should reject missing name field', () => {
      const input = validInput();
      delete (input as Record<string, unknown>).name;
      const result = validateCatalogEntityInput(input);
      expect(result.success).toBe(false);
    });
  });

  describe('owner validation', () => {
    it('should reject empty owner', () => {
      const result = validateCatalogEntityInput(validInput({ owner: '' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.some((d) => d.field === 'owner')).toBe(true);
      }
    });

    it('should reject owner exceeding 128 characters', () => {
      const result = validateCatalogEntityInput(validInput({ owner: 'o'.repeat(129) }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.some((d) => d.field === 'owner')).toBe(true);
      }
    });
  });

  describe('description validation', () => {
    it('should reject empty description', () => {
      const result = validateCatalogEntityInput(validInput({ description: '' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.some((d) => d.field === 'description')).toBe(true);
      }
    });

    it('should reject description exceeding 1024 characters', () => {
      const result = validateCatalogEntityInput(validInput({ description: 'd'.repeat(1025) }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.some((d) => d.field === 'description')).toBe(true);
      }
    });
  });

  describe('lifecycle stage validation', () => {
    it('should reject invalid lifecycle stage', () => {
      const result = validateCatalogEntityInput(validInput({ lifecycleStage: 'invalid' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.some((d) => d.field === 'lifecycleStage')).toBe(true);
        const detail = result.error.details.find((d) => d.field === 'lifecycleStage');
        expect(detail?.message).toContain('Must be one of');
      }
    });

    it('should reject missing lifecycle stage', () => {
      const input = validInput();
      delete (input as Record<string, unknown>).lifecycleStage;
      const result = validateCatalogEntityInput(input);
      expect(result.success).toBe(false);
    });
  });

  describe('repository URL validation', () => {
    it('should reject invalid URL format', () => {
      const result = validateCatalogEntityInput(validInput({ repositoryUrl: 'not-a-url' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.some((d) => d.field === 'repositoryUrl')).toBe(true);
        const detail = result.error.details.find((d) => d.field === 'repositoryUrl');
        expect(detail?.message).toContain('valid URL');
      }
    });

    it('should reject empty repository URL', () => {
      const result = validateCatalogEntityInput(validInput({ repositoryUrl: '' }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.some((d) => d.field === 'repositoryUrl')).toBe(true);
      }
    });

    it('should accept valid https URL', () => {
      const result = validateCatalogEntityInput(
        validInput({ repositoryUrl: 'https://gitlab.com/org/repo' }),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('tags validation', () => {
    it('should reject more than 20 tags', () => {
      const tags = Array.from({ length: 21 }, (_, i) => `tag-${i}`);
      const result = validateCatalogEntityInput(validInput({ tags }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.some((d) => d.field === 'tags')).toBe(true);
      }
    });

    it('should reject tag exceeding 64 characters', () => {
      const result = validateCatalogEntityInput(validInput({ tags: ['t'.repeat(65)] }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.some((d) => d.field?.startsWith('tags'))).toBe(true);
      }
    });

    it('should reject empty tag string', () => {
      const result = validateCatalogEntityInput(validInput({ tags: [''] }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.some((d) => d.field?.startsWith('tags'))).toBe(true);
      }
    });
  });

  describe('structured error response format', () => {
    it('should return error with correct structure', () => {
      const result = validateCatalogEntityInput({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toHaveProperty('error');
        expect(result.error).toHaveProperty('code');
        expect(result.error).toHaveProperty('details');
        expect(typeof result.error.error).toBe('string');
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(Array.isArray(result.error.details)).toBe(true);
      }
    });

    it('should list each failing field with reason', () => {
      const result = validateCatalogEntityInput({
        name: '',
        owner: '',
        description: '',
        lifecycleStage: 'invalid',
        repositoryUrl: 'bad',
        tags: [''],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        // Should have multiple field errors
        expect(result.error.details.length).toBeGreaterThan(1);
        // Each detail should have a message
        for (const detail of result.error.details) {
          expect(detail.message).toBeTruthy();
        }
      }
    });

    it('should include constraint information in details', () => {
      const result = validateCatalogEntityInput(validInput({ name: 'a'.repeat(129) }));
      expect(result.success).toBe(false);
      if (!result.success) {
        const nameDetail = result.error.details.find((d) => d.field === 'name');
        expect(nameDetail).toBeDefined();
        expect(nameDetail?.constraint).toBeDefined();
      }
    });

    it('should limit details to 50 entries maximum', () => {
      // Even with many errors, details should be capped at 50
      const result = validateCatalogEntityInput({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.length).toBeLessThanOrEqual(50);
      }
    });
  });

  describe('multiple validation errors', () => {
    it('should report all failing fields in a single response', () => {
      const result = validateCatalogEntityInput({
        name: 'a'.repeat(129),
        owner: '',
        description: 'd'.repeat(1025),
        lifecycleStage: 'unknown',
        repositoryUrl: 'not-url',
        tags: Array.from({ length: 21 }, (_, i) => `tag-${i}`),
        namespace: '',
        sourceRepository: 'not-url',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const fields = result.error.details.map((d) => d.field).filter(Boolean);
        expect(fields).toContain('name');
        expect(fields).toContain('owner');
        expect(fields).toContain('description');
        expect(fields).toContain('lifecycleStage');
        expect(fields).toContain('repositoryUrl');
        expect(fields).toContain('tags');
        expect(fields).toContain('namespace');
        expect(fields).toContain('sourceRepository');
      }
    });
  });

  describe('non-object inputs', () => {
    it('should reject null input', () => {
      const result = validateCatalogEntityInput(null);
      expect(result.success).toBe(false);
    });

    it('should reject undefined input', () => {
      const result = validateCatalogEntityInput(undefined);
      expect(result.success).toBe(false);
    });

    it('should reject string input', () => {
      const result = validateCatalogEntityInput('not an object');
      expect(result.success).toBe(false);
    });

    it('should reject number input', () => {
      const result = validateCatalogEntityInput(42);
      expect(result.success).toBe(false);
    });
  });
});
