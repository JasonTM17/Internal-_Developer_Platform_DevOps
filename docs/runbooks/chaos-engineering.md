# Chaos Engineering Runbook

## Overview

This runbook provides operational guidance for conducting chaos engineering experiments on the Internal Developer Platform (IDP). It covers preparation, execution, monitoring, and post-experiment procedures.

## Prerequisites

### Tools Required

- `kubectl` configured with cluster access
- `litmusctl` CLI installed (v0.23.0+)
- Access to Grafana dashboards
- Access to Slack #platform-chaos channel
- PagerDuty escalation policy configured

### Pre-Experiment Checklist

- [ ] Verify steady-state hypothesis passes
- [ ] Confirm no active incidents or maintenance windows
- [ ] Notify on-call team via Slack
- [ ] Verify rollback procedures are tested
- [ ] Confirm monitoring and alerting is functional
- [ ] Check that PDB (Pod Disruption Budgets) are configured
- [ ] Verify experiment scope is limited to target namespace
- [ ] Ensure chaos service account has correct RBAC

## Experiment Categories

### Level 1: Pod-Level Chaos (Low Risk)

| Experiment | Target | Duration | Blast Radius |
|-----------|--------|----------|--------------|
| pod-delete | idp-api | 60s | 30-50% pods |
| container-kill | idp-api | 30s | Single pod |
| pod-cpu-hog | idp-api | 120s | 50% pods |
| pod-memory-hog | idp-api | 120s | 50% pods |

### Level 2: Network Chaos (Medium Risk)

| Experiment | Target | Duration | Blast Radius |
|-----------|--------|----------|--------------|
| pod-network-latency | idp-api | 60s | All pods |
| pod-network-loss | idp-api | 120s | 60% packets |
| pod-network-partition | idp-api→db | 90s | Specific route |
| pod-dns-error | idp-api | 60s | DNS resolution |

### Level 3: Node-Level Chaos (High Risk)

| Experiment | Target | Duration | Blast Radius |
|-----------|--------|----------|--------------|
| node-drain | workload nodes | 90s | Single node |
| node-taint | workload nodes | 60s | Single node |
| node-cpu-hog | workload nodes | 180s | Single node |

## Execution Procedures

### Starting an Experiment

```bash
# 1. Verify steady state
kubectl apply -f tests/chaos/steady-state-hypothesis.yaml
kubectl get configmap steady-state-hypothesis -n idp-platform -o yaml

# 2. Check current system health
kubectl get pods -n idp-platform -l app=idp-api
kubectl get hpa -n idp-platform
kubectl top pods -n idp-platform

# 3. Apply chaos experiment
kubectl apply -f infra/chaos/litmus/chaosengine-pod-delete.yaml

# 4. Monitor experiment progress
kubectl get chaosengine -n idp-platform
kubectl get chaosresult -n idp-platform
watch kubectl get pods -n idp-platform
```

### Monitoring During Experiment

```bash
# Watch chaos engine status
kubectl get chaosengine idp-api-pod-delete -n idp-platform -w

# Check chaos result
kubectl get chaosresult -n idp-platform -o wide

# Monitor pod health
kubectl get pods -n idp-platform -l app=idp-api -w

# Check HPA scaling
kubectl get hpa -n idp-platform -w

# View experiment logs
kubectl logs -n idp-platform -l app.kubernetes.io/component=experiment-job -f
```

### Emergency Abort

```bash
# Immediately stop all chaos experiments
kubectl patch chaosengine idp-api-pod-delete -n idp-platform \
  --type merge -p '{"spec":{"engineState":"stop"}}'

# Delete chaos engine to clean up
kubectl delete chaosengine --all -n idp-platform

# Verify system recovery
kubectl get pods -n idp-platform
kubectl get events -n idp-platform --sort-by='.lastTimestamp' | tail -20
```

## Scheduled Game Days

### Weekly Game Day (Wednesdays 2-4 PM UTC)

**Scope**: Pod-level chaos only
**Notification**: 1 hour before via Slack
**Participants**: On-call SRE + 1 engineer

**Procedure**:
1. Post in #platform-chaos: "Weekly game day starting in 1 hour"
2. Verify steady state at T-15 minutes
3. Run experiments sequentially (pod-delete → network-latency → cpu-stress)
4. Document results in experiment report
5. Post summary in #platform-chaos

