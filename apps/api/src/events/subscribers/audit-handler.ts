/* eslint-disable */
import { DeliverPolicy, AckPolicy } from 'nats';
import { getEventBus, EventEnvelope } from '../event-bus';
import { EventType } from '../schemas/events';

interface AuditRecord {
  id: string;
  eventId: string;
  eventType: string;
  source: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  resourceId: string;
  environment: string;
  outcome: 'success' | 'failure';
  details: Record<string, unknown>;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditStore {
  save(record: AuditRecord): Promise<void>;
  query(filters: Partial<AuditRecord>, limit?: number): Promise<AuditRecord[]>;
}

class InMemoryAuditStore implements AuditStore {
  private records: AuditRecord[] = [];

  async save(record: AuditRecord): Promise<void> {
    this.records.push(record);
    // In production, this would write to a database or external audit service
    if (this.records.length > 100_000) {
      this.records = this.records.slice(-50_000);
    }
  }

  async query(filters: Partial<AuditRecord>, limit = 100): Promise<AuditRecord[]> {
    return this.records
      .filter((record) =>
        Object.entries(filters).every(([key, value]) => record[key as keyof AuditRecord] === value),
      )
      .slice(-limit);
  }
}

export class AuditHandler {
  private store: AuditStore;
  private batchBuffer: AuditRecord[] = [];
  private batchInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL_MS = 5000;

  constructor(store?: AuditStore) {
    this.store = store ?? new InMemoryAuditStore();
  }

  async start(): Promise<void> {
    const eventBus = getEventBus();

    // Subscribe to all deployment events for audit
    await eventBus.subscribe(
      'DEPLOYMENTS',
      'idp.events.deployment.>',
      this.handleDeploymentEvent.bind(this),
      {
        durable: 'audit-handler-deployments',
        deliverPolicy: DeliverPolicy.All,
        ackPolicy: AckPolicy.Explicit,
        maxDeliver: 10,
        ackWait: 60,
        queue: 'audit-workers',
      },
    );

    // Subscribe to all audit-specific events
    await eventBus.subscribe('AUDIT', 'idp.events.audit.>', this.handleAuditEvent.bind(this), {
      durable: 'audit-handler-audit',
      deliverPolicy: DeliverPolicy.All,
      ackPolicy: AckPolicy.Explicit,
      maxDeliver: 10,
      ackWait: 60,
      queue: 'audit-workers',
    });

    // Subscribe to catalog change events
    await eventBus.subscribe(
      'DEPLOYMENTS',
      'idp.events.catalog.>',
      this.handleCatalogEvent.bind(this),
      {
        durable: 'audit-handler-catalog',
        deliverPolicy: DeliverPolicy.All,
        ackPolicy: AckPolicy.Explicit,
        maxDeliver: 10,
        ackWait: 60,
        queue: 'audit-workers',
      },
    );

    // Start batch flush timer
    this.batchInterval = setInterval(() => {
      void this.flushBatch();
    }, this.FLUSH_INTERVAL_MS);

    console.info('[AuditHandler] Started - listening for all platform events');
  }

  async stop(): Promise<void> {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
    await this.flushBatch();
  }

  private async handleDeploymentEvent(event: EventEnvelope): Promise<void> {
    const data = event.data as Record<string, unknown>;

    const record: AuditRecord = {
      id: `audit-${event.id}`,
      eventId: event.id,
      eventType: event.type,
      source: event.source,
      timestamp: event.timestamp,
      actor: (data.triggeredBy as string) ?? 'system',
      action: this.mapEventTypeToAction(event.type),
      resource: 'deployment',
      resourceId: (data.deploymentId as string) ?? '',
      environment: (data.environment as string) ?? 'unknown',
      outcome: event.type.includes('failed') ? 'failure' : 'success',
      details: {
        serviceName: data.serviceName,
        version: data.version,
        ...(data.errorMessage ? { errorMessage: data.errorMessage } : {}),
        ...(data.duration ? { duration: data.duration } : {}),
      },
      correlationId: event.correlationId,
    };

    await this.addToBatch(record);
  }

  private async handleAuditEvent(event: EventEnvelope): Promise<void> {
    const data = event.data as Record<string, unknown>;

    const record: AuditRecord = {
      id: `audit-${event.id}`,
      eventId: event.id,
      eventType: event.type,
      source: event.source,
      timestamp: event.timestamp,
      actor: (data.actor as string) ?? 'system',
      action: (data.action as string) ?? event.type,
      resource: (data.resource as string) ?? 'unknown',
      resourceId: (data.resourceId as string) ?? '',
      environment: (data.environment as string) ?? 'unknown',
      outcome: (data.outcome as 'success' | 'failure') ?? 'success',
      details: (data.details as Record<string, unknown>) ?? {},
      correlationId: event.correlationId,
      ipAddress: data.ipAddress as string | undefined,
      userAgent: data.userAgent as string | undefined,
    };

    await this.addToBatch(record);
  }

  private async handleCatalogEvent(event: EventEnvelope): Promise<void> {
    const data = event.data as Record<string, unknown>;

    const record: AuditRecord = {
      id: `audit-${event.id}`,
      eventId: event.id,
      eventType: event.type,
      source: event.source,
      timestamp: event.timestamp,
      actor: (data.actor as string) ?? 'system',
      action: this.mapEventTypeToAction(event.type),
      resource: 'catalog-service',
      resourceId: (data.serviceId as string) ?? '',
      environment: 'platform',
      outcome: 'success',
      details: {
        serviceName: data.serviceName,
        changes: data.changes,
      },
      correlationId: event.correlationId,
    };

    await this.addToBatch(record);
  }

  private async addToBatch(record: AuditRecord): Promise<void> {
    this.batchBuffer.push(record);

    if (this.batchBuffer.length >= this.BATCH_SIZE) {
      await this.flushBatch();
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return;

    const batch = [...this.batchBuffer];
    this.batchBuffer = [];

    try {
      await Promise.all(batch.map((record) => this.store.save(record)));
      console.info(`[AuditHandler] Flushed ${batch.length} audit records`);
    } catch (error) {
      console.error('[AuditHandler] Failed to flush batch:', error);
      // Re-add failed records to buffer for retry
      this.batchBuffer.unshift(...batch);
    }
  }

  private mapEventTypeToAction(eventType: string): string {
    const actionMap: Record<string, string> = {
      [EventType.DEPLOYMENT_STARTED]: 'deployment.start',
      [EventType.DEPLOYMENT_COMPLETED]: 'deployment.complete',
      [EventType.DEPLOYMENT_FAILED]: 'deployment.fail',
      [EventType.DEPLOYMENT_ROLLED_BACK]: 'deployment.rollback',
      [EventType.CANARY_PROMOTED]: 'deployment.canary.promote',
      [EventType.SERVICE_CREATED]: 'catalog.service.create',
      [EventType.SERVICE_UPDATED]: 'catalog.service.update',
      [EventType.SERVICE_DELETED]: 'catalog.service.delete',
    };

    return actionMap[eventType] ?? eventType;
  }

  // Public query interface for audit log retrieval
  async queryAuditLog(filters: Partial<AuditRecord>, limit?: number): Promise<AuditRecord[]> {
    return this.store.query(filters, limit);
  }
}

export const auditHandler = new AuditHandler();
