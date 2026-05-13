# Capacity Planning Guide

## Overview

This document outlines the capacity planning methodology for the IDP platform, covering compute, storage, network, and service-specific scaling considerations.

---

## Current Capacity Profile

### Cluster Resources (Production)

| Resource | Provisioned | Used (avg) | Used (peak) | Headroom |
|----------|------------|------------|-------------|----------|
| CPU Cores | 96 | 38 (40%) | 62 (65%) | 35% |
| Memory (GB) | 384 | 210 (55%) | 295 (77%) | 23% |
| Storage (TB) | 5.0 | 2.8 (56%) | — | 44% |
| Pods | 440 (max) | 185 | 240 | 45% |
| Nodes | 12 | — | — | Auto-scales to 20 |

### Database Resources

| Database | Instance | Storage | Connections | IOPS |
|----------|----------|---------|-------------|------|
| Platform DB | db.r6g.xlarge | 500 GB | 200/400 max | 3000/12000 |
| Audit DB | db.r6g.large | 200 GB | 50/200 max | 1500/6000 |
| Redis Cache | cache.r6g.large | 26 GB | 150/65000 | — |

---

## Scaling Triggers

### Horizontal Pod Autoscaler (HPA) Thresholds

| Service | Metric | Scale-Up | Scale-Down | Min | Max |
|---------|--------|----------|------------|-----|-----|
| API | CPU | 70% | 30% | 3 | 20 |
| API | Memory | 80% | 40% | 3 | 20 |
| API | RPS | 500/pod | 100/pod | 3 | 20 |
| Portal | CPU | 60% | 20% | 2 | 10 |
| Workers | Queue depth | 100 msgs | 10 msgs | 1 | 15 |

### Cluster Autoscaler Triggers

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Pending pods | > 0 for 30s | Add node |
| Node utilization | < 50% for 10m | Remove node |
| Node count | Max 20 | Alert, manual review |

---

## Growth Projections

### Traffic Growth Model

| Metric | Current | +6 months | +12 months | +24 months |
|--------|---------|-----------|------------|------------|
| Registered services | 47 | 80 | 150 | 300 |
| Daily deployments | 25 | 50 | 100 | 200 |
| API requests/day | 2.5M | 5M | 12M | 30M |
| Active developers | 85 | 150 | 250 | 500 |
| Environments (active) | 30 | 60 | 120 | 200 |

### Resource Growth Formula

```
Required CPU = Base CPU + (Services × 0.5 cores) + (RPS × 0.001 cores)
Required Memory = Base Memory + (Services × 256 MB) + (Connections × 10 MB)
Required Storage = Base Storage + (Services × 2 GB) + (Days × Daily Ingest Rate)
```

---

## Capacity Planning by Component

### API Service

| Load Level | Pods | CPU/Pod | Memory/Pod | Total CPU | Total Memory |
|-----------|------|---------|------------|-----------|-------------|
| Low (< 100 RPS) | 3 | 500m | 512Mi | 1.5 cores | 1.5 GB |
| Normal (100-500 RPS) | 5 | 1000m | 1Gi | 5 cores | 5 GB |
| High (500-2000 RPS) | 10 | 1000m | 1Gi | 10 cores | 10 GB |
| Peak (2000-5000 RPS) | 20 | 1000m | 2Gi | 20 cores | 40 GB |

### PostgreSQL

| Growth Factor | Action | Trigger |
|--------------|--------|---------|
| Storage > 70% | Increase volume | Automated alarm |
| Connections > 70% | Scale read replicas | HPA on connection count |
| IOPS > 80% | Upgrade instance class | Manual review |
| Query latency p99 > 100ms | Add read replicas or optimize | Alert + investigation |

### Redis

| Growth Factor | Action | Trigger |
|--------------|--------|---------|
| Memory > 75% | Scale up instance | Automated alarm |
| Evictions > 0 | Increase memory or review TTLs | Alert |
| Connections > 80% | Add cluster nodes | Manual review |
| Hit rate < 90% | Review caching strategy | Weekly report |

---

## Cost Projections

### Monthly Cost by Growth Stage

| Stage | Compute | Database | Storage | Network | Total |
|-------|---------|----------|---------|---------|-------|
| Current | $3,200 | $1,800 | $400 | $200 | $5,600 |
| +6 months | $5,500 | $2,400 | $600 | $350 | $8,850 |
| +12 months | $9,000 | $3,600 | $1,000 | $600 | $14,200 |
| +24 months | $15,000 | $5,400 | $1,800 | $1,000 | $23,200 |

### Cost Optimization Strategies

1. **Reserved Instances** — 30-40% savings on stable workloads
2. **Spot Instances** — 60-70% savings for non-critical workloads (CI runners, preview envs)
3. **Right-sizing** — Monthly review of over-provisioned resources
4. **Auto-scaling** — Scale down during off-hours (non-production)
5. **Storage tiering** — Move cold data to S3 Glacier

---

## Capacity Review Cadence

| Review | Frequency | Participants | Output |
|--------|-----------|-------------|--------|
| Automated alerts | Real-time | On-call | Immediate action |
| Weekly capacity report | Weekly | Platform team | Trend analysis |
| Monthly planning | Monthly | Platform + Finance | Budget forecast |
| Quarterly review | Quarterly | Engineering leadership | Strategic decisions |

---

## Runbook: Capacity Emergency

### Symptoms
- Pods in Pending state
- HPA at maximum replicas
- Response latency increasing
- 503 errors from load balancer

### Immediate Actions
1. Check cluster autoscaler status: `kubectl get nodes`
2. Check HPA status: `kubectl get hpa -n platform`
3. If nodes at max: manually increase ASG max
4. If single service: increase HPA max temporarily
5. If database: promote read replica or increase instance size

### Post-Incident
1. Root cause analysis
2. Update capacity projections
3. Adjust autoscaling thresholds
4. Consider pre-scaling for known events
