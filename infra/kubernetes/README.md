# Kubernetes Manifests

Base Kubernetes manifests for the Internal Developer Platform cluster configuration.

## Manifest Overview

| Directory | Description |
|-----------|-------------|
| `namespaces/` | Namespace definitions with labels and annotations |
| `rbac/` | Roles, ClusterRoles, and bindings for access control |
| `network-policies/` | Network segmentation and traffic rules |
| `resource-quotas/` | CPU/memory limits per namespace |
| `limit-ranges/` | Default container resource constraints |
| `priority-classes/` | Pod scheduling priority definitions |
| `nats/` | NATS messaging cluster configuration |
| `federation/` | Multi-cluster federation resources |
| `cost/` | Cost allocation and resource tagging |

## Namespace Strategy

Namespaces follow a consistent naming convention:

| Namespace | Purpose |
|-----------|---------|
| `idp-system` | Core platform services |
| `idp-api` | API workloads |
| `idp-portal` | Frontend portal services |
| `idp-monitoring` | Observability stack |
| `idp-jobs` | Background jobs and CronJobs |

Each namespace includes:
- Resource quotas for CPU and memory
- Limit ranges for default container sizing
- Network policies for ingress/egress control
- RBAC bindings for team access

## RBAC Model

Access control follows the principle of least privilege:

| Role | Scope | Permissions |
|------|-------|-------------|
| `platform-admin` | Cluster | Full cluster administration |
| `team-lead` | Namespace | Deploy, scale, view secrets |
| `developer` | Namespace | Deploy, view logs, port-forward |
| `viewer` | Namespace | Read-only access to resources |

## Network Policies

Default deny-all ingress/egress with explicit allow rules:

- Services can only communicate with declared dependencies
- Egress to external services is restricted by namespace
- Monitoring namespace has read access to all namespaces
- Ingress controller namespace allows external traffic

## Resource Quotas per Environment

| Environment | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-------------|-------------|-----------|----------------|--------------|
| Dev | 4 cores | 8 cores | 8Gi | 16Gi |
| Staging | 8 cores | 16 cores | 16Gi | 32Gi |
| Production | 32 cores | 64 cores | 64Gi | 128Gi |

## Applying Manifests

```bash
# Apply all base manifests
kubectl apply -k .

# Apply specific directory
kubectl apply -f namespaces/

# Validate before applying
kubectl apply --dry-run=server -f rbac/
```
