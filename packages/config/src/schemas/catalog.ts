/**
 * Zod schemas for Service Catalog entities.
 *
 * Validates: Requirements 2.1, 2.2
 */
import { z } from 'zod';

import { VALIDATION_CONSTRAINTS } from '../constants/validation';

/**
 * Lifecycle stages for catalog entities.
 * Requirement 2.2: lifecycle stage must be one of these values.
 */
export const LifecycleStageSchema = z.enum([
  'experimental',
  'development',
  'production',
  'deprecated',
]);

/**
 * Dependency type for entity relationships.
 */
export const DependencyTypeSchema = z.string().min(1).max(64);

/**
 * Schema for a single tag on a catalog entity.
 * Requirement 2.1: each tag 1-64 characters.
 */
export const CatalogTagSchema = z
  .string()
  .min(VALIDATION_CONSTRAINTS.tag.minLength)
  .max(VALIDATION_CONSTRAINTS.tag.maxLength);

/**
 * Input schema for registering or updating a CatalogEntity.
 * Requirement 2.1: name (1-128 chars), owner (1-128 chars),
 * description (1-1024 chars), lifecycle stage, repository URL, tags (0-20).
 */
export const CatalogEntityInputSchema = z.object({
  name: z
    .string()
    .min(VALIDATION_CONSTRAINTS.name.minLength)
    .max(VALIDATION_CONSTRAINTS.name.maxLength),
  namespace: z
    .string()
    .min(VALIDATION_CONSTRAINTS.namespace.minLength)
    .max(VALIDATION_CONSTRAINTS.namespace.maxLength),
  owner: z
    .string()
    .min(VALIDATION_CONSTRAINTS.owner.minLength)
    .max(VALIDATION_CONSTRAINTS.owner.maxLength),
  description: z
    .string()
    .min(VALIDATION_CONSTRAINTS.description.minLength)
    .max(VALIDATION_CONSTRAINTS.description.maxLength),
  lifecycleStage: LifecycleStageSchema,
  repositoryUrl: z.string().url(),
  tags: z
    .array(CatalogTagSchema)
    .min(VALIDATION_CONSTRAINTS.tags.minCount)
    .max(VALIDATION_CONSTRAINTS.tags.maxCount),
});

/**
 * Full CatalogEntity schema (persisted entity with system-generated fields).
 */
export const CatalogEntitySchema = CatalogEntityInputSchema.extend({
  id: z.string().uuid(),
  version: z.number().int().min(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().min(1).max(128),
  sourceRepository: z.string().url(),
});

/**
 * Schema for a versioned snapshot of a CatalogEntity.
 */
export const CatalogEntityVersionSchema = z.object({
  entityId: z.string().uuid(),
  version: z.number().int().min(1),
  data: CatalogEntitySchema,
  changedBy: z.string().min(1).max(128),
  changedAt: z.coerce.date(),
});

/**
 * Schema for a dependency edge between two catalog entities.
 */
export const DependencyEdgeSchema = z.object({
  sourceEntityId: z.string().uuid(),
  targetEntityId: z.string().uuid(),
  dependencyType: DependencyTypeSchema,
  createdAt: z.coerce.date(),
});

// Inferred types
export type LifecycleStage = z.infer<typeof LifecycleStageSchema>;
export type CatalogEntityInput = z.infer<typeof CatalogEntityInputSchema>;
export type CatalogEntity = z.infer<typeof CatalogEntitySchema>;
export type CatalogEntityVersion = z.infer<typeof CatalogEntityVersionSchema>;
export type DependencyEdge = z.infer<typeof DependencyEdgeSchema>;
