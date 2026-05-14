# ADR-007: Team-Scoped RBAC

## Status

Accepted

## Date

2026-02-05

## Context

The IDP serves multiple development teams, each owning different services. We need an authorization model that:

- Isolates teams from each other's resources
- Allows fine-grained permissions within a team
- Supports hierarchical roles (org admin > team lead > developer)
- Integrates with external identity providers

## Decision

We will implement **team-scoped Role-Based Access Control (RBAC)** with hierarchical roles.

## Model

```
Organization
  └── Team (scope boundary)
       ├── Role: admin    → full team management
       ├── Role: deployer → deploy + view
       ├── Role: developer → view + request
       └── Role: viewer   → read-only

Permissions are evaluated as:
  user.hasPermission(action, resource, team_scope)
```

## Role Hierarchy

| Role       | Catalog    | Deploy            | Infrastructure | Team Mgmt | Audit    |
| ---------- | ---------- | ----------------- | -------------- | --------- | -------- |
| org-admin  | CRUD       | All envs          | All            | All       | Full     |
| team-admin | CRUD (own) | All envs (own)    | Request        | Own team  | Own team |
| deployer   | Read       | Dev+Staging (own) | None           | None      | Own team |
| developer  | Read       | Dev (own)         | None           | None      | Own      |
| viewer     | Read       | None              | None           | None      | None     |

## Implementation

- Permissions stored in PostgreSQL with team_id foreign key
- JWT tokens include team memberships and roles
- API middleware evaluates permissions before handler execution
- Kubernetes RBAC namespaces aligned with team scopes

## Consequences

### Positive

- Clear isolation between teams
- Principle of least privilege enforced
- Auditable permission changes
- Scalable to many teams without policy explosion

### Negative

- Cross-team collaboration requires explicit sharing
- Role proliferation if teams need custom permissions
- Token size grows with team memberships
