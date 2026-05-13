# Release Process

This document outlines the release process for the Internal Developer Platform.

## Semantic Versioning

We follow [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR** (`X.0.0`) — Breaking API changes, major architecture shifts
- **MINOR** (`0.X.0`) — New features, backward-compatible additions
- **PATCH** (`0.0.X`) — Bug fixes, security patches, documentation updates

### Pre-release Versions

- Release candidates: `v1.2.0-rc.1`
- Beta releases: `v1.2.0-beta.1`
- Alpha releases: `v1.2.0-alpha.1`

---

## Branch Workflow

```
main (production)
 ├── develop (integration)
 │    ├── feature/* (new features)
 │    └── fix/* (bug fixes)
 ├── release/* (release preparation)
 └── hotfix/* (emergency fixes)
```

### Branch Purposes

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `main` | Production-ready code | Production |
| `develop` | Integration branch | Development |
| `release/*` | Release stabilization | Staging |
| `hotfix/*` | Emergency production fixes | Production |
| `feature/*` | New feature development | Preview |

---

## Release Checklist

### Pre-Release

- [ ] All CI checks pass on the release branch
- [ ] Security scan shows no critical/high vulnerabilities
- [ ] Integration tests pass in staging environment
- [ ] E2E tests pass against staging
- [ ] Performance benchmarks meet SLO targets
- [ ] Database migrations tested and reversible
- [ ] API documentation updated for new/changed endpoints
- [ ] CHANGELOG.md updated with release notes
- [ ] Version bumped in package.json files
- [ ] Architecture Decision Records (ADRs) created for significant changes

### Release Execution

1. **Create release branch** from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/v1.2.0
   ```

2. **Bump version** across all packages:
   ```bash
   pnpm version:bump 1.2.0
   ```

3. **Update CHANGELOG.md** with release notes

4. **Push release branch** and create PR to `main`:
   ```bash
   git push -u origin release/v1.2.0
   gh pr create --base main --title "Release v1.2.0"
   ```

5. **Deploy to staging** (automatic on push to `release/*`)

6. **Run final validation** in staging environment

7. **Merge to main** after approval:
   ```bash
   gh pr merge --squash
   ```

8. **Tag the release**:
   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.2.0 -m "Release v1.2.0"
   git push origin v1.2.0
   ```

9. **Create GitHub Release** (automated via Release Drafter)

10. **Merge back to develop**:
    ```bash
    git checkout develop
    git merge main
    git push origin develop
    ```

### Post-Release

- [ ] Production deployment verified
- [ ] Health checks passing
- [ ] Monitoring dashboards show normal metrics
- [ ] Smoke tests pass in production
- [ ] Team notified via Slack
- [ ] Release notes published

---

## Hotfix Process

For critical production issues that cannot wait for the next release:

1. **Create hotfix branch** from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/v1.2.1
   ```

2. **Apply fix** with tests

3. **Bump patch version**

4. **Create PR to main** with expedited review

5. **Deploy to production** after merge

6. **Merge back to develop**:
   ```bash
   git checkout develop
   git merge main
   git push origin develop
   ```

---

## Rollback Procedure

### Automatic Rollback

The platform automatically rolls back deployments when:
- Health checks fail after deployment
- Error rate exceeds threshold (>5% 5xx responses)
- Latency exceeds SLO targets (p99 > 2s)

### Manual Rollback

#### Via ArgoCD (Preferred)

```bash
# List application history
argocd app history <app-name>

# Rollback to previous version
argocd app rollback <app-name>

# Rollback to specific revision
argocd app rollback <app-name> --revision <revision-number>
```

#### Via Kubernetes

```bash
# View rollout history
kubectl rollout history deployment/<name> -n <namespace>

# Rollback to previous version
kubectl rollout undo deployment/<name> -n <namespace>

# Rollback to specific revision
kubectl rollout undo deployment/<name> -n <namespace> --to-revision=<number>
```

#### Via Terraform (Infrastructure)

```bash
# Revert to previous state
cd infra/terraform
git revert <commit-hash>
terraform plan
terraform apply
```

### Rollback Verification

After any rollback:
1. Verify health checks pass
2. Check error rates return to normal
3. Confirm no data corruption
4. Update incident timeline
5. Notify stakeholders

---

## Changelog Management

### Format

We follow [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [1.2.0] - 2024-03-15

### Added
- New service catalog template system
- Real-time deployment notifications

### Changed
- Improved deployment pipeline performance

### Fixed
- Environment variable injection in preview environments

### Security
- Updated dependencies to patch CVE-2024-XXXX
```

### Automation

- **Release Drafter** automatically generates draft release notes from PR labels
- **Conventional Commits** are parsed to categorize changes
- **GitHub Releases** are created automatically on tag push

---

## Release Schedule

| Type | Frequency | Day |
|------|-----------|-----|
| Major | Quarterly | First Monday of quarter |
| Minor | Bi-weekly | Tuesday |
| Patch | As needed | Any day |
| Hotfix | Immediate | Any day |
