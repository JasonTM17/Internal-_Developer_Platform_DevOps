import { z } from 'zod';

export const createEnvironmentSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(
      /^[a-z][a-z0-9-]*$/,
      'Name must start with a lowercase letter and contain only lowercase letters, digits, and hyphens',
    ),
  tier: z.enum(['development', 'staging', 'production']),
  region: z.string().min(1).max(32).optional(),
  description: z.string().max(500).optional(),
  clusterName: z.string().max(64).optional(),
  namespace: z.string().max(64).optional(),
  quota: z
    .object({
      cpuCores: z.number().optional(),
      memoryGb: z.number().optional(),
      storageGb: z.number().optional(),
      pods: z.number().optional(),
    })
    .partial()
    .optional(),
  variables: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.string().min(1),
        isSecret: z.boolean().optional(),
      }),
    )
    .optional(),
  labels: z.record(z.string()).optional(),
  autoScaling: z.boolean().optional(),
  ttlHours: z.number().int().positive().optional(),
});

export const updateEnvironmentSchema = createEnvironmentSchema.partial();

export const setVariableSchema = z.object({
  value: z.string().min(1).max(4096),
  isSecret: z.boolean().optional(),
});

export const promoteEnvironmentSchema = z.object({
  targetTier: z.enum(['development', 'staging', 'production']),
});
