/**
 * Deployment Engine
 *
 * Orchestrates the deployment lifecycle for services:
 * - Validates deployment requests against service catalog
 * - Manages deployment pipelines with configurable stages
 * - Coordinates rollback on failure
 * - Emits deployment events for notification/audit
 * - Supports canary, blue-green, and rolling deployment strategies
 * - Enforces deployment policies (approval gates, freeze windows)
 */

import { randomUUID } from 'crypto';

import type { DeploymentStore, Deployment, DeploymentEvent } from './deployment-store';
import type { DeploymentState, DeploymentTransition } from './state-machine';
import { DeploymentStateMachine } from './state-machine';

/** Deployment strategy types. */
export type DeploymentStrategy = 'rolling' | 'blue-green' | 'canary' | 'recreate';

/** Deployment request input. */
export interface DeploymentRequest {
  /** Service ID from the catalog */
  serviceId: string;
  /** Target environment (e.g., 'staging', 'production') */
  environment: string;
  /** Version/tag to deploy */
  version: string;
  /** Deployment strategy */
  strategy: DeploymentStrategy;
  /** Optional configuration overrides */
  configOverrides?: Record<string, string>;
  /** Whether to require manual approval */
  requiresApproval?: boolean;
  /** Canary percentage (for canary strategy) */
  canaryPercentage?: number;
  /** Deployment timeout in seconds */
  timeoutSeconds?: number;
  /** Rollback on failure */
  autoRollback?: boolean;
  /** Deployment description/notes */
  description?: string;
}

/** Deployment result. */
export interface DeploymentResult {
  success: boolean;
  deployment?: Deployment;
  error?: string;
}

/** Deployment policy check result. */
export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  violations: string[];
}

/** Deployment event listener. */
export type DeploymentEventListener = (event: DeploymentEvent) => void | Promise<void>;

/** Deployment freeze window. */
export interface FreezeWindow {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  environments: string[];
  reason: string;
  createdBy: string;
}

/**
 * Deployment Engine - orchestrates the full deployment lifecycle.
 */
export class DeploymentEngine {
  private readonly listeners: DeploymentEventListener[] = [];
  private readonly freezeWindows: FreezeWindow[] = [];
  private readonly activeDeployments: Map<string, DeploymentStateMachine> = new Map();

  constructor(
    private readonly store: DeploymentStore,
    private readonly options: {
      maxConcurrentDeployments?: number;
      defaultTimeoutSeconds?: number;
      defaultStrategy?: DeploymentStrategy;
      requireApprovalForProduction?: boolean;
    } = {},
  ) {}

  /**
   * Initiate a new deployment.
   *
   * Validates the request, checks policies, creates the deployment record,
   * and starts the deployment state machine.
   */
  async deploy(request: DeploymentRequest, actor: string): Promise<DeploymentResult> {
    // Validate the deployment request
    const validation = this.validateRequest(request);
    if (!validation.allowed) {
      return { success: false, error: validation.reason };
    }

    // Check deployment policies
    const policyCheck = this.checkPolicies(request);
    if (!policyCheck.allowed) {
      return {
        success: false,
        error: `Deployment blocked by policy: ${policyCheck.violations.join(', ')}`,
      };
    }

    // Check concurrent deployment limits
    const activeCount = await this.store.countActiveDeployments(request.environment);
    const maxConcurrent = this.options.maxConcurrentDeployments || 3;
    if (activeCount >= maxConcurrent) {
      return {
        success: false,
        error: `Maximum concurrent deployments (${maxConcurrent}) reached for environment '${request.environment}'`,
      };
    }

    // Create the deployment record
    const deployment: Deployment = {
      id: randomUUID(),
      serviceId: request.serviceId,
      environment: request.environment,
      version: request.version,
      previousVersion: await this.store.getCurrentVersion(request.serviceId, request.environment),
      strategy: request.strategy,
      state: request.requiresApproval ? 'pending_approval' : 'queued',
      configOverrides: request.configOverrides || {},
      canaryPercentage: request.canaryPercentage,
      timeoutSeconds: request.timeoutSeconds || this.options.defaultTimeoutSeconds || 600,
      autoRollback: request.autoRollback !== false,
      description: request.description || '',
      initiatedBy: actor,
      createdAt: new Date(),
      updatedAt: new Date(),
      events: [],
    };

    // Persist the deployment
    await this.store.create(deployment);

    // Create and start the state machine
    const stateMachine = new DeploymentStateMachine(deployment.state);
    this.activeDeployments.set(deployment.id, stateMachine);

    // Emit deployment created event
    await this.emitEvent({
      deploymentId: deployment.id,
      type: 'deployment_created',
      state: deployment.state,
      message: `Deployment initiated for ${request.serviceId} v${request.version} to ${request.environment}`,
      actor,
      timestamp: new Date(),
    });

    // If no approval required, start the deployment
    if (!request.requiresApproval) {
      await this.startDeployment(deployment.id, actor);
    }

    return { success: true, deployment };
  }

