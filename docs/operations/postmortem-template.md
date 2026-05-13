# Postmortem Template

## Incident: [TITLE]

| Field | Value |
|-------|-------|
| **Date** | YYYY-MM-DD |
| **Duration** | X hours Y minutes |
| **Severity** | P1 / P2 / P3 |
| **Impact** | [Number of users/services affected] |
| **Detection** | [How was it detected: alert, customer report, etc.] |
| **Incident Commander** | [Name] |
| **Authors** | [Names] |
| **Status** | Draft / In Review / Complete |

---

## Summary

[2-3 sentence summary of what happened, the impact, and the resolution.]

---

## Impact

| Metric | Value |
|--------|-------|
| Duration of user-facing impact | X minutes |
| Number of affected users | X |
| Number of affected services | X |
| Revenue impact | $X (if applicable) |
| SLO budget consumed | X% of monthly budget |
| Support tickets created | X |

---

## Timeline (UTC)

| Time | Event |
|------|-------|
| HH:MM | [First sign of issue — metric anomaly, error spike] |
| HH:MM | [Alert fired — which alert, who was paged] |
| HH:MM | [Acknowledged — who, response time] |
| HH:MM | [Investigation started — initial hypothesis] |
| HH:MM | [Root cause identified] |
| HH:MM | [Mitigation applied — what action was taken] |
| HH:MM | [Service restored — metrics back to normal] |
| HH:MM | [Incident declared resolved] |

---

## Root Cause

[Detailed technical explanation of what caused the incident. Be specific about the chain of events.]

### Contributing Factors

1. [Factor 1 — e.g., missing input validation]
2. [Factor 2 — e.g., no circuit breaker on upstream dependency]
3. [Factor 3 — e.g., alert threshold too high to catch early]

---

## Detection

| Question | Answer |
|----------|--------|
| How was the incident detected? | [Alert / Customer report / Manual observation] |
| How long after the incident started was it detected? | [X minutes] |
| Could we have detected it sooner? | [Yes/No — explain] |
| What monitoring gaps exist? | [Describe any gaps] |

---

## Response

| Question | Answer |
|----------|--------|
| Who responded? | [Names and roles] |
| Was the response timely? | [Yes/No — explain] |
| Were runbooks helpful? | [Yes/No — what was missing] |
| Was escalation needed? | [Yes/No — to whom] |
| What slowed down the response? | [Describe blockers] |

---

## Mitigation & Resolution

### Immediate Mitigation
[What was done to stop the bleeding — rollback, scale up, failover, etc.]

### Permanent Fix
[What was done to prevent recurrence — code fix, config change, architecture change]

---

## Lessons Learned

### What went well
- [Thing 1 — e.g., alert fired quickly]
- [Thing 2 — e.g., rollback was fast]
- [Thing 3 — e.g., communication was clear]

### What went poorly
- [Thing 1 — e.g., took too long to identify root cause]
- [Thing 2 — e.g., runbook was outdated]
- [Thing 3 — e.g., no one knew who owned the service]

### Where we got lucky
- [Thing 1 — e.g., happened during business hours]
- [Thing 2 — e.g., only affected non-critical service]

---

## Action Items

| Priority | Action | Owner | Due Date | Status |
|----------|--------|-------|----------|--------|
| P1 | [Immediate fix to prevent recurrence] | [Name] | [Date] | ☐ |
| P2 | [Improve detection — add/fix alert] | [Name] | [Date] | ☐ |
| P2 | [Update runbook with learnings] | [Name] | [Date] | ☐ |
| P3 | [Longer-term architectural improvement] | [Name] | [Date] | ☐ |
| P3 | [Add integration test for this scenario] | [Name] | [Date] | ☐ |

---

## Appendix

### Relevant Logs
```
[Paste relevant log snippets — sanitize any secrets]
```

### Relevant Metrics
[Link to Grafana dashboard with time range set to incident window]

### Related Incidents
- [Link to similar past incidents, if any]

---

## Review Checklist

- [ ] Timeline is accurate and complete
- [ ] Root cause is clearly identified (not just symptoms)
- [ ] Action items have owners and due dates
- [ ] No blame language (focus on systems, not people)
- [ ] Reviewed by incident participants
- [ ] Shared with broader engineering team
