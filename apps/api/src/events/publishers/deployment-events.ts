import { randomUUID } from 'crypto';

import { getEventBus, EventEnvelope, PublishOptions } from '../event-bus';
import {
  DeploymentStartedEvent,
  DeploymentCompletedEvent,
  DeploymentFailedEvent,
  DeploymentRolledBackEvent,
  CanaryPromotedEvent,
  EventType,
} from '../schemas/events';

const DEPLOYMENT_SUBJECT_PREFIX = 'idp.events.deployment';

export class DeploymentEventPublisher {
  private serviceName: string;

  constructor(serviceName = 'idp-api') {
    this.serviceName = serviceName;
  }

  async publishDeploymentStarted(data: DeploymentStartedEvent): Promise<string> {
    const eventId = randomUUID();
    const envelope: EventEnvelope<DeploymentStartedEvent> = {
      id: eventId,
      type: EventType.DEPLOYMENT_STARTED,
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      correlationId: data.deploymentId,
      version: '1.0.0',
      data,
      metadata: {
        environment: data.environment,
        service: data.serviceName,
        triggeredBy: data.triggeredBy,
      },
    };

    const options: PublishOptions = {
      msgID: `deploy-started-${data.deploymentId}`,
    };

    const eventBus = getEventBus();
    await eventBus.publish(
      `${DEPLOYMENT_SUBJECT_PREFIX}.started.${data.environment}`,
      envelope,
      options,
    );

    return eventId;
  }

  async publishDeploymentCompleted(data: DeploymentCompletedEvent): Promise<string> {
    const eventId = randomUUID();
    const envelope: EventEnvelope<DeploymentCompletedEvent> = {
      id: eventId,
      type: EventType.DEPLOYMENT_COMPLETED,
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      correlationId: data.deploymentId,
      causationId: data.deploymentId,
      version: '1.0.0',
      data,
      metadata: {
        environment: data.environment,
        service: data.serviceName,
        duration: data.duration,
        version: data.version,
      },
    };

    const options: PublishOptions = {
      msgID: `deploy-completed-${data.deploymentId}`,
    };

    const eventBus = getEventBus();
    await eventBus.publish(
      `${DEPLOYMENT_SUBJECT_PREFIX}.completed.${data.environment}`,
      envelope,
      options,
    );

    return eventId;
  }

  async publishDeploymentFailed(data: DeploymentFailedEvent): Promise<string> {
    const eventId = randomUUID();
    const envelope: EventEnvelope<DeploymentFailedEvent> = {
      id: eventId,
      type: EventType.DEPLOYMENT_FAILED,
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      correlationId: data.deploymentId,
      causationId: data.deploymentId,
      version: '1.0.0',
      data,
      metadata: {
        environment: data.environment,
        service: data.serviceName,
        errorCode: data.errorCode,
        severity: 'high',
      },
    };

    const options: PublishOptions = {
      msgID: `deploy-failed-${data.deploymentId}`,
    };

    const eventBus = getEventBus();
    await eventBus.publish(
      `${DEPLOYMENT_SUBJECT_PREFIX}.failed.${data.environment}`,
      envelope,
      options,
    );

    return eventId;
  }

  async publishDeploymentRolledBack(data: DeploymentRolledBackEvent): Promise<string> {
    const eventId = randomUUID();
    const envelope: EventEnvelope<DeploymentRolledBackEvent> = {
      id: eventId,
      type: EventType.DEPLOYMENT_ROLLED_BACK,
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      correlationId: data.deploymentId,
      causationId: data.deploymentId,
      version: '1.0.0',
      data,
      metadata: {
        environment: data.environment,
        service: data.serviceName,
        reason: data.reason,
        rolledBackTo: data.previousVersion,
      },
    };

    const eventBus = getEventBus();
    await eventBus.publish(`${DEPLOYMENT_SUBJECT_PREFIX}.rolledback.${data.environment}`, envelope);

    return eventId;
  }

  async publishCanaryPromoted(data: CanaryPromotedEvent): Promise<string> {
    const eventId = randomUUID();
    const envelope: EventEnvelope<CanaryPromotedEvent> = {
      id: eventId,
      type: EventType.CANARY_PROMOTED,
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      correlationId: data.deploymentId,
      version: '1.0.0',
      data,
      metadata: {
        environment: data.environment,
        service: data.serviceName,
        canaryWeight: data.finalWeight,
        analysisScore: data.analysisScore,
      },
    };

    const eventBus = getEventBus();
    await eventBus.publish(
      `${DEPLOYMENT_SUBJECT_PREFIX}.canary.promoted.${data.environment}`,
      envelope,
    );

    return eventId;
  }
}

// Export singleton
export const deploymentEvents = new DeploymentEventPublisher();
