# ADR-005: PostgreSQL as Primary Database

## Status

Accepted

## Date

2024-01-25

## Context

The IDP requires a primary database for storing service catalog entries, RBAC policies, audit logs, team configurations, and deployment records. Requirements:

- ACID compliance for audit integrity
- Complex queries (joins, aggregations) for catalog search
- JSON support for flexible metadata
- Strong consistency for RBAC decisions
- Proven reliability at scale

## Decision

We will use **PostgreSQL 16** on **Amazon RDS** as the primary database.

## Rationale

- **ACID compliance**: Critical for audit log integrity and RBAC consistency
- **JSON/JSONB**: Native support for semi-structured metadata without schema migrations
- **Full-text search**: Built-in `tsvector` for service catalog search (avoids Elasticsearch dependency)
- **Row-level security**: Database-enforced access control as defense-in-depth
- **Mature ecosystem**: pg_stat_statements, pgAudit, logical replication
- **RDS managed**: Automated backups, patching, Multi-AZ failover

### Why not DynamoDB?

- Complex queries (multi-table joins for catalog relationships) are expensive
- No native full-text search
- Eventual consistency model conflicts with RBAC requirements
- Higher cost for read-heavy workloads with complex access patterns

### Why not Aurora?

- Higher cost for our current scale
- PostgreSQL compatibility layer occasionally has edge cases
- Standard RDS PostgreSQL meets our performance requirements
- Can migrate to Aurora later if needed (compatible)

## Configuration

| Setting | Dev | Staging | Production |
|---------|-----|---------|------------|
| Instance | db.t3.medium | db.r6g.large | db.r6g.xlarge |
| Storage | 20 GB gp3 | 100 GB gp3 | 500 GB io2 |
| Multi-AZ | No | Yes | Yes |
| Read Replicas | 0 | 1 | 2 |
| Backup Retention | 1 day | 7 days | 35 days |
| Encryption | Yes (KMS) | Yes (KMS) | Yes (CMK) |

## Consequences

### Positive

- Proven reliability and performance
- Rich query capabilities reduce application complexity
- Strong ecosystem of tools and extensions
- Easy to find experienced engineers

### Negative

- Vertical scaling has limits (mitigated by read replicas and connection pooling)
- Schema migrations require careful planning
- Connection management needs PgBouncer at scale
