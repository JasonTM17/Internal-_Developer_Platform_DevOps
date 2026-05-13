# Encryption Standards

## Purpose

This document defines the encryption standards and cryptographic requirements for the IDP platform, covering data at rest, data in transit, and key management.

## Encryption Requirements by Classification

| Data Classification | At Rest | In Transit | Key Management |
|-------------------|---------|------------|----------------|
| Public | Optional | TLS 1.2+ recommended | N/A |
| Internal | AES-256-GCM | TLS 1.2+ required | AWS KMS (automatic rotation) |
| Confidential | AES-256-GCM | TLS 1.2+ with mTLS | AWS KMS (annual rotation) |
| Restricted | AES-256-GCM (HSM-backed) | TLS 1.3 with mTLS | AWS CloudHSM (manual rotation) |

## Data at Rest

### Database Encryption

| Component | Algorithm | Key Source | Rotation |
|-----------|-----------|-----------|----------|
| RDS PostgreSQL | AES-256 | AWS KMS CMK | Annual (automatic) |
| Column-level encryption | AES-256-GCM | Application-managed | Quarterly |
| Backup encryption | AES-256 | AWS KMS CMK | Annual |

### Object Storage

| Bucket Type | Encryption | Algorithm | Key |
|------------|-----------|-----------|-----|
| Standard buckets | SSE-KMS | AES-256 | AWS KMS CMK |
| Audit log buckets | SSE-KMS | AES-256 | Dedicated CMK |
| Artifact buckets | SSE-S3 | AES-256 | AWS-managed |

### Kubernetes Secrets

| Method | Tool | Encryption |
|--------|------|-----------|
| etcd encryption | EncryptionConfiguration | AES-CBC with 32-byte key |
| External secrets | External Secrets Operator | AWS Secrets Manager (AES-256) |
| Sealed secrets | Sealed Secrets controller | RSA-4096 + AES-256-GCM |

## Data in Transit

### TLS Configuration

**Minimum Requirements**:
- Protocol: TLS 1.2 (TLS 1.3 preferred)
- Key Exchange: ECDHE (P-256 or P-384)
- Certificate: RSA-2048 or ECDSA P-256

**Approved Cipher Suites** (in priority order):

```
TLS 1.3:
- TLS_AES_256_GCM_SHA384
- TLS_CHACHA20_POLY1305_SHA256
- TLS_AES_128_GCM_SHA256

TLS 1.2:
- ECDHE-ECDSA-AES256-GCM-SHA384
- ECDHE-RSA-AES256-GCM-SHA384
- ECDHE-ECDSA-CHACHA20-POLY1305
- ECDHE-RSA-CHACHA20-POLY1305
- ECDHE-ECDSA-AES128-GCM-SHA256
- ECDHE-RSA-AES128-GCM-SHA256
```

**Prohibited**:
- SSL 2.0, SSL 3.0, TLS 1.0, TLS 1.1
- RC4, DES, 3DES, MD5, SHA-1
- Export-grade ciphers
- NULL ciphers
- Anonymous key exchange

### Service Mesh (Istio mTLS)

| Communication | Mode | Certificate |
|--------------|------|-------------|
| Service-to-service | STRICT mTLS | SPIFFE/X.509 (auto-rotated) |
| Ingress gateway | TLS termination | Let's Encrypt / ACM |
| Egress gateway | TLS origination | Platform CA |

### Certificate Management

| Certificate Type | Issuer | Validity | Rotation |
|-----------------|--------|----------|----------|
| Ingress TLS | AWS ACM / Let's Encrypt | 90 days | Automatic (30 days before expiry) |
| Service mesh | Istio CA (citadel) | 24 hours | Automatic |
| Internal CA | AWS Private CA | 10 years | Manual (5 years) |
| Client certificates | Internal CA | 1 year | Annual |

## Key Management

### AWS KMS Configuration

```hcl
# Standard CMK for platform encryption
resource "aws_kms_key" "platform" {
  description             = "IDP Platform encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true  # Annual automatic rotation
  multi_region            = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "RootAccess"
        Effect = "Allow"
        Principal = { AWS = "arn:aws:iam::ACCOUNT:root" }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })
}
```

### Key Hierarchy

```
Root Key (HSM-protected)
├── Platform Master Key (KMS CMK)
│   ├── Database Encryption Key (DEK)
│   ├── Storage Encryption Key (DEK)
│   └── Secrets Encryption Key (DEK)
├── DR Encryption Key (KMS CMK, multi-region)
│   ├── DR Database Key (DEK)
│   └── DR Storage Key (DEK)
└── Audit Key (KMS CMK, separate account)
    └── Audit Log Encryption Key (DEK)
```

### Key Rotation Schedule

| Key Type | Rotation Period | Method | Notification |
|----------|----------------|--------|--------------|
| KMS CMK | Annual | Automatic (AWS) | CloudWatch alarm |
| Database DEK | Quarterly | Application-managed | Automated job |
| TLS certificates | 90 days | cert-manager / ACM | 30 days before expiry |
| Service mesh certs | 24 hours | Istio automatic | N/A |
| API keys | 90 days | User-initiated | Email notification |
| SSH keys | Annual | Manual | Calendar reminder |

## Hashing Standards

| Use Case | Algorithm | Parameters |
|----------|-----------|-----------|
| Password storage | Argon2id | m=65536, t=3, p=4 |
| API key storage | SHA-256 | With salt |
| Data integrity | SHA-256 | N/A |
| HMAC signatures | HMAC-SHA256 | 256-bit key |
| Content addressing | SHA-256 | N/A |

## Prohibited Algorithms

| Algorithm | Reason | Replacement |
|-----------|--------|-------------|
| MD5 | Collision attacks | SHA-256 |
| SHA-1 | Collision attacks | SHA-256 |
| DES / 3DES | Key size too small | AES-256 |
| RC4 | Multiple vulnerabilities | AES-GCM |
| RSA-1024 | Key size too small | RSA-2048 or ECDSA P-256 |
| Blowfish | Superseded | AES-256 |

## Implementation Checklist

### New Service Deployment

- [ ] TLS certificate provisioned and configured
- [ ] mTLS enabled in service mesh
- [ ] Database connections use TLS
- [ ] Secrets stored in Secrets Manager (not env vars)
- [ ] Encryption at rest enabled for all storage
- [ ] Key rotation configured
- [ ] Certificate expiry monitoring enabled

### Annual Review

- [ ] Review and update cipher suite list
- [ ] Verify all certificates are valid
- [ ] Confirm key rotation is functioning
- [ ] Audit KMS key policies
- [ ] Review and revoke unused keys
- [ ] Update encryption standards for new threats
- [ ] Verify compliance with current regulations
