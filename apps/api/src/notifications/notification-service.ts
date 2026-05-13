/**
 * Multi-Channel Notification Service
 *
 * Manages notifications across multiple channels:
 * - Slack (webhooks and Bot API)
 * - Email (SMTP)
 * - Webhook (generic HTTP callbacks)
 *
 * Features:
 * - Channel routing based on event type and severity
 * - Template-based message formatting
 * - Retry with exponential backoff
 * - Notification preferences per user/team
 * - Rate limiting to prevent notification storms
 * - Delivery tracking and audit logging
 */

import { randomUUID } from 'crypto';

/** Notification channel types. */
export type NotificationChannel = 'slack' | 'email' | 'webhook';

/** Notification severity levels. */
export type NotificationSeverity = 'info' | 'warning' | 'error' | 'critical';

/** Notification event types. */
export type NotificationEventType =
  | 'deployment_started'
  | 'deployment_completed'
  | 'deployment_failed'
  | 'deployment_rollback'
  | 'environment_created'
  | 'environment_deleted'
  | 'health_check_failed'
  | 'health_check_recovered'
  | 'config_changed'
  | 'security_alert'
  | 'approval_required'
  | 'custom';

/** Notification payload. */
export interface NotificationPayload {
  id?: string;
  eventType: NotificationEventType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  channels?: NotificationChannel[];
  recipients?: string[];
  templateId?: string;
  deduplicationKey?: string;
}

/** Notification delivery result. */
export interface DeliveryResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
  deliveredAt?: Date;
}

/** Notification record. */
export interface NotificationRecord {
  id: string;
  eventType: NotificationEventType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  deliveries: DeliveryResult[];
  createdAt: Date;
  processedAt?: Date;
}

/** Channel handler interface. */
export interface ChannelHandler {
  channel: NotificationChannel;
  send(payload: NotificationPayload): Promise<DeliveryResult>;
  isConfigured(): boolean;
}

/** Notification routing rule. */
export interface RoutingRule {
  eventType: NotificationEventType | '*';
  severity?: NotificationSeverity;
  channels: NotificationChannel[];
  recipients?: string[];
}

/** Notification service options. */
export interface NotificationServiceOptions {
  /** Maximum retries for failed deliveries */
  maxRetries: number;
  /** Base delay between retries in milliseconds */
  retryDelayMs: number;
  /** Maximum notifications per minute (rate limiting) */
  maxPerMinute: number;
  /** Deduplication window in milliseconds */
  deduplicationWindowMs: number;
  /** Whether to send notifications in development mode */
  enableInDevelopment: boolean;
}

const DEFAULT_OPTIONS: NotificationServiceOptions = {
  maxRetries: 3,
  retryDelayMs: 1000,
  maxPerMinute: 60,
  deduplicationWindowMs: 300000, // 5 minutes
  enableInDevelopment: false,
};

/**
 * Multi-channel Notification Service.
 */
export class NotificationService {
  private readonly handlers: Map<NotificationChannel, ChannelHandler> = new Map();
  private readonly routingRules: RoutingRule[] = [];
  private readonly recentNotifications: Map<string, Date> = new Map();
  private readonly sentCount: { count: number; windowStart: number } = { count: 0, windowStart: Date.now() };
  private readonly history: NotificationRecord[] = [];
  private readonly options: NotificationServiceOptions;

  constructor(options: Partial<NotificationServiceOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Register a channel handler.
   */
  registerChannel(handler: ChannelHandler): void {
    this.handlers.set(handler.channel, handler);
  }

  /**
   * Add a routing rule for event-to-channel mapping.
   */
  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.push(rule);
  }