  /**
   * Approve a pending deployment.
   */
  async approve(deploymentId: string, actor: string): Promise<DeploymentResult> {
    const deployment = await this.store.getById(deploymentId);
    if (!deployment) {
      return { success: false, error: `Deployment '${deploymentId}' not found` };
    }

    if (deployment.state !== 'pending_approval') {
      return {
        success: false,
        error: `Deployment is not pending approval (current state: ${deployment.state})`,
      };
    }

    const stateMachine = this.activeDeployments.get(deploymentId);
    if (!stateMachine) {
      return { success: false, error: 'Deployment state machine not found' };
    }

    const transition: DeploymentTransition = {
      from: 'pending_approval',
      to: 'queued',
      trigger: 'approve',
    };
    if (!stateMachine.canTransition(transition)) {
      return { success: false, error: 'Invalid state transition' };
    }

    stateMachine.transition(transition);
    await this.store.updateState(deploymentId, 'queued');

    await this.emitEvent({
      deploymentId,
      type: 'deployment_approved',
      state: 'queued',
      message: `Deployment approved by ${actor}`,
      actor,
      timestamp: new Date(),
    });

    // Start the deployment after approval
    await this.startDeployment(deploymentId, actor);

    return { success: true, deployment: { ...deployment, state: 'queued' } };
  }

  /**
   * Cancel a deployment.
   */
  async cancel(deploymentId: string, actor: string, reason: string): Promise<DeploymentResult> {
    const deployment = await this.store.getById(deploymentId);
    if (!deployment) {
      return { success: false, error: `Deployment '${deploymentId}' not found` };
    }

    const terminalStates: DeploymentState[] = ['completed', 'failed', 'cancelled'];
    if (terminalStates.includes(deployment.state)) {
      return { success: false, error: `Cannot cancel deployment in state '${deployment.state}'` };
    }

    await this.store.updateState(deploymentId, 'cancelled');
    this.activeDeployments.delete(deploymentId);

    await this.emitEvent({
      deploymentId,
      type: 'deployment_cancelled',
      state: 'cancelled',
      message: `Deployment cancelled by ${actor}: ${reason}`,
      actor,
      timestamp: new Date(),
    });

    return { success: true, deployment: { ...deployment, state: 'cancelled' } };
  }

  /**
   * Trigger a rollback for a deployment.
   */
  async rollback(deploymentId: string, actor: string): Promise<DeploymentResult> {
    const deployment = await this.store.getById(deploymentId);
    if (!deployment) {
      return { success: false, error: `Deployment '${deploymentId}' not found` };
    }

    if (!deployment.previousVersion) {
      return { success: false, error: 'No previous version available for rollback' };
    }

    // Create a new deployment for the rollback
    const rollbackRequest: DeploymentRequest = {
      serviceId: deployment.serviceId,
      environment: deployment.environment,
      version: deployment.previousVersion,
      strategy: 'rolling',
      autoRollback: false,
      description: `Rollback from v${deployment.version} to v${deployment.previousVersion}`,
    };

    await this.store.updateState(deploymentId, 'rolling_back');

    await this.emitEvent({
      deploymentId,
      type: 'deployment_rollback_started',
      state: 'rolling_back',
      message: `Rolling back to v${deployment.previousVersion}`,
      actor,
      timestamp: new Date(),
    });

    return this.deploy(rollbackRequest, actor);
  }

  /**
   * Add a freeze window to prevent deployments during a time period.
   */
  addFreezeWindow(window: FreezeWindow): void {
    this.freezeWindows.push(window);
  }

  /**
   * Remove a freeze window.
   */
  removeFreezeWindow(windowId: string): boolean {
    const index = this.freezeWindows.findIndex((w) => w.id === windowId);
    if (index === -1) return false;
    this.freezeWindows.splice(index, 1);
    return true;
  }

