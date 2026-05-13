/**
 * Prometheus Metrics Middleware
 *
 * Collects and exposes application metrics in Prometheus format:
 * - HTTP request duration histogram (by method, path, status)
 * - HTTP request total counter
 * - Active connections gauge
 * - Response size histogram
 * - Custom business metrics support
 *
 * Exposes metrics at GET /metrics endpoint for Prometheus scraping.
 */

import type { Request, Response, NextFunction } from 'express';

/** Histogram bucket boundaries for request duration (seconds). */
const DEFAULT_DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

/** Histogram bucket boundaries for response size (bytes). */
const DEFAULT_SIZE_BUCKETS = [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];

/** Label set for HTTP metrics. */
interface HttpLabels {
  method: string;
  path: string;
  statusCode: string;
}

/** Histogram data structure. */
interface Histogram {
  buckets: Map<number, number>;
  sum: number;
  count: number;
  labels: Map<string, { buckets: Map<number, number>; sum: number; count: number }>;
}

/** Counter data structure. */
interface Counter {
  value: number;
  labels: Map<string, number>;
}

/** Gauge data structure. */
interface Gauge {
  value: number;
}

/**
 * Prometheus metrics collector.
 * Stores metrics in memory and serializes to Prometheus exposition format.
 */
export class MetricsCollector {
  private readonly httpRequestDuration: Histogram;
  private readonly httpRequestTotal: Counter;
  private readonly httpResponseSize: Histogram;
  private readonly activeConnections: Gauge;
  private readonly customCounters: Map<string, Counter> = new Map();
  private readonly customGauges: Map<string, Gauge> = new Map();
  private readonly durationBuckets: number[];
  private readonly sizeBuckets: number[];
  private readonly prefix: string;

  constructor(options: { prefix?: string; durationBuckets?: number[]; sizeBuckets?: number[] } = {}) {
    this.prefix = options.prefix || 'idp_api_';
    this.durationBuckets = options.durationBuckets || DEFAULT_DURATION_BUCKETS;
    this.sizeBuckets = options.sizeBuckets || DEFAULT_SIZE_BUCKETS;

    this.httpRequestDuration = this.createHistogram();
    this.httpRequestTotal = { value: 0, labels: new Map() };
    this.httpResponseSize = this.createHistogram();
    this.activeConnections = { value: 0 };
  }

  /**
   * Record an HTTP request observation.
   */
  recordRequest(labels: HttpLabels, durationSeconds: number, responseBytes: number): void {
    const labelKey = `${labels.method}|${labels.path}|${labels.statusCode}`;

    // Increment request counter
    this.httpRequestTotal.value++;
    this.httpRequestTotal.labels.set(
      labelKey,
      (this.httpRequestTotal.labels.get(labelKey) || 0) + 1,
    );

    // Record duration
    this.observeHistogram(this.httpRequestDuration, labelKey, durationSeconds, this.durationBuckets);

    // Record response size
    this.observeHistogram(this.httpResponseSize, labelKey, responseBytes, this.sizeBuckets);
  }

  /**
   * Increment active connections gauge.
   */
  incrementConnections(): void {
    this.activeConnections.value++;
  }

  /**
   * Decrement active connections gauge.
   */
  decrementConnections(): void {
    this.activeConnections.value = Math.max(0, this.activeConnections.value - 1);
  }

  /**
   * Increment a custom counter.
   */
  incrementCounter(name: string, labels?: string): void {
    if (!this.customCounters.has(name)) {
      this.customCounters.set(name, { value: 0, labels: new Map() });
    }
    const counter = this.customCounters.get(name)!;
    counter.value++;
    if (labels) {
      counter.labels.set(labels, (counter.labels.get(labels) || 0) + 1);
    }
  }

  /**
   * Set a custom gauge value.
   */
  setGauge(name: string, value: number): void {
    this.customGauges.set(name, { value });
  }

