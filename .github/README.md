# GitHub Actions Workflows

CI/CD pipeline configuration for the Internal Developer Platform.

## Workflow Overview

| Workflow          | File                     | Trigger                               | Description                                 |
| ----------------- | ------------------------ | ------------------------------------- | ------------------------------------------- |
| CI                | `ci.yaml`                | Push, PR                              | Lint, typecheck, test, build, security scan |
| Docker Build      | `docker-build.yaml`      | Tags `v*`, Dockerfile changes, manual | Multi-service container builds to GHCR      |
| Security Scan     | `security-scan.yaml`     | Weekly + manual                       | Trivy, Snyk, CodeQL, TruffleHog, Gitleaks   |
| Release           | `release.yaml`           | Tags `v*`                             | Semantic release with changelog             |
| Release Drafter   | `release-drafter.yaml`   | Push to main                          | Auto-draft release notes from PR labels     |
| CD Development    | `cd-dev.yaml`            | Push to `develop`                     | Auto-deploy to dev environment              |
| CD Staging        | `cd-staging.yaml`        | Push to `release/*`                   | Deploy to staging with integration tests    |
| CD Production     | `cd-production.yaml`     | Manual approval                       | Blue-green deploy with canary analysis      |
| Terraform Plan    | `terraform-plan.yaml`    | PR with infra changes                 | Preview infrastructure changes              |
| Terraform Apply   | `terraform-apply.yaml`   | Merge to main                         | Apply approved infrastructure changes       |
| Compliance Audit  | `compliance-audit.yaml`  | Weekly                                | License check, SBOM generation              |
| Dependency Review | `dependency-review.yaml` | PR                                    | Check for vulnerable dependencies           |
| Stale Issues      | `stale.yaml`             | Daily                                 | Auto-close stale issues/PRs                 |
| Label Sync        | `label-sync.yaml`        | Push to main                          | Sync GitHub labels from config              |

## Required Secrets

| Secret                | Description                             | Used By       |
| --------------------- | --------------------------------------- | ------------- |
| `GITHUB_TOKEN`        | Auto-provided by GitHub                 | All workflows |
| `AWS_DEPLOY_ROLE_ARN` | IAM role for AWS deployments            | CD, Terraform |
| `AWS_ACCOUNT_ID`      | AWS account ID for ECR                  | Docker Build  |
| `SNYK_TOKEN`          | Snyk vulnerability scanning             | Security Scan |
| `SLACK_WEBHOOK_URL`   | Slack notification webhook              | Notifications |
| `NPM_TOKEN`           | npm publish token                       | Release       |
| `BOT_PAT`             | PAT for triggering workflows (optional) | Release       |
| `CODECOV_TOKEN`       | Code coverage upload                    | CI            |

## CI Pipeline Architecture

```
Push/PR → Detect Changes → Lint & Format ─┐
                         → Test (with DB) ─┼→ Build → Upload Artifacts
                         → Security Scan  ─┘
```

## Adding New Workflows

1. Create a new `.yaml` file in `.github/workflows/`
2. Define trigger events (`on:`)
3. Use reusable actions from the marketplace where possible
4. Add required secrets to repository settings
5. Test locally before pushing:

```bash
# Run lint and tests locally
pnpm lint && pnpm test && pnpm build
```

## Troubleshooting Common Failures

| Issue                | Cause                                | Fix                                                    |
| -------------------- | ------------------------------------ | ------------------------------------------------------ |
| `pnpm install` fails | Lock file mismatch                   | Run `pnpm install` locally and commit `pnpm-lock.yaml` |
| Docker build timeout | Large image layers                   | Check `.dockerignore`, use multi-stage builds          |
| Terraform plan fails | State lock                           | Check for stuck locks in DynamoDB                      |
| SARIF upload fails   | GitHub Advanced Security not enabled | `continue-on-error: true` handles this                 |
| TypeScript errors    | Type mismatch                        | Run `pnpm typecheck` locally                           |
| OCI ref parse error  | Uppercase in image name              | Use `${GITHUB_REPOSITORY,,}` for lowercase             |

## Branch Protection

The `main` branch requires:

- Passing CI checks (lint, test, build, security)
- At least 1 approving review
- Up-to-date with base branch
- No force pushes
