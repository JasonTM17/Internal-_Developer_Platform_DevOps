import {
  connect,
  NatsConnection,
  JetStreamClient,
  JetStreamManager,
  StringCodec,
  AckPolicy,
  DeliverPolicy,
  RetentionPolicy,
  StorageType,
  ConsumerConfig,
  StreamConfig,
} from 'nats';

export interface EventBusConfig {
  servers: string[];
  user?: string;
  pass?: string;
  token?: string;
  name?: string;
  maxReconnectAttempts?: number;
  reconnectTimeWait?: number;
}

export interface PublishOptions {
  msgID?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface SubscribeOptions {
  queue?: string;
  durable?: string;
  deliverPolicy?: DeliverPolicy;
  ackPolicy?: AckPolicy;
  maxDeliver?: number;
  ackWait?: number;
  filterSubject?: string;
  batchSize?: number;
}

export interface EventEnvelope<T = unknown> {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  correlationId?: string;
  causationId?: string;
  version: string;
  data: T;
  metadata?: Record<string, unknown>;
}

export type EventHandler<T = unknown> = (event: EventEnvelope<T>) => Promise<void>;

const sc = StringCodec();

export class EventBus {
  private connection: NatsConnection | null = null;
  private jetstream: JetStreamClient | null = null;
  private jetstreamManager: JetStreamManager | null = null;
  private config: EventBusConfig;
  private handlers: Map<string, EventHandler[]> = new Map();
  private isConnected = false;

  constructor(config: EventBusConfig) {
    this.config = {
      maxReconnectAttempts: 10,
      reconnectTimeWait: 2000,
      name: 'idp-api',
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    this.connection = await connect({
      servers: this.config.servers,
      user: this.config.user,
      pass: this.config.pass,
      token: this.config.token,
      name: this.config.name,
      maxReconnectAttempts: this.config.maxReconnectAttempts,
      reconnectTimeWait: this.config.reconnectTimeWait,
      pingInterval: 30_000,
      maxPingOut: 3,
    });

    this.jetstream = this.connection.jetstream();
    this.jetstreamManager = await this.connection.jetstreamManager();
    this.isConnected = true;

    // Monitor connection status
    void this.monitorConnection();
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.drain();
      await this.connection.close();
      this.connection = null;
      this.jetstream = null;
      this.jetstreamManager = null;
      this.isConnected = false;
    }
  }

  async publish<T>(subject: string, event: EventEnvelope<T>, options?: PublishOptions): Promise<void> {
    if (!this.jetstream) throw new Error('EventBus not connected');

    const payload = sc.encode(JSON.stringify(event));
    const pubOpts: Record<string, unknown> = {};

    if (options?.msgID) {
      pubOpts.msgID = options.msgID;
    }

    await this.jetstream.publish(subject, payload, pubOpts);
  }

  async subscribe<T>(
    stream: string,
    subject: string,
    handler: EventHandler<T>,
    options?: SubscribeOptions,
  ): Promise<void> {
    if (!this.jetstream) throw new Error('EventBus not connected');

    const consumerConfig: Partial<ConsumerConfig> = {
      durable_name: options?.durable,
      deliver_policy: options?.deliverPolicy ?? DeliverPolicy.All,
      ack_policy: options?.ackPolicy ?? AckPolicy.Explicit,
      max_deliver: options?.maxDeliver ?? 5,
      ack_wait: (options?.ackWait ?? 30) * 1_000_000_000, // nanoseconds
      filter_subject: options?.filterSubject ?? subject,
    };

    const consumer = await this.jetstream.consumers.get(stream, consumerConfig.durable_name);
    const messages = await consumer.consume({ max_messages: options?.batchSize ?? 100 });

    void (async () => {
      for await (const msg of messages) {
        try {
          const event = JSON.parse(sc.decode(msg.data)) as EventEnvelope<T>;
          await handler(event);
          msg.ack();
        } catch (error) {
          console.error(`Error processing message on ${subject}:`, error);
          msg.nak();
        }
      }
    })();

    // Track handlers for graceful shutdown
    const existing = this.handlers.get(subject) ?? [];
    existing.push(handler as EventHandler);
    this.handlers.set(subject, existing);
  }

  async ensureStream(config: Partial<StreamConfig> & { name: string; subjects: string[] }): Promise<void> {
    if (!this.jetstreamManager) throw new Error('EventBus not connected');

    const streamConfig: Partial<StreamConfig> = {
      name: config.name,
      subjects: config.subjects,
      retention: config.retention ?? RetentionPolicy.Limits,
      storage: config.storage ?? StorageType.File,
      num_replicas: config.num_replicas ?? 3,
      max_msgs: config.max_msgs ?? 100_000,
      max_bytes: config.max_bytes ?? 1_073_741_824, // 1GB
      max_age: config.max_age ?? 30 * 24 * 60 * 60 * 1_000_000_000, // 30 days in ns
      duplicate_window: config.duplicate_window ?? 120_000_000_000, // 2 minutes in ns
      discard: config.discard,
    };

    try {
      await this.jetstreamManager.streams.info(config.name);
      await this.jetstreamManager.streams.update(config.name, streamConfig);
    } catch {
      await this.jetstreamManager.streams.add(streamConfig);
    }
  }

  async healthCheck(): Promise<{ connected: boolean; rtt?: number }> {
    if (!this.connection || this.connection.isClosed()) {
      return { connected: false };
    }

    try {
      const start = Date.now();
      await this.connection.flush();
      const rtt = Date.now() - start;
      return { connected: true, rtt };
    } catch {
      return { connected: false };
    }
  }

  private async monitorConnection(): Promise<void> {
    if (!this.connection) return;

    for await (const status of this.connection.status()) {
      switch (status.type) {
        case 'disconnect':
          console.warn('NATS disconnected:', status.data);
          this.isConnected = false;
          break;
        case 'reconnect':
          console.info('NATS reconnected:', status.data);
          this.isConnected = true;
          break;
        case 'error':
          console.error('NATS error:', status.data);
          break;
      }
    }
  }
}

// Singleton instance
let eventBusInstance: EventBus | null = null;

export function getEventBus(config?: EventBusConfig): EventBus {
  if (!eventBusInstance) {
    if (!config) {
      config = {
        servers: (process.env.NATS_URL ?? 'nats://localhost:4222').split(','),
        user: process.env.NATS_USER,
        pass: process.env.NATS_PASS,
        name: process.env.SERVICE_NAME ?? 'idp-api',
      };
    }
    eventBusInstance = new EventBus(config);
  }
  return eventBusInstance;
}
