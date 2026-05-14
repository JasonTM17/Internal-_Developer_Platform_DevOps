import { z } from 'zod';

export const createDeploymentSchema = z.object({
  serviceId: z.string().min(1, 'serviceId is required'),
  environment: z.string().min(1).max(64),
  version: z.string().min(1).max(128),
  strategy: z.enum(['rolling', 'blue-green', 'canary', 'recreate']).default('rolling'),
  configOverrides: z.record(z.string()).optional(),
  requiresApproval: z.boolean().optional(),
  canaryPercentage: z.number().int().min(1).max(100).optional(),
  timeoutSeconds: z.number().int().min(30).max(3600).optional(),
  autoRollback: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

export const cancelDeploymentSchema = z.object({
  reason: z.string().min(1, 'A cancellation reason is required').max(500),
});
