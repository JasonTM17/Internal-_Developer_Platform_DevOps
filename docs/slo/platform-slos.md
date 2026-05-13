# Platform Service Level Objectives (SLOs)

## Overview

This document defines the Service Level Objectives for the Internal Developer Platform. SLOs represent our reliability targets and inform alerting, error budgets, and engineering priorities.

---

## SLO Framework

### Definitions

| Term | Definition |
|------|-----------|
| **SLI** | Service Level Indicator — a quantitative measure of service behavior |
| **SLO** | Service Level Objective — a target value for an SLI over a time window |
| **SLA** | Service Level Agreement — a contractual commitment (external) |
| **Error Budget** | The allowed amount of unreliability (1 - SLO target) |

### Error Budget Policy

When an error budget is exhausted:
1. **75% consumed** — Review recent changes, increase monitoring
2. **90% consumed** — Freeze non-critical deployments, prioritize reliability work
3. **100% consumed** — All engineering effort shifts to reliability until budget recovers

---

## Platform-Wide SLOs

### API Availability

| Metric | Target | Window | Measurement |
|--------|--------|--------|-------------|
| Availability | 99.95% | 30 days rolling | Successful requests / Total requests |
| Error Budget | 21.6 minutes/month | Monthly | Allowed downtime |

**Definition:** A request is successful if it returns a non-5xx response within the timeout period.

**Exclusions:**
- Planned maintenance windows (announced 48h in advance)
- Requests from blocked/abusive clients
- Health check endpoints

---

### API Latency

| Percentile | Target | Measurement |
|------------|--------|-------------|
| p50 | < 100ms | Median response time |
| p95 | < 500ms | 95th percentile response time |
| p99 | < 2000ms | 99th percentile response time |

**Measurement point:** From request received at load balancer to response sent.

**Exclusions:**
- Long-running operations (scaffolding, provisioning) — these return 202 Accepted
- Requests exceeding 10MB payload

---

### Deployment Pipeline

| Metric | Target | Window |
|--------|--------|--------|
| Success Rate | 99.0% | 30 days rolling |
| Time to Deploy (p95) | < 15 minutes | Per deployment |
| Rollback Time (p95) | < 5 minutes | Per rollback |

**Definition:** A deployment is successful if it reaches the `succeeded` state without manual intervention.

---

### Environment Provisioning

| Metric | Target | Window |
|--------|--------|--------|
| Provisioning Success Rate | 99.5% | 30 days rolling |
| Time to Ready (p95) | < 10 minutes | Per environment |
| Availability (active envs) | 99.9% | 30 days rolling |

---

### Portal (Developer UI)

| Metric | Target | Window |
|--------|--------|--------|
| Availability | 99.9% | 30 days rolling |
| Page Load Time (p95) | < 3 seconds | Per page navigation |
| Time to Interactive (p95) | < 5 seconds | Initial load |

---

### Data Durability

| Metric | Target | Window |
|--------|--------|--------|
| Service Catalog Data | 99.999% | Annual |
| Deployment History | 99.99% | Annual |
| Audit Logs | 99.999% | Annual |
| Configuration Data | 99.999% | Annual |

---

## SLO by Service Tier

Services registered in the catalog inherit SLO expectations based on their tier:

| Tier | Availability | Latency (p99) | Deployment Frequency | On-Call |
|------|-------------|---------------|---------------------|---------|
| Critical | 99.99% | < 500ms | Daily | 24/7 |
| Standard | 99.9% | < 2000ms | Weekly | Business hours |
| Experimental | 99.0% | < 5000ms | On-demand | Best effort |

---

## Error Budget Calculations

### Monthly Error Budget

```
Error Budget = (1 - SLO Target) × Total Time

Example for 99.95% availability:
  Budget = (1 - 0.9995) × 43,200 minutes = 21.6 minutes/month
  Budget = (1 - 0.9995) × 2,592,000 seconds = 1,296 seconds/month
```

### Current Error Budgets

| Service | SLO | Monthly Budget | Burn Rate Alert |
|---------|-----|---------------|-----------------|
| Platform API | 99.95% | 21.6 min | 14.4× (1h), 6× (6h) |
| Deployment Pipeline | 99.0% | 432 min | 14.4× (1h), 6× (6h) |
| Portal | 99.9% | 43.2 min | 14.4× (1h), 6× (6h) |
| Environment Provisioning | 99.5% | 216 min | 14.4× (1h), 6× (6h) |

---

## Measurement & Reporting

### Data Sources

| SLI | Data Source | Collection Method |
|-----|-------------|-------------------|
| API Availability | Envoy access logs | Prometheus counter |
| API Latency | Envoy histograms | Prometheus histogram |
| Deployment Success | ArgoCD metrics | Prometheus gauge |
| Portal Availability | Synthetic monitoring | Prometheus probe |
| Provisioning Time | Terraform metrics | Custom exporter |

### Reporting Cadence

- **Real-time:** Grafana SLO dashboard (burn rate, remaining budget)
- **Daily:** Automated Slack report to #platform-reliability
- **Weekly:** SLO review in platform team standup
- **Monthly:** SLO report to engineering leadership
- **Quarterly:** SLO target review and adjustment

---

## SLO Review Process

### Quarterly Review Criteria

1. Were SLO targets met consistently? (If always met easily, consider tightening)
2. Were there error budget exhaustion events? (Root cause analysis required)
3. Are SLIs still measuring what matters to users?
4. Do we need new SLOs for new platform capabilities?
5. Are alerting thresholds appropriate?

### Changing SLOs

SLO changes require:
1. Proposal with justification
2. Impact analysis on error budgets and alerting
3. Platform team approval
4. 2-week notice to dependent teams
5. Dashboard and alert updates
