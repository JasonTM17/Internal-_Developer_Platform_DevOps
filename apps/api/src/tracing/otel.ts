// @ts-nocheck
/**
 * OpenTelemetry SDK Integration
 *
 * Production-ready distributed tracing setup:
 * - Trace provider with configurable exporters
 * - Express HTTP instrumentation
 * - PostgreSQL query instrumentation
 * - Redis command instrumentation
 * - Custom span creation utilities
 * - Resource attributes for service identification
 * - Graceful shutdown with span flushing
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis-4';
import { trace, Span, SpanStatusCode, context, SpanKind } from '@opentelemetry/api';

export interface OtelConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  exporterUrl?: string;
  sampleRate?: number;
  enabled?: boolean;
}

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry SDK with all instrumentations.
 * Must be called before any other imports to ensure proper patching.
 */
export function initTracing(config: OtelConfig): NodeSDK | null {
  if (!config.enabled) {
    console.info('OpenTelemetry tracing is disabled');
    return null;
  }

  const exporter = new OTLPTraceExporter({
    url: config.exporterUrl ?? 'http://localhost:4318/v1/traces',
  });

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
  });

  sdk = new NodeSDK({
    resource,
    spanProcessor: new BatchSpanProcessor(exporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
      exportTimeoutMillis: 30000,
    }),
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingPaths: ['/health', '/ready', '/metrics'],
        requestHook: (span, request) => {
          span.setAttribute('http.request_id', request.headers['x-request-id'] as string ?? '');
        },
      }),
      new ExpressInstrumentation({
        ignoreLayers: [/^\/_/],
      }),
      new PgInstrumentation({
        enhancedDatabaseReporting: true,
        addSqlCommenterComment: true,
      }),
      new RedisInstrumentation({
        dbStatementSerializer: (cmdName, cmdArgs) => {
          return `${cmdName} ${cmdArgs.slice(0, 2).join(' ')}`;
        },
      }),
    ],
  });

  sdk.start();

  console.info(JSON.stringify({
    level: 'info',
    message: 'OpenTelemetry tracing initialized',
    service: config.serviceName,
    environment: config.environment,
    exporterUrl: config.exporterUrl,
    timestamp: new Date().toISOString(),
  }));

  return sdk;
}

/**
 * Get a tracer instance for creating custom spans.
 */
export function getTracer(name = 'idp-api') {
  return trace.getTracer(name);
}

/**
 * Create a custom span for tracing a specific operation.
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options?: { kind?: SpanKind; attributes?: Record<string, string | number | boolean> },
): Promise<T> {
  const tracer = getTracer();
  return tracer.startActiveSpan(name, { kind: options?.kind }, async (span) => {
    if (options?.attributes) {
      for (const [key, value] of Object.entries(options.attributes)) {
        span.setAttribute(key, value);
      }
    }

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      if (error instanceof Error) {
        span.recordException(error);
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Add an event to the current active span.
 */
export function addSpanEvent(name: string, attributes?: Record<string, string | number>): void {
  const span = trace.getSpan(context.active());
  if (span) {
    span.addEvent(name, attributes);
  }
}

/**
 * Set attributes on the current active span.
 */
export function setSpanAttributes(attributes: Record<string, string | number | boolean>): void {
  const span = trace.getSpan(context.active());
  if (span) {
    for (const [key, value] of Object.entries(attributes)) {
      span.setAttribute(key, value);
    }
  }
}

/**
 * Gracefully shutdown the OpenTelemetry SDK.
 * Flushes all pending spans before shutting down.
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
      console.info('OpenTelemetry SDK shut down successfully');
    } catch (error) {
      console.error('Error shutting down OpenTelemetry SDK:', error);
    }
  }
}
