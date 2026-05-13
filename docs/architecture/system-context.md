# System Context Diagram (C4 Level 1)

## Overview

The System Context diagram shows the IDP and its relationships with external systems and users.

## Diagram

```
                                    ┌─────────────────┐
                                    │   GitHub         │
                                    │   (Source Code)  │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│                      │  │                      │  │                      │
│   Development Teams  │  │   Platform Engineers │  │   Team Leads         │
│                      │  │                      │  │                      │
│   - Deploy services  │  │   - Manage platform  │  │   - View dashboards  │
│   - View catalogs    │  │   - Configure infra  │  │   - Approve deploys  │
│   - Request resources│  │   - Set policies     │  │   - Manage teams     │
│                      │  │                      │  │                      │
└──────────┬───────────┘  └──────────┬───────────┘  └──────────┬───────────┘
           │                         │                          │
           └─────────────────────────┼──────────────────────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │                                │
                    │   Internal Developer Platform  │
                    │          (IDP)                 │
                    │                                │
                    │   Self-service platform for    │
                    │   infrastructure provisioning, │
                    │   deployment management, and   │
                    │   service catalog              │
                    │                                │
                    └───────┬──────┬──────┬─────────┘
                            │      │      │
              ┌─────────────┘      │      └─────────────┐
              │                    │                     │
              ▼                    ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│                  │  │                  │  │                      │
│   AWS Cloud      │  │   PagerDuty     │  │   Slack              │
│                  │  │                  │  │                      │
│   - EKS          │  │   - Incident    │  │   - Notifications    │
│   - RDS          │  │     alerting    │  │   - Deploy approvals │
│   - S3           │  │   - On-call     │  │   - Status updates   │
│   - ElastiCache  │  │     routing     │  │                      │
│                  │  │                  │  │                      │
└──────────────────┘  └──────────────────┘  └──────────────────────┘
              │
              ▼
┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│                      │  │                  │  │                  │
│   Identity Provider  │  │   Vault          │  │   Container      │
│   (Okta/Azure AD)    │  │   (Secrets)      │  │   Registry (ECR) │
│                      │  │                  │  │                  │
└──────────────────────┘  └──────────────────┘  └──────────────────┘
```

## System Actors

| Actor | Role | Interactions |
|-------|------|-------------|
| Development Teams | Service owners | Deploy, monitor, manage services |
| Platform Engineers | Platform maintainers | Configure infrastructure, set policies |
| Team Leads | Organizational oversight | Approve deployments, manage access |
| CI/CD Systems | Automated pipelines | Trigger builds, run tests, deploy |

## External Systems

| System | Integration Type | Purpose |
|--------|-----------------|---------|
| AWS Cloud | API (SDK) | Infrastructure provisioning and hosting |
| GitHub | Webhooks + API | Source code, CI/CD triggers, GitOps |
| PagerDuty | REST API | Incident management and alerting |
| Slack | Webhooks | Notifications and approvals |
| Okta/Azure AD | OIDC/SAML | Authentication and identity |
| HashiCorp Vault | API | Secrets management |
| Amazon ECR | Docker Registry API | Container image storage |

## Trust Boundaries

1. **External Network** → API Gateway (TLS termination, rate limiting)
2. **API Gateway** → Platform Services (JWT validation, RBAC)
3. **Platform Services** → Infrastructure (IAM roles, network policies)
4. **Platform Services** → External APIs (mTLS, API keys)