### Monthly Full Game Day (First Thursday 2-6 PM UTC)

**Scope**: All levels including node-level
**Notification**: 24 hours before via email + Slack
**Participants**: Full SRE team + engineering leads

**Procedure**:
1. Send calendar invite 1 week before
2. Pre-game briefing at T-30 minutes
3. Run Level 1 experiments (30 min)
4. Run Level 2 experiments (60 min)
5. Run Level 3 experiments (60 min)
6. Post-game review and action items
7. Publish experiment report within 24 hours

## Rollback Procedures

### Automatic Rollback

Litmus ChaosEngine automatically reverts changes when:
- Experiment duration expires
- Engine state is set to "stop"
- Probes fail with `stopOnFailure: true`

### Manual Rollback

```bash
# 1. Stop chaos engine
kubectl patch chaosengine <name> -n idp-platform \
  --type merge -p '{"spec":{"engineState":"stop"}}'

# 2. Delete any lingering chaos resources
kubectl delete pods -n idp-platform -l chaosUID

# 3. Force restart affected deployments
kubectl rollout restart deployment/idp-api -n idp-platform
kubectl rollout restart deployment/idp-portal -n idp-platform

# 4. Verify recovery
kubectl rollout status deployment/idp-api -n idp-platform
kubectl rollout status deployment/idp-portal -n idp-platform

# 5. Check all probes pass
curl -sf http://idp-api.idp-platform.svc.cluster.local:3000/healthz
curl -sf http://idp-api.idp-platform.svc.cluster.local:3000/readyz
```

## Metrics and Dashboards

### Key Metrics to Monitor

| Metric | Normal Range | Alert Threshold |
|--------|-------------|-----------------|
| Request Success Rate | ≥ 99.9% | < 99% |
| P99 Latency | ≤ 500ms | > 2000ms |
| Pod Restart Count | 0 | > 3 in 5min |
| HPA Replica Count | 3-5 | > 8 |
| Circuit Breaker Trips | 0 | > 0 |

### Grafana Dashboards

- **Service Mesh Overview**: Istio traffic, errors, latency
- **Kubernetes Resources**: CPU, memory, pod status
- **Chaos Experiments**: Experiment status, probe results
- **Application Metrics**: Business-level metrics

## Troubleshooting

### Experiment Stuck in "Running"

```bash
# Check runner pod logs
kubectl logs -n idp-platform -l app.kubernetes.io/component=experiment-job

# Force cleanup
kubectl delete chaosengine <name> -n idp-platform
kubectl delete pods -n idp-platform -l chaosUID --force --grace-period=0
```

### Probes Failing Before Experiment

```bash
# Verify target service is healthy
kubectl get pods -n idp-platform -l app=idp-api
curl -v http://idp-api.idp-platform.svc.cluster.local:3000/healthz

# Check RBAC permissions
kubectl auth can-i get pods -n idp-platform --as=system:serviceaccount:idp-platform:chaos-serviceaccount
```

### System Not Recovering After Experiment

```bash
# Check for stuck pods
kubectl get pods -n idp-platform --field-selector=status.phase!=Running

# Check events for errors
kubectl get events -n idp-platform --sort-by='.lastTimestamp' | grep -i error

# Force pod recreation
kubectl delete pods -n idp-platform -l app=idp-api --force
```

## Compliance and Safety

### Guardrails

1. **Never run in production without approval** from SRE Lead
2. **Always verify PDBs** before node-level experiments
3. **Maximum blast radius**: 50% of pods for Level 1, single node for Level 3
4. **Business hours only**: No experiments outside 9 AM - 5 PM local time
5. **Freeze periods**: No experiments during release freezes or peak traffic

### Escalation Path

1. **Experiment fails to revert** → On-call SRE → Manual rollback
2. **Customer impact detected** → Abort immediately → Incident process
3. **Data loss suspected** → Abort → Page database team → Incident P1

## References

- [Litmus Chaos Documentation](https://docs.litmuschaos.io/)
- [Principles of Chaos Engineering](https://principlesofchaos.org/)
- [Steady State Hypothesis](../tests/chaos/steady-state-hypothesis.yaml)
- [Experiment Report Template](../tests/chaos/experiment-report-template.md)
