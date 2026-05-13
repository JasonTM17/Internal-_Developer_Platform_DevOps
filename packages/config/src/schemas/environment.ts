/**
 * Zod schemas for Environment types.
 *
 * Validates: Requirements 6.5
 */
import { z } from 'zod';

/**
 * Environment type enum.
 */
export const EnvironmentTypeSchema = z.enum(['development', 'staging', 'production']);

/**
 * Environment status enum.
 */
export const EnvironmentStatusSchema = z.enum([
  'provisioning',
  'active',
  'expiring',
  'deprovisioning',
  'deleted',
]);

/**
 * Resource quota schema for environment resource limits.
 */
export const ResourceQuotaSchema = z.object({
  cpuLimit: z.string().min(1),
  memoryLimit: z.string().min(1),
  storageLimit: z.string().min(1),
});

/**
 * Environment labels schema.
 */
export const EnvironmentLabelsSchema = z.object({
  team: z.string().min(1).max(128),
  environmentType: z.string().min(1),
  createdBy: z.string().min(1).max(128),
  expiryDate: z.string().min(1), // ISO date string
});

/**
 * Input schema for requesting a new environment.
 */
export const EnvironmentRequestSchema = z.object({
  name: z.string().min(1).max(128),
  type: EnvironmentTypeSchema,
  team: z.string().min(1).max(128),
  expiryDays: z.number().int().min(1).max(365).optional(), // defaults to 30
});

/**
 * Full Environment schema (persisted environment record).
 */
export const EnvironmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(128),
  type: EnvironmentTypeSchema,
  namespace: z.string().min(1).max(253), // Kubernetes namespace max length
  owner: z.string().min(1).max(128),
  team: z.string().min(1).max(128),
  status: EnvironmentStatusSchema,
  resourceQuota: ResourceQuotaSchema,
  labels: EnvironmentLabelsSchema,
  expiryDate: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Inferred types
export type EnvironmentType = z.infer<typeof EnvironmentTypeSchema>;
export type EnvironmentStatus = z.infer<typeof EnvironmentStatusSchema>;
export type ResourceQuota = z.infer<typeof ResourceQuotaSchema>;
export type EnvironmentLabels = z.infer<typeof EnvironmentLabelsSchema>;
export type EnvironmentRequest = z.infer<typeof EnvironmentRequestSchema>;
export type Environment = z.infer<typeof EnvironmentSchema>;
