# Change Management Process

## Purpose

This document defines the change management process for the IDP platform, ensuring all changes are properly reviewed, tested, approved, and documented before deployment to production.

## Change Categories

### Standard Changes

Pre-approved, low-risk changes that follow established procedures.

| Type | Examples | Approval | Lead Time |
|------|----------|----------|-----------|
| Dependency update (patch) | npm patch updates | Automated | Immediate |
| Config change (non-prod) | Dev/staging env vars | 1 reviewer | < 1 hour |
| Documentation update | README, runbooks | 1 reviewer | < 1 hour |
| Feature flag toggle | Enable/disable flags | Team lead | < 30 min |

### Normal Changes

Changes requiring standard review and approval process.

| Type | Examples | Approval | Lead Time |
|------|----------|----------|-----------|
| Feature deployment | New API endpoint | 2 reviewers + CI pass | 1-3 days |
| Infrastructure change | Terraform modifications | 2 reviewers + plan review | 2-5 days |
| Dependency update (minor) | npm minor updates | 1 reviewer + security scan | 1-2 days |
| Configuration change (prod) | Production env vars | 2 reviewers + team lead | 1-2 days |

### Emergency Changes

Critical fixes requiring expedited process.

| Type | Examples | Approval | Lead Time |
|------|----------|----------|-----------|
| Security patch | CVE remediation | Security team + 1 reviewer | < 4 hours |
| Production hotfix | Critical bug fix | Team lead + on-call SRE | < 2 hours |
| Incident response | Service restoration | On-call authority | Immediate |

## Change Process Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Request   │────▶│    Review    │────▶│   Approve   │
└─────────────┘     └──────────────┘     └─────────────┘
                                                │
┌─────────────┐     ┌──────────────┐           │
│   Close     │◀────│   Deploy     │◀──────────┘
└─────────────┘     └──────────────┘
```

### 1. Request

- Create Pull Request with description of change
- Fill in PR template (what, why, how, testing)
- Link to related issues/tickets
- Assign appropriate reviewers based on CODEOWNERS

### 2. Review

- Code review by required reviewers
- Automated checks must pass:
  - CI pipeline (lint, test, build)
  - Security scanning (Trivy, CodeQL)
  - Terraform plan (for infra changes)
  - License compliance check
- Manual review checklist:
  - [ ] Change is scoped appropriately
  - [ ] Tests cover new functionality
  - [ ] Documentation updated
  - [ ] No secrets in code
  - [ ] Backward compatible (or migration plan)

### 3. Approve

- Minimum approvals met (per change category)
- All CI checks passing
- No unresolved review comments
- Change window confirmed (if applicable)

### 4. Deploy

- Merge to main branch triggers deployment pipeline
- Progressive delivery via canary (Flagger)
- Automated rollback on failure
- Deployment verification tests run

### 5. Close

- Verify deployment successful
- Update change record
- Notify stakeholders
- Close related tickets

## Deployment Pipeline

```
PR Merge → Build → Security Scan → Deploy Dev → Integration Tests
    → Deploy Staging → E2E Tests → Canary Production → Full Production
```

### Rollback Criteria

Automatic rollback triggers:
- Error rate > 1% (5xx responses)
- P99 latency > 2x baseline
- Health check failures > 3 consecutive
- Canary analysis score < threshold

### Change Windows

| Environment | Window | Restrictions |
|------------|--------|-------------|
| Development | 24/7 | None |
| Staging | Business hours | None |
| Production | Mon-Thu 9AM-4PM UTC | No deploys during peak |
| Production (emergency) | 24/7 | Requires on-call approval |

## Change Freeze Periods

| Period | Duration | Exceptions |
|--------|----------|-----------|
| End of quarter | Last 3 business days | Security patches only |
| Major holidays | Company-defined | P1 incidents only |
| After major release | 48 hours | Critical fixes only |

## Audit Trail

All changes are tracked via:
- **Git history**: Full commit and PR history
- **ArgoCD**: Deployment sync history
- **Audit logger**: API-level change tracking
- **CloudTrail**: Infrastructure change audit
- **Terraform state**: Infrastructure state history

## Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Change lead time | < 24 hours | PR open to production |
| Change failure rate | < 5% | Rollbacks / total deploys |
| MTTR | < 1 hour | Time to restore service |
| Deployment frequency | Daily | Deploys per day |

## Responsibilities

| Role | Responsibility |
|------|---------------|
| Developer | Create PR, respond to reviews, verify deployment |
| Reviewer | Review code, approve/request changes |
| Team Lead | Approve production changes, manage change windows |
| SRE | Monitor deployments, manage rollbacks |
| Security | Review security-sensitive changes |
| Change Manager | Oversee process compliance, report metrics |
