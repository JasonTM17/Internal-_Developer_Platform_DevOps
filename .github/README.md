# GitHub Actions Workflows

CI/CD pipeline configuration for the Internal Developer Platform.

## Workflow Overview

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `ci.yaml` | Push, PR | Lint, typecheck, unit tests, build |
| `integration-tests.yaml` | PR to main | Integration and contract tests |
| `docker-build.yaml` | Push to main | Build and push container images |
| `security-scan.yaml` | Push, schedule | Trivy vulnerability scanning |
| `terraform-plan.yaml` | PR (infra changes) | Terraform plan with cost estimate |
| `terraform-apply.yaml` | Push to main (infra) | Apply Terraform changes |
| `cd-dev.yaml` | Push to main | Deploy to development environment |
| `cd-staging.yaml` | Manual, after dev | Deploy to staging environment |
| `cd-production.yaml` | Manual, approval | Deploy to production environment |
| `preview-env.yaml` | PR | Spin up preview environment |
| `release.yaml` | Tag push | Create GitHub release |
| `release-drafter.yml` | Push to main | Draft release notes |
| `dependency-update.yaml` | Schedule (weekly) | Update dependencies via PR |
| `compliance-audit.yaml` | Schedule (daily) | Security and compliance checks |

## Required Secrets

| Secret | Description | Used By |
|--------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key | Terraform, CD workflows |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | Terraform, CD workflows |
| `AWS_REGION` | AWS deployment region | All AWS workflows |
| `ECR_REGISTRY` | ECR registry URL | Docker build, CD |
| `KUBE_CONFIG` | Base64-encoded kubeconfig | CD workflows |
| `SLACK_WEBHOOK_URL` | Slack notification webhook | All workflows |
| `SONAR_TOKEN` | SonarCloud analysis token | CI workflow |
| `SNYK_TOKEN` | Snyk vulnerability scanning | Security scan |
| `TERRAFORM_CLOUD_TOKEN` | Terraform Cloud API token | Terraform workflows |
| `CODECOV_TOKEN` | Code coverage upload token | CI workflow |

## Adding New Workflows

1. Create a new `.yaml` file in `.github/workflows/`
2. Define trigger events (`on:`)
3. Use reusable actions from the marketplace where possible
4. Add required secrets to repository settings
5. Test with `act` locally before pushing:

```bash
# Install act (https://github.com/nektos/act)
act -W .github/workflows/ci.yaml --secret-file .env.ci
```

## Troubleshooting Common Failures

| Issue | Cause | Fix |
|-------|-------|-----|
| `npm ci` fails | Lock file mismatch | Run `npm install` locally and commit `package-lock.json` |
| Docker build timeout | Large image layers | Check `.dockerignore`, use multi-stage builds |
| Terraform plan fails | State lock | Check for stuck locks in DynamoDB |
| E2E tests flaky | Timing issues | Add proper waits, increase timeout |
| Permission denied | Missing secrets | Verify secrets are set in repo settings |
| Preview env stuck | Orphaned resources | Run `cleanup-envs.sh` manually |

## Branch Protection

The `main` branch requires:
- Passing CI checks
- At least 1 approving review
- Up-to-date with base branch
- No force pushes
