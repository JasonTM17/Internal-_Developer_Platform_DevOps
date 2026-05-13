/**
 * Zod schemas for Deployment types.
 *
 * Validates: Requirements 3.1, 13.1
 */
import { z } from 'zod';

/**
 * Deployment status enum.
 */
export const DeploymentStatusSchema = z.enum([
  'pending',
  'in_progress',
  'success',
  'failed',
  'rollback_failed',
]);

/**
 * Deployment phase enum representing the lifecycle stages.
 */
export const DeploymentPhaseSchema = z.enum([
  'pending',
  'validating',
  'generating_manifests',
  'committing',
  'syncing',
  'health_checking',
  'success',
  'failed',
  'rollback_failed',
]);

/**
 * Deployment type: forward deployment or rollback.
 */
export const DeploymentTypeSchema = z.enum(['forward', 'rollback']);

/**
 * Schema for a deployment phase record tracking progress.
 */
export const DeploymentPhaseRecordSchema = z.object({
  phase: DeploymentPhaseSchema,
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
  progress: z.number().int().min(0).max(100),
  error: z.string().optional(),
});

/**
 * Schema for deployment error details.
 */
export const DeploymentErrorSchema = z.object({
  message: z.string().min(1),
  phase: DeploymentPhaseSchema,
  details: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Input schema for creating a deployment action.
 */
export const DeploymentActionInputSchema = z.object({
  serviceId: z.string().uuid(),
  serviceName: z.string().min(1).max(128),
  version: z.string().min(1).max(128),
  environment: z.string().min(1).max(128),
});

/**
 * Full Deployment schema (persisted deployment record).
 */
export const DeploymentSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
  serviceName: z.string().min(1).max(128),
  version: z.string().min(1).max(128),
  environment: z.string().min(1).max(128),
  status: DeploymentStatusSchema,
  type: DeploymentTypeSchema,
  actor: z.string().min(1).max(128),
  phases: z.array(DeploymentPhaseRecordSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
  error: DeploymentErrorSchema.optional(),
});

// Inferred types
export type DeploymentStatus = z.infer<typeof DeploymentStatusSchema>;
export type DeploymentPhase = z.infer<typeof DeploymentPhaseSchema>;
export type DeploymentType = z.infer<typeof DeploymentTypeSchema>;
export type DeploymentPhaseRecord = z.infer<typeof DeploymentPhaseRecordSchema>;
export type DeploymentError = z.infer<typeof DeploymentErrorSchema>;
export type DeploymentActionInput = z.infer<typeof DeploymentActionInputSchema>;
export type Deployment = z.infer<typeof DeploymentSchema>;
