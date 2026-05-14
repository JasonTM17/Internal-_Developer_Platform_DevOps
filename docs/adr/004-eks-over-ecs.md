# ADR-004: EKS over ECS

## Status

Accepted

## Date

2026-01-22

## Context

We need a container orchestration platform for running the IDP services. The primary options on AWS are:

1. **Amazon EKS** (Managed Kubernetes)
2. **Amazon ECS** (AWS-native container orchestration)
3. **ECS on Fargate** (Serverless containers)

## Decision

We will use **Amazon EKS** (Elastic Kubernetes Service) as our container orchestration platform.

## Rationale

### Why EKS?

- **Ecosystem**: Rich ecosystem of tools (ArgoCD, Prometheus, Istio, OPA) designed for Kubernetes
- **GitOps compatibility**: ArgoCD and Flux are Kubernetes-native
- **Portability**: Kubernetes workloads are portable across clouds (future multi-cloud option)
- **Custom controllers**: CRDs and operators for platform-specific automation
- **Network policies**: Fine-grained pod-to-pod network segmentation
- **RBAC**: Kubernetes RBAC + AWS IAM integration (IRSA)

### Why not ECS?

- Limited ecosystem for GitOps tooling
- No equivalent to Kubernetes CRDs for extensibility
- Vendor lock-in to AWS
- Less mature service mesh options
- No native equivalent to network policies

### Why not Fargate?

- Higher per-vCPU cost at our scale
- Cold start latency for infrequent workloads
- Limited control over node configuration
- No DaemonSets (needed for monitoring agents)

## Configuration

- **Kubernetes version**: 1.28 (latest stable)
- **Node groups**: Managed node groups with m6i.xlarge instances
- **Networking**: VPC-CNI with prefix delegation
- **Add-ons**: CoreDNS, kube-proxy, VPC-CNI, EBS CSI driver
- **Authentication**: OIDC provider + IRSA for pod-level IAM

## Consequences

### Positive

- Full Kubernetes ecosystem available
- Strong community support and documentation
- Portable workload definitions
- Advanced scheduling and autoscaling (Karpenter)

### Negative

- Higher operational complexity than ECS
- Kubernetes version upgrades require planning
- Steeper learning curve for developers
- Control plane cost ($0.10/hr per cluster)

## Cost Comparison (estimated monthly)

| Component         | EKS  | ECS  | Fargate |
| ----------------- | ---- | ---- | ------- |
| Control plane     | $73  | $0   | $0      |
| Compute (6 nodes) | $780 | $780 | $1,200  |
| Total             | $853 | $780 | $1,200  |

EKS is slightly more expensive than ECS but the ecosystem benefits justify the cost.
