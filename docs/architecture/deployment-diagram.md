# Deployment Diagram

## Overview

This document describes the deployment topology across AWS regions and availability zones.

## Production Deployment Topology

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AWS Account: Production                              │
│                              Region: us-east-1                                    │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                           VPC: idp-production (10.0.0.0/16)                  │ │
│  │                                                                              │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                    Public Subnets (10.0.0.0/20)                         │ │ │
│  │  │                                                                         │ │ │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │ │ │
│  │  │  │ NAT GW (a)  │  │ NAT GW (b)  │  │ NAT GW (c)  │                   │ │ │
│  │  │  │ ALB (a)     │  │ ALB (b)     │  │ ALB (c)     │                   │ │ │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘                   │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                              │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                    Private Subnets - App (10.0.16.0/20)                 │ │ │
│  │  │                                                                         │ │ │
│  │  │  ┌─────────────────────────────────────────────────────────────────┐   │ │ │
│  │  │  │              EKS Cluster: idp-production                         │   │ │ │
│  │  │  │                                                                  │   │ │ │
│  │  │  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │   │ │ │
│  │  │  │  │  Node Group:    │  │  Node Group:    │  │  Node Group:   │  │   │ │ │
│  │  │  │  │  platform       │  │  platform       │  │  platform      │  │   │ │ │
│  │  │  │  │  (m6i.xlarge)   │  │  (m6i.xlarge)   │  │  (m6i.xlarge)  │  │   │ │ │
│  │  │  │  │  AZ: us-east-1a │  │  AZ: us-east-1b │  │  AZ: us-east-1c│  │   │ │ │
│  │  │  │  │                 │  │                 │  │                │  │   │ │ │
│  │  │  │  │  Pods:          │  │  Pods:          │  │  Pods:         │  │   │ │ │
│  │  │  │  │  - api (x2)     │  │  - api (x2)     │  │  - api (x2)    │  │   │ │ │
│  │  │  │  │  - portal (x1)  │  │  - portal (x1)  │  │  - portal (x1) │  │   │ │ │
│  │  │  │  │  - argocd       │  │  - prometheus    │  │  - loki        │  │   │ │ │
│  │  │  │  └─────────────────┘  └─────────────────┘  └────────────────┘  │   │ │ │
│  │  │  │                                                                  │   │ │ │
│  │  │  │  Namespaces: idp-production, argocd, monitoring, cert-manager   │   │ │ │
│  │  │  └─────────────────────────────────────────────────────────────────┘   │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                              │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                    Private Subnets - Data (10.0.32.0/20)                │ │ │
│  │  │                                                                         │ │ │
│  │  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────────┐ │ │ │
│  │  │  │  RDS Primary    │  │  RDS Standby    │  │  ElastiCache Redis     │ │ │ │
│  │  │  │  PostgreSQL 16  │  │  (Multi-AZ)     │  │  Cluster (3 shards)   │ │ │ │
│  │  │  │  db.r6g.xlarge  │  │  db.r6g.xlarge  │  │  cache.r6g.large      │ │ │ │
│  │  │  │  AZ: us-east-1a │  │  AZ: us-east-1b │  │  AZ: multi           │ │ │ │
│  │  │  └─────────────────┘  └─────────────────┘  └────────────────────────┘ │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │  Global Services                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │    │
│  │  │ CloudFront   │  │ Route 53     │  │ WAF          │  │ ACM         │  │    │
│  │  │ (CDN)        │  │ (DNS)        │  │ (Firewall)   │  │ (TLS Certs) │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Environment Comparison

| Aspect | Development | Staging | Production |
|--------|------------|---------|------------|
| EKS Nodes | 2x t3.large | 3x m6i.large | 3x m6i.xlarge |
| API Replicas | 1 | 2 | 6 (2 per AZ) |
| Portal Replicas | 1 | 2 | 3 (1 per AZ) |
| RDS Instance | db.t3.medium | db.r6g.large | db.r6g.xlarge |
| RDS Multi-AZ | No | Yes | Yes |
| Redis | Single node | 2 replicas | 3-shard cluster |
| Availability Zones | 2 | 2 | 3 |
| Auto-scaling | Disabled | Enabled | Enabled |
| Backup Retention | 1 day | 7 days | 35 days |

## Disaster Recovery

- **RPO (Recovery Point Objective):** 5 minutes (continuous RDS backup)
- **RTO (Recovery Time Objective):** 30 minutes (automated failover)
- **DR Region:** us-west-2 (warm standby)
- **Cross-region replication:** RDS read replica + S3 replication
