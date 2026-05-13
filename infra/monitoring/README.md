# Observability Stack

Full observability stack for the Internal Developer Platform, providing metrics, logging, tracing, and alerting.

## Stack Overview

| Component | Purpose | Port |
|-----------|---------|------|
| **Prometheus** | Metrics collection and alerting | 9090 |
| **Grafana** | Dashboards and visualization | 3000 |
| **Loki** | Log aggregation and querying | 3100 |
| **OpenTelemetry** | Distributed tracing and telemetry | 4317/4318 |
| **Alertmanager** | Alert routing and notification | 9093 |

## Directory Structure

```
monitoring/
├── alertmanager/     # Alert routing, silences, and notification templates
├── grafana/          # Dashboards, provisioning, and datasource config
├── loki/             # Log storage and retention configuration
├── otel/             # OpenTelemetry Collector pipelines
└── prometheus/       # Scrape configs, recording rules, and alerts
```

## Local Setup

Start the full observability stack locally with Docker Compose:

```bash
# From the project root
docker-compose -f docker-compose.monitoring.yml up -d

# Access services
# Grafana:      http://localhost:3000 (admin/admin)
# Prometheus:   http://localhost:9090
# Alertmanager: http://localhost:9093
```

## Dashboard Descriptions

| Dashboard | Description |
|-----------|-------------|
| Platform Overview | High-level health of all IDP services |
| API Performance | Request latency, throughput, and error rates |
| Deployment Tracker | Deployment frequency, lead time, and failure rate |
| Infrastructure | Node CPU, memory, disk, and network utilization |
| Cost Analysis | Resource usage vs. allocated budgets |
| SLO Dashboard | Service Level Objectives burn rate and budget |

## Alert Rules

Alerts are organized by severity:

| Severity | Response Time | Examples |
|----------|--------------|---------|
| `critical` | < 5 minutes | Service down, data loss risk, SLO breach |
| `warning` | < 30 minutes | High error rate, resource pressure |
| `info` | Next business day | Deployment completed, scaling event |

### Key Alert Rules

- **HighErrorRate**: API 5xx rate > 1% for 5 minutes
- **PodCrashLooping**: Pod restarted > 3 times in 10 minutes
- **HighLatency**: P99 latency > 2s for 5 minutes
- **DiskPressure**: Node disk usage > 85%
- **CertificateExpiry**: TLS cert expires within 14 days
- **DeploymentFailed**: Deployment rollout not progressing

## Runbook Links

Each alert includes a `runbook_url` annotation linking to the corresponding runbook:

- [High Error Rate Runbook](../docs/runbooks/high-error-rate.md)
- [Pod Crash Loop Runbook](../docs/runbooks/pod-crash-loop.md)
- [High Latency Runbook](../docs/runbooks/high-latency.md)
- [Disk Pressure Runbook](../docs/runbooks/disk-pressure.md)

## Adding New Metrics

1. Instrument your service with Prometheus client library
2. Add scrape target to `prometheus/scrape-configs.yml`
3. Create recording rules for frequently-queried aggregations
4. Build Grafana dashboard panels
5. Define alert thresholds based on SLOs
