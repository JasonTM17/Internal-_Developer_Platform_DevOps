# Data Classification Policy

## Purpose

This policy defines how data within the IDP platform is classified, handled, stored, and transmitted based on its sensitivity level. All team members must follow these guidelines when working with platform data.

## Classification Levels

### Level 1: Public

**Definition**: Information intended for public consumption with no confidentiality requirements.

| Attribute | Requirement |
|-----------|-------------|
| Encryption at Rest | Optional |
| Encryption in Transit | Recommended (TLS) |
| Access Control | None required |
| Retention | As needed |
| Backup | Standard |
| Audit Logging | Not required |

**Examples**:
- Public API documentation
- Open-source code
- Marketing materials
- Public status page data

### Level 2: Internal

**Definition**: Information intended for internal use that could cause minor impact if disclosed.

| Attribute | Requirement |
|-----------|-------------|
| Encryption at Rest | Required (AES-256) |
| Encryption in Transit | Required (TLS 1.2+) |
| Access Control | Role-based (authenticated users) |
| Retention | 1 year |
| Backup | Daily with 30-day retention |
| Audit Logging | Required |

**Examples**:
- Internal documentation
- Service catalog metadata
- Deployment configurations
- Non-sensitive environment variables
- Team structure information
- Internal metrics and dashboards

### Level 3: Confidential

**Definition**: Sensitive business information that could cause significant harm if disclosed.

| Attribute | Requirement |
|-----------|-------------|
| Encryption at Rest | Required (AES-256, dedicated KMS key) |
| Encryption in Transit | Required (TLS 1.2+ with mTLS) |
| Access Control | Strict RBAC, need-to-know basis |
| Retention | Per regulatory requirement |
| Backup | Hourly with 90-day retention |
| Audit Logging | Required with tamper protection |
| Data Masking | Required in non-production |

**Examples**:
- API keys and secrets
- Database credentials
- Customer configuration data
- Deployment secrets
- Internal security policies
- Vulnerability reports
- Incident details

### Level 4: Restricted

**Definition**: Highly sensitive data subject to regulatory requirements. Unauthorized disclosure could cause severe harm.

| Attribute | Requirement |
|-----------|-------------|
| Encryption at Rest | Required (AES-256, HSM-backed KMS) |
| Encryption in Transit | Required (TLS 1.3, mTLS mandatory) |
| Access Control | MFA required, explicit approval, time-limited |
| Retention | Per regulatory requirement (minimum 7 years) |
| Backup | Continuous with cross-region replication |
| Audit Logging | Required, immutable, real-time alerting |
| Data Masking | Required everywhere except production |
| DLP | Data Loss Prevention controls active |

**Examples**:
- PII (Personally Identifiable Information)
- Authentication tokens and session data
- Encryption keys and certificates
- Financial data
- Health information (if applicable)
- Legal documents

## Data Handling Procedures

### Storage

| Classification | Storage Location | Encryption | Access |
|---------------|-----------------|------------|--------|
| Public | Any | Optional | Open |
| Internal | Approved cloud services | AES-256 | Authenticated |
| Confidential | Encrypted volumes, Secrets Manager | AES-256 + KMS | RBAC + audit |
| Restricted | Dedicated encrypted storage, HSM | AES-256 + HSM | MFA + approval + audit |

### Transmission

| Classification | Internal Network | External Network | API |
|---------------|-----------------|-----------------|-----|
| Public | Any | Any | No restrictions |
| Internal | TLS 1.2+ | TLS 1.2+ | API key |
| Confidential | mTLS | TLS 1.2+ with auth | OAuth2 + scopes |
| Restricted | mTLS + network isolation | Prohibited without approval | OAuth2 + MFA + audit |

### Disposal

| Classification | Method | Verification |
|---------------|--------|--------------|
| Public | Standard deletion | None |
| Internal | Secure deletion | Confirmation log |
| Confidential | Cryptographic erasure | Audit trail + verification |
| Restricted | Cryptographic erasure + physical destruction | Certificate of destruction |

## Platform Implementation

### Kubernetes Secrets Management

```yaml
# Confidential data: Use External Secrets Operator with AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  annotations:
    data-classification: confidential
```

### Database Encryption

- All databases use encryption at rest (AWS KMS)
- Column-level encryption for Restricted data
- TLS required for all database connections

### Service Mesh (Istio)

- mTLS enforced between all services (PeerAuthentication STRICT)
- Network policies restrict data flow based on classification
- Egress control prevents unauthorized data exfiltration

### Audit Logging

- All access to Confidential/Restricted data is logged
- Logs are immutable (append-only with integrity verification)
- Real-time alerting on unauthorized access attempts

## Roles and Responsibilities

| Role | Responsibility |
|------|---------------|
| Data Owner | Classify data, approve access requests |
| Data Custodian | Implement controls, manage storage |
| Data User | Follow handling procedures, report incidents |
| Security Team | Audit compliance, investigate breaches |
| Platform Team | Implement technical controls |

## Review Schedule

- **Quarterly**: Review classification of existing data assets
- **Annually**: Full policy review and update
- **On Change**: Re-classify when data usage changes
- **On Incident**: Review after any data-related incident