  /**
   * Send a notification through configured channels.
   */
  async send(payload: NotificationPayload): Promise<NotificationRecord> {
    const id = payload.id || randomUUID();

    // Check rate limiting
    if (this.isRateLimited()) {
      const record: NotificationRecord = {
        id,
        eventType: payload.eventType,
        severity: payload.severity,
        title: payload.title,
        message: payload.message,
        metadata: payload.metadata || {},
        deliveries: [{ channel: 'slack', success: false, error: 'Rate limited' }],
        createdAt: new Date(),
      };
      this.history.push(record);
      return record;
    }

    // Check deduplication
    if (payload.deduplicationKey && this.isDuplicate(payload.deduplicationKey)) {
      const record: NotificationRecord = {
        id,
        eventType: payload.eventType,
        severity: payload.severity,
        title: payload.title,
        message: payload.message,
        metadata: payload.metadata || {},
        deliveries: [{ channel: 'slack', success: false, error: 'Deduplicated' }],
        createdAt: new Date(),
      };
      return record;
    }

    // Determine target channels
    const channels = payload.channels || this.resolveChannels(payload);

    // Send to each channel
    const deliveries: DeliveryResult[] = [];

    for (const channel of channels) {
      const handler = this.handlers.get(channel);
      if (!handler || !handler.isConfigured()) {
        deliveries.push({
          channel,
          success: false,
          error: `Channel '${channel}' is not configured`,
        });
        continue;
      }

      const result = await this.sendWithRetry(handler, payload);
      deliveries.push(result);
    }

    // Track for rate limiting
    this.incrementSentCount();

    // Track for deduplication
    if (payload.deduplicationKey) {
      this.recentNotifications.set(payload.deduplicationKey, new Date());
    }

    // Create record
    const record: NotificationRecord = {
      id,
      eventType: payload.eventType,
      severity: payload.severity,
      title: payload.title,
      message: payload.message,
      metadata: payload.metadata || {},
      deliveries,
      createdAt: new Date(),
      processedAt: new Date(),
    };

    this.history.push(record);
    return record;
  }

  /**
   * Send a notification with retry logic.
   */
  private async sendWithRetry(handler: ChannelHandler, payload: NotificationPayload): Promise<DeliveryResult> {
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        const result = await handler.send(payload);
        if (result.success) return result;
        lastError = result.error;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
      }

      // Wait before retry (exponential backoff)
      if (attempt < this.options.maxRetries) {
        const delay = this.options.retryDelayMs * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    return {
      channel: handler.channel,
      success: false,
      error: `Failed after ${this.options.maxRetries + 1} attempts: ${lastError}`,
    };
  }

  /**
   * Resolve which channels to use based on routing rules.
   */
  private resolveChannels(payload: NotificationPayload): NotificationChannel[] {
    const channels = new Set<NotificationChannel>();

    for (const rule of this.routingRules) {
      if (rule.eventType === '*' || rule.eventType === payload.eventType) {
        if (!rule.severity || rule.severity === payload.severity) {
          for (const channel of rule.channels) {
            channels.add(channel);
          }
        }
      }
    }

    // Default: send critical to all configured channels
    if (channels.size === 0 && payload.severity === 'critical') {
      for (const [channel, handler] of this.handlers) {
        if (handler.isConfigured()) {
          channels.add(channel);
        }
      }
    }

    // Fallback: at least try Slack
    if (channels.size === 0) {
      channels.add('slack');
    }

    return Array.from(channels);
  }

  /**
   * Check if we're currently rate limited.
   */
  private isRateLimited(): boolean {
    const now = Date.now();
    if (now - this.sentCount.windowStart > 60000) {
      this.sentCount.count = 0;
      this.sentCount.windowStart = now;
    }
    return this.sentCount.count >= this.options.maxPerMinute;
  }

  /**
   * Increment the sent counter.
   */
  private incrementSentCount(): void {
    const now = Date.now();
    if (now - this.sentCount.windowStart > 60000) {
      this.sentCount.count = 1;
      this.sentCount.windowStart = now;
    } else {
      this.sentCount.count++;
    }
  }

  /**
   * Check if a notification is a duplicate within the deduplication window.
   */
  private isDuplicate(key: string): boolean {
    const lastSent = this.recentNotifications.get(key);
    if (!lastSent) return false;
    return Date.now() - lastSent.getTime() < this.options.deduplicationWindowMs;
  }

  /**
   * Get notification history.
   */
  getHistory(limit = 100): NotificationRecord[] {
    return this.history.slice(-limit);
  }

  /**
   * Get delivery statistics.
   */
  getStats(): { total: number; successful: number; failed: number; byChannel: Record<string, { sent: number; failed: number }> } {
    let total = 0;
    let successful = 0;
    let failed = 0;
    const byChannel: Record<string, { sent: number; failed: number }> = {};

    for (const record of this.history) {
      for (const delivery of record.deliveries) {
        total++;
        if (delivery.success) {
          successful++;
        } else {
          failed++;
        }

        if (!byChannel[delivery.channel]) {
          byChannel[delivery.channel] = { sent: 0, failed: 0 };
        }
        if (delivery.success) {
          byChannel[delivery.channel].sent++;
        } else {
          byChannel[delivery.channel].failed++;
        }
      }
    }

    return { total, successful, failed, byChannel };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
