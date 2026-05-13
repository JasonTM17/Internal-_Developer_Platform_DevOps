# Scaling Guide

## Horizontal Pod Autoscaling (HPA)

### Current Configuration

| Service | Min Replicas | Max Replicas | CPU Target | Memory Target |
|---------|-------------|-------------|------------|---------------|
| API (dev) | 1 | 3 | 70% | 80% |
| API (staging) | 2 | 5 | 65% | 75% |
| API (production) | 3 | 20 | 60% | 70% |
| Portal (production) | 2 | 10 | 70% | 80% |

### Manual Scaling

```bash
# Scale API replicas
kubectl scale deployment idp-api -n idp-production --replicas=10

# Update HPA limits
kubectl patch hpa idp-api -n idp-production \
  -p '{"spec":{"maxReplicas":30}}'

# Check current HPA status
kubectl get hpa -n idp-production
kubectl describe hpa idp-api -n idp-production
```

### Custom Metrics Scaling

The API also scales on requests-per-second:

```yaml
metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
```

## Vertical Scaling

### EKS Node Groups

```bash
# Current node group configuration
aws eks describe-nodegroup \
  --cluster-name idp-production \
  --nodegroup-name platform-nodes

# Scale node group
aws eks update-nodegroup-config \
  --cluster-name idp-production \
  --nodegroup-name platform-nodes \
  --scaling-config minSize=3,maxSize=10,desiredSize=6

# Monitor scaling
kubectl get nodes -w
```

### RDS Scaling

```bash
# Vertical scale (causes brief downtime during maintenance window)
aws rds modify-db-instance \
  --db-instance-identifier idp-production \
  --db-instance-class db.r6g.2xlarge \
  --apply-immediately

# Add read replica for read scaling
aws rds create-db-instance-read-replica \
  --db-instance-identifier idp-production-replica-2 \
  --source-db-instance-identifier idp-production \
  --db-instance-class db.r6g.xlarge
```

### Redis Scaling

```bash
# Scale ElastiCache cluster (add shards)
aws elasticache modify-replication-group \
  --replication-group-id idp-production-redis \
  --node-group-count 4 \
  --apply-immediately
```

## Scaling Decision Matrix

| Symptom | Metric | Action |
|---------|--------|--------|
| High CPU on API pods | CPU > 80% sustained | HPA will auto-scale; if at max, increase maxReplicas |
| High memory on API pods | Memory > 85% | Check for memory leaks; increase resource limits |
| Node CPU pressure | Node CPU > 80% | Karpenter will provision new nodes |
| Slow database queries | Query time > 500ms | Add read replica or optimize queries |
| Redis high memory | Memory > 80% | Add shard or increase instance size |
| High request queue | Queue depth > 100 | Scale API pods; check for bottlenecks |

## Capacity Planning

### Current Capacity (Production)

- **API**: 6 pods × 1 vCPU = ~3000 req/s
- **Database**: db.r6g.xlarge = ~5000 connections, 16GB RAM
- **Redis**: 3 shards × 6.38GB = ~19GB cache
- **Storage**: 500GB io2 (16,000 IOPS)

### Growth Projections

| Metric | Current | 6 months | 12 months |
|--------|---------|----------|-----------|
| Teams | 10 | 25 | 50 |
| Services in catalog | 50 | 150 | 300 |
| Deployments/day | 20 | 60 | 150 |
| API requests/min | 5,000 | 15,000 | 40,000 |

### Scaling Triggers

- **Immediate**: Any metric at 80% of capacity
- **Planned**: Projected to hit 70% within 30 days
- **Architecture review**: Projected to hit limits within 90 days
