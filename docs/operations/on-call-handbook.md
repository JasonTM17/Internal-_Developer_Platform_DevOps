# On-Call Handbook

## Overview

This handbook provides everything an on-call engineer needs to effectively respond to incidents on the IDP platform. Read this before your first on-call shift.

---

## On-Call Responsibilities

1. **Acknowledge** alerts within 5 minutes
2. **Assess** severity and impact
3. **Mitigate** — restore service first, investigate later
4. **Communicate** — keep stakeholders informed
5. **Escalate** when needed (no shame in escalation)
6. **Document** actions taken for postmortem

---

## On-Call Rotation

| Rotation | Coverage | Escalation |
|----------|----------|------------|
| Primary | 24/7, 1-week shifts | Responds to all pages |
| Secondary | 24/7, 1-week shifts | Escalation if primary doesn't ack in 10 min |
| Platform Lead | Business hours | Escalation for P1 incidents |

### Shift Schedule
- Shifts rotate weekly (Monday 09:00 UTC)
- Handoff meeting: 15 minutes at shift change
- Maximum: 1 week on-call per month
- Compensatory time off after on-call week

---

## Alert Response Guide

### Severity Levels

| Severity | Response Time | Examples |
|----------|--------------|---------|
| P1 Critical | 5 minutes | Platform down, data loss, security breach |
| P2 High | 15 minutes | Degraded service, failed deployments (multiple) |
| P3 Medium | 1 hour | Single service degraded, elevated error rate |
| P4 Low | Next business day | Non-critical alert, capacity warning |

### Response Workflow

```
Alert Fires → Acknowledge (PagerDuty) → Assess Impact
     ↓
Is it a real issue?
  No → Silence alert, create ticket to fix alert
  Yes ↓
     
Determine severity → Open incident channel (#inc-YYYYMMDD-brief)
     ↓
Mitigate (rollback, scale, failover)
     ↓
Communicate (status page, Slack)
     ↓
Investigate root cause
     ↓
Resolve → Update status page → Schedule postmortem
```

---

## Common Scenarios & Runbooks

### API High Error Rate (5xx > 1%)

1. Check: `kubectl get pods -n platform -l app=api`
2. Look for: CrashLoopBackOff, OOMKilled, ImagePullBackOff
3. Check recent deployments: `argocd app list --status Degraded`
4. If recent deploy: `argocd app rollback platform-api`
5. If not deploy-related: check database connectivity, upstream services
6. Runbook: https://wiki.internal/runbooks/api-high-error-rate

### Database Connection Pool Exhausted

1. Check: `kubectl exec -it postgres-0 -- psql -c "SELECT count(*) FROM pg_stat_activity;"`
2. Kill idle connections: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '10 minutes';`
3. Check for connection leaks in application logs
4. Temporary: increase `max_connections` in pgbouncer
5. Runbook: https://wiki.internal/runbooks/db-connections

### Pod CrashLoopBackOff

1. Check logs: `kubectl logs -n platform <pod> --previous`
2. Check events: `kubectl describe pod -n platform <pod>`
3. Common causes: OOM, missing config/secret, failed health check
4. If OOM: increase memory limit temporarily
5. If config: check ConfigMap/Secret changes
6. Runbook: https://wiki.internal/runbooks/crashloop

### Certificate Expiry

1. Check: `kubectl get certificates -A`
2. Force renewal: `kubectl delete certificate <name> -n <namespace>`
3. cert-manager will auto-recreate
4. Verify: `kubectl describe certificate <name>`
5. Runbook: https://wiki.internal/runbooks/cert-expiry

### Disk Space Critical

1. Check: `kubectl exec -it <pod> -- df -h`
2. For PVCs: `kubectl get pvc -A | grep -v Bound`
3. Clean up: old logs, temp files, unused images
4. Expand PVC: update PVC spec (if StorageClass allows expansion)
5. Runbook: https://wiki.internal/runbooks/disk-space

---

## Escalation Matrix

| Situation | Escalate To | Method |
|-----------|------------|--------|
| Can't resolve in 30 min | Secondary on-call | PagerDuty |
| P1 incident | Platform Lead + Secondary | PagerDuty + Slack |
| Security incident | Security team + CISO | PagerDuty + Phone |
| Data loss suspected | Platform Lead + DBA | PagerDuty + Phone |
| Customer-facing impact > 15 min | Engineering VP | Slack DM |

---

## Communication Templates

### Incident Start (Slack #incidents)

```
🚨 INCIDENT: [Brief description]
Severity: P[1-4]
Impact: [What's affected]
Status: Investigating
On-call: @[your name]
Incident channel: #inc-YYYYMMDD-brief
```

### Status Update (every 15-30 min for P1/P2)

```
📋 UPDATE: [Incident title]
Status: [Investigating | Mitigating | Monitoring | Resolved]
What we know: [Brief summary]
What we're doing: [Current action]
ETA: [If known]
Next update: [Time]
```

### Incident Resolved

```
✅ RESOLVED: [Incident title]
Duration: [X minutes/hours]
Impact: [Summary of impact]
Root cause: [Brief, if known]
Postmortem: [Scheduled for DATE]
```

---

## Tools & Access

### Required Access (verify before shift)

- [ ] PagerDuty account with mobile app
- [ ] kubectl access to all clusters
- [ ] ArgoCD admin access
- [ ] Grafana dashboards bookmarked
- [ ] AWS Console access (read + limited write)
- [ ] Slack channels: #incidents, #platform-alerts, #on-call
- [ ] VPN configured and tested

### Key Dashboards

| Dashboard | URL | Use |
|-----------|-----|-----|
| SLO Overview | grafana.internal/d/platform-slo-overview | Error budget status |
| K8s Cluster | grafana.internal/d/k8s-cluster-overview | Node/pod health |
| API Metrics | grafana.internal/d/platform-api | Request rate, errors, latency |
| PostgreSQL | grafana.internal/d/postgres-exporter-metrics | DB health |
| ArgoCD | argocd.platform.internal | Deployment status |

---

## Self-Care

- You are not expected to fix everything alone — escalate early
- Take breaks during long incidents (hand off to secondary)
- If woken up at night, you can start late the next day
- Log all after-hours pages for compensation tracking
- Debrief with team after difficult incidents
