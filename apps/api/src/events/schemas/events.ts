/**
 * Event Schema Definitions for IDP Platform
 *
 * All events follow the CloudEvents specification with additional
 * platform-specific metadata. Events are versioned to support
 * backward-compatible schema evolution.
 */

// Event type constants
export const EventType = {
  // Deployment events
  DEPLOYMENT_STARTED: 'idp.deployment.started',
  DEPLOYMENT_COMPLETED: 'idp.deployment.completed',
  DEPLOYMENT_FAILED: 'idp.deployment.failed',
  DEPLOYMENT_ROLLED_BACK: 'idp.deployment.rolledback',
  CANARY_PROMOTED: 'idp.deployment.canary.promoted',
  CANARY_REJECTED: 'idp.deployment.canary.rejected',

  // Catalog events
  SERVICE_CREATED: 'idp.catalog.service.created',
  SERVICE_UPDATED: 'idp.catalog.service.updated',
  SERVICE_DELETED: 'idp.catalog.service.deleted',
  SERVICE_DEPRECATED: 'idp.catalog.service.deprecated',

  // Environment events
  ENVIRONMENT_CREATED: 'idp.environment.created',
  ENVIRONMENT_UPDATED: 'idp.environment.updated',
  ENVIRONMENT_DELETED: 'idp.environment.deleted',
  ENVIRONMENT_SCALED: 'idp.environment.scaled',

  // Infrastructure events
  INFRA_PROVISIONED: 'idp.infra.provisioned',
  INFRA_UPDATED: 'idp.infra.updated',
  INFRA_DESTROYED: 'idp.infra.destroyed',
  INFRA_DRIFT_DETECTED: 'idp.infra.drift.detected',

  // Security events
  ACCESS_GRANTED: 'idp.security.access.granted',
  ACCESS_REVOKED: 'idp.security.access.revoked',
  SECRET_ROTATED: 'idp.security.secret.rotated',
  VULNERABILITY_DETECTED: 'idp.security.vulnerability.detected',

  // Platform events
  HEALTH_CHECK_FAILED: 'idp.platform.health.failed',
  HEALTH_CHECK_RECOVERED: 'idp.platform.health.recovered',
  SLO_BREACH: 'idp.platform.slo.breach',
  COST_ALERT: 'idp.platform.cost.alert',
} as const;

export type EventTypeValue = (typeof EventType)[keyof typeof EventType];

// Deployment event schemas
export interface DeploymentStartedEvent {
  deploymentId: string;
  serviceName: string;
  environment: string;
  version: string;
  previousVersion?: string;
  triggeredBy: string;
  strategy: 'rolling' | 'canary' | 'blue-green' | 'recreate';
  commitSha: string;
  repository: string;
  branch: string;
  metadata?: Record<string, unknown>;
}

export interface DeploymentCompletedEvent {
  deploymentId: string;
  serviceName: string;
  environment: string;
  version: string;
  previousVersion?: string;
  triggeredBy: string;
  duration: number; // milliseconds
  replicas: number;
  healthChecksPassed: boolean;
  metrics?: {
    p99Latency?: number;
    errorRate?: number;
    successRate?: number;
  };
}

export interface DeploymentFailedEvent {
  deploymentId: string;
  serviceName: string;
  environment: string;
  version: string;
  triggeredBy: string;
  errorMessage: string;
  errorCode: string;
  failedAt: string; // stage where failure occurred
  logs?: string[];
  autoRollback: boolean;
}

export interface DeploymentRolledBackEvent {
  deploymentId: string;
  serviceName: string;
  environment: string;
  previousVersion: string;
  failedVersion: string;
  reason: string;
  automatic: boolean;
  triggeredBy: string;
}

export interface CanaryPromotedEvent {
  deploymentId: string;
  serviceName: string;
  environment: string;
  version: string;
  finalWeight: number;
  analysisScore: number;
  duration: number;
  metrics: {
    successRate: number;
    p99Latency: number;
    errorRate: number;
  };
}

// Catalog event schemas
export interface ServiceCreatedEvent {
  serviceId: string;
  serviceName: string;
  owner: string;
  team: string;
  description: string;
  repository: string;
  language: string;
  framework: string;
  createdBy: string;
}

export interface ServiceUpdatedEvent {
  serviceId: string;
  serviceName: string;
  changes: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  updatedBy: string;
}

export interface ServiceDeletedEvent {
  serviceId: string;
  serviceName: string;
  deletedBy: string;
  reason: string;
}

// Environment event schemas
export interface EnvironmentCreatedEvent {
  environmentId: string;
  name: string;
  type: 'development' | 'staging' | 'production' | 'preview';
  cluster: string;
  namespace: string;
  createdBy: string;
  config: Record<string, unknown>;
}

export interface EnvironmentScaledEvent {
  environmentId: string;
  name: string;
  previousReplicas: number;
  newReplicas: number;
  reason: string;
  scaledBy: string;
}

// Security event schemas
export interface VulnerabilityDetectedEvent {
  scanId: string;
  serviceName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cveId: string;
  package: string;
  currentVersion: string;
  fixedVersion?: string;
  description: string;
}

export interface SecretRotatedEvent {
  secretName: string;
  namespace: string;
  rotatedBy: string;
  reason: string;
  affectedServices: string[];
}

// Platform event schemas
export interface SLOBreachEvent {
  sloName: string;
  serviceName: string;
  objective: number;
  actual: number;
  window: string;
  burnRate: number;
  remainingBudget: number;
}

export interface CostAlertEvent {
  alertType: 'budget_warning' | 'budget_exceeded' | 'anomaly';
  currentSpend: number;
  budgetLimit: number;
  percentUsed: number;
  forecastedSpend: number;
  namespace?: string;
  service?: string;
}

// Event validation helpers
export function isValidEventType(type: string): type is EventTypeValue {
  return Object.values(EventType).includes(type as EventTypeValue);
}

export function getEventSubject(type: EventTypeValue, environment?: string): string {
  const base = type.replace(/\./g, '.');
  return environment ? `${base}.${environment}` : base;
}
