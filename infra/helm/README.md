# Helm Charts

Helm charts for deploying the Internal Developer Platform services.

## Chart Overview

| Chart | Description | Version |
|-------|-------------|---------|
| `idp-platform` | Umbrella chart for full platform deployment | 1.0.0 |
| `idp-api` | Backend API service | 1.0.0 |
| `idp-portal` | Frontend portal application | 1.0.0 |

## Prerequisites

- Helm >= 3.12
- Kubernetes cluster >= 1.27
- `kubectl` configured with cluster access
- Container images pushed to ECR

## Installation

### Full Platform (Umbrella Chart)

```bash
# Add dependencies
helm dependency update infra/helm/idp-platform

# Install with default values
helm install idp infra/helm/idp-platform -n idp-system --create-namespace

# Install with environment-specific values
helm install idp infra/helm/idp-platform \
  -n idp-system \
  --create-namespace \
  -f infra/helm/idp-platform/values-production.yaml
```

### Individual Services

```bash
# API only
helm install idp-api infra/helm/idp-api -n idp-api --create-namespace

# Portal only
helm install idp-portal infra/helm/idp-portal -n idp-portal --create-namespace
```

## Values Configuration

Key configuration values for `idp-platform`:

| Value | Default | Description |
|-------|---------|-------------|
| `global.environment` | `dev` | Target environment |
| `global.domain` | `idp.internal` | Base domain for ingress |
| `api.replicas` | `2` | API pod replicas |
| `api.image.tag` | `latest` | API container image tag |
| `portal.replicas` | `2` | Portal pod replicas |
| `portal.image.tag` | `latest` | Portal container image tag |
| `ingress.enabled` | `true` | Enable ingress resources |
| `ingress.tls` | `true` | Enable TLS termination |

## Upgrade Procedures

```bash
# Diff changes before upgrading
helm diff upgrade idp infra/helm/idp-platform -n idp-system -f values-production.yaml

# Upgrade with atomic rollback on failure
helm upgrade idp infra/helm/idp-platform \
  -n idp-system \
  --atomic \
  --timeout 10m \
  -f values-production.yaml

# Rollback to previous release
helm rollback idp -n idp-system
```

## Chart Development

```bash
# Lint chart
helm lint infra/helm/idp-platform

# Template locally (dry-run)
helm template idp infra/helm/idp-platform -n idp-system

# Package chart
helm package infra/helm/idp-platform
```
