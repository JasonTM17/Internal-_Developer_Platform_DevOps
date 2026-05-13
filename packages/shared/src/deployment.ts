/**
 * Deployment interfaces and types.
 *
 * Defines the deployment lifecycle model including actions, status tracking,
 * phase management, and error reporting.
 */

/**
 * Deployment lifecycle phases.
 */
export type DeploymentPhase =
  | 'pending'
  | 'validating'
  | 'generating_manifests'
  | 'committing'
  | 'syncing'
  | 'health_checking'
  | 'success'
  | 'failed'
  | 'rollback_failed';

/**
 * Overall deployment status.
 */
export type DeploymentStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'rollback_failed';

/**
 * Deployment type indicating direction.
 */
export type DeploymentType = 'forward' | 'rollback';

/**
 * A record of a single deployment phase execution.
 */
export interface DeploymentPhaseRecord {
  /** The phase being executed. */
  phase: DeploymentPhase;
  /** When this phase started. */
  startedAt: Date;
  /** When this phase completed (undefined if still in progress). */
  completedAt?: Date;
  /** Progress percentage, 0-100. */
  progress: number;
  /** Error message if the phase failed. */
  error?: string;
}

/**
 * Error details for a failed deployment.
 */
export interface DeploymentError {
  /** Human-readable error message. */
  message: string;
  /** The phase during which the error occurred. */
  phase: DeploymentPhase;
  /** Additional error context. */
  details?: Record<string, unknown>;
}

/**
 * A deployment record representing a single deployment operation.
 */
export interface Deployment {
  /** Unique identifier (UUID). */
  id: string;
  /** Reference to the CatalogEntity being deployed. */
  serviceId: string;
  /** Name of the service being deployed. */
  serviceName: string;
  /** Artifact version being deployed. */
  version: string;
  /** Target environment name. */
  environment: string;
  /** Current deployment status. */
  status: DeploymentStatus;
  /** Whether this is a forward deployment or rollback. */
  type: DeploymentType;
  /** Identity of the user who initiated the deployment. */
  actor: string;
  /** Ordered list of phase execution records. */
  phases: DeploymentPhaseRecord[];
  /** Timestamp of deployment creation. */
  createdAt: Date;
  /** Timestamp of last status update. */
  updatedAt: Date;
  /** Timestamp when deployment completed (success or failure). */
  completedAt?: Date;
  /** Error details if the deployment failed. */
  error?: DeploymentError;
}

/**
 * Input for initiating a deployment action.
 */
export interface DeploymentAction {
  /** ID of the service to deploy. */
  serviceId: string;
  /** Name of the service to deploy. */
  serviceName: string;
  /** Artifact version to deploy. */
  version: string;
  /** Target environment name. */
  environment: string;
}
