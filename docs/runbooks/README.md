# Operational Runbooks

## Overview

This directory contains step-by-step operational procedures for managing the Internal Developer Platform in production. Each runbook is designed to be followed under pressure during incidents, with clear decision trees and verification steps.

## Runbook Index

### Incident Management

| Runbook                                       | Trigger                        | Estimated Time |
| --------------------------------------------- | ------------------------------ | -------------- |
| [Incident Response](incident-response.md)     | Any P1/P2 alert fires          | Ongoing        |
| [Deployment Rollback](deployment-rollback.md) | Failed deployment, error spike | < 5 min        |
| [Database Failover](database-failover.md)     | Primary DB unreachable         | < 10 min       |
| [Disaster Recovery](disaster-recovery.md)     | Region-level failure           | < 60 min       |

### Routine Operations

| Runbook                                         | Trigger                       | Estimated Time |
| ----------------------------------------------- | ----------------------------- | -------------- |
| [Certificate Rotation](certificate-rotation.md) | Cert expiry < 30 days         | < 15 min       |
| [Node Replacement](node-replacement.md)         | Node unhealthy, OS patching   | < 20 min       |
| [Scaling Guide](scaling-guide.md)               | Load increase, capacity alert | < 10 min       |
| [Cost Optimization](cost-optimization.md)       | Monthly review, budget alert  | 1-2 hours      |

### Resilience Testing

| Runbook                                   | Trigger            | Estimated Time |
| ----------------------------------------- | ------------------ | -------------- |
| [Chaos Engineering](chaos-engineering.md) | Scheduled game day | 2-4 hours      |

## Severity Levels

| Level         | Definition                        | Response Time     | Examples                          |
| ------------- | --------------------------------- | ----------------- | --------------------------------- |
| P1 - Critical | Platform unusable, data loss risk | < 5 min           | API down, DB corruption           |
| P2 - High     | Major feature degraded            | < 15 min          | Deployments failing, auth broken  |
| P3 - Medium   | Minor feature impacted            | < 1 hour          | Slow queries, non-critical alerts |
| P4 - Low      | Cosmetic or minor issue           | Next business day | UI glitch, log noise              |

## On-Call Expectations

- **Response time**: Acknowledge within 5 minutes for P1, 15 minutes for P2
- **Escalation**: If not resolved within 30 minutes, escalate to secondary
- **Communication**: Update status page and Slack channel every 15 minutes during P1
- **Post-incident**: Blameless postmortem within 48 hours for P1/P2

## Related

- [SLO Definitions](../slo/) — Error budgets and reliability targets
- [Architecture Overview](../architecture/) — System context for troubleshooting
- [Monitoring Stack](../../infra/monitoring/) — Prometheus, Grafana, AlertManager configs
