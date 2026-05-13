# Deployment Rollback Procedures

## When to Rollback

- Error rate exceeds 5% after deployment
- P95 latency increases by more than 50%
- Health checks failing for more than 2 minutes
- Critical functionality broken (auth, deployments, catalog)

## Quick Rollback (< 2 minutes)

### Via Helm

```bash
# List release history
helm history idp-api -n idp-production

# Rollback to previous revision
helm rollback idp-api -n idp-production

# Rollback to specific revision
helm rollback idp-api 42 -n idp-production

# Verify rollback
kubectl rollout status deployment/idp-api -n idp-production
```

### Via ArgoCD

```bash
# List application history
argocd app history idp-api-production

# Rollback to previous sync
argocd app rollback idp-api-production

# Sync to specific revision
argocd app sync idp-api-production --revision <commit-sha>
```

### Via kubectl (Emergency)

```bash
# Rollback deployment directly
kubectl rollout undo deployment/idp-api -n idp-production

# Rollback to specific revision
kubectl rollout undo deployment/idp-api -n idp-production --to-revision=5

# Check rollout status
kubectl rollout status deployment/idp-api -n idp-production
```

## Rollback Verification

```bash
# 1. Check pod status
kubectl get pods -n idp-production -l app=idp-api

# 2. Verify version
curl -s https://api.idp.example.com/version | jq .

# 3. Check health endpoints
curl -sf https://api.idp.example.com/health
curl -sf https://api.idp.example.com/ready

# 4. Check error rate (Prometheus)
# rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# 5. Check logs for errors
kubectl logs -n idp-production -l app=idp-api --tail=50 --since=5m | grep -i error
```

## Database Migration Rollback

If the deployment included a database migration:

```bash
# 1. Check current migration version
kubectl exec -n idp-production deploy/idp-api -- npm run db:version

# 2. Rollback migration (if reversible)
kubectl exec -n idp-production deploy/idp-api -- npm run db:rollback

# 3. If migration is not reversible, apply compensating migration
# Create a new migration that undoes the changes
```

**Important**: Always verify migration reversibility BEFORE deploying to production.

## Canary Rollback

If using canary deployment strategy:

```bash
# Remove canary deployment
helm uninstall idp-api-canary -n idp-production

# Verify all traffic goes to stable
kubectl get virtualservice idp-api -n idp-production -o yaml
```

## Post-Rollback Actions

1. [ ] Verify service is healthy
2. [ ] Notify team in `#platform-deployments`
3. [ ] Create incident ticket if user-facing impact
4. [ ] Investigate root cause
5. [ ] Fix forward (don't re-deploy broken version)
6. [ ] Update deployment notes with failure reason

## Prevention

- Always deploy to staging first
- Run E2E tests before production promotion
- Use canary deployments for risky changes
- Feature flags for gradual rollout
- Database migrations must be backward-compatible
