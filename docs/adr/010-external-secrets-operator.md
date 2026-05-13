# ADR-010: External Secrets Operator

## Status

Accepted

## Date

2024-02-12

## Context

Kubernetes applications need access to secrets (database credentials, API keys, TLS certificates). We need a secure way to manage secrets that:

- Doesn't store secrets in Git (even encrypted)
- Supports rotation without pod restarts
- Integrates with our existing secret stores (AWS Secrets Manager, Vault)
- Works with ArgoCD GitOps workflow

Options:
1. **Sealed Secrets** - Encrypt secrets in Git, decrypt in cluster
2. **External Secrets Operator (ESO)** - Sync from external stores
3. **Vault Agent Injector** - Sidecar-based secret injection
4. **SOPS + ArgoCD** - Mozilla SOPS encryption in Git

## Decision

We will use **External Secrets Operator (ESO)** to sync secrets from AWS Secrets Manager and HashiCorp Vault into Kubernetes.

## Rationale

### Why ESO?

- **No secrets in Git**: Only references (ExternalSecret CRDs) are stored in Git
- **Multi-backend**: Supports AWS Secrets Manager, Vault, GCP Secret Manager
- **Auto-rotation**: Polls for changes and updates Kubernetes secrets automatically
- **GitOps compatible**: ExternalSecret manifests are declarative and safe to commit
- **Namespace isolation**: ClusterSecretStore for shared secrets, SecretStore for team-scoped

### Why not Sealed Secrets?

- Encrypted blobs in Git are still a risk if encryption key is compromised
- No automatic rotation
- Requires re-encryption on key rotation
- Single point of failure (controller holds decryption key)

### Why not Vault Agent?

- Sidecar adds resource overhead to every pod
- More complex pod specifications
- Application must handle file-based secret consumption
- Harder to debug secret injection issues

## Architecture

```
AWS Secrets Manager / Vault
         │
         ▼
┌─────────────────────┐
│  External Secrets   │
│  Operator           │
│  (ClusterSecretStore)│
└─────────┬───────────┘
          │ sync
          ▼
┌─────────────────────┐
│  Kubernetes Secret  │
│  (auto-created)     │
└─────────┬───────────┘
          │ mount
          ▼
┌─────────────────────┐
│  Application Pod    │
│  (env vars / files) │
└─────────────────────┘
```

## Example

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: idp-api-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: idp-api-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: idp/production/database
        property: url
    - secretKey: JWT_SECRET
      remoteRef:
        key: idp/production/auth
        property: jwt_secret
```

## Consequences

### Positive

- Zero secrets in Git repository
- Automatic rotation without application changes
- Centralized secret management
- Audit trail in AWS CloudTrail / Vault audit log
- Works seamlessly with ArgoCD

### Negative

- Additional operator to maintain in cluster
- Dependency on external secret store availability
- Slight delay in secret propagation (refresh interval)
- Requires IAM/IRSA configuration for authentication
