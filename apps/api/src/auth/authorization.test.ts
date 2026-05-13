/**
 * Tests for the Role-Based Permission Evaluation Engine.
 *
 * Validates: Requirements 9.2, 9.3, 9.4
 */

import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import type { AuthenticatedUser } from '@idp/shared';
import {
  evaluatePermission,
  evaluatePermissionAcrossTeams,
  createAuthzMiddleware,
  requirePermission,
} from './authorization';
import type { Resource, Action } from './authorization';
import type { AuthenticatedRequest } from './middleware';

// Helper to create a user with role assignments
function createUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'user-1',
    email: 'user@example.com',
    teams: ['team-alpha'],
    roles: [
      {
        userId: 'user-1',
        role: 'developer',
        team: 'team-alpha',
        assignedBy: 'admin-1',
        assignedAt: new Date('2024-01-01'),
      },
    ],
    sessionExpiry: new Date(Date.now() + 3600000),
    ...overrides,
  };
}

describe('evaluatePermission', () => {
  describe('viewer role', () => {
    const viewer = createUser({
      roles: [
        {
          userId: 'user-1',
          role: 'viewer',
          team: 'team-alpha',
          assignedBy: 'admin-1',
          assignedAt: new Date('2024-01-01'),
        },
      ],
    });

    it('allows read access to team-owned resources', () => {
      const action: Action = { type: 'read' };
      const resource: Resource = { type: 'catalog', team: 'team-alpha' };

      const result = evaluatePermission(viewer, action, resource);
      expect(result.allowed).toBe(true);
    });

    it('denies deploy access', () => {
      const action: Action = { type: 'deploy', environment: 'staging' };
      const resource: Resource = { type: 'deployment', team: 'team-alpha' };

      const result = evaluatePermission(viewer, action, resource);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('denies provision access', () => {
      const action: Action = { type: 'provision' };
      const resource: Resource = { type: 'environment', team: 'team-alpha' };

      const result = evaluatePermission(viewer, action, resource);
      expect(result.allowed).toBe(false);
    });

    it('denies manage config access', () => {
      const action: Action = { type: 'manage' };
      const resource: Resource = { type: 'config', team: 'team-alpha' };

      const result = evaluatePermission(viewer, action, resource);
      expect(result.allowed).toBe(false);
    });

    it('denies access to other team resources', () => {
      const action: Action = { type: 'read' };
      const resource: Resource = { type: 'catalog', team: 'team-beta' };

      const result = evaluatePermission(viewer, action, resource);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('no role assignment for team');
    });
  });

  describe('developer role', () => {
    const developer = createUser({
      roles: [
        {
          userId: 'user-1',
          role: 'developer',
          team: 'team-alpha',
          assignedBy: 'admin-1',
          assignedAt: new Date('2024-01-01'),
        },
      ],
    });

    it('allows read access', () => {
      const action: Action = { type: 'read' };
      const resource: Resource = { type: 'catalog', team: 'team-alpha' };

      const result = evaluatePermission(developer, action, resource);
      expect(result.allowed).toBe(true);
    });

    it('allows deploy to non-production environments', () => {
      const action: Action = { type: 'deploy', environment: 'staging' };
      const resource: Resource = { type: 'deployment', team: 'team-alpha' };

      const result = evaluatePermission(developer, action, resource);
      expect(result.allowed).toBe(true);
    });

    it('allows deploy to development environments', () => {
      const action: Action = { type: 'deploy', environment: 'development' };
      const resource: Resource = { type: 'deployment', team: 'team-alpha' };

      const result = evaluatePermission(developer, action, resource);
      expect(result.allowed).toBe(true);
    });

    it('denies deploy to production environments', () => {
      const action: Action = { type: 'deploy', environment: 'production' };
      const resource: Resource = { type: 'deployment', team: 'team-alpha' };

      const result = evaluatePermission(developer, action, resource);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not have');
    });

    it('allows provision environments', () => {
      const action: Action = { type: 'provision' };
      const resource: Resource = { type: 'environment', team: 'team-alpha' };

      const result = evaluatePermission(developer, action, resource);
      expect(result.allowed).toBe(true);
    });

    it('allows manage config', () => {
      const action: Action = { type: 'manage' };
      const resource: Resource = { type: 'config', team: 'team-alpha' };

      const result = evaluatePermission(developer, action, resource);
      expect(result.allowed).toBe(true);
    });

    it('denies access to other team resources', () => {
      const action: Action = { type: 'deploy', environment: 'staging' };
      const resource: Resource = { type: 'deployment', team: 'team-beta' };

      const result = evaluatePermission(developer, action, resource);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('no role assignment for team');
    });
  });

  describe('admin role', () => {
    const admin = createUser({
      roles: [
        {
          userId: 'user-1',
          role: 'admin',
          team: 'team-alpha',
          assignedBy: 'super-admin',
          assignedAt: new Date('2024-01-01'),
        },
      ],
    });

    it('allows all actions on team resources', () => {
      const actions: Action[] = [
        { type: 'read' },
        { type: 'deploy', environment: 'production' },
        { type: 'deploy', environment: 'staging' },
        { type: 'provision' },
        { type: 'manage' },
        { type: 'delete' },
        { type: 'admin' },
      ];

      for (const action of actions) {
        const resource: Resource = { type: 'catalog', team: 'team-alpha' };
        const result = evaluatePermission(admin, action, resource);
        expect(result.allowed).toBe(true);
      }
    });

    it('denies access to other team resources', () => {
      const action: Action = { type: 'admin' };
      const resource: Resource = { type: 'catalog', team: 'team-beta' };

      const result = evaluatePermission(admin, action, resource);
      expect(result.allowed).toBe(false);
    });
  });

  describe('team-scoped permissions (Requirement 9.4)', () => {
    it('evaluates permissions independently per team', () => {
      const multiTeamUser = createUser({
        id: 'user-multi',
        teams: ['team-alpha', 'team-beta'],
        roles: [
          {
            userId: 'user-multi',
            role: 'admin',
            team: 'team-alpha',
            assignedBy: 'super-admin',
            assignedAt: new Date('2024-01-01'),
          },
          {
            userId: 'user-multi',
            role: 'viewer',
            team: 'team-beta',
            assignedBy: 'admin-1',
            assignedAt: new Date('2024-01-01'),
          },
        ],
      });

      // Admin in team-alpha: can deploy to production
      const deployProd: Action = { type: 'deploy', environment: 'production' };
      const alphaResource: Resource = { type: 'deployment', team: 'team-alpha' };
      expect(evaluatePermission(multiTeamUser, deployProd, alphaResource).allowed).toBe(true);

      // Viewer in team-beta: cannot deploy
      const betaResource: Resource = { type: 'deployment', team: 'team-beta' };
      expect(evaluatePermission(multiTeamUser, deployProd, betaResource).allowed).toBe(false);

      // Viewer in team-beta: can read
      const readAction: Action = { type: 'read' };
      expect(evaluatePermission(multiTeamUser, readAction, betaResource).allowed).toBe(true);
    });

    it('denies access to teams user has no membership in', () => {
      const user = createUser({
        teams: ['team-alpha'],
        roles: [
          {
            userId: 'user-1',
            role: 'admin',
            team: 'team-alpha',
            assignedBy: 'super-admin',
            assignedAt: new Date('2024-01-01'),
          },
        ],
      });

      const action: Action = { type: 'read' };
      const resource: Resource = { type: 'catalog', team: 'team-gamma' };

      const result = evaluatePermission(user, action, resource);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('no role assignment for team');
    });

    it('supports multiple roles in the same team (highest privilege wins)', () => {
      const user = createUser({
        roles: [
          {
            userId: 'user-1',
            role: 'viewer',
            team: 'team-alpha',
            assignedBy: 'admin-1',
            assignedAt: new Date('2024-01-01'),
          },
          {
            userId: 'user-1',
            role: 'developer',
            team: 'team-alpha',
            assignedBy: 'admin-1',
            assignedAt: new Date('2024-02-01'),
          },
        ],
      });

      // Developer permission should be granted even though viewer is also assigned
      const action: Action = { type: 'deploy', environment: 'staging' };
      const resource: Resource = { type: 'deployment', team: 'team-alpha' };

      const result = evaluatePermission(user, action, resource);
      expect(result.allowed).toBe(true);
    });
  });

  describe('denial reasons', () => {
    it('provides reason when user has no team role', () => {
      const user = createUser({ roles: [] });
      const action: Action = { type: 'read' };
      const resource: Resource = { type: 'catalog', team: 'team-alpha' };

      const result = evaluatePermission(user, action, resource);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('no role assignment');
    });

    it('provides reason when role lacks permission', () => {
      const viewer = createUser({
        roles: [
          {
            userId: 'user-1',
            role: 'viewer',
            team: 'team-alpha',
            assignedBy: 'admin-1',
            assignedAt: new Date('2024-01-01'),
          },
        ],
      });

      const action: Action = { type: 'deploy', environment: 'staging' };
      const resource: Resource = { type: 'deployment', team: 'team-alpha' };

      const result = evaluatePermission(viewer, action, resource);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('does not have');
      expect(result.reason).toContain('deploy');
    });
  });

  describe('performance (Requirement 9.3)', () => {
    it('evaluates permission within 500ms', () => {
      const user = createUser({
        roles: Array.from({ length: 50 }, (_, i) => ({
          userId: 'user-1',
          role: 'developer' as const,
          team: `team-${i}`,
          assignedBy: 'admin-1',
          assignedAt: new Date('2024-01-01'),
        })),
      });

      const action: Action = { type: 'deploy', environment: 'staging' };
      const resource: Resource = { type: 'deployment', team: 'team-49' };

      const start = performance.now();
      const result = evaluatePermission(user, action, resource);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(500);
      expect(result.allowed).toBe(true);
    });
  });
});

describe('evaluatePermissionAcrossTeams', () => {
  it('returns results for all teams the user has roles in', () => {
    const user = createUser({
      roles: [
        {
          userId: 'user-1',
          role: 'developer',
          team: 'team-alpha',
          assignedBy: 'admin-1',
          assignedAt: new Date('2024-01-01'),
        },
        {
          userId: 'user-1',
          role: 'viewer',
          team: 'team-beta',
          assignedBy: 'admin-1',
          assignedAt: new Date('2024-01-01'),
        },
      ],
    });

    const action: Action = { type: 'deploy', environment: 'staging' };
    const results = evaluatePermissionAcrossTeams(user, action, 'deployment');

    expect(results).toHaveLength(2);

    const alphaResult = results.find((r) => r.team === 'team-alpha');
    const betaResult = results.find((r) => r.team === 'team-beta');

    expect(alphaResult?.result.allowed).toBe(true);
    expect(betaResult?.result.allowed).toBe(false);
  });
});

describe('createAuthzMiddleware', () => {
  function createMockReq(user?: AuthenticatedUser): AuthenticatedRequest {
    return {
      user,
      params: { team: 'team-alpha' },
      query: {},
    } as unknown as AuthenticatedRequest;
  }

  function createMockRes() {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    return res;
  }

  it('returns 401 when no user is on the request', () => {
    const middleware = createAuthzMiddleware({
      getAction: () => ({ type: 'read' }),
      getResource: () => ({ type: 'catalog', team: 'team-alpha' }),
    });

    const req = createMockReq(undefined);
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 with denial reason for unauthorized requests', () => {
    const viewer = createUser({
      roles: [
        {
          userId: 'user-1',
          role: 'viewer',
          team: 'team-alpha',
          assignedBy: 'admin-1',
          assignedAt: new Date('2024-01-01'),
        },
      ],
    });

    const middleware = createAuthzMiddleware({
      getAction: () => ({ type: 'deploy', environment: 'staging' }),
      getResource: () => ({ type: 'deployment', team: 'team-alpha' }),
    });

    const req = createMockReq(viewer);
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INSUFFICIENT_PERMISSIONS',
        details: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('does not have'),
          }),
        ]),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for authorized requests', () => {
    const developer = createUser({
      roles: [
        {
          userId: 'user-1',
          role: 'developer',
          team: 'team-alpha',
          assignedBy: 'admin-1',
          assignedAt: new Date('2024-01-01'),
        },
      ],
    });

    const middleware = createAuthzMiddleware({
      getAction: () => ({ type: 'read' }),
      getResource: () => ({ type: 'catalog', team: 'team-alpha' }),
    });

    const req = createMockReq(developer);
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('requirePermission', () => {
  it('creates middleware that extracts team from params', () => {
    const developer = createUser({
      roles: [
        {
          userId: 'user-1',
          role: 'developer',
          team: 'team-alpha',
          assignedBy: 'admin-1',
          assignedAt: new Date('2024-01-01'),
        },
      ],
    });

    const middleware = requirePermission('read', 'catalog');

    const req = {
      user: developer,
      params: { team: 'team-alpha' },
      query: {},
    } as unknown as AuthenticatedRequest;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('creates middleware with custom team extraction', () => {
    const developer = createUser({
      roles: [
        {
          userId: 'user-1',
          role: 'developer',
          team: 'team-alpha',
          assignedBy: 'admin-1',
          assignedAt: new Date('2024-01-01'),
        },
      ],
    });

    const middleware = requirePermission('deploy', 'deployment', {
      environment: 'staging',
      getTeam: () => 'team-alpha',
    });

    const req = {
      user: developer,
      params: {},
      query: {},
    } as unknown as AuthenticatedRequest;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
