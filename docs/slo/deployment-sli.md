# Deployment Pipeline Service Level Indicators

## Overview

This document defines the SLIs for the deployment pipeline, measuring reliability, speed, and safety of the continuous delivery system.

---

## Deployment Success Rate SLI

### Definition

```
Deployment Success Rate = Successful Deployments / Total Deployment Attempts
```

### What Counts

| Outcome | Classification | Notes |
|---------|---------------|-------|
| Deployment reaches `succeeded` | ✅ Success | Normal completion |
| Deployment auto-promoted after canary | ✅ Success | Canary passed |
| Deployment manually approved and completed | ✅ Success | Human-in-the-loop |
| Deployment fails with infrastructure error | ❌ Failure | Platform responsibility |
| Deployment fails health checks | ❌ Failure | Caught by platform |
| Deployment rolled back automatically | ❌ Failure | Safety mechanism triggered |
| Deployment cancelled by user | ➖ Excluded | Intentional cancellation |
| Deployment rejected at approval gate | ➖ Excluded | Business decision |

### Targets

| Environment | Target | Error Budget (monthly) |
|-------------|--------|----------------------|
| Production | 99.0% | 4.3 failed deploys per 430 |
| Staging | 98.0% | More tolerance for experimentation |
| Development | 95.0% | High tolerance for iteration |
| Preview | 90.0% | Ephemeral, best effort |

### Prometheus Query

```promql
# Deployment success rate (30 days)
sum(argocd_app_sync_total{phase="Succeeded"}[30d])
/
(sum(argocd_app_sync_total{phase="Succeeded"}[30d]) + sum(argocd_app_sync_total{phase="Failed"}[30d]))
```

---

## Deployment Lead Time SLI

### Definition

Time from deployment trigger to traffic serving the new version.

### Measurement Phases

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Queue   │──▶│  Build   │──▶│  Deploy  │──▶│  Verify  │──▶│  Serve   │
│  Time    │   │  Time    │   │  Time    │   │  Time    │   │ Traffic  │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
     t1             t2              t3             t4             t5
```

| Phase | Definition | Target (p95) |
|-------|-----------|-------------|
| Queue Time (t1) | Time waiting for pipeline slot | < 30s |
| Build Time (t2) | Container build + push | < 5 min |
| Deploy Time (t3) | Kubernetes rollout | < 3 min |
| Verify Time (t4) | Health checks + smoke tests | < 2 min |
| Total Lead Time | t1 + t2 + t3 + t4 | < 15 min |

### Strategy-Specific Targets

| Strategy | Target (p95) | Notes |
|----------|-------------|-------|
| Rolling Update | < 10 min | Standard rollout |
| Blue/Green | < 5 min | Instant traffic switch |
| Canary | < 30 min | Includes observation period |
| Canary (auto-promote) | < 15 min | Automated promotion |

### Prometheus Queries

```promql
# Deployment duration (p95)
histogram_quantile(0.95,
  sum(rate(deployment_duration_seconds_bucket{environment="production"}[7d])) by (le)
)

# Queue time (p95)
histogram_quantile(0.95,
  sum(rate(deployment_queue_duration_seconds_bucket[7d])) by (le)
)

