/**
 * Slack Notification Channel
 *
 * Implements Slack integration for the notification service:
 * - Webhook-based message delivery
 * - Rich message formatting with Block Kit
 * - Thread support for deployment updates
 * - Channel routing based on severity
 * - Interactive message actions (approve/reject)
 */

import type { ChannelHandler, NotificationPayload, DeliveryResult, NotificationSeverity } from './notification-service';

/** Slack configuration. */
export interface SlackConfig {
  /** Default webhook URL */
  webhookUrl: string;
  /** Channel-specific webhook URLs */
  channelWebhooks?: Record<string, string>;
  /** Bot token for API calls (optional, for interactive features) */
  botToken?: string;
  /** Default channel for notifications */
  defaultChannel?: string;
  /** Channel overrides by severity */
  severityChannels?: Partial<Record<NotificationSeverity, string>>;
  /** Whether to use rich formatting (Block Kit) */
  useBlockKit?: boolean;
  /** Application name shown in messages */
  appName?: string;
  /** Icon emoji for the bot */
  iconEmoji?: string;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
}

/** Slack Block Kit block types. */
interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: Array<{ type: string; text: string }>;
  elements?: Array<{ type: string; text?: { type: string; text: string }; action_id?: string; style?: string; url?: string }>;
  accessory?: unknown;
}

/** Slack message payload. */
interface SlackMessage {
  text: string;
  channel?: string;
  username?: string;
  icon_emoji?: string;
  blocks?: SlackBlock[];
  thread_ts?: string;
  unfurl_links?: boolean;
}

/** Severity to emoji mapping. */
const SEVERITY_EMOJI: Record<NotificationSeverity, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '🔴',
  critical: '🚨',
};

/** Severity to color mapping for attachments. */
const _SEVERITY_COLOR: Record<NotificationSeverity, string> = {
  info: '#36a64f',
  warning: '#ff9900',
  error: '#dc3545',
  critical: '#8b0000',
};

/**
 * Slack notification channel handler.
 */
export class SlackHandler implements ChannelHandler {
  readonly channel = 'slack' as const;
  private readonly config: SlackConfig;

  constructor(config: SlackConfig) {
    this.config = {
      useBlockKit: true,
      appName: 'IDP Platform',
      iconEmoji: ':rocket:',
      timeoutMs: 10000,
      ...config,
    };
  }

  /**
   * Check if Slack is properly configured.
   */
  isConfigured(): boolean {
    return !!this.config.webhookUrl && this.config.webhookUrl.startsWith('https://');
  }

  /**
   * Send a notification to Slack.
   */
  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    if (!this.isConfigured()) {
      return {
        channel: 'slack',
        success: false,
        error: 'Slack webhook URL is not configured',
      };
    }

    const message = this.buildMessage(payload);
    const webhookUrl = this.getWebhookUrl(payload);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
        signal: AbortSignal.timeout(this.config.timeoutMs!),
      });

      if (!response.ok) {
        const body = await response.text();
        return {
          channel: 'slack',
          success: false,
          error: `Slack API error (${response.status}): ${body}`,
        };
      }

      return {
        channel: 'slack',
        success: true,
        deliveredAt: new Date(),
      };
    } catch (error) {
      return {
        channel: 'slack',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error sending to Slack',
      };
    }
  }

  /**
   * Build a Slack message from the notification payload.
   */
  private buildMessage(payload: NotificationPayload): SlackMessage {
    const emoji = SEVERITY_EMOJI[payload.severity];
    const fallbackText = `${emoji} [${payload.severity.toUpperCase()}] ${payload.title}: ${payload.message}`;

    if (!this.config.useBlockKit) {
      return {
        text: fallbackText,
        username: this.config.appName,
        icon_emoji: this.config.iconEmoji,
        unfurl_links: false,
      };
    }

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${payload.title}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: payload.message,
        },
      },
    ];

    // Add metadata fields if present
    if (payload.metadata && Object.keys(payload.metadata).length > 0) {
      const fields = Object.entries(payload.metadata)
        .slice(0, 10) // Slack limit
        .map(([key, value]) => ({
          type: 'mrkdwn',
          text: `*${this.formatFieldName(key)}:*\n${String(value)}`,
        }));

      blocks.push({ type: 'section', fields });
    }

    // Add context block with timestamp and severity
    blocks.push({
      type: 'context' as string,
      elements: [
        {
          type: 'mrkdwn' as string,
          text: `*Severity:* ${payload.severity} | *Event:* ${payload.eventType} | *Time:* <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toISOString()}>`,
        },
      ],
    } as unknown as SlackBlock);

    // Add action buttons for approval events
    if (payload.eventType === 'approval_required') {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ Approve' },
            action_id: 'approve_deployment',
            style: 'primary',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '❌ Reject' },
            action_id: 'reject_deployment',
            style: 'danger',
          },
        ],
      });
    }

    return {
      text: fallbackText,
      username: this.config.appName,
      icon_emoji: this.config.iconEmoji,
      blocks,
      unfurl_links: false,
    };
  }

  /**
   * Get the appropriate webhook URL based on severity/channel routing.
   */
  private getWebhookUrl(payload: NotificationPayload): string {
    // Check severity-based channel routing
    if (this.config.severityChannels?.[payload.severity]) {
      const channel = this.config.severityChannels[payload.severity]!;
      if (this.config.channelWebhooks?.[channel]) {
        return this.config.channelWebhooks[channel];
      }
    }

    return this.config.webhookUrl;
  }

  /**
   * Format a metadata field name for display.
   */
  private formatFieldName(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim();
  }
}

/**
 * Create a Slack handler from environment variables.
 */
export function createSlackHandler(): SlackHandler {
  return new SlackHandler({
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    botToken: process.env.SLACK_BOT_TOKEN,
    defaultChannel: process.env.SLACK_DEFAULT_CHANNEL || '#platform-notifications',
    severityChannels: {
      critical: process.env.SLACK_CRITICAL_CHANNEL || '#platform-alerts',
      error: process.env.SLACK_ERROR_CHANNEL || '#platform-alerts',
    },
    appName: process.env.SLACK_APP_NAME || 'IDP Platform',
    iconEmoji: process.env.SLACK_ICON_EMOJI || ':rocket:',
  });
}
