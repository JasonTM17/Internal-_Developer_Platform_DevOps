# ADR-008: Hash Chain Audit Integrity

## Status

Accepted

## Date

2026-02-08

## Context

The IDP audit log records all significant actions (deployments, permission changes, infrastructure modifications). For compliance and security, we need to guarantee that audit records cannot be tampered with after creation.

## Decision

We will implement a **hash chain** (blockchain-inspired) for audit log integrity verification.

## Design

Each audit entry includes a hash computed from:

```
hash[n] = SHA-256(hash[n-1] + timestamp + actor + action + resource + metadata)
```

This creates a chain where modifying any historical entry invalidates all subsequent hashes.

## Schema

```sql
CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_num  BIGSERIAL UNIQUE,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id      UUID NOT NULL,
  actor_type    VARCHAR(50) NOT NULL,  -- user, service, system
  action        VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id   VARCHAR(255) NOT NULL,
  team_id       UUID,
  metadata      JSONB,
  previous_hash VARCHAR(64) NOT NULL,
  entry_hash    VARCHAR(64) NOT NULL,

  CONSTRAINT valid_hash CHECK (length(entry_hash) = 64)
);
```

## Verification

- **Continuous**: Background job verifies chain integrity every hour
- **On-demand**: API endpoint for point-in-time verification
- **Alerting**: Broken chain triggers P1 security alert

## Consequences

### Positive

- Tamper-evident audit trail
- Compliance with SOC2 and ISO 27001 requirements
- Cryptographic proof of log integrity
- Simple to verify (linear scan)

### Negative

- Sequential write dependency (cannot parallelize inserts)
- Verification time grows linearly with log size (mitigated by checkpoints)
- Hash computation adds ~1ms latency per write
- Cannot delete individual entries without breaking chain
