# Key Platform Metrics

## Overview

This document defines the key metrics that measure the health, performance, and value delivery of the Internal Developer Platform. These metrics are reported weekly to engineering leadership.

---

## Platform Health Metrics

### Availability & Reliability

| Metric | Definition | Target | Current |
|--------|-----------|--------|---------|
| Platform Availability | Uptime of core platform services | 99.95% | 99.97% |
| API Success Rate | Non-5xx responses / Total responses | 99.95% | 99.98% |
| Deployment Success Rate | Successful deploys / Total deploys | 99.0% | 99.2% |
| Mean Time to Recovery (MTTR) | Average incident resolution time | < 30 min | 22 min |
| Mean Time Between Failures (MTBF) | Average time between P1/P2 incidents | > 30 days | 45 days |

### Performance

| Metric | Definition | Target | Current |
|--------|-----------|--------|---------|
| API Latency (p50) | Median response time | < 100ms | 45ms |
| API Latency (p95) | 95th percentile response time | < 500ms | 180ms |
| API Latency (p99) | 99th percentile response time | < 2000ms | 650ms |
| Portal Load Time | Time to interactive | < 3s | 1.8s |
| Deployment Lead Time (p95) | Trigger to traffic serving | < 15 min | 8 min |

---

## Developer Experience Metrics

### Productivity

| Metric | Definition | Target | Current |
|--------|-----------|--------|---------|
| Deployment Frequency | Deploys per day (all services) | > 20/day | 25/day |
| Lead Time for Changes | Commit to production | < 1 hour | 42 min |
| Change Failure Rate | Failed deploys / Total deploys | < 5% | 2.1% |
| Time to Restore Service | Detection to resolution | < 1 hour | 22 min |
| New Service Time | From request to first deploy | < 1 day | 4 hours |

### Adoption

| Metric | Definition | Target | Current |
|--------|-----------|--------|---------|
| Active Users (weekly) | Unique portal logins per week | — | 78 |
| Services Registered | Total services in catalog | — | 47 |
| Self-Service Rate | Requests handled without platform team | > 80% | 76% |
| Template Usage | New services from templates | > 90% | 88% |
| API Key Active | Active API keys (automation adoption) | — | 34 |

### Satisfaction

| Metric | Definition | Target | Current |
|--------|-----------|--------|---------|
| Developer NPS | Net Promoter Score (quarterly survey) | > 40 | 52 |
| Platform CSAT | Satisfaction score (1-5) | > 4.0 | 4.2 |
| Support Ticket Volume | Tickets per week | Decreasing | 12/week |
| Time to Resolution (support) | Average support ticket resolution | < 4 hours | 2.5 hours |

---

## Operational Metrics

### Toil & Efficiency

| Metric | Definition | Target | Current |
|--------|-----------|--------|---------|
| Toil Ratio | Toil hours / Total engineering hours | < 15% | 22% |
| Automation Coverage | Automated tasks / Total repetitive tasks | > 85% | 78% |
| Alert Actionability | Actionable alerts / Total alerts | > 90% | 82% |
| On-Call Load | Pages per on-call shift | < 5 | 3.2 |
| Incident Rate | P1+P2 incidents per month | < 2 | 0.8 |

### Cost Efficiency

| Metric | Definition | Target | Current |
|--------|-----------|--------|---------|
| Cost per Service | Monthly infra cost / Number of services | Decreasing | $119 |
| Cost per Deploy | Monthly infra cost / Number of deploys | Decreasing | $7.50 |
| Resource Utilization (CPU) | Used / Provisioned | > 40% | 42% |
| Resource Utilization (Memory) | Used / Provisioned | > 50% | 55% |
| Waste Ratio | Idle resources cost / Total cost | < 20% | 18% |

---

## Security Metrics

| Metric | Definition | Target | Current |
|--------|-----------|--------|---------|
| Vulnerability SLA Compliance | Critical fixed within 24h | 100% | 100% |
| Image Scan Pass Rate | Images passing security scan | > 95% | 97% |
| Secret Rotation Compliance | Secrets rotated on schedule | 100% | 98% |
| MFA Adoption | Users with MFA enabled | 100% | 100% |
| Dependency Freshness | Dependencies within 1 major version | > 90% | 92% |

---

## Reporting & Dashboards

### Weekly Report (automated, Slack #platform-metrics)

```
📊 Platform Weekly Report (Week of YYYY-MM-DD)

Availability: 99.97% ✅ (target: 99.95%)
Deployments: 175 total, 172 successful (98.3%) ✅
Incidents: 0 P1, 1 P2 ✅
MTTR: 18 min ✅
Developer NPS: 52 ✅

Top 3 deployed services:
  1. payment-service (23 deploys)
  2. auth-service (18 deploys)
  3. portal (15 deploys)

Action items:
  - Alert actionability below target (82% vs 90%)
  - 2 services with no deploys in 30 days (review needed)
```

### Monthly Executive Summary

- Platform health scorecard (red/amber/green)
- Cost trend and forecast
- Developer satisfaction trend
- Key achievements and risks
- Capacity planning updates

---

## Metric Collection

| Source | Metrics | Collection Method |
|--------|---------|-------------------|
| Prometheus | Availability, latency, error rates | Scraping (15s interval) |
| ArgoCD | Deployment frequency, success rate | Metrics endpoint |
| GitHub | Lead time, PR metrics | GitHub API |
| PagerDuty | MTTR, incident count, on-call load | PagerDuty API |
| Surveys | NPS, CSAT | Quarterly survey tool |
| Cost Explorer | Infrastructure costs | AWS Cost Explorer API |
