# Incident Management Standard Operating Procedure

## Purpose

This SOP defines the incident management process for the IDP platform, covering detection, response, resolution, and post-incident activities.

## Severity Levels

| Severity | Definition | Response Time | Update Frequency | Examples |
|----------|-----------|---------------|------------------|----------|
| P1 - Critical | Platform-wide outage, data loss | 5 minutes | Every 15 minutes | Complete service down, data breach |
| P2 - High | Major feature degraded, partial outage | 15 minutes | Every 30 minutes | API errors > 5%, deployment pipeline broken |
| P3 - Medium | Minor feature impacted, workaround exists | 1 hour | Every 2 hours | Single service degraded, non-critical alert |
| P4 - Low | Cosmetic issue, no user impact | 4 hours | Daily | UI glitch, non-critical log errors |

## Incident Lifecycle

### 1. Detection

**Automated Detection**:
- Prometheus alerting rules fire
- PagerDuty creates incident
- Slack notification in #platform-incidents

**Manual Detection**:
- User reports issue via support channel
- Engineer notices anomaly during work
- External monitoring (status page checks)

### 2. Triage

**On-call engineer** (first responder):
1. Acknowledge alert within response time SLA
2. Assess severity based on impact and scope
3. Determine if escalation needed
4. Begin initial investigation

**Triage Checklist**:
- [ ] What services are affected?
- [ ] How many users are impacted?
- [ ] Is there data loss or security implications?
- [ ] Is there a known workaround?
- [ ] When did the issue start?

### 3. Response

**Incident Commander** (IC) responsibilities:
- Coordinate response team
- Make decisions on mitigation approach
- Communicate status updates
- Manage escalations

**Communication Template**:
```
🚨 INCIDENT: [Title]
Severity: P[1-4]
Status: Investigating / Identified / Monitoring / Resolved
Impact: [Description of user impact]
Start Time: [UTC timestamp]
IC: @[name]
Next Update: [time]
```

### 4. Mitigation

**Standard Mitigation Actions**:

| Action | When to Use | Command/Procedure |
|--------|------------|-------------------|
| Rollback deployment | Bad deploy identified | `kubectl rollout undo deployment/idp-api -n idp-platform` |
| Scale up | Capacity issue | `kubectl scale deployment/idp-api --replicas=10 -n idp-platform` |
| Circuit breaker | Dependency failure | Update Istio DestinationRule |
| Feature flag disable | Feature causing issues | Toggle flag in LaunchDarkly |
| DNS failover | Region failure | Update Route53 failover record |
| Database failover | Primary DB failure | Promote RDS read replica |

### 5. Resolution

- Confirm service restored to normal operation
- Verify all monitoring shows healthy state
- Remove any temporary mitigations
- Update incident status to "Resolved"
- Notify stakeholders

### 6. Post-Incident

**Timeline** (after resolution):
- **Within 24 hours**: Draft post-mortem
- **Within 48 hours**: Post-mortem review meeting
- **Within 1 week**: Action items assigned and tracked
- **Within 2 weeks**: Preventive measures implemented

## Escalation Matrix

| Condition | Escalate To | Method |
|-----------|------------|--------|
| P1 not acknowledged in 5 min | Secondary on-call | PagerDuty auto-escalation |
| P1 not mitigated in 30 min | Engineering Manager | Phone call |
| P1 lasting > 1 hour | VP Engineering | Phone call + Slack |
| Data breach suspected | Security Team + Legal | Immediate page |
| Customer SLA at risk | Customer Success + Exec | Email + Slack |

## On-Call Rotation

| Team | Schedule | Primary | Secondary |
|------|----------|---------|-----------|
| Platform SRE | Weekly rotation | 1 engineer | 1 engineer |
| Application | Weekly rotation | 1 engineer | Team lead |
| Security | Weekly rotation | 1 engineer | Security lead |

**On-call expectations**:
- Acknowledge alerts within 5 minutes (P1) or 15 minutes (P2)
- Laptop and internet access available
- Able to join video call within 10 minutes
- Handoff briefing at rotation change

## Communication Channels

| Channel | Purpose | Audience |
|---------|---------|----------|
| #platform-incidents | Real-time incident coordination | Response team |
| #platform-status | Status updates for broader team | All engineering |
| PagerDuty | Alerting and escalation | On-call engineers |
| Status page | External communication | Customers |
| Email | Formal notifications | Stakeholders |

## Post-Mortem Template

### Incident Summary
- **Title**: [Brief description]
- **Severity**: P[1-4]
- **Duration**: [Start time] to [End time] ([total duration])
- **Impact**: [Number of users affected, services impacted]
- **Detection**: [How was it detected]

### Timeline
| Time (UTC) | Event |
|------------|-------|
| HH:MM | [Event description] |

### Root Cause
[Detailed explanation of what caused the incident]

### Contributing Factors
1. [Factor 1]
2. [Factor 2]

### What Went Well
1. [Positive observation]

### What Could Be Improved
1. [Improvement area]

### Action Items
| # | Priority | Action | Owner | Due Date |
|---|----------|--------|-------|----------|
| 1 | P1 | [Action] | @owner | YYYY-MM-DD |

### Lessons Learned
[Key takeaways for the team]

## Metrics and Reporting

| Metric | Target | Current |
|--------|--------|---------|
| MTTA (Mean Time to Acknowledge) | < 5 min (P1) | - |
| MTTD (Mean Time to Detect) | < 5 min | - |
| MTTR (Mean Time to Resolve) | < 1 hour (P1) | - |
| Incidents per month | < 5 (P1+P2) | - |
| Post-mortem completion rate | 100% (P1+P2) | - |
| Action item completion | > 90% within SLA | - |
