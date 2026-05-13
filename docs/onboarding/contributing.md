# Contributing Guidelines

## Code of Conduct

We are committed to providing a welcoming and inclusive experience. Be respectful, constructive, and professional in all interactions.

## Branch Strategy

```
main          ─────────────────────────────────────────── (production)
                    \                    /
release/1.2    ─────────────────────── (staging)
                  \          /
develop        ────────────────────────────────────────── (dev)
                \    /  \    /
feature/xyz  ───────    ───────
```

- `main` - Production-ready code, protected
- `develop` - Integration branch, auto-deploys to dev
- `release/*` - Release candidates, deploys to staging
- `feat/*`, `fix/*`, `chore/*` - Feature branches

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes nor adds |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, dependencies |
| `ci` | CI/CD changes |

### Scopes

| Scope | Area |
|-------|------|
| `api` | Platform API |
| `portal` | Developer Portal |
| `infra` | Infrastructure |
| `ci` | CI/CD pipelines |
| `docker` | Docker configurations |
| `helm` | Helm charts |
| `monitoring` | Observability |
| `security` | Security policies |
| `deps` | Dependencies |

### Examples

```
feat(api): add service catalog search endpoint
fix(portal): resolve deployment status polling race condition
docs(runbook): add Redis failover procedure
chore(deps): update TypeScript to 5.3
ci(security): add container image signing with cosign
```

## Pull Request Process

### Before Creating a PR

1. Rebase on latest `develop`: `git rebase develop`
2. Run full test suite: `npm test`
3. Run linting: `npm run lint`
4. Build successfully: `npx turbo build`

### PR Requirements

- [ ] Descriptive title following commit convention
- [ ] Filled out PR template
- [ ] Tests added for new functionality
- [ ] Documentation updated if needed
- [ ] No `console.log` or debug code
- [ ] No secrets or credentials committed

### Review Process

1. Automated checks must pass (CI, security scan)
2. At least 1 approval from CODEOWNERS
3. No unresolved conversations
4. Branch is up to date with target

### Merge Strategy

- **Squash merge** for feature branches → develop
- **Merge commit** for release branches → main
- **Rebase** for keeping branches up to date

## Testing Standards

### Unit Tests

- Minimum 80% code coverage for new code
- Test file co-located: `feature.test.ts` next to `feature.ts`
- Use descriptive test names: `it('should reject deployment when user lacks permission')`

### Integration Tests

- Test database interactions with real PostgreSQL (Docker)
- Test API endpoints with supertest
- Clean up test data after each test

### E2E Tests

- Critical user flows covered
- Run against staging before production deploy

## Code Style

- TypeScript strict mode (no `any` without justification)
- Functional style preferred (pure functions, immutability)
- Error handling: use Result types, avoid throwing in business logic
- Naming: camelCase for variables/functions, PascalCase for types/classes

## Getting Help

- **Questions**: `#platform-engineering` Slack channel
- **Bugs**: Create a GitHub issue with bug template
- **Features**: Create a GitHub issue with feature template
- **Urgent**: Page on-call via PagerDuty
