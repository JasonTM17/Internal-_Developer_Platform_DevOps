/**
 * Zod schemas for Configuration and Secret management types.
 *
 * Validates: Requirements 14.1, 14.2, 14.5
 */
import { z } from 'zod';

/**
 * Config field type enum for schema validation.
 */
export const ConfigFieldTypeSchema = z.enum(['string', 'number', 'boolean', 'url', 'email']);

/**
 * Schema for a configuration field definition within a service's config schema.
 */
export const ConfigFieldSchemaDefinition = z.object({
  type: ConfigFieldTypeSchema,
  required: z.boolean(),
  pattern: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  description: z.string().max(512).optional(),
});

/**
 * Schema for a service's configuration schema declaration.
 */
export const ConfigSchemaSchema = z.object({
  serviceId: z.string().uuid(),
  schema: z.record(z.string(), ConfigFieldSchemaDefinition),
});

/**
 * Schema for a single configuration entry.
 */
export const ConfigEntrySchema = z.object({
  key: z.string().min(1).max(256),
  value: z.string(),
  isSecret: z.boolean(),
  serviceId: z.string().uuid(),
  environmentId: z.string().uuid(),
  version: z.number().int().min(1),
  updatedBy: z.string().min(1).max(128),
  updatedAt: z.coerce.date(),
});

/**
 * Input schema for updating configuration values.
 */
export const ConfigUpdateSchema = z.object({
  values: z.record(z.string().min(1).max(256), z.string()),
});

// Inferred types
export type ConfigFieldType = z.infer<typeof ConfigFieldTypeSchema>;
export type ConfigFieldSchema = z.infer<typeof ConfigFieldSchemaDefinition>;
export type ConfigSchema = z.infer<typeof ConfigSchemaSchema>;
export type ConfigEntry = z.infer<typeof ConfigEntrySchema>;
export type ConfigUpdate = z.infer<typeof ConfigUpdateSchema>;
