# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the Internal Developer Platform.

## What is an ADR?

An ADR is a document that captures an important architectural decision made along with its context and consequences. ADRs are immutable once accepted - if a decision is reversed, a new ADR is created.

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](./001-monorepo-structure.md) | Monorepo Structure with Turborepo | Accepted | 2024-01-15 |
| [002](./002-typescript-strict.md) | TypeScript Strict Mode | Accepted | 2024-01-15 |
| [003](./003-gitops-argocd.md) | GitOps with ArgoCD | Accepted | 2024-01-20 |
| [004](./004-eks-over-ecs.md) | EKS over ECS | Accepted | 2024-01-22 |
| [005](./005-postgresql-primary-db.md) | PostgreSQL as Primary Database | Accepted | 2024-01-25 |
| [006](./006-event-driven-deployments.md) | Event-Driven Deployment Pipeline | Accepted | 2024-02-01 |
| [007](./007-rbac-team-scoped.md) | Team-Scoped RBAC | Accepted | 2024-02-05 |
| [008](./008-audit-hash-chain.md) | Hash Chain Audit Integrity | Accepted | 2024-02-08 |
| [009](./009-helm-over-kustomize.md) | Helm over Kustomize | Accepted | 2024-02-10 |
| [010](./010-external-secrets-operator.md) | External Secrets Operator | Accepted | 2024-02-12 |

## Creating a New ADR

Use the template below:

```markdown
# ADR-NNN: Title

## Status
Proposed | Accepted | Deprecated | Superseded by [ADR-XXX]

## Date
YYYY-MM-DD

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult to do because of this change?
```

## Principles

1. **Immutable**: Once accepted, ADRs are not modified (create a new one to supersede)
2. **Concise**: Focus on the decision, not the implementation details
3. **Contextual**: Include enough context for future readers to understand the "why"
4. **Consequential**: Document both positive and negative consequences