  /**
   * Register an event listener for deployment events.
   */
  addEventListener(listener: DeploymentEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Get the current status of a deployment.
   */
  async getStatus(deploymentId: string): Promise<Deployment | null> {
    return this.store.getById(deploymentId);
  }

  /**
   * List deployments with optional filters.
   */
  async list(filters: {
    serviceId?: string;
    environment?: string;
    state?: DeploymentState;
    limit?: number;
    offset?: number;
  }): Promise<{ deployments: Deployment[]; total: number }> {
    return this.store.list(filters);
  }

  /**
   * Start the deployment process (internal).
   */
  private async startDeployment(deploymentId: string, actor: string): Promise<void> {
    await this.store.updateState(deploymentId, 'in_progress');

    await this.emitEvent({
      deploymentId,
      type: 'deployment_started',
      state: 'in_progress',
      message: 'Deployment execution started',
      actor,
      timestamp: new Date(),
    });

    this.scheduleVerification(deploymentId, actor);
  }

  /**
   * Schedule deployment verification after execution phase.
   * NOTE: Uses setTimeout to simulate async deployment lifecycle for dev/demo.
   * In production, replace with orchestration callbacks (ArgoCD, K8s events, job queue).
   */
  private scheduleVerification(deploymentId: string, actor: string): void {
    setTimeout(() => {
      void (async () => {
        const deployment = await this.store.getById(deploymentId);
        if (!deployment || deployment.state !== 'in_progress') return;

        await this.store.updateState(deploymentId, 'verifying');
        await this.emitEvent({
          deploymentId,
          type: 'deployment_progress',
          state: 'verifying',
          message: 'Running health checks and verification',
          actor,
          timestamp: new Date(),
        });

        setTimeout(() => {
          void (async () => {
            const current = await this.store.getById(deploymentId);
            if (!current || current.state !== 'verifying') return;

            await this.store.updateState(deploymentId, 'completed');
            await this.emitEvent({
              deploymentId,
              type: 'deployment_completed',
              state: 'completed',
              message: 'Deployment completed successfully',
              actor,
              timestamp: new Date(),
            });
          })();
        }, 5000);
      })();
    }, 3000);
  }

  /**
   * Validate a deployment request.
   */
  private validateRequest(request: DeploymentRequest): PolicyCheckResult {
    const violations: string[] = [];

    if (!request.serviceId) violations.push('serviceId is required');
    if (!request.environment) violations.push('environment is required');
    if (!request.version) violations.push('version is required');
    if (!request.strategy) violations.push('strategy is required');

    const validStrategies: DeploymentStrategy[] = ['rolling', 'blue-green', 'canary', 'recreate'];
    if (request.strategy && !validStrategies.includes(request.strategy)) {
      violations.push(
        `Invalid strategy '${request.strategy}'. Must be one of: ${validStrategies.join(', ')}`,
      );
    }

    if (request.canaryPercentage !== undefined) {
      if (request.canaryPercentage < 1 || request.canaryPercentage > 100) {
        violations.push('canaryPercentage must be between 1 and 100');
      }
      if (request.strategy !== 'canary') {
        violations.push('canaryPercentage is only valid with canary strategy');
      }
    }

    return {
      allowed: violations.length === 0,
      reason: violations.length > 0 ? violations.join('; ') : undefined,
      violations,
    };
  }

  /**
   * Check deployment policies (freeze windows, approval requirements).
   */
  private checkPolicies(request: DeploymentRequest): PolicyCheckResult {
    const violations: string[] = [];
    const now = new Date();

    // Check freeze windows
    for (const window of this.freezeWindows) {
      if (
        now >= window.startTime &&
        now <= window.endTime &&
        (window.environments.length === 0 || window.environments.includes(request.environment))
      ) {
        violations.push(`Deployment freeze active: ${window.name} (${window.reason})`);
      }
    }

    // Check production approval requirement
    if (
      this.options.requireApprovalForProduction &&
      request.environment === 'production' &&
      !request.requiresApproval
    ) {
      violations.push('Production deployments require approval');
    }

    return {
      allowed: violations.length === 0,
      reason: violations.length > 0 ? violations.join('; ') : undefined,
      violations,
    };
  }

  /**
   * Emit a deployment event to all registered listeners.
   */
  private async emitEvent(event: DeploymentEvent): Promise<void> {
    // Persist the event
    await this.store.addEvent(event.deploymentId, event);

    // Notify listeners (fire and forget)
    for (const listener of this.listeners) {
      try {
        await listener(event);
      } catch (error) {
        console.error('Deployment event listener error:', error);
      }
    }
  }
}
