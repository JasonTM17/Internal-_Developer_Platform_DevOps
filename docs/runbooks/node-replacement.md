# EKS Node Replacement

## Overview

Node replacement is needed for:
- Instance health issues
- Kubernetes version upgrades
- Instance type changes
- Security patching (AMI updates)

## Graceful Node Replacement

### Single Node Replacement

```bash
# 1. Identify the node to replace
kubectl get nodes -o wide
NODE_NAME="ip-10-0-16-42.ec2.internal"

# 2. Cordon the node (prevent new pods from scheduling)
kubectl cordon $NODE_NAME

# 3. Drain the node (evict existing pods gracefully)
kubectl drain $NODE_NAME \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=60 \
  --timeout=300s

# 4. Verify pods have been rescheduled
kubectl get pods -n idp-production -o wide | grep -v $NODE_NAME

# 5. Terminate the instance (ASG will replace it)
INSTANCE_ID=$(kubectl get node $NODE_NAME -o jsonpath='{.spec.providerID}' | cut -d'/' -f5)
aws ec2 terminate-instances --instance-ids $INSTANCE_ID

# 6. Wait for new node to join
kubectl get nodes -w

# 7. Verify cluster health
kubectl get nodes
kubectl get pods -n idp-production
```

### Rolling Node Group Update (AMI Update)

```bash
# 1. Update the launch template with new AMI
aws eks update-nodegroup-version \
  --cluster-name idp-production \
  --nodegroup-name platform-nodes \
  --launch-template name=idp-production-nodes,version=\$Latest

# 2. Monitor the rolling update
aws eks describe-update \
  --cluster-name idp-production \
  --nodegroup-name platform-nodes \
  --update-id <update-id>

# 3. Watch nodes being replaced
watch -n 10 'kubectl get nodes -o wide'
```

### Karpenter Node Rotation

If using Karpenter for node provisioning:

```bash
# 1. Trigger node rotation by updating NodePool
kubectl annotate nodepool default karpenter.sh/disruption=rotate

# 2. Monitor rotation
kubectl get nodeclaims
kubectl get nodes -w

# 3. Verify all pods healthy after rotation
kubectl get pods -A --field-selector=status.phase!=Running
```

## Pre-Replacement Checklist

- [ ] Verify PodDisruptionBudgets are configured
- [ ] Confirm sufficient capacity in remaining nodes
- [ ] Check for pods without proper resource requests
- [ ] Verify no single-replica deployments without PDB
- [ ] Notify team in `#platform-ops`

## PodDisruptionBudget Verification

```bash
# Check PDBs exist for critical services
kubectl get pdb -n idp-production

# Expected output:
# NAME          MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS
# idp-api-pdb   2               N/A               4
# idp-portal    1               N/A               2

# If PDB is blocking drain:
kubectl get pdb -n idp-production -o yaml | grep -A5 "status:"
```

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Drain stuck | PDB preventing eviction | Check PDB, scale up first |
| Pod won't reschedule | Node affinity/selector | Check pod spec constraints |
| New node not joining | Security group issue | Check node SG allows cluster API |
| Pods in Pending | Insufficient resources | Scale node group or check resource requests |

## Emergency Node Replacement

If a node is completely unresponsive:

```bash
# 1. Force delete the node object
kubectl delete node $NODE_NAME --force --grace-period=0

# 2. Terminate the EC2 instance
aws ec2 terminate-instances --instance-ids $INSTANCE_ID

# 3. Force delete stuck pods
kubectl get pods -A --field-selector spec.nodeName=$NODE_NAME | \
  awk 'NR>1 {print $1, $2}' | \
  xargs -L1 sh -c 'kubectl delete pod $1 -n $0 --force --grace-period=0'

# 4. Wait for ASG to launch replacement
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names idp-production-nodes
```
