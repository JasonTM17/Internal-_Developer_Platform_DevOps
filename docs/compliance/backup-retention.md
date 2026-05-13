# Backup and Retention Policy

## Purpose

This policy defines backup strategies, retention periods, and recovery procedures for all IDP platform data to ensure business continuity and regulatory compliance.

## Backup Strategy Overview

| Data Type | Method | Frequency | Retention | RTO | RPO |
|-----------|--------|-----------|-----------|-----|-----|
| PostgreSQL (primary) | Automated snapshots | Continuous (WAL) | 90 days | 15 min | 5 min |
| PostgreSQL (DR) | Cross-region replica | Real-time | 90 days | 15 min | < 1 min |
| Redis cache | RDB snapshots | Every 6 hours | 7 days | 5 min | 6 hours |
| Object storage (S3) | Cross-region replication | Real-time | Per classification | N/A | 0 |
| Kubernetes state | etcd snapshots | Every 1 hour | 30 days | 30 min | 1 hour |
| Configuration | Git repository | On change | Indefinite | 5 min | 0 |
| Audit logs | S3 + Glacier | Continuous | 7 years | 4 hours | 0 |
| Monitoring data | Prometheus TSDB | Continuous | 90 days (hot), 2 years (cold) | 1 hour | 15 min |

## Database Backup

### PostgreSQL

**Continuous Backup (WAL Archiving)**:
- Write-Ahead Log shipped to S3 every 5 minutes
- Point-in-time recovery (PITR) available for last 90 days
- Encrypted with AES-256 (AWS KMS)

**Automated Snapshots**:
- Daily full snapshot at 03:00 UTC
- Retained for 90 days
- Cross-region copy to DR region

**Manual Snapshots**:
- Before major migrations
- Before schema changes
- Retained until explicitly deleted

### Recovery Procedures

```bash
# Point-in-time recovery
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier idp-primary \
  --target-db-instance-identifier idp-recovery \
  --restore-time "2024-01-15T10:30:00Z" \
  --db-instance-class db.r6g.large

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier idp-recovery \
  --db-snapshot-identifier idp-daily-2024-01-15
```

## Object Storage Backup

### S3 Bucket Configuration

| Bucket | Versioning | Replication | Lifecycle |
|--------|-----------|-------------|-----------|
| idp-artifacts | Enabled | Cross-region | 90 days → IA → Glacier |
| idp-audit-logs | Enabled | Cross-region | 7 years → Deep Archive |
| idp-backups | Enabled | Cross-region | 90 days → Glacier |
| idp-user-uploads | Enabled | Cross-region | Per classification |

### Lifecycle Rules

```
Days 0-30:    Standard storage
Days 30-90:   Standard-IA
Days 90-365:  Glacier Instant Retrieval
Days 365+:    Glacier Deep Archive (audit logs only)
```

## Kubernetes State Backup

### etcd Snapshots

- Automated via Velero every 1 hour
- Stored in S3 with encryption
- Cross-region replication enabled
- 30-day retention

### Velero Backup Schedule

```yaml
# Full cluster backup - daily
schedule: "0 2 * * *"
ttl: 720h  # 30 days

# Namespace backup - hourly
schedule: "0 * * * *"
ttl: 168h  # 7 days
includedNamespaces:
  - idp-platform
  - idp-data
```

## Retention Schedule

| Data Category | Hot Storage | Warm Storage | Cold Storage | Total Retention |
|--------------|-------------|--------------|--------------|-----------------|
| Application data | 90 days | 1 year | 7 years | 7 years |
| Audit logs | 90 days | 1 year | 7 years | 7 years |
| Monitoring metrics | 90 days | 2 years | N/A | 2 years |
| Deployment artifacts | 30 days | 90 days | 1 year | 1 year |
| User session data | 24 hours | N/A | N/A | 24 hours |
| Temporary/cache data | As needed | N/A | N/A | 7 days max |
| Security scan results | 90 days | 1 year | 3 years | 3 years |

## Data Deletion

### Secure Deletion Procedures

| Classification | Method | Verification |
|---------------|--------|--------------|
| Public | Standard deletion | None |
| Internal | Versioned delete + lifecycle expiry | Audit log |
| Confidential | Cryptographic erasure (KMS key deletion) | Certificate |
| Restricted | Cryptographic erasure + verification | Certificate + audit |

### Right to Deletion (GDPR)

- PII deletion requests processed within 30 days
- Deletion propagated to all replicas and backups
- Verification report generated
- Audit trail maintained (without PII)

## Testing and Validation

### Monthly Backup Tests

- [ ] Restore database from latest snapshot
- [ ] Verify data integrity post-restore
- [ ] Test PITR to random point in time
- [ ] Validate cross-region replica promotion
- [ ] Restore Kubernetes namespace from Velero backup

### Quarterly DR Drills

- [ ] Full DR failover simulation
- [ ] Measure actual RTO and RPO
- [ ] Validate all backup restoration procedures
- [ ] Update runbooks based on findings

## Monitoring and Alerting

| Alert | Condition | Severity |
|-------|-----------|----------|
| Backup failed | Any backup job fails | P2 |
| Replication lag | > 30 seconds | P3 |
| Replication lag | > 5 minutes | P2 |
| Storage approaching limit | > 80% capacity | P3 |
| Backup age | Latest backup > 25 hours old | P2 |
| Cross-region sync failed | Replication error | P2 |

## Compliance Requirements

| Regulation | Requirement | Implementation |
|-----------|-------------|----------------|
| SOC 2 | Backup procedures documented | This document |
| SOC 2 | Regular backup testing | Monthly tests |
| GDPR | Right to erasure | Deletion procedures |
| GDPR | Data portability | Export functionality |
| PCI DSS | 1-year retention minimum | Lifecycle policies |
| HIPAA | 6-year retention | Extended retention rules |
