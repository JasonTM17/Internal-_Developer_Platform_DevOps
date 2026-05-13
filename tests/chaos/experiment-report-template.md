# Chaos Experiment Report

## Experiment Metadata

| Field | Value |
|-------|-------|
| **Experiment ID** | `CE-YYYY-MM-DD-NNN` |
| **Date** | YYYY-MM-DD |
| **Duration** | HH:MM:SS |
| **Environment** | staging / production |
| **Conducted By** | @engineer-name |
| **Reviewed By** | @reviewer-name |
| **Status** | ✅ Passed / ❌ Failed / ⚠️ Partial |

## Experiment Details

### Hypothesis

> **Statement**: [Describe what you expect to happen when the fault is injected]
>
> **Example**: "When 50% of API pods are terminated, the service will maintain
> 99% availability due to Kubernetes self-healing and HPA autoscaling."

### Steady State Definition

| Metric | Expected Value | Pre-Experiment | During Experiment | Post-Experiment |
|--------|---------------|----------------|-------------------|-----------------|
| API Availability | ≥ 99.9% | | | |
| P99 Latency | ≤ 1000ms | | | |
| Error Rate (5xx) | ≤ 1% | | | |
| Active Replicas | ≥ 2 | | | |
| CPU Utilization | ≤ 80% | | | |

### Fault Injection

| Parameter | Value |
|-----------|-------|
| **Experiment Type** | pod-delete / network-loss / cpu-stress / disk-fill / node-drain |
| **Target Service** | idp-api / idp-portal |
| **Target Namespace** | idp-platform |
| **Blast Radius** | X% of pods / specific node / all pods |
| **Duration** | Xs |
| **Chaos Interval** | Xs |

### Probes Configured

| Probe Name | Type | Mode | Result |
|------------|------|------|--------|
| api-health-check | httpProbe | Continuous | ✅ / ❌ |
| latency-within-sla | promProbe | Continuous | ✅ / ❌ |
| min-replicas | cmdProbe | Edge | ✅ / ❌ |

## Results

### Summary

- **Hypothesis Validated**: Yes / No / Partially
- **System Behavior**: [Brief description of observed behavior]
- **Recovery Time**: Xs (time to return to steady state)
- **Data Loss**: None / [describe if any]

### Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM:SS | Experiment started |
| HH:MM:SS | Fault injection began |
| HH:MM:SS | First impact observed |
| HH:MM:SS | Recovery mechanisms triggered |
| HH:MM:SS | Steady state restored |
| HH:MM:SS | Experiment completed |

### Metrics During Experiment

#### Availability
```
Pre:    99.99%
During: XX.XX%
Post:   99.99%
```

#### Latency (P99)
```
Pre:    XXXms
During: XXXms
Peak:   XXXms
Post:   XXXms
```

#### Error Rate
```
Pre:    X.XX%
During: X.XX%
Peak:   X.XX%
Post:   X.XX%
```

### Grafana Dashboard Links

- [Service Mesh Dashboard](https://grafana.idp.example.com/d/istio-mesh)
- [Application Metrics](https://grafana.idp.example.com/d/app-metrics)
- [Kubernetes Resources](https://grafana.idp.example.com/d/k8s-resources)

## Observations

### What Worked Well

1. [Observation about resilience mechanisms that performed as expected]
2. [Observation about recovery behavior]
3. [Observation about alerting/monitoring]

### Issues Discovered

| # | Severity | Description | Impact | Remediation |
|---|----------|-------------|--------|-------------|
| 1 | High/Med/Low | [Issue description] | [Impact on users/system] | [Fix or mitigation] |
| 2 | | | | |

### Unexpected Behaviors

1. [Any unexpected system behavior observed during the experiment]

## Action Items

| # | Priority | Action | Owner | Due Date | Status |
|---|----------|--------|-------|----------|--------|
| 1 | P1 | [Action description] | @owner | YYYY-MM-DD | Open |
| 2 | P2 | [Action description] | @owner | YYYY-MM-DD | Open |

## Recommendations

### Short-term (This Sprint)

- [ ] [Immediate fix or improvement]
- [ ] [Configuration change]

### Medium-term (This Quarter)

- [ ] [Architecture improvement]
- [ ] [Additional resilience mechanism]

### Long-term (Next Quarter)

- [ ] [Strategic improvement]
- [ ] [New chaos experiment to add]

## Approval

| Role | Name | Approved | Date |
|------|------|----------|------|
| SRE Lead | | ☐ | |
| Engineering Manager | | ☐ | |
| Security | | ☐ | |

---

## Appendix

### Experiment Configuration

```yaml
# Paste the ChaosEngine YAML used
```

### Relevant Logs

```
# Paste relevant log snippets
```

### Related Incidents

- [Link to any related incidents or post-mortems]
