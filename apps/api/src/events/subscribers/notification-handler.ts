/* eslint-disable */
import { DeliverPolicy, AckPolicy } from 'nats';
import { getEventBus, EventEnvelope } from '../event-bus';
import {
  DeploymentCompletedEvent,
  DeploymentFailedEvent,
  DeploymentRolledBackEvent,
} from '../schemas/events';

interface NotificationChannel {
  type: 'slack' | 'email' | 'webhook' | 'pagerduty';
  target: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface NotificationConfig {
  channels: NotificationChannel[];
  filters?: {
    environments?: string[];
    services?: string[];
    eventTypes?: string[];
  };
}

const DEFAULT_CONFIG: NotificationConfig = {
  channels: [
    { type: 'slack', target: '#platform-deployments', severity: 'info' },
    { type: 'slack', target: '#platform-incidents', severity: 'error' },
    { type: 'pagerduty', target: 'platform-oncall', severity: 'critical' },
  ],
};

export class NotificationHandler {
  private config: NotificationConfig;

  constructor(config: NotificationConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  async start(): Promise<void> {
    const eventBus = getEventBus();

    // Subscribe to deployment completed events
    await eventBus.subscribe<DeploymentCompletedEvent>(
      'DEPLOYMENTS',
      'idp.events.deployment.completed.>',
      this.handleDeploymentCompleted.bind(this),
      {
        durable: 'notification-handler-completed',
        deliverPolicy: DeliverPolicy.New,
        ackPolicy: AckPolicy.Explicit,
        maxDeliver: 3,
        ackWait: 30,
        queue: 'notification-workers',
      },
    );

    // Subscribe to deployment failed events
    await eventBus.subscribe<DeploymentFailedEvent>(
      'DEPLOYMENTS',
      'idp.events.deployment.failed.>',
      this.handleDeploymentFailed.bind(this),
      {
        durable: 'notification-handler-failed',
        deliverPolicy: DeliverPolicy.New,
        ackPolicy: AckPolicy.Explicit,
        maxDeliver: 5,
        ackWait: 30,
        queue: 'notification-workers',
      },
    );

    // Subscribe to rollback events
    await eventBus.subscribe<DeploymentRolledBackEvent>(
      'DEPLOYMENTS',
      'idp.events.deployment.rolledback.>',
      this.handleDeploymentRolledBack.bind(this),
      {
        durable: 'notification-handler-rollback',
        deliverPolicy: DeliverPolicy.New,
        ackPolicy: AckPolicy.Explicit,
        maxDeliver: 5,
        ackWait: 30,
        queue: 'notification-workers',
      },
    );

    console.info('[NotificationHandler] Started - listening for deployment events');
  }

  private async handleDeploymentCompleted(
    event: EventEnvelope<DeploymentCompletedEvent>,
  ): Promise<void> {
    const { data } = event;

    const message = this.formatDeploymentCompleted(data);
    const channels = this.getChannelsForSeverity('info');

    await Promise.allSettled(
      channels.map((channel) => this.sendNotification(channel, message, event)),
    );
  }

  private async handleDeploymentFailed(event: EventEnvelope<DeploymentFailedEvent>): Promise<void> {
    const { data } = event;

    const severity = data.environment === 'production' ? 'critical' : 'error';
    const message = this.formatDeploymentFailed(data);
    const channels = this.getChannelsForSeverity(severity);

    await Promise.allSettled(
      channels.map((channel) => this.sendNotification(channel, message, event)),
    );
  }

  private async handleDeploymentRolledBack(
    event: EventEnvelope<DeploymentRolledBackEvent>,
  ): Promise<void> {
    const { data } = event;

    const message = this.formatDeploymentRolledBack(data);
    const channels = this.getChannelsForSeverity('warning');

    await Promise.allSettled(
      channels.map((channel) => this.sendNotification(channel, message, event)),
    );
  }

  private formatDeploymentCompleted(data: DeploymentCompletedEvent): string {
    return [
      `✅ Deployment Successful`,
      `*Service*: ${data.serviceName}`,
      `*Environment*: ${data.environment}`,
      `*Version*: ${data.version}`,
      `*Duration*: ${Math.round(data.duration / 1000)}s`,
      `*Deployed by*: ${data.triggeredBy}`,
    ].join('\n');
  }

  private formatDeploymentFailed(data: DeploymentFailedEvent): string {
    return [
      `❌ Deployment Failed`,
      `*Service*: ${data.serviceName}`,
      `*Environment*: ${data.environment}`,
      `*Version*: ${data.version}`,
      `*Error*: ${data.errorMessage}`,
      `*Error Code*: ${data.errorCode}`,
      `*Triggered by*: ${data.triggeredBy}`,
    ].join('\n');
  }

  private formatDeploymentRolledBack(data: DeploymentRolledBackEvent): string {
    return [
      `⚠️ Deployment Rolled Back`,
      `*Service*: ${data.serviceName}`,
      `*Environment*: ${data.environment}`,
      `*Reason*: ${data.reason}`,
      `*Rolled back to*: ${data.previousVersion}`,
    ].join('\n');
  }

  private getChannelsForSeverity(severity: string): NotificationChannel[] {
    const severityOrder = ['info', 'warning', 'error', 'critical'];
    const minIndex = severityOrder.indexOf(severity);

    return this.config.channels.filter((channel) => {
      const channelIndex = severityOrder.indexOf(channel.severity);
      return channelIndex <= minIndex;
    });
  }

  private async sendNotification(
    channel: NotificationChannel,
    message: string,
    event: EventEnvelope,
  ): Promise<void> {
    switch (channel.type) {
      case 'slack':
        await this.sendSlackNotification(channel.target, message, event);
        break;
      case 'email':
        await this.sendEmailNotification(channel.target, message, event);
        break;
      case 'webhook':
        await this.sendWebhookNotification(channel.target, message, event);
        break;
      case 'pagerduty':
        await this.sendPagerDutyNotification(channel.target, message, event);
        break;
    }
  }

  private async sendSlackNotification(
    channel: string,
    message: string,
    event: EventEnvelope,
  ): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel,
        text: message,
        attachments: [
          {
            color: event.type.includes('failed')
              ? 'danger'
              : event.type.includes('rollback')
                ? 'warning'
                : 'good',
            fields: [
              { title: 'Event ID', value: event.id, short: true },
              { title: 'Timestamp', value: event.timestamp, short: true },
            ],
          },
        ],
      }),
    });
  }

  private async sendEmailNotification(
    _target: string,
    _message: string,
    _event: EventEnvelope,
  ): Promise<void> {
    // Email notification implementation
    console.info('[NotificationHandler] Email notification sent');
  }

  private async sendWebhookNotification(
    url: string,
    _message: string,
    event: EventEnvelope,
  ): Promise<void> {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  }

  private async sendPagerDutyNotification(
    _service: string,
    message: string,
    event: EventEnvelope,
  ): Promise<void> {
    const routingKey = process.env.PAGERDUTY_ROUTING_KEY;
    if (!routingKey) return;

    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: routingKey,
        event_action: 'trigger',
        payload: {
          summary: message.split('\n')[0],
          severity: 'critical',
          source: event.source,
          custom_details: event,
        },
      }),
    });
  }
}

export const notificationHandler = new NotificationHandler();
