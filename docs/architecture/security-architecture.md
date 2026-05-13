# Security Architecture

## Overview

This document describes the security architecture of the IDP platform, covering defense-in-depth layers, authentication, authorization, data protection, and compliance controls.

---

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        Edge (CloudFront + WAF)                    │
├─────────────────────────────────────────────────────────────────┤
│                     Network (VPC + Security Groups)               │
├─────────────────────────────────────────────────────────────────┤
│                   Identity (OAuth2 + RBAC + mTLS)                 │
├─────────────────────────────────────────────────────────────────┤
│                  Application (Input validation + CSP)             │
├─────────────────────────────────────────────────────────────────┤
│                    Data (Encryption at rest + in transit)         │
├─────────────────────────────────────────────────────────────────┤
│                  Runtime (Container isolation + seccomp)          │
├─────────────────────────────────────────────────────────────────┤
│                    Audit (Logging + SIEM + Alerting)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication Architecture

### User Authentication Flow

```
Developer → IdP (OIDC) → JWT Token → API Gateway → Service
                                         ↓
                                   Token Validation
                                   (signature, expiry, audience)
```

### Service-to-Service Authentication

```
Service A → mTLS Certificate → Service Mesh (Istio) → Service B
                                      ↓
                              Certificate Validation
                              (CA chain, SPIFFE ID)
```

### Authentication Methods

| Method | Use Case | Token Lifetime |
|--------|----------|---------------|
| OAuth2 + OIDC | User interactive sessions | 1 hour (refresh: 7 days) |
| API Keys | CI/CD automation | 90 days (rotated) |
| mTLS | Service mesh communication | Certificate: 24 hours |
| Service Accounts | Kubernetes workloads | Pod-bound, auto-rotated |

---

## Authorization Model

### RBAC Hierarchy

```
Platform Admin
  └── Platform Engineer
        └── Developer
              └── Viewer
```

### Permission Matrix

| Action | Admin | Platform Eng | Developer | Viewer |
|--------|-------|-------------|-----------|--------|
| Create services | ✅ | ✅ | ✅ (own team) | ❌ |
| Deploy to production | ✅ | ✅ | ❌ (needs approval) | ❌ |
| Deploy to staging | ✅ | ✅ | ✅ | ❌ |
| Manage secrets | ✅ | ✅ | ✅ (own namespace) | ❌ |
| View audit logs | ✅ | ✅ | ✅ (own team) | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ |
| Provision environments | ✅ | ✅ | ✅ (non-prod) | ❌ |

### Policy Enforcement Points

1. **API Gateway** — Token validation, rate limiting
2. **Application Layer** — RBAC checks, resource ownership
3. **Kubernetes** — NetworkPolicies, PodSecurityPolicies
4. **Database** — Row-level security, connection pooling

---

## Network Security

### VPC Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ VPC (10.0.0.0/16)                                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Public Subnet │  │ Public Subnet │  │ Public Subnet │     │
│  │ (10.0.1.0/24)│  │ (10.0.2.0/24)│  │ (10.0.3.0/24)│     │
│  │   ALB, NAT   │  │   ALB, NAT   │  │   ALB, NAT   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Private Subnet │  │Private Subnet │  │Private Subnet │    │
│  │(10.0.10.0/24)│  │(10.0.11.0/24)│  │(10.0.12.0/24)│     │
│  │  EKS Nodes   │  │  EKS Nodes   │  │  EKS Nodes   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Data Subnet  │  │  Data Subnet  │  │  Data Subnet  │    │
│  │(10.0.20.0/24)│  │(10.0.21.0/24)│  │(10.0.22.0/24)│     │
│  │  RDS, Redis  │  │  RDS, Redis  │  │  RDS, Redis  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Network Policies

- **Default deny** — All inter-namespace traffic blocked by default
- **Explicit allow** — Services declare required connections
- **Egress control** — External access only through NAT gateway
- **DNS policy** — Internal DNS resolution only for platform services

---

## Data Protection

### Encryption

| Data State | Method | Key Management |
|-----------|--------|---------------|
| At rest (S3) | AES-256 (SSE-S3) | AWS managed |
| At rest (RDS) | AES-256 | KMS CMK, auto-rotated |
| At rest (EBS) | AES-256 | KMS CMK |
| In transit (external) | TLS 1.3 | ACM certificates |
| In transit (internal) | mTLS | Istio CA, 24h rotation |
| Secrets | AES-256 | KMS CMK, per-environment |

### Data Classification

| Level | Examples | Controls |
|-------|----------|----------|
| Public | API docs, status page | No restrictions |
| Internal | Service metadata, team info | Authentication required |
| Confidential | Deployment configs, audit logs | RBAC + encryption |
| Restricted | Secrets, credentials, PII | KMS + access logging + rotation |

---

## Container Security

### Image Security

1. **Base images** — Distroless or Alpine only
2. **Scanning** — Trivy scan on every build (block Critical/High)
3. **Signing** — Cosign image signatures verified at admission
4. **Registry** — Private ECR with immutable tags
5. **Updates** — Automated base image updates via Renovate

### Runtime Security

```yaml
# Pod Security Standards (Restricted)
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
  seccompProfile:
    type: RuntimeDefault
```

### Admission Control

- **OPA Gatekeeper** — Policy enforcement at admission
- **Kyverno** — Mutation policies (add labels, defaults)
- **Image policy** — Only signed images from approved registries

---

## Secret Management

### Secret Lifecycle

```
Create → Store (encrypted) → Distribute → Use → Rotate → Revoke
   ↓          ↓                  ↓          ↓       ↓         ↓
 Audit     KMS CMK         K8s CSI Driver  Memory  Lambda   Audit
```

### Secret Distribution

| Method | Use Case | Rotation |
|--------|----------|----------|
| AWS Secrets Manager | Application secrets | Auto (30-90 days) |
| Sealed Secrets | GitOps-managed K8s secrets | Manual |
| CSI Secret Store | Pod-mounted secrets | On pod restart |
| IRSA | AWS service access | Automatic (STS) |

---

## Compliance Controls

### SOC 2 Type II Alignment

| Control | Implementation |
|---------|---------------|
| Access control | RBAC + MFA + SSO |
| Audit logging | CloudTrail + application audit log |
| Change management | GitOps + PR reviews + approvals |
| Encryption | TLS 1.3 + KMS + at-rest encryption |
| Incident response | PagerDuty + runbooks + postmortems |
| Vulnerability management | Trivy + Dependabot + SLA for fixes |

### Security Scanning Pipeline

```
Code Push → SAST (Semgrep) → Dependency Check (Dependabot)
         → Container Scan (Trivy) → IaC Scan (tfsec/checkov)
         → DAST (OWASP ZAP, staging only) → Deploy
```

---

## Incident Response

### Security Incident Severity

| Severity | Example | Response Time | Escalation |
|----------|---------|---------------|------------|
| P1 Critical | Data breach, active exploit | 15 minutes | CISO + Engineering VP |
| P2 High | Vulnerability in production | 4 hours | Security team + Platform |
| P3 Medium | Failed security scan | 24 hours | Platform team |
| P4 Low | Policy violation (non-prod) | 1 week | Team lead |

### Response Playbooks

1. **Compromised credentials** — Rotate immediately, audit access logs, notify affected users
2. **Container escape** — Isolate node, cordon + drain, forensic capture
3. **Data exposure** — Assess scope, notify DPO, contain access, remediate
4. **Supply chain attack** — Pin dependencies, audit recent changes, rebuild from known-good
