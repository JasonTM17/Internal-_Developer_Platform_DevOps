# API Service Level Indicators

## Overview

This document defines the specific Service Level Indicators (SLIs) used to measure the IDP Platform API's reliability, performance, and correctness.

---

## Availability SLI

### Definition

```
Availability = (Total Valid Requests - Server Errors) / Total Valid Requests
```

### What Counts

| Category | Included | Rationale |
|----------|----------|-----------|
| 2xx responses | ✅ Success | Normal operation |
| 3xx responses | ✅ Success | Redirects are intentional |
| 4xx responses | ✅ Success | Client errors are not platform failures |
| 5xx responses | ❌ Failure | Server-side failures |
| Timeouts (>30s) | ❌ Failure | Unresponsive is equivalent to down |
| Connection refused | ❌ Failure | Service unreachable |

### Exclusions

- Requests to `/health` and `/health/ready` (infrastructure probes)
- Requests during announced maintenance windows
- Requests from load testing tools (identified by User-Agent)
- Requests that exceed rate limits (429s are intentional)

### Prometheus Query

```promql
# Availability over 30 days
1 - (
  sum(rate(http_requests_total{job="platform-api", code=~"5.."}[30d]))
  /
  sum(rate(http_requests_total{job="platform-api"}[30d]))
)
```

---

## Latency SLI

### Definition

Response latency measured from request received at the ingress gateway to response body sent.

### Measurement Points

```
Client → [CDN] → Load Balancer → Ingress Gateway → API Pod → Response
                                  ▲ Start                      ▲ End
```

### Histogram Buckets

```yaml
buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
```

### SLI Targets by Endpoint Category

| Category | p50 Target | p95 Target | p99 Target |
|----------|-----------|-----------|-----------|
| Read (GET list) | 50ms | 200ms | 1000ms |
| Read (GET single) | 20ms | 100ms | 500ms |
| Write (POST/PUT) | 100ms | 500ms | 2000ms |
| Delete (DELETE) | 50ms | 200ms | 1000ms |
| Search (GET with filters) | 100ms | 500ms | 2000ms |

### Prometheus Queries

```promql
# p95 latency over 5 minutes
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{job="platform-api"}[5m])) by (le)
)

# Latency SLI: proportion of requests under 500ms
sum(rate(http_request_duration_seconds_bucket{job="platform-api", le="0.5"}[30d]))
/
sum(rate(http_request_duration_seconds_count{job="platform-api"}[30d]))
```

---

## Throughput SLI

### Definition

The platform must handle sustained request load without degradation.

### Capacity Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Sustained RPS | 1,000 req/s | Average over 5 minutes |
| Peak RPS | 5,000 req/s | 1-minute burst |
| Concurrent connections | 10,000 | Active TCP connections |

### Prometheus Query

```promql
# Current throughput
sum(rate(http_requests_total{job="platform-api"}[5m]))

# Peak throughput (1 minute window)
max_over_time(sum(rate(http_requests_total{job="platform-api"}[1m]))[1h:1m])
```

---

## Error Rate SLI

### Definition

Proportion of requests resulting in errors, broken down by category.

### Error Categories

| Category | Codes | Target | Alert Threshold |
|----------|-------|--------|-----------------|
| Server errors | 5xx | < 0.05% | > 0.1% for 5 min |
| Client errors | 4xx | < 5% | > 10% for 5 min |
| Timeout errors | — | < 0.01% | > 0.05% for 5 min |
| Upstream errors | 502, 503 | < 0.02% | > 0.05% for 5 min |

### Prometheus Queries

```promql
# Server error rate
sum(rate(http_requests_total{job="platform-api", code=~"5.."}[5m]))
/
sum(rate(http_requests_total{job="platform-api"}[5m]))

# Upstream error rate
sum(rate(http_requests_total{job="platform-api", code=~"502|503"}[5m]))
/
sum(rate(http_requests_total{job="platform-api"}[5m]))
```

---

## Correctness SLI

### Definition

Proportion of requests that return semantically correct responses.

### Measurement Methods

| Method | Description | Frequency |
|--------|-------------|-----------|
| Synthetic probes | Known-good requests with expected responses | Every 30s |
| Consistency checks | Read-after-write verification | Every 5 min |
| Data validation | Schema compliance of responses | Continuous |

### Synthetic Probe Checks

```yaml
probes:
  - name: service-crud
    steps:
      - POST /v2/services → expect 201
      - GET /v2/services/{id} → expect 200, body matches
      - PUT /v2/services/{id} → expect 200
      - DELETE /v2/services/{id} → expect 204
      - GET /v2/services/{id} → expect 404

  - name: health-check
    steps:
      - GET /health → expect 200, body.status == "healthy"

  - name: pagination-consistency
    steps:
      - GET /v2/services?pageSize=5 → expect total == sum of all pages
```

### Prometheus Query

```promql
# Correctness (synthetic probe success rate)
sum(rate(probe_success{job="platform-api-probes"}[1h]))
/
sum(rate(probe_total{job="platform-api-probes"}[1h]))
```

---

## Saturation SLI

### Definition

How close the platform is to resource exhaustion.

### Resource Metrics

| Resource | Warning | Critical | Measurement |
|----------|---------|----------|-------------|
| CPU utilization | 70% | 85% | Per pod average |
| Memory utilization | 75% | 90% | Per pod RSS |
| Database connections | 70% | 85% | Pool utilization |
| Disk I/O | 70% | 85% | IOPS utilization |
| Network bandwidth | 60% | 80% | Interface utilization |

### Prometheus Queries

```promql
# CPU saturation
avg(rate(container_cpu_usage_seconds_total{namespace="platform", container="api"}[5m]))
/
avg(kube_pod_container_resource_limits{namespace="platform", container="api", resource="cpu"})

# Memory saturation
avg(container_memory_working_set_bytes{namespace="platform", container="api"})
/
avg(kube_pod_container_resource_limits{namespace="platform", container="api", resource="memory"})

# Database connection pool saturation
pg_stat_activity_count{datname="platform"}
/
pg_settings_max_connections{datname="platform"}
```

---

## SLI Dashboard Panels

Each SLI should have the following dashboard panels:

1. **Current value** — Real-time SLI value (gauge)
2. **Trend** — SLI over time (time series, 30-day window)
3. **Error budget** — Remaining budget percentage (gauge with thresholds)
4. **Burn rate** — Current consumption rate (time series)
5. **Breakdown** — SLI by endpoint/method (table)

---

## Collection Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  API Pods   │────▶│  Prometheus  │────▶│   Grafana   │
│  (metrics)  │     │  (scrape)    │     │ (dashboard) │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
┌─────────────┐            │              ┌─────────────┐
│   Envoy     │────────────┘              │ AlertManager│
│  (access    │                           │  (alerts)   │
│   logs)     │                           └─────────────┘
└─────────────┘
```
