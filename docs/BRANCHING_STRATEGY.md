# Branching Strategy

This document defines the Git branching strategy for the Internal Developer Platform, adapted from GitFlow for GitOps-driven continuous delivery.

## Overview

Our branching model is designed to support:
- Continuous integration on `develop`
- Stable releases via `release/*` branches
- GitOps-driven deployments via ArgoCD
- Emergency hotfixes with minimal disruption

---

## Branch Types

### Long-Lived Branches

| Branch | Purpose | Protection | Deploys To |
|--------|---------|------------|------------|
| `main` | Production-ready code | Required reviews, status checks | Production |
| `develop` | Integration branch | Required reviews | Development |

### Short-Lived Branches

| Pattern | Purpose | Base Branch | Merges Into |
|---------|---------|-------------|-------------|
| `feature/*` | New features | `develop` | `develop` |
| `fix/*` | Bug fixes | `develop` | `develop` |
| `hotfix/*` | Emergency fixes | `main` | `main` + `develop` |
| `release/*` | Release prep | `develop` | `main` + `develop` |
| `docs/*` | Documentation | `develop` | `develop` |
| `refactor/*` | Code refactoring | `develop` | `develop` |
| `test/*` | Test additions | `develop` | `develop` |

---

## Branch Naming Conventions

### Format

```
<type>/<ticket-id>-<short-description>
```

### Examples

```
feature/IDP-123-service-catalog-templates
fix/IDP-456-deployment-timeout
hotfix/IDP-789-auth-bypass
release/v1.2.0
docs/IDP-101-api-reference
refactor/IDP-202-extract-deployment-service
```

### Rules

- Use lowercase letters, numbers, and hyphens only
- Keep descriptions concise (3-5 words)
- Include ticket/issue ID when applicable
- No spaces or special characters

---

## GitOps Integration

### How Branches Map to Environments

```
feature/* ──→ Preview Environment (ephemeral)
     │
     ▼
develop ────→ Development Environment (persistent)
     │
     ▼
release/* ──→ Staging Environment (persistent)
     │
     ▼
main ───────→ Production Environment (persistent)
```

### ArgoCD Application Sets

Each environment is managed by ArgoCD ApplicationSets that watch specific branches:

```yaml
# ArgoCD watches these branch patterns:
- main      → production overlay
- develop   → development overlay
- release/* → staging overlay
```

### Preview Environments

Feature branches automatically get ephemeral preview environments:
- Created on PR open
- Updated on each push
- Destroyed on PR close/merge
- Accessible via `preview-<pr-number>.dev.idp.internal`

---

## Pull Request Requirements

### Required for All PRs

- [ ] At least 1 approving review
- [ ] All CI status checks pass (lint, test, build, security)
- [ ] No merge conflicts
- [ ] Branch is up-to-date with target branch
- [ ] Conventional commit message format

### Additional Requirements by Target

#### PRs to `main`

- [ ] 2 approving reviews (including 1 from CODEOWNERS)
- [ ] All integration tests pass
- [ ] Security scan shows no new vulnerabilities
- [ ] Performance benchmarks within SLO targets
- [ ] Release notes prepared

#### PRs to `develop`

- [ ] 1 approving review
- [ ] Unit tests pass
- [ ] Lint and type checks pass
- [ ] No decrease in code coverage

### PR Size Guidelines

| Size | Lines Changed | Review Time |
|------|--------------|-------------|
| XS | < 50 | < 30 min |
| S | 50-200 | < 1 hour |
| M | 200-500 | < 2 hours |
| L | 500-1000 | < 4 hours |
| XL | > 1000 | Split recommended |

---

## Merge Strategies

### Feature → Develop

**Strategy:** Squash and merge

```bash
# Squash all commits into a single meaningful commit
gh pr merge --squash --subject "feat(catalog): add service template system (#123)"
```

**Rationale:** Keeps `develop` history clean with one commit per feature.

### Release → Main

**Strategy:** Merge commit (no squash)

```bash
# Create a merge commit to preserve release history
gh pr merge --merge --subject "Release v1.2.0"
```

**Rationale:** Preserves the full release context and makes rollbacks easier.

### Hotfix → Main

**Strategy:** Merge commit

```bash
gh pr merge --merge --subject "hotfix: fix authentication bypass (#789)"
```

### Main → Develop (Back-merge)

**Strategy:** Merge commit

```bash
git checkout develop
git merge main --no-ff -m "chore: merge main into develop after release v1.2.0"
git push origin develop
```

---

## Workflow Diagrams

### Feature Development

```
1. Create branch from develop
   git checkout develop && git pull
   git checkout -b feature/IDP-123-new-feature

2. Develop with regular commits
   git commit -m "feat(module): implement feature part 1"
   git commit -m "feat(module): implement feature part 2"

3. Push and create PR
   git push -u origin feature/IDP-123-new-feature
   gh pr create --base develop

4. Address review feedback
   git commit -m "fix: address review comments"
   git push

5. Merge (squash) after approval
   gh pr merge --squash
```

### Release Process

```
1. Create release branch
   git checkout develop && git pull
   git checkout -b release/v1.2.0

2. Stabilize (bug fixes only)
   git commit -m "fix: resolve edge case in deployment"

3. Deploy to staging (automatic)

4. Create PR to main
   gh pr create --base main --title "Release v1.2.0"

5. Merge after validation
   gh pr merge --merge

6. Tag release
   git tag -a v1.2.0 -m "Release v1.2.0"
   git push origin v1.2.0

7. Back-merge to develop
   git checkout develop && git merge main
```

### Hotfix Process

```
1. Create hotfix branch from main
   git checkout main && git pull
   git checkout -b hotfix/IDP-789-critical-fix

2. Apply fix with tests
   git commit -m "fix: resolve critical auth issue"

3. Create PR to main (expedited review)
   gh pr create --base main --title "hotfix: fix auth bypass"

4. Merge and deploy
   gh pr merge --merge

5. Back-merge to develop
   git checkout develop && git merge main
```

---

## Branch Protection Rules

### `main` Branch

```yaml
protection_rules:
  required_reviews: 2
  dismiss_stale_reviews: true
  require_code_owner_review: true
  required_status_checks:
    - "CI"
    - "Security Scan"
    - "Integration Tests"
  enforce_admins: true
  restrict_pushes: true
  allow_force_pushes: false
  allow_deletions: false
```

### `develop` Branch

```yaml
protection_rules:
  required_reviews: 1
  dismiss_stale_reviews: true
  required_status_checks:
    - "CI"
  enforce_admins: false
  allow_force_pushes: false
  allow_deletions: false
```

---

## Conflict Resolution

### Prevention

- Keep feature branches short-lived (< 1 week)
- Regularly rebase on `develop`:
  ```bash
  git checkout feature/my-feature
  git fetch origin
  git rebase origin/develop
  ```
- Communicate with team about overlapping work

### Resolution Steps

1. Pull latest target branch
2. Rebase your branch on target
3. Resolve conflicts locally
4. Run tests to verify resolution
5. Force-push the rebased branch
6. Request re-review if significant changes

---

## Best Practices

1. **Keep branches short-lived** — Merge within 1-3 days
2. **Commit often** — Small, atomic commits are easier to review
3. **Write meaningful commit messages** — Follow conventional commits
4. **Delete merged branches** — Keep the repository clean
5. **Never force-push shared branches** — Only force-push your own feature branches
6. **Rebase before merge** — Keep history linear where possible
7. **Use draft PRs** — Signal work-in-progress early for feedback
