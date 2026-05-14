# ADR-006: Event-Driven Deployment Pipeline

## Status

Accepted

## Date

2026-02-01

## Context

The deployment pipeline needs to coordinate multiple stages (build, test, scan, deploy, verify) across environments. We need to decide between:

1. **Synchronous pipeline** - Linear execution within a single CI job
2. **Event-driven pipeline** - Loosely coupled stages triggered by events

## Decision

We will implement an **event-driven deployment pipeline** where each stage emits events that trigger subsequent stages.

## Architecture

```
Git Push → CI Build → Image Push Event → Security Scan
                                       → Deploy to Dev Event
                                              → Smoke Test Event
                                                    → Promote to Staging Event
                                                          → E2E Test Event
                                                                → Ready for Production
```

## Event Types

| Event              | Trigger              | Consumers                         |
| ------------------ | -------------------- | --------------------------------- |
| `build.completed`  | CI build success     | Security scanner, artifact store  |
| `image.pushed`     | Docker push to ECR   | Vulnerability scanner, deploy-dev |
| `scan.passed`      | Security scan clean  | Deployment gate                   |
| `deploy.completed` | Helm release success | Smoke tests, notifications        |
| `tests.passed`     | All tests green      | Environment promotion             |
| `approval.granted` | Manual approval      | Production deploy                 |

## Implementation

- **GitHub Actions** workflows trigger on `workflow_run` completion events
- **ArgoCD** notifications trigger on sync status changes
- **SNS/SQS** for cross-service event propagation
- **GitHub Deployments API** for deployment status tracking

## Consequences

### Positive

- Each stage is independently retryable
- Parallel execution where possible (scan + deploy simultaneously)
- Clear audit trail of pipeline progression
- Easy to add new stages without modifying existing ones
- Faster feedback (don't wait for full pipeline to get partial results)

### Negative

- More complex debugging (distributed pipeline state)
- Eventual consistency between stages
- Requires event schema versioning
- More GitHub Actions workflows to maintain