  /**
   * Serialize all metrics to Prometheus exposition format.
   */
  serialize(): string {
    const lines: string[] = [];

    // HTTP request duration histogram
    lines.push(`# HELP ${this.prefix}http_request_duration_seconds HTTP request duration in seconds`);
    lines.push(`# TYPE ${this.prefix}http_request_duration_seconds histogram`);
    this.serializeHistogram(lines, `${this.prefix}http_request_duration_seconds`, this.httpRequestDuration, this.durationBuckets);

    // HTTP request total counter
    lines.push(`# HELP ${this.prefix}http_requests_total Total number of HTTP requests`);
    lines.push(`# TYPE ${this.prefix}http_requests_total counter`);
    lines.push(`${this.prefix}http_requests_total ${this.httpRequestTotal.value}`);
    for (const [labelKey, count] of this.httpRequestTotal.labels) {
      const [method, path, statusCode] = labelKey.split('|');
      lines.push(`${this.prefix}http_requests_total{method="${method}",path="${path}",status="${statusCode}"} ${count}`);
    }

    // HTTP response size histogram
    lines.push(`# HELP ${this.prefix}http_response_size_bytes HTTP response size in bytes`);
    lines.push(`# TYPE ${this.prefix}http_response_size_bytes histogram`);
    this.serializeHistogram(lines, `${this.prefix}http_response_size_bytes`, this.httpResponseSize, this.sizeBuckets);

    // Active connections gauge
    lines.push(`# HELP ${this.prefix}active_connections Number of active HTTP connections`);
    lines.push(`# TYPE ${this.prefix}active_connections gauge`);
    lines.push(`${this.prefix}active_connections ${this.activeConnections.value}`);

    // Custom counters
    for (const [name, counter] of this.customCounters) {
      lines.push(`# HELP ${this.prefix}${name} Custom counter`);
      lines.push(`# TYPE ${this.prefix}${name} counter`);
      lines.push(`${this.prefix}${name} ${counter.value}`);
      for (const [labels, count] of counter.labels) {
        lines.push(`${this.prefix}${name}{${labels}} ${count}`);
      }
    }

    // Custom gauges
    for (const [name, gauge] of this.customGauges) {
      lines.push(`# HELP ${this.prefix}${name} Custom gauge`);
      lines.push(`# TYPE ${this.prefix}${name} gauge`);
      lines.push(`${this.prefix}${name} ${gauge.value}`);
    }

    // Process metrics
    lines.push(`# HELP ${this.prefix}process_uptime_seconds Process uptime in seconds`);
    lines.push(`# TYPE ${this.prefix}process_uptime_seconds gauge`);
    lines.push(`${this.prefix}process_uptime_seconds ${Math.floor(process.uptime())}`);

    lines.push(`# HELP ${this.prefix}process_memory_heap_bytes Process heap memory usage`);
    lines.push(`# TYPE ${this.prefix}process_memory_heap_bytes gauge`);
    lines.push(`${this.prefix}process_memory_heap_bytes ${process.memoryUsage().heapUsed}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Reset all metrics (useful for testing).
   */
  reset(): void {
    this.httpRequestTotal.value = 0;
    this.httpRequestTotal.labels.clear();
    this.httpRequestDuration.labels.clear();
    this.httpRequestDuration.sum = 0;
    this.httpRequestDuration.count = 0;
    this.httpResponseSize.labels.clear();
    this.httpResponseSize.sum = 0;
    this.httpResponseSize.count = 0;
    this.activeConnections.value = 0;
    this.customCounters.clear();
    this.customGauges.clear();
  }

  private createHistogram(): Histogram {
    return {
      buckets: new Map(),
      sum: 0,
      count: 0,
      labels: new Map(),
    };
  }

  private observeHistogram(histogram: Histogram, labelKey: string, value: number, buckets: number[]): void {
    histogram.sum += value;
    histogram.count++;

    if (!histogram.labels.has(labelKey)) {
      histogram.labels.set(labelKey, { buckets: new Map(), sum: 0, count: 0 });
    }
    const labeled = histogram.labels.get(labelKey)!;
    labeled.sum += value;
    labeled.count++;

    for (const bucket of buckets) {
      if (value <= bucket) {
        labeled.buckets.set(bucket, (labeled.buckets.get(bucket) || 0) + 1);
      }
    }
  }

  private serializeHistogram(lines: string[], name: string, histogram: Histogram, buckets: number[]): void {
    for (const [labelKey, data] of histogram.labels) {
      const [method, path, statusCode] = labelKey.split('|');
      const labelStr = `method="${method}",path="${path}",status="${statusCode}"`;

      let cumulative = 0;
      for (const bucket of buckets) {
        cumulative += data.buckets.get(bucket) || 0;
        lines.push(`${name}_bucket{${labelStr},le="${bucket}"} ${cumulative}`);
      }
      lines.push(`${name}_bucket{${labelStr},le="+Inf"} ${data.count}`);
      lines.push(`${name}_sum{${labelStr}} ${data.sum}`);
      lines.push(`${name}_count{${labelStr}} ${data.count}`);
    }
  }
}

/** Normalize path for metrics labels (replace IDs with :id). */
function normalizePath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id')
    .replace(/\?.*$/, '');
}

/**
 * Create Prometheus metrics collection middleware.
 */
export function createMetricsMiddleware(collector: MetricsCollector) {
  return function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Skip metrics endpoint itself to avoid recursion
    if (req.path === '/metrics') {
      next();
      return;
    }

    collector.incrementConnections();
    const startTime = process.hrtime.bigint();

    res.on('finish', () => {
      collector.decrementConnections();

      const durationNs = process.hrtime.bigint() - startTime;
      const durationSeconds = Number(durationNs) / 1_000_000_000;
      const responseSize = parseInt(String(res.getHeader('content-length') || '0'), 10);

      collector.recordRequest(
        {
          method: req.method,
          path: normalizePath(req.route?.path || req.path),
          statusCode: String(res.statusCode),
        },
        durationSeconds,
        responseSize,
      );
    });

    next();
  };
}

/**
 * Create the /metrics endpoint handler.
 */
export function createMetricsEndpoint(collector: MetricsCollector) {
  return function metricsEndpoint(_req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.status(200).send(collector.serialize());
  };
}

/** Global metrics collector singleton. */
let _collector: MetricsCollector | null = null;

/**
 * Get or create the global metrics collector.
 */
export function getMetricsCollector(options?: { prefix?: string }): MetricsCollector {
  if (!_collector) {
    _collector = new MetricsCollector(options);
  }
  return _collector;
}
