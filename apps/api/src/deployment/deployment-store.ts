/**
 * Deployment Store Interface
 *
 * Data access layer for deployment persistence.
 * Defines the contract for storing and retrieving deployment records,
 * supporting both PostgreSQL and in-memory implementations.
 */

import type { DeploymentState } from './state-machine';
import type { DeploymentStrategy } from './deployment-engine';

/** Deployment event types. */
export type DeploymentEventType =
  | 'deployment_created'
  | 'deployment_approved'
  | 'deployment_started'
  | 'deployment_progress'
  | 'deployment_completed'
  | 'deployment_failed'
  | 'deployment_cancelled'
  | 'deployment_rollback_started'
  | 'deployment_rollback_completed'
  | 'health_check_passed'
  | 'health_check_failed'
  | 'canary_promoted'
  | 'canary_rejected';

/** Deployment event record. */
export interface DeploymentEvent {
  deploymentId: string;
  type: DeploymentEventType;
  state: DeploymentState;
  message: string;
  actor: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

/** Deployment record. */
export interface Deployment {
  id: string;
  serviceId: string;
  environment: string;
  version: string;
  previousVersion: string | null;
  strategy: DeploymentStrategy;
  state: DeploymentState;
  configOverrides: Record<string, string>;
  canaryPercentage?: number;
  timeoutSeconds: number;
  autoRollback: boolean;
  description: string;
  initiatedBy: string;
  approvedBy?: string;
  completedAt?: Date;
  failureReason?: string;
  events: DeploymentEvent[];
  createdAt: Date;
  updatedAt: Date;
}

/** Filters for listing deployments. */
export interface DeploymentListFilters {
  serviceId?: string;
  environment?: string;
  state?: DeploymentState;
  initiatedBy?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Deployment Store interface.
 * Implementations handle the actual persistence (PostgreSQL, in-memory, etc.).
 */
export interface DeploymentStore {
  /**
   * Create a new deployment record.
   */
  create(deployment: Deployment): Promise<void>;

  /**
   * Get a deployment by its unique ID.
   */
  getById(id: string): Promise<Deployment | null>;

  /**
   * Update the state of a deployment.
   */
  updateState(id: string, state: DeploymentState, metadata?: Record<string, unknown>): Promise<void>;

  /**
   * Add an event to a deployment's event log.
   */
  addEvent(deploymentId: string, event: DeploymentEvent): Promise<void>;

  /**
   * Get the currently deployed version for a service in an environment.
   */
  getCurrentVersion(serviceId: string, environment: string): Promise<string | null>;

  /**
   * Count active (non-terminal) deployments for an environment.
   */
  countActiveDeployments(environment: string): Promise<number>;

  /**
   * List deployments with optional filters and pagination.
   */
  list(filters: DeploymentListFilters): Promise<{ deployments: Deployment[]; total: number }>;

  /**
   * Get deployment history for a service.
   */
  getHistory(serviceId: string, limit?: number): Promise<Deployment[]>;

  /**
   * Mark a deployment as completed.
   */
  markCompleted(id: string, completedAt: Date): Promise<void>;

  /**
   * Mark a deployment as failed.
   */
  markFailed(id: string, reason: string): Promise<void>;
}

/**
 * In-memory implementation of DeploymentStore for testing.
 */
export class InMemoryDeploymentStore implements DeploymentStore {
  private readonly deployments: Map<string, Deployment> = new Map();

  async create(deployment: Deployment): Promise<void> {
    this.deployments.set(deployment.id, { ...deployment });
  }

  async getById(id: string): Promise<Deployment | null> {
    return this.deployments.get(id) || null;
  }

  async updateState(id: string, state: DeploymentState): Promise<void> {
    const deployment = this.deployments.get(id);
    if (deployment) {
      deployment.state = state;
      deployment.updatedAt = new Date();
    }
  }

  async addEvent(deploymentId: string, event: DeploymentEvent): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (deployment) {
      deployment.events.push(event);
    }
  }

  async getCurrentVersion(serviceId: string, environment: string): Promise<string | null> {
    const completed = Array.from(this.deployments.values())
      .filter(
        (d) =>
          d.serviceId === serviceId &&
          d.environment === environment &&
          d.state === 'completed',
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return completed.length > 0 ? completed[0].version : null;
  }

  async countActiveDeployments(environment: string): Promise<number> {
    const terminalStates: DeploymentState[] = ['completed', 'failed', 'cancelled'];
    return Array.from(this.deployments.values()).filter(
      (d) => d.environment === environment && !terminalStates.includes(d.state),
    ).length;
  }

  async list(filters: DeploymentListFilters): Promise<{ deployments: Deployment[]; total: number }> {
    let results = Array.from(this.deployments.values());

    if (filters.serviceId) {
      results = results.filter((d) => d.serviceId === filters.serviceId);
    }
    if (filters.environment) {
      results = results.filter((d) => d.environment === filters.environment);
    }
    if (filters.state) {
      results = results.filter((d) => d.state === filters.state);
    }
    if (filters.initiatedBy) {
      results = results.filter((d) => d.initiatedBy === filters.initiatedBy);
    }
    if (filters.fromDate) {
      results = results.filter((d) => d.createdAt >= filters.fromDate!);
    }
    if (filters.toDate) {
      results = results.filter((d) => d.createdAt <= filters.toDate!);
    }

    // Sort by creation date descending
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = results.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    results = results.slice(offset, offset + limit);

    return { deployments: results, total };
  }

  async getHistory(serviceId: string, limit = 50): Promise<Deployment[]> {
    return Array.from(this.deployments.values())
      .filter((d) => d.serviceId === serviceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async markCompleted(id: string, completedAt: Date): Promise<void> {
    const deployment = this.deployments.get(id);
    if (deployment) {
      deployment.state = 'completed';
      deployment.completedAt = completedAt;
      deployment.updatedAt = new Date();
    }
  }

  async markFailed(id: string, reason: string): Promise<void> {
    const deployment = this.deployments.get(id);
    if (deployment) {
      deployment.state = 'failed';
      deployment.failureReason = reason;
      deployment.updatedAt = new Date();
    }
  }

  /** Clear all deployments (for testing). */
  clear(): void {
    this.deployments.clear();
  }
}
