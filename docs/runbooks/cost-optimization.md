# Cost Optimization Runbook

## Overview

This runbook provides procedures for monitoring, analyzing, and optimizing infrastructure costs for the IDP platform. Target: maintain cost efficiency above 70% while meeting performance SLAs.

## Cost Monitoring

### Daily Checks

1. Review Kubecost dashboard for anomalies
2. Check AWS Cost Explorer for unexpected spikes
3. Verify Spot instance availability and interruption rate

### Weekly Review

1. Analyze namespace-level cost allocation
2. Review right-sizing recommendations
3. Check idle resource waste metrics
4. Verify budget alert thresholds

## Common Optimization Actions

### 1. Right-Size Workloads

**When**: CPU/Memory efficiency < 50% for 7+ days

```bash
# Check current resource utilization
kubectl top pods -n idp-platform --sort-by=cpu

# Get Kubecost recommendations
kubectl port-forward -n kubecost svc/kubecost-cost-analyzer 9090:9090
# Visit http://localhost:9090/savings

# Apply right-sizing (example)
kubectl patch deployment idp-api -n idp-platform --type=json -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/resources/requests/cpu", "value": "150m"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/resources/requests/memory", "value": "192Mi"}
]'
```

### 2. Increase Spot Instance Usage

**When**: Spot coverage < 60% of non-critical workloads

```bash
# Check current Spot vs On-Demand ratio
kubectl get nodes -l node-lifecycle=spot --no-headers | wc -l
kubectl get nodes -l node-lifecycle=on-demand --no-headers | wc -l

# Add Spot tolerations to workloads
kubectl patch deployment idp-api -n idp-platform --type=json -p='[
  {"op": "add", "path": "/spec/template/spec/tolerations/-", "value": {
    "key": "node-lifecycle",
    "operator": "Equal",
    "value": "spot",
    "effect": "NoSchedule"
  }}
]'
```

### 3. Scale Down Non-Production

**When**: Dev/staging environments idle outside business hours

```bash
# Scale down dev environments (automated via CronJob)
kubectl scale deployment --all -n idp-dev --replicas=0

# Scale down staging overnight
kubectl scale deployment --all -n idp-staging --replicas=1
```

### 4. Clean Up Unused Resources

**When**: Monthly cleanup or when waste > $500/month

```bash
# Find unused PVCs
kubectl get pvc -A --no-headers | while read ns name rest; do
  if ! kubectl get pods -n $ns -o json | grep -q $name; then
    echo "Unused PVC: $ns/$name"
  fi
done

# Find idle load balancers
aws elbv2 describe-load-balancers --query 'LoadBalancers[?State.Code==`active`]' | \
  jq -r '.[] | select(.AvailabilityZones | length == 0) | .LoadBalancerArn'

# Delete unused ECR images (keep last 10)
aws ecr describe-repositories --query 'repositories[].repositoryName' --output text | \
  while read repo; do
    aws ecr list-images --repository-name $repo --filter tagStatus=UNTAGGED \
      --query 'imageIds[*]' --output json | \
      jq -r '.[10:] | .[].imageDigest' | \
      while read digest; do
        aws ecr batch-delete-image --repository-name $repo --image-ids imageDigest=$digest
      done
  done
```

### 5. Reserved Instance / Savings Plans

**When**: Stable baseline workload identified (running 24/7 for 3+ months)

| Resource Type | Commitment | Estimated Savings |
|--------------|-----------|-------------------|
| EC2 Compute Savings Plan | 1 year, no upfront | 20-30% |
| EC2 Compute Savings Plan | 3 year, partial upfront | 40-50% |
| RDS Reserved Instance | 1 year, no upfront | 25-35% |
| ElastiCache Reserved | 1 year, no upfront | 25-35% |

## Cost Allocation

### Tagging Strategy

All resources must have these tags:

| Tag | Purpose | Example |
|-----|---------|---------|
| `team` | Cost allocation to team | platform, frontend, backend |
| `service` | Service-level cost tracking | idp-api, idp-portal |
| `environment` | Environment cost separation | production, staging, dev |
| `cost-center` | Finance department mapping | engineering-001 |

### Kubernetes Labels for Cost

```yaml
metadata:
  labels:
    team: platform
    service: idp-api
    environment: production
    cost-center: engineering-001
```

## Budget Alerts

| Alert Level | Threshold | Action |
|------------|-----------|--------|
| Warning | 80% forecasted | Review spending, identify optimization |
| Critical | 100% actual | Immediate review, scale down non-essential |
| Emergency | 120% actual | Executive notification, emergency measures |

## Optimization Targets

| Metric | Target | Current | Action if Below |
|--------|--------|---------|-----------------|
| CPU Efficiency | > 60% | - | Right-size requests |
| Memory Efficiency | > 70% | - | Right-size requests |
| Spot Coverage | > 50% | - | Add Spot tolerations |
| Idle Resources | < $500/mo | - | Clean up unused |
| Cost per Request | < $0.001 | - | Optimize architecture |

## Quarterly Cost Review Agenda

1. Total spend vs budget (trend analysis)
2. Cost per service breakdown
3. Efficiency metrics review
4. Savings plan utilization
5. Spot instance performance
6. Right-sizing recommendations
7. Architecture optimization opportunities
8. Next quarter budget planning
