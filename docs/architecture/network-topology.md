# Network Topology

## Overview

This document describes the network architecture, segmentation strategy, and security boundaries.

## Network Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Internet                                         │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          │   CloudFront CDN   │
                          │   + AWS WAF        │
                          │   + Shield Advanced│
                          └─────────┬─────────┘
                                    │
                          ┌─────────┴─────────┐
                          │   Route 53         │
                          │   (DNS + Health)   │
                          └─────────┬─────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────┐
│  VPC: 10.0.0.0/16                 │                                          │
│                                   │                                          │
│  ┌────────────────────────────────┼────────────────────────────────────┐    │
│  │  Public Subnets: 10.0.0.0/20  │                                     │    │
│  │                                │                                     │    │
│  │  ┌─────────────┐    ┌─────────┴─────────┐    ┌─────────────┐       │    │
│  │  │ NAT Gateway │    │  Application LB   │    │ NAT Gateway │       │    │
│  │  │ (AZ-a)      │    │  (internet-facing) │    │ (AZ-b)      │       │    │
│  │  └──────┬──────┘    └─────────┬─────────┘    └──────┬──────┘       │    │
│  └─────────┼──────────────────────┼─────────────────────┼──────────────┘    │
│            │                      │                     │                    │
│  ┌─────────┼──────────────────────┼─────────────────────┼──────────────┐    │
│  │  Private│Subnets - App:        │10.0.16.0/20         │              │    │
│  │         │                      │                     │              │    │
│  │         │    ┌─────────────────┴─────────────────┐   │              │    │
│  │         │    │         EKS Cluster                │   │              │    │
│  │         │    │                                    │   │              │    │
│  │         │    │  ┌──────────────────────────────┐  │   │              │    │
│  │         │    │  │  Namespace: idp-production   │  │   │              │    │
│  │         │    │  │  NetworkPolicy: deny-all     │  │   │              │    │
│  │         │    │  │  + allow specific ingress    │  │   │              │    │
│  │         │    │  └──────────────────────────────┘  │   │              │    │
│  │         │    │                                    │   │              │    │
│  │         │    │  ┌──────────────────────────────┐  │   │              │    │
│  │         │    │  │  Namespace: monitoring       │  │   │              │    │
│  │         │    │  │  NetworkPolicy: restricted   │  │   │              │    │
│  │         │    │  └──────────────────────────────┘  │   │              │    │
│  │         │    │                                    │   │              │    │
│  │         │    │  ┌──────────────────────────────┐  │   │              │    │
│  │         │    │  │  Namespace: argocd           │  │   │              │    │
│  │         │    │  │  NetworkPolicy: restricted   │  │   │              │    │
│  │         │    │  └──────────────────────────────┘  │   │              │    │
│  │         │    └────────────────────────────────────┘   │              │    │
│  └─────────┼─────────────────────────────────────────────┼──────────────┘    │
│            │                                             │                    │
│  ┌─────────┼─────────────────────────────────────────────┼──────────────┐    │
│  │  Private│Subnets - Data: 10.0.32.0/20                 │              │    │
│  │         │                                             │              │    │
│  │    ┌────┴────────┐    ┌───────────────┐    ┌─────────┴────────┐     │    │
│  │    │ RDS Primary │    │ RDS Standby   │    │ ElastiCache      │     │    │
│  │    │ SG: db-sg   │    │ SG: db-sg     │    │ SG: cache-sg     │     │    │
│  │    │ Port: 5432  │    │ Port: 5432    │    │ Port: 6379       │     │    │
│  │    └─────────────┘    └───────────────┘    └──────────────────┘     │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  VPC Endpoints (Private Link)                                         │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐   │    │
│  │  │ S3 (GW) │ │ ECR     │ │ STS     │ │ SSM     │ │ Secrets Mgr │   │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────────┘   │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Subnet Allocation

| Subnet Type | CIDR | AZ-a | AZ-b | AZ-c | Purpose |
|-------------|------|------|------|------|---------|
| Public | /20 | 10.0.0.0/22 | 10.0.4.0/22 | 10.0.8.0/22 | Load balancers, NAT |
| Private (App) | /20 | 10.0.16.0/22 | 10.0.20.0/22 | 10.0.24.0/22 | EKS nodes |
| Private (Data) | /20 | 10.0.32.0/22 | 10.0.36.0/22 | 10.0.40.0/22 | RDS, ElastiCache |
| Private (Mgmt) | /20 | 10.0.48.0/22 | 10.0.52.0/22 | 10.0.56.0/22 | Bastion, VPN |

## Security Groups

| Security Group | Inbound Rules | Outbound Rules |
|---------------|---------------|----------------|
| alb-sg | 443 from 0.0.0.0/0 (via WAF) | All to app-sg |
| app-sg (EKS nodes) | All from alb-sg, All from app-sg | 5432 to db-sg, 6379 to cache-sg, 443 to VPC endpoints |
| db-sg | 5432 from app-sg | None |
| cache-sg | 6379 from app-sg | None |
| bastion-sg | 22 from VPN CIDR | All to app-sg, db-sg |

## Kubernetes Network Policies

```yaml
# Default deny all ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress

# Allow API to receive traffic from ingress controller
# Allow API to connect to PostgreSQL and Redis
# Allow Portal to receive traffic from ingress controller
# Allow monitoring namespace to scrape metrics
```

## DNS Architecture

| Domain | Type | Target |
|--------|------|--------|
| idp.example.com | A (Alias) | CloudFront distribution |
| api.idp.example.com | A (Alias) | ALB |
| *.dev.idp.example.com | CNAME | Internal ALB |
| grafana.internal.idp.example.com | A | Internal ALB |
