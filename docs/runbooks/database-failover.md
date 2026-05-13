# Database Failover Procedure

## Overview

RDS PostgreSQL Multi-AZ provides automatic failover. This runbook covers both automatic and manual failover scenarios.

## Automatic Failover

RDS automatically fails over when:
- Primary instance failure
- AZ outage
- Instance type change
- Software patching
- Manual failover triggered

**Expected downtime**: 60-120 seconds

## Monitoring Failover

### Detect Failover in Progress

```bash
# Check RDS events
aws rds describe-events \
  --source-identifier idp-production \
  --source-type db-instance \
  --duration 60

# Check instance status
aws rds describe-db-instances \
  --db-instance-identifier idp-production \
  --query 'DBInstances[0].{Status:DBInstanceStatus,AZ:AvailabilityZone,MultiAZ:MultiAZ}'
```

### Application Impact

During failover, applications will see:
- Connection refused errors (60-120s)
- DNS propagation delay (up to 30s after failover)

Our connection pooler (PgBouncer) handles reconnection automatically.

## Manual Failover

### When to Trigger Manual Failover

- Primary AZ showing degraded performance
- Planned maintenance requiring AZ switch
- Testing DR procedures

### Procedure

```bash
# 1. Notify team
echo "Initiating manual database failover for idp-production"

# 2. Trigger failover
aws rds reboot-db-instance \
  --db-instance-identifier idp-production \
  --force-failover

# 3. Monitor failover progress
watch -n 5 'aws rds describe-db-instances \
  --db-instance-identifier idp-production \
  --query "DBInstances[0].DBInstanceStatus"'

# 4. Verify new primary
aws rds describe-db-instances \
  --db-instance-identifier idp-production \
  --query 'DBInstances[0].AvailabilityZone'

# 5. Verify application connectivity
kubectl exec -n idp-production deploy/idp-api -- \
  node -e "const pg = require('pg'); const c = new pg.Client(process.env.DATABASE_URL); c.connect().then(() => console.log('Connected')).catch(console.error)"
```

## Read Replica Promotion

If the primary is unrecoverable:

```bash
# 1. Promote read replica to standalone
aws rds promote-read-replica \
  --db-instance-identifier idp-production-replica-1

# 2. Wait for promotion
aws rds wait db-instance-available \
  --db-instance-identifier idp-production-replica-1

# 3. Update application connection string
# Update AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id idp/production/database \
  --secret-string '{"url":"postgresql://...new-endpoint..."}'

# 4. Restart application pods to pick up new connection
kubectl rollout restart deployment/idp-api -n idp-production

# 5. Verify connectivity
kubectl exec -n idp-production deploy/idp-api -- curl -s localhost:3000/health
```

## Post-Failover Verification

```bash
# Check replication status
aws rds describe-db-instances \
  --db-instance-identifier idp-production \
  --query 'DBInstances[0].StatusInfos'

# Verify no data loss (check latest audit log entry)
kubectl exec -n idp-production deploy/idp-api -- \
  curl -s localhost:3000/api/v1/audit/latest

# Check connection pool health
kubectl exec -n idp-production deploy/idp-api -- \
  curl -s localhost:3000/metrics | grep db_pool

# Monitor for elevated error rates (5 minutes)
# Dashboard: https://grafana.internal.idp.example.com/d/database-health
```

## Recovery Time Objectives

| Scenario | RTO | RPO |
|----------|-----|-----|
| Multi-AZ failover | 2 minutes | 0 (synchronous replication) |
| Read replica promotion | 5 minutes | < 5 minutes (async replication lag) |
| Point-in-time recovery | 30 minutes | 5 minutes (continuous backup) |
| Cross-region recovery | 1 hour | < 5 minutes |
