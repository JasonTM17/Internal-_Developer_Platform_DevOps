# Disaster Recovery Procedures

## DR Strategy Overview

| Component       | Strategy                        | RPO               | RTO    |
| --------------- | ------------------------------- | ----------------- | ------ |
| EKS Cluster     | Multi-AZ + DR region            | 0                 | 15 min |
| RDS PostgreSQL  | Multi-AZ + Cross-region replica | < 5 min           | 30 min |
| Redis           | Multi-AZ cluster                | 0 (cache rebuild) | 5 min  |
| S3 Data         | Cross-region replication        | < 15 min          | 5 min  |
| Secrets (Vault) | Cross-region replication        | < 1 min           | 10 min |
| DNS             | Route 53 health checks          | N/A               | 60 sec |

## Scenario 1: Single AZ Failure

**Impact**: Partial capacity reduction, automatic recovery

### Automatic Response

- EKS: Pods rescheduled to healthy AZs (< 2 min)
- RDS: Automatic failover to standby (< 2 min)
- Redis: Replica promotion (< 30 sec)
- ALB: Health checks remove unhealthy targets (< 30 sec)

### Manual Verification

```bash
# Check node distribution
kubectl get nodes -o wide | awk '{print $7}' | sort | uniq -c

# Verify pod distribution
kubectl get pods -n idp-production -o wide | awk '{print $7}' | sort | uniq -c

# Check RDS AZ
aws rds describe-db-instances --db-instance-identifier idp-production \
  --query 'DBInstances[0].AvailabilityZone'
```

## Scenario 2: Full Region Failure

**Impact**: Complete outage until DR region activated

### Activation Procedure (RTO: 30 minutes)

```bash
# 1. Confirm region failure (check AWS Health Dashboard)
aws health describe-events --region us-east-1

# 2. Activate DR region (us-west-2)
# Update Route 53 to point to DR region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.idp.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z0987654321",
          "DNSName": "dr-alb.us-west-2.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# 3. Promote DR database
aws rds promote-read-replica \
  --db-instance-identifier idp-dr-replica \
  --region us-west-2

# 4. Scale up DR EKS cluster
aws eks update-nodegroup-config \
  --cluster-name idp-dr \
  --nodegroup-name platform-nodes \
  --scaling-config minSize=3,maxSize=10,desiredSize=6 \
  --region us-west-2

# 5. Update ArgoCD to sync DR applications
argocd app sync idp-api-dr --force

# 6. Verify DR services
curl -sf https://api.idp.example.com/health
curl -sf https://api.idp.example.com/ready
```

## Scenario 3: Data Corruption

**Impact**: Data integrity compromised

### Point-in-Time Recovery

```bash
# 1. Identify corruption timestamp
# Check audit logs and application logs for anomalies

# 2. Create point-in-time restore
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier idp-production \
  --target-db-instance-identifier idp-production-pitr \
  --restore-time "2026-01-15T10:30:00Z" \
  --db-instance-class db.r6g.xlarge

# 3. Verify restored data
# Connect to restored instance and validate

# 4. Swap application to restored database
# Update Secrets Manager with new endpoint
aws secretsmanager update-secret \
  --secret-id idp/production/database \
  --secret-string '{"url":"postgresql://...pitr-endpoint..."}'

# 5. Restart applications
kubectl rollout restart deployment/idp-api -n idp-production
```

## DR Testing Schedule

| Test Type                   | Frequency | Last Tested | Next Test  |
| --------------------------- | --------- | ----------- | ---------- |
| AZ failover simulation      | Monthly   | 2026-01-10  | 2026-02-10 |
| Database failover           | Monthly   | 2026-01-15  | 2026-02-15 |
| Full DR activation          | Quarterly | 2026-01-01  | 2026-04-01 |
| Backup restore verification | Weekly    | Automated   | Automated  |

## Communication During DR

1. Post in `#platform-incidents`: "DR activation in progress"
2. Update status page: "Service degraded - activating disaster recovery"
3. Notify stakeholders via email
4. Post updates every 10 minutes until resolved