# Build time (p95)
histogram_quantile(0.95,
  sum(rate(container_build_duration_seconds_bucket[7d])) by (le)
)
```

---

## Rollback Time SLI

### Definition

Time from rollback trigger to previous version serving all traffic.

### Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Rollback Time (p50) | < 2 min | Median rollback duration |
| Rollback Time (p95) | < 5 min | 95th percentile |
| Rollback Time (p99) | < 10 min | Worst case (excluding outliers) |
| Rollback Success Rate | 99.9% | Rollbacks must not fail |

### Prometheus Query

```promql
# Rollback duration (p95)
histogram_quantile(0.95,
  sum(rate(rollback_duration_seconds_bucket{environment="production"}[30d])) by (le)
)
```

---

## Deployment Frequency SLI

### Definition

How often teams deploy to production, measured per service.

### Targets by Tier

| Service Tier | Target Frequency | Measurement |
|-------------|-----------------|-------------|
| Critical | ≥ 1 deploy/day | Daily average over 30 days |
| Standard | ≥ 1 deploy/week | Weekly average over 30 days |
| Experimental | No minimum | On-demand |

### DORA Metrics Alignment

| DORA Metric | Our Target | Elite Benchmark |
|-------------|-----------|-----------------|
| Deployment Frequency | Multiple/day | On-demand |
| Lead Time for Changes | < 1 hour | < 1 hour |
| Change Failure Rate | < 5% | < 5% |
| Time to Restore | < 1 hour | < 1 hour |

### Prometheus Query

```promql
# Deployments per day (7-day average)
sum(increase(deployment_total{environment="production"}[7d])) / 7

# Change failure rate (30 days)
sum(increase(deployment_total{environment="production", status="failed"}[30d]))
/
sum(increase(deployment_total{environment="production"}[30d]))
```

---

## Pipeline Reliability SLI

### Definition

Proportion of pipeline runs that complete without infrastructure failures.

### Failure Categories

| Category | Counts Against SLI | Example |
|----------|-------------------|---------|
| Infrastructure failure | Yes | Runner OOM, network timeout |
| Flaky test | Yes | Non-deterministic test failure |
| Legitimate test failure | No | Code bug caught by tests |
| Build failure (code error) | No | Compilation error |
| Timeout (infrastructure) | Yes | Pipeline stuck |
| Cancelled by user | No | Intentional |

### Targets

| Metric | Target |
|--------|--------|
| Pipeline infrastructure reliability | 99.5% |
| Test flakiness rate | < 2% |
| Pipeline timeout rate | < 0.1% |

### Prometheus Queries

```promql
# Pipeline infrastructure reliability
1 - (
  sum(rate(pipeline_failures_total{reason="infrastructure"}[30d]))
  /
  sum(rate(pipeline_runs_total[30d]))
)

# Test flakiness rate
sum(rate(test_flaky_failures_total[30d]))
/
sum(rate(test_runs_total[30d]))
```

---

## Canary Analysis SLI

### Definition

Accuracy of canary analysis in detecting bad deployments.

### Metrics

| Metric | Target | Definition |
|--------|--------|-----------|
| True Positive Rate | > 95% | Bad deploys correctly caught |
| False Positive Rate | < 5% | Good deploys incorrectly blocked |
| Detection Time (p95) | < 5 min | Time to detect regression |

### Canary Signals

| Signal | Weight | Threshold |
|--------|--------|-----------|
| Error rate delta | 40% | > 1% increase |
| Latency p99 delta | 30% | > 50% increase |
| CPU usage delta | 15% | > 30% increase |
| Memory usage delta | 15% | > 20% increase |

---

## Alerting Thresholds

### Burn Rate Alerts

| Alert | Burn Rate | Window | Severity |
|-------|-----------|--------|----------|
| Deployment success critical | 14.4× | 1 hour | Critical (page) |
| Deployment success warning | 6× | 6 hours | Warning (ticket) |
| Lead time critical | 3× target | 1 hour | Warning |
| Rollback time critical | 2× target | Per event | Critical (page) |

### Example Alert Rule

```yaml
- alert: DeploymentSuccessRateBurnRateCritical
  expr: |
    (
      sum(rate(deployment_total{status="failed", environment="production"}[1h]))
      /
      sum(rate(deployment_total{environment="production"}[1h]))
    ) > (14.4 * 0.01)
  for: 5m
  labels:
    severity: critical
    team: platform
  annotations:
    summary: "Deployment success rate burning error budget at 14.4x"
    description: "Production deployment failure rate is {{ $value | humanizePercentage }}"
```
