# Access Control Matrix

## Overview

This document defines the role-based access control (RBAC) matrix for the IDP platform. It specifies which roles have access to which resources and at what permission level.

## Role Definitions

| Role | Description | Assignment Criteria |
|------|-------------|-------------------|
| Platform Admin | Full platform access, manages infrastructure | SRE/Platform team leads |
| Developer | Standard development access | All engineering team members |
| Team Lead | Extended access for team management | Engineering managers |
| Security Engineer | Security tooling and audit access | Security team members |
| Auditor | Read-only access for compliance | Compliance team, external auditors |
| Service Account | Automated system access | CI/CD pipelines, integrations |
| Viewer | Read-only access to non-sensitive resources | Stakeholders, PMs |

## Platform Access Matrix

### Service Catalog

| Action | Platform Admin | Developer | Team Lead | Security | Auditor | Viewer |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| View services | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create service | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update service | ✅ | ✅* | ✅ | ❌ | ❌ | ❌ |
| Delete service | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View secrets | ✅ | ✅* | ✅* | ✅ | ❌ | ❌ |
| Manage secrets | ✅ | ❌ | ✅* | ✅ | ❌ | ❌ |

*\* Limited to own team's resources*

### Deployments

| Action | Platform Admin | Developer | Team Lead | Security | Auditor | Viewer |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| View deployments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Deploy to dev | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Deploy to staging | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Deploy to production | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Rollback deployment | ✅ | ✅* | ✅ | ❌ | ❌ | ❌ |
| Approve deployment | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |

### Environments

| Action | Platform Admin | Developer | Team Lead | Security | Auditor | Viewer |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| View environments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create environment | ✅ | ✅* | ✅ | ❌ | ❌ | ❌ |
| Update environment | ✅ | ✅* | ✅ | ❌ | ❌ | ❌ |
| Delete environment | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Manage env secrets | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |

### Infrastructure

| Action | Platform Admin | Developer | Team Lead | Security | Auditor | Viewer |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| View infrastructure | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Modify infrastructure | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View terraform state | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Apply terraform | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage DNS | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage certificates | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |

### Monitoring & Observability

| Action | Platform Admin | Developer | Team Lead | Security | Auditor | Viewer |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| View dashboards | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create dashboards | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View alerts | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage alert rules | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Export audit logs | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |

### User Management

| Action | Platform Admin | Developer | Team Lead | Security | Auditor | Viewer |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| View users | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Create users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Assign roles | ✅ | ❌ | ✅* | ✅ | ❌ | ❌ |
| Revoke access | ✅ | ❌ | ✅* | ✅ | ❌ | ❌ |
| View API keys | ✅ | ✅* | ✅ | ✅ | ❌ | ❌ |
| Manage API keys | ✅ | ✅* | ✅ | ✅ | ❌ | ❌ |

## AWS IAM Mapping

| Platform Role | AWS IAM Role | Permissions Boundary |
|--------------|-------------|---------------------|
| Platform Admin | idp-platform-admin | AdministratorAccess (scoped) |
| Developer | idp-developer | DeveloperBoundary |
| Team Lead | idp-team-lead | TeamLeadBoundary |
| Security Engineer | idp-security | SecurityAuditBoundary |
| Auditor | idp-auditor | ReadOnlyAccess |
| Service Account | idp-ci-cd | CICDBoundary |

## Kubernetes RBAC Mapping

| Platform Role | K8s ClusterRole | Namespaces |
|--------------|----------------|------------|
| Platform Admin | cluster-admin | All |
| Developer | idp-developer | idp-platform, idp-dev-* |
| Team Lead | idp-team-lead | idp-platform, idp-staging |
| Security Engineer | idp-security | All (read), security (write) |
| Auditor | view | All (read-only) |
| Service Account | idp-deployer | idp-platform |

## Access Request Process

1. **Request**: Submit access request via internal ticketing system
2. **Approval**: Manager approval + Security review (for Confidential/Restricted)
3. **Provisioning**: Automated via IdP integration (max 4 hours)
4. **Verification**: Requester confirms access works
5. **Review**: Quarterly access review by team leads

## Access Review Schedule

| Review Type | Frequency | Reviewer | Scope |
|------------|-----------|----------|-------|
| User access | Quarterly | Team Leads | Team members |
| Service accounts | Monthly | Platform Admin | All service accounts |
| Admin access | Monthly | Security Team | All admin roles |
| External access | Quarterly | Security + Legal | Auditors, vendors |
| Dormant accounts | Monthly | Automated | Inactive > 30 days |

## Emergency Access

Emergency access ("break glass") procedures:
1. Available only to Platform Admin and Security Engineer roles
2. Requires documented justification
3. Time-limited (maximum 4 hours)
4. Triggers immediate alert to Security team
5. Full audit trail maintained
6. Post-incident review required within 24 hours
