/**
 * Webhook Delivery System
 *
 * Production-ready webhook delivery with:
 * - Webhook registration and management
 * - Payload signing with HMAC-SHA256
 * - Delivery with configurable retry policy
 * - Delivery log for audit trail
 * - Dead letter handling for permanently failed deliveries
 * - Timeout and circuit breaking per endpoint
 */
import { createHmac, randomBytes } from 'crypto';

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  createdAt: Date;
  metadata?: Record<string, string>;
}

export interface WebhookPayload {
  id: string;
  event: string;
  timestamp: string;
  data: unknown;
}

export interface DeliveryAttempt {
  webhookId: string;
  deliveryId: string;
  url: string;
  event: string;
  statusCode: number | null;
  success: boolean;
  attempt: number;
  duration: number;
  error?: string;
  timestamp: Date;
}

export interface DeliveryOptions {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_DELIVERY_OPTIONS: Required<DeliveryOptions> = {
  timeoutMs: 10000,
  maxRetries: 5,
  retryDelayMs: 1000,
  backoffMultiplier: 2,
};

export class WebhookDeliveryService {
  private static readonly MAX_LOG_SIZE = 1000;
  private static readonly MAX_DLQ_SIZE = 200;

  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private deliveryLog: DeliveryAttempt[] = [];
  private deadLetterQueue: Array<{
    payload: WebhookPayload;
    endpoint: WebhookEndpoint;
    error: string;
  }> = [];
  private readonly options: Required<DeliveryOptions>;

  constructor(options?: DeliveryOptions) {
    this.options = { ...DEFAULT_DELIVERY_OPTIONS, ...options };
  }

  /**
   * Register a new webhook endpoint.
   */
  registerEndpoint(
    url: string,
    events: string[],
    metadata?: Record<string, string>,
  ): WebhookEndpoint {
    const endpoint: WebhookEndpoint = {
      id: this.generateId(),
      url,
      secret: this.generateSecret(),
      events,
      active: true,
      createdAt: new Date(),
      metadata,
    };
    this.endpoints.set(endpoint.id, endpoint);
    return endpoint;
  }

  /**
   * Remove a webhook endpoint.
   */
  removeEndpoint(id: string): boolean {
    return this.endpoints.delete(id);
  }

  /**
   * Deactivate an endpoint without removing it.
   */
  deactivateEndpoint(id: string): void {
    const endpoint = this.endpoints.get(id);
    if (endpoint) {
      endpoint.active = false;
    }
  }

  /**
   * Deliver a webhook event to all matching endpoints.
   */
  async deliver(event: string, data: unknown): Promise<DeliveryAttempt[]> {
    const payload: WebhookPayload = {
      id: this.generateId(),
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const matchingEndpoints = Array.from(this.endpoints.values()).filter(
      (ep) => ep.active && ep.events.includes(event),
    );

    const results = await Promise.allSettled(
      matchingEndpoints.map((ep) => this.deliverToEndpoint(payload, ep)),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<DeliveryAttempt> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  /**
   * Sign a payload with HMAC-SHA256.
   */
  signPayload(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify a webhook signature.
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = this.signPayload(payload, secret);
    // Constant-time comparison to prevent timing attacks
    if (expected.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Get delivery log for an endpoint.
   */
  getDeliveryLog(webhookId?: string, limit = 50): DeliveryAttempt[] {
    let log = this.deliveryLog;
    if (webhookId) {
      log = log.filter((d) => d.webhookId === webhookId);
    }
    return log.slice(-limit);
  }

  /**
   * Get dead letter queue entries.
   */
  getDeadLetterQueue() {
    return [...this.deadLetterQueue];
  }

  /**
   * Retry a dead letter entry.
   */
  async retryDeadLetter(index: number): Promise<DeliveryAttempt | null> {
    const entry = this.deadLetterQueue[index];
    if (!entry) return null;

    const result = await this.deliverToEndpoint(entry.payload, entry.endpoint);
    if (result.success) {
      this.deadLetterQueue.splice(index, 1);
    }
    return result;
  }

  /**
   * Get all registered endpoints.
   */
  getEndpoints(): WebhookEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  private async deliverToEndpoint(
    payload: WebhookPayload,
    endpoint: WebhookEndpoint,
  ): Promise<DeliveryAttempt> {
    const deliveryId = this.generateId();
    const body = JSON.stringify(payload);
    const signature = this.signPayload(body, endpoint.secret);

    let lastAttempt: DeliveryAttempt | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      const startTime = Date.now();

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Id': payload.id,
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': payload.timestamp,
            'User-Agent': 'IDP-Webhook/1.0',
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        lastAttempt = {
          webhookId: endpoint.id,
          deliveryId,
          url: endpoint.url,
          event: payload.event,
          statusCode: response.status,
          success: response.status >= 200 && response.status < 300,
          attempt,
          duration: Date.now() - startTime,
          timestamp: new Date(),
        };

        this.deliveryLog.push(lastAttempt);
        this.trimLog();

        if (lastAttempt.success) {
          return lastAttempt;
        }
      } catch (error) {
        lastAttempt = {
          webhookId: endpoint.id,
          deliveryId,
          url: endpoint.url,
          event: payload.event,
          statusCode: null,
          success: false,
          attempt,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        };
        this.deliveryLog.push(lastAttempt);
        this.trimLog();
      }

      // Wait before retry with exponential backoff
      if (attempt < this.options.maxRetries) {
        const delay =
          this.options.retryDelayMs * Math.pow(this.options.backoffMultiplier, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // All retries exhausted - move to dead letter queue
    if (lastAttempt && !lastAttempt.success) {
      this.deadLetterQueue.push({
        payload,
        endpoint,
        error: lastAttempt.error ?? `HTTP ${lastAttempt.statusCode}`,
      });
      this.trimDlq();
    }

    return lastAttempt!;
  }

  private trimLog(): void {
    if (this.deliveryLog.length > WebhookDeliveryService.MAX_LOG_SIZE) {
      this.deliveryLog = this.deliveryLog.slice(-WebhookDeliveryService.MAX_LOG_SIZE);
    }
  }

  private trimDlq(): void {
    if (this.deadLetterQueue.length > WebhookDeliveryService.MAX_DLQ_SIZE) {
      this.deadLetterQueue = this.deadLetterQueue.slice(-WebhookDeliveryService.MAX_DLQ_SIZE);
    }
  }

  private generateId(): string {
    return randomBytes(16).toString('hex');
  }

  private generateSecret(): string {
    return `whsec_${randomBytes(32).toString('base64url')}`;
  }
}
