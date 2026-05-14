# Service Level Objectives (SLOs)

## Overview

This directory defines the reliability contracts for the Internal Developer Platform. SLOs are the primary mechanism for balancing feature velocity against system reliability, following Google's SRE principles.

## Documents

| Document                                          | Description                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| [Platform SLOs](platform-slos.md)                 | Top-level SLO definitions, error budget policy, and review process |
| [API SLI Specification](api-sli.md)               | Detailed SLI definitions for the Platform API                      |
| [Deployment SLI Specification](deployment-sli.md) | SLI definitions for the deployment pipeline                        |

## Key Metrics at a Glance

| Service                     | SLO Target | Error Budget (30d) | Burn Rate Alert     |
| --------------------------- | ---------- | ------------------ | ------------------- |
| Platform API (Availability) | 99.95%     | 21.6 min           | 14.4x (1h), 6x (6h) |
| Platform API (Latency p99)  | < 2000ms   | —                  | Static threshold    |
| Deployment Pipeline         | 99.0%      | 432 min            | 14.4x (1h), 6x (6h) |
| Developer Portal            | 99.9%      | 43.2 min           | 14.4x (1h), 6x (6h) |
| Environment Provisioning    | 99.5%      | 216 min            | 14.4x (1h), 6x (6h) |

## Monitoring

SLO dashboards are available in Grafana:

- **Platform SLO Overview**: `http://localhost:3001/d/slo-overview`
- **Error Budget Burn Rate**: `http://localhost:3001/d/error-budget`
- **API Latency Distribution**: `http://localhost:3001/d/api-latency`

## Related

- [Incident Response Runbook](../runbooks/incident-response.md)
- [Alerting Configuration](../../infra/monitoring/)
- [Capacity Planning](../architecture/capacity-planning.md)
