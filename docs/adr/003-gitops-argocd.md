# ADR-003: GitOps with ArgoCD

## Status

Accepted

## Date

2024-01-20

## Context

We need a deployment strategy that provides:
- Declarative infrastructure and application state
- Full audit trail of all changes
- Easy rollback capabilities
- Multi-environment promotion
- Self-healing capabilities

Options considered:
1. **Push-based CI/CD** (GitHub Actions deploys directly to clusters)
2. **Pull-based GitOps with ArgoCD**
3. **Pull-based GitOps with Flux**

## Decision

We will use **ArgoCD** as our GitOps operator for Kubernetes deployments.

## Rationale

### Why GitOps?

- **Single source of truth**: Git repository defines desired cluster state
- **Audit trail**: Every change is a Git commit with author, timestamp, and diff
- **Drift detection**: ArgoCD continuously reconciles actual vs desired state
- **Rollback**: `git revert` is a deployment rollback
- **Security**: No cluster credentials in CI pipelines

### Why ArgoCD over Flux?

- Superior web UI for deployment visualization
- ApplicationSet for multi-cluster/multi-env management
- Better RBAC model (project-scoped access)
- Larger community and ecosystem (Argo Rollouts for canary/blue-green)
- Sync waves and hooks for ordered deployments

## Architecture

```
GitHub Repo (manifests)
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  ArgoCD      │────►│  EKS Dev     │     │  EKS Staging │
│  (Control)   │────►│              │     │              │
│              │────►│              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                          ┌─────┴──────┐
                                          │ EKS Prod   │
                                          └────────────┘
```

## Promotion Strategy

1. **Dev**: Auto-sync on commit to `develop` branch
2. **Staging**: Auto-sync on commit to `release/*` branches
3. **Production**: Manual sync with approval gate

## Consequences

### Positive

- Declarative, version-controlled deployments
- Self-healing (auto-corrects drift)
- Clear separation of CI (build) and CD (deploy)
- Multi-cluster management from single control plane

### Negative

- Additional infrastructure component to maintain
- Learning curve for teams unfamiliar with GitOps
- Secrets management requires additional tooling (External Secrets Operator)
- Debugging sync issues can be complex
