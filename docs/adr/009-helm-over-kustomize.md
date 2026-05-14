# ADR-009: Helm over Kustomize

## Status

Accepted

## Date

2026-02-10

## Context

We need a Kubernetes manifest management tool for packaging and deploying the IDP services across multiple environments. Options:

1. **Helm** - Template-based package manager
2. **Kustomize** - Patch-based overlay system
3. **Helm + Kustomize** - Combined approach

## Decision

We will use **Helm** as the primary manifest management tool.

## Rationale

### Why Helm?

- **Parameterization**: Values files per environment (values-dev.yaml, values-staging.yaml, values-production.yaml)
- **Release management**: Helm tracks releases with revision history, enabling `helm rollback`
- **Chart dependencies**: Sub-charts for common patterns (e.g., standard microservice chart)
- **Ecosystem**: Vast library of community charts for infrastructure components
- **ArgoCD integration**: First-class Helm support in ArgoCD Applications
- **Lifecycle hooks**: Pre/post install/upgrade hooks for migrations

### Why not Kustomize?

- No native release tracking (relies on Git history)
- Patch-based approach becomes complex with many environment differences
- No equivalent to Helm hooks for deployment lifecycle
- Less suitable for packaging reusable components

### Why not both?

- Added complexity without proportional benefit at our scale
- Team cognitive load of two systems
- ArgoCD handles both but Helm-only is simpler to reason about

## Chart Structure

```
infra/helm/idp-platform/
├── Chart.yaml
├── values.yaml           # Defaults
├── values-dev.yaml       # Dev overrides
├── values-staging.yaml   # Staging overrides
├── values-production.yaml # Production overrides
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── pdb.yaml
│   ├── networkpolicy.yaml
│   └── serviceaccount.yaml
└── charts/               # Sub-chart dependencies
```

## Consequences

### Positive

- Single tool for all manifest management
- Clear environment differentiation via values files
- Release history and rollback capability
- Reusable chart for all IDP services

### Negative

- Go templating syntax can be verbose
- Debugging rendered templates requires `helm template`
- Chart versioning adds maintenance overhead
