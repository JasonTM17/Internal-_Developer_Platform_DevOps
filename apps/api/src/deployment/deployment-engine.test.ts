import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DeploymentEngine } from './deployment-engine';
import type { DeploymentStore, Deployment } from './deployment-store';

function createMockStore(): DeploymentStore {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn().mockResolvedValue(null),
    updateState: vi.fn().mockResolvedValue(undefined),
    addEvent: vi.fn().mockResolvedValue(undefined),
    getCurrentVersion: vi.fn().mockResolvedValue('v1.0.0'),
    countActiveDeployments: vi.fn().mockResolvedValue(0),
    list: vi.fn().mockResolvedValue({ deployments: [], total: 0 }),
    getHistory: vi.fn().mockResolvedValue([]),
    markCompleted: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
  };
}

describe('DeploymentEngine', () => {
  let store: DeploymentStore;
  let engine: DeploymentEngine;

  beforeEach(() => {
    store = createMockStore();
    engine = new DeploymentEngine(store, {
      maxConcurrentDeployments: 3,
      defaultTimeoutSeconds: 600,
    });
  });

  describe('deploy', () => {
    it('creates a deployment successfully', async () => {
      const result = await engine.deploy(
        {
          serviceId: 'svc-1',
          environment: 'staging',
          version: 'v2.0.0',
          strategy: 'rolling',
        },
        'user-1',
      );

      expect(result.success).toBe(true);
      expect(result.deployment).toBeDefined();
      expect(result.deployment!.serviceId).toBe('svc-1');
      expect(result.deployment!.version).toBe('v2.0.0');
      expect(result.deployment!.environment).toBe('staging');
      expect(store.create).toHaveBeenCalled();
    });

    it('blocks deployment when max concurrent reached', async () => {
      vi.mocked(store.countActiveDeployments).mockResolvedValue(3);

      const result = await engine.deploy(
        {
          serviceId: 'svc-1',
          environment: 'production',
          version: 'v2.0.0',
          strategy: 'rolling',
        },
        'user-1',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum concurrent deployments');
    });

    it('sets state to pending_approval when requiresApproval is true', async () => {
      const result = await engine.deploy(
        {
          serviceId: 'svc-1',
          environment: 'production',
          version: 'v2.0.0',
          strategy: 'canary',
          requiresApproval: true,
        },
        'user-1',
      );

      expect(result.success).toBe(true);
      expect(result.deployment!.state).toBe('pending_approval');
    });

    it('records previousVersion from store', async () => {
      vi.mocked(store.getCurrentVersion).mockResolvedValue('v1.5.0');

      const result = await engine.deploy(
        {
          serviceId: 'svc-1',
          environment: 'staging',
          version: 'v2.0.0',
          strategy: 'rolling',
        },
        'user-1',
      );

      expect(result.deployment!.previousVersion).toBe('v1.5.0');
    });
  });

  describe('approve', () => {
    it('returns error when deployment not found', async () => {
      const result = await engine.approve('nonexistent', 'user-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns error when deployment is not pending approval', async () => {
      vi.mocked(store.getById).mockResolvedValue({
        id: 'dep-1',
        state: 'in_progress',
      } as Deployment);

      const result = await engine.approve('dep-1', 'user-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not pending approval');
    });
  });

  describe('cancel', () => {
    it('returns error when deployment not found', async () => {
      const result = await engine.cancel('nonexistent', 'user-1', 'no longer needed');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });
});
