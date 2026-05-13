# SOC 2 Type II Controls Mapping

## Overview

This document maps the IDP platform's security controls to SOC 2 Type II Trust Service Criteria. It demonstrates how the platform meets the requirements for Security, Availability, Processing Integrity, Confidentiality, and Privacy.

## Trust Service Criteria Mapping

### CC1 - Control Environment

| Control ID | Description | Implementation | Evidence |
|-----------|-------------|----------------|----------|
| CC1.1 | CISO/Security leadership defined | Security team owns platform security policies | Org chart, RACI matrix |
| CC1.2 | Board oversight of security | Quarterly security reviews with leadership | Meeting minutes, reports |
| CC1.3 | Organizational structure established | DevOps, SRE, Security teams defined | Team structure docs |
| CC1.4 | Commitment to competence | Security training required for all engineers | Training records |
| CC1.5 | Accountability enforced | CODEOWNERS, PR reviews, audit logging | Git history, audit logs |

### CC2 - Communication and Information

| Control ID | Description | Implementation | Evidence |
|-----------|-------------|----------------|----------|
| CC2.1 | Internal communication of security policies | Security policies in docs/compliance/ | Policy documents |
| CC2.2 | External communication of commitments | SLA documentation, status page | Public docs |
| CC2.3 | Communication with external parties | Incident notification procedures | Runbooks |

### CC3 - Risk Assessment

| Control ID | Description | Implementation | Evidence |
|-----------|-------------|----------------|----------|
| CC3.1 | Risk objectives specified | RTO/RPO defined, threat modeling | DR module, threat models |
| CC3.2 | Risk identification and analysis | Trivy scanning, dependency audits | Scan reports |
| CC3.3 | Fraud risk considered | RBAC, audit logging, separation of duties | AuthZ policies |
| CC3.4 | Change impact assessed | PR reviews, terraform plan, staging env | CI/CD pipeline |

### CC4 - Monitoring Activities

| Control ID | Description | Implementation | Evidence |
|-----------|-------------|----------------|----------|
| CC4.1 | Ongoing monitoring | Prometheus, Grafana, alerting | Dashboards, alert rules |
| CC4.2 | Deficiency evaluation | Incident post-mortems, SLO tracking | Post-mortem docs |

### CC5 - Control Activities

| Control ID | Description | Implementation | Evidence |
|-----------|-------------|----------------|----------|
| CC5.1 | Control activities selected | Defense in depth: WAF, mTLS, RBAC, network policies | Infrastructure configs |
| CC5.2 | Technology controls deployed | Automated security scanning in CI/CD | Pipeline configs |
| CC5.3 | Policy deployment through technology | OPA/Gatekeeper policies, admission controllers | Policy YAML files |

### CC6 - Logical and Physical Access Controls

| Control ID | Description | Implementation | Evidence |
|-----------|-------------|----------------|----------|
| CC6.1 | Logical access security | OIDC authentication, JWT validation | Auth middleware |
| CC6.2 | Access provisioning | RBAC with role hierarchy, least privilege | Authorization policies |
| CC6.3 | Access removal | Automated deprovisioning, token expiry | IdP integration |
| CC6.4 | Access restriction to assets | Network policies, security groups, mTLS | Istio configs |
| CC6.5 | Access restriction to information | Data classification, encryption at rest | KMS, encryption configs |
| CC6.6 | Security measures against threats | WAF, rate limiting, DDoS protection | EnvoyFilter configs |
| CC6.7 | Transmission security | TLS 1.2+, mTLS between services | Gateway, PeerAuth configs |
| CC6.8 | Unauthorized access prevention | Intrusion detection, anomaly alerting | Monitoring configs |

### CC7 - System Operations

| Control ID | Description | Implementation | Evidence |
|-----------|-------------|----------------|----------|
| CC7.1 | Infrastructure monitoring | Prometheus, node exporters, kube-state-metrics | Monitoring stack |
| CC7.2 | Anomaly detection | Alert rules, SLO-based alerting | AlertManager configs |
| CC7.3 | Security event evaluation | Audit logs, SIEM integration | Audit logger |
| CC7.4 | Incident response | Incident management SOP, PagerDuty | Runbooks |
| CC7.5 | Recovery from incidents | DR procedures, backup restoration | DR module |

### CC8 - Change Management

| Control ID | Description | Implementation | Evidence |
|-----------|-------------|----------------|----------|
| CC8.1 | Change authorization | PR approvals, CODEOWNERS, branch protection | GitHub settings |
| CC8.2 | Change testing | CI pipeline, staging environment, canary | CI/CD configs |
| CC8.3 | Change deployment | GitOps (ArgoCD), progressive delivery (Flagger) | Deployment configs |

### CC9 - Risk Mitigation

| Control ID | Description | Implementation | Evidence |
|-----------|-------------|----------------|----------|
| CC9.1 | Risk mitigation activities | Chaos engineering, DR testing | Chaos configs |
| CC9.2 | Vendor risk management | Dependency scanning, SBOM generation | Security scan workflow |

## Availability Criteria

| Control ID | Description | Implementation | Evidence |
|-----------|-------------|----------------|----------|
| A1.1 | Capacity planning | HPA, cluster autoscaler, resource quotas | K8s configs |
| A1.2 | Recovery objectives | RTO: 15min, RPO: 5min | DR module variables |
| A1.3 | DR testing | Monthly DR drills, chaos game days | Chaos schedules |

## Confidentiality Criteria

| Control ID | Description | Implementation | Evidence |
|-----------|-------------|----------------|----------|
| C1.1 | Confidential information identified | Data classification policy | Classification doc |
| C1.2 | Confidential information disposed | Retention policies, secure deletion | Backup lifecycle |

## Audit Schedule

| Quarter | Activities |
|---------|-----------|
| Q1 | Access review, penetration testing, DR drill |
| Q2 | Policy review, vendor assessment, compliance scan |
| Q3 | Access review, chaos game day, security training |
| Q4 | Annual audit prep, policy updates, certification renewal |

## Evidence Collection

Automated evidence is collected via:
- **GitHub Actions**: CI/CD pipeline logs, security scan results
- **Audit Logger**: API access logs with user attribution
- **Prometheus**: Metric history for SLO compliance
- **AWS CloudTrail**: Infrastructure change audit trail
- **ArgoCD**: Deployment history and approval records
