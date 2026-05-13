-- Migration: Create audit_log table
-- Description: Append-only audit log with hash chain integrity for tamper detection
-- Requirements: 10.1, 10.2, 10.5

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor VARCHAR(256) NOT NULL,
  action VARCHAR(256) NOT NULL,
  resource VARCHAR(512) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome VARCHAR(16) NOT NULL CHECK (outcome IN ('success', 'failure')),
  reason TEXT,
  metadata JSONB,
  integrity_hash VARCHAR(64) NOT NULL,
  previous_hash VARCHAR(64) NOT NULL,
  CONSTRAINT audit_log_outcome_check CHECK (outcome IN ('success', 'failure'))
);

-- Index for efficient querying by actor
CREATE INDEX idx_audit_log_actor ON audit_log (actor);

-- Index for efficient querying by action
CREATE INDEX idx_audit_log_action ON audit_log (action);

-- Index for efficient querying by timestamp (most common filter for recent entries)
CREATE INDEX idx_audit_log_timestamp ON audit_log (timestamp DESC);

-- Composite index for time-range queries with actor filter
CREATE INDEX idx_audit_log_actor_timestamp ON audit_log (actor, timestamp DESC);

-- Index on integrity_hash for chain verification
CREATE INDEX idx_audit_log_integrity_hash ON audit_log (integrity_hash);

-- Comment on table to document append-only semantics
COMMENT ON TABLE audit_log IS 'Append-only audit log with SHA-256 hash chain integrity. Entries must never be modified or deleted.';
COMMENT ON COLUMN audit_log.integrity_hash IS 'SHA-256 hash of (previous_hash + actor + action + resource + timestamp + outcome)';
COMMENT ON COLUMN audit_log.previous_hash IS 'integrity_hash of the preceding entry, forming a verifiable chain. First entry uses a genesis hash of 64 zeros.';
