# Incident Response Playbook

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| SEV-1 | Platform down, all users affected | 5 min | Complete outage, data loss |
| SEV-2 | Major feature degraded | 15 min | Deployments failing, auth broken |
| SEV-3 | Minor feature impacted | 1 hour | Slow queries, single service degraded |
| SEV-4 | Cosmetic/low impact | Next business day | UI glitch, non-critical alert |

## Incident Commander Checklist

### 1. Detection & Triage (0-5 minutes)

- [ ] Acknowledge alert in PagerDuty
- [ ] Assess severity level
- [ ] Open incident Slack channel: `#inc-YYYYMMDD-brief-description`
- [ ] Post initial assessment in channel
- [ ] Page additional responders if SEV-1/SEV-2

### 2. Communication (5-10 minutes)

- [ ] Post status page update (if customer-facing)
- [ ] Notify stakeholders in `#platform-incidents`
- [ ] Set up bridge call for SEV-1

### 3. Investigation

```bash
# Check cluster health
kubectl get nodes
kubectl get pods -n idp-production --field-selector=status.phase!=Running

# Check recent deployments
kubectl get events -n idp-production --sort-by='.lastTimestamp' | tail -20
helm history idp-api -n idp-production

# Check application logs
kubectl logs -n idp-production -l app=idp-api --tail=100 --since=10m

# Check metrics
# Grafana: https://grafana.internal.idp.example.com/d/platform-overview

# Check database connectivity
kubectl exec -n idp-production deploy/idp-api -- curl -s localhost:3000/health
```

### 4. Mitigation

**If caused by recent deployment:**
```bash
# Rollback to previous version
helm rollback idp-api -n idp-production

# Or rollback via ArgoCD
argocd app rollback idp-api-production
```

**If caused by infrastructure:**
```bash
# Check AWS service health
aws health describe-events --region us-east-1

# Scale up if capacity issue
kubectl scale deployment idp-api -n idp-production --replicas=10
```

**If caused by database:**
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier idp-production

# Failover if primary is unhealthy
aws rds failover-db-cluster --db-cluster-identifier idp-production
```

### 5. Resolution

- [ ] Confirm service restored (health checks green)
- [ ] Monitor for 15 minutes post-fix
- [ ] Update status page to resolved
- [ ] Post final update in incident channel

### 6. Post-Incident (within 48 hours)

- [ ] Schedule blameless post-mortem
- [ ] Write incident report (template below)
- [ ] Create follow-up action items
- [ ] Update runbooks if gaps identified

## Incident Report Template

```markdown
## Incident Report: [Title]

**Date:** YYYY-MM-DD
**Duration:** X hours Y minutes
**Severity:** SEV-X
**Incident Commander:** @name

### Summary
One paragraph description of what happened.

### Timeline
- HH:MM - Alert fired
- HH:MM - IC acknowledged
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Service restored

### Root Cause
Technical explanation of what went wrong.

### Impact
- Users affected: X
- Duration: Y minutes
- Data loss: None/Description

### Action Items
| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| Fix X | @name | YYYY-MM-DD | P1 |

### Lessons Learned
What went well, what didn't, what we'll change.
```

## Escalation Path

1. On-call engineer (PagerDuty primary)
2. On-call engineer (PagerDuty secondary)
3. Engineering Manager
4. VP of Engineering (SEV-1 only)
