-- Migration: Create deployments table
-- Description: Deployment records with state tracking, strategy, and event history
-- Depends on: 002_create_catalog_entities.sql

CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES catalog_entities(id) ON DELETE RESTRICT,
  environment VARCHAR(64) NOT NULL,
  version VARCHAR(128) NOT NULL,
  previous_version VARCHAR(128),
  strategy VARCHAR(32) NOT NULL CHECK (strategy IN ('rolling', 'blue-green', 'canary', 'recreate')),
  state VARCHAR(32) NOT NULL DEFAULT 'queued' CHECK (state IN (
    'pending_approval', 'queued', 'in_progress', 'verifying',
    'completed', 'failed', 'cancelled', 'rolling_back', 'rolled_back', 'rollback_failed'
  )),
  config_overrides JSONB NOT NULL DEFAULT '{}',
  canary_percentage INTEGER CHECK (canary_percentage IS NULL OR (canary_percentage >= 1 AND canary_percentage <= 100)),
  timeout_seconds INTEGER NOT NULL DEFAULT 600,
  auto_rollback BOOLEAN NOT NULL DEFAULT true,
  description TEXT NOT NULL DEFAULT '',
  initiated_by VARCHAR(128) NOT NULL,
  approved_by VARCHAR(128),
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing deployments by service
CREATE INDEX idx_deployments_service_id ON deployments (service_id, created_at DESC);

-- Index for listing deployments by environment
CREATE INDEX idx_deployments_environment ON deployments (environment, created_at DESC);

-- Index for filtering by state
CREATE INDEX idx_deployments_state ON deployments (state);

-- Index for finding active deployments (non-terminal states)
CREATE INDEX idx_deployments_active ON deployments (environment, state)
  WHERE state NOT IN ('completed', 'failed', 'cancelled', 'rolled_back', 'rollback_failed');

-- Index for user's deployments
CREATE INDEX idx_deployments_initiated_by ON deployments (initiated_by, created_at DESC);

-- Deployment events table for audit trail
CREATE TABLE deployment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  state VARCHAR(32) NOT NULL,
  message TEXT NOT NULL,
  actor VARCHAR(128) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient event retrieval by deployment
CREATE INDEX idx_deployment_events_deployment_id ON deployment_events (deployment_id, created_at ASC);

-- Index for event type filtering
CREATE INDEX idx_deployment_events_type ON deployment_events (event_type, created_at DESC);

-- Trigger to update updated_at on deployments
CREATE OR REPLACE FUNCTION update_deployments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deployments_updated_at
  BEFORE UPDATE ON deployments
  FOR EACH ROW
  EXECUTE FUNCTION update_deployments_updated_at();

COMMENT ON TABLE deployments IS 'Deployment records tracking the lifecycle of service deployments across environments.';
COMMENT ON TABLE deployment_events IS 'Immutable event log for deployment state transitions and actions.';
COMMENT ON COLUMN deployments.state IS 'Current deployment state following the deployment state machine.';
COMMENT ON COLUMN deployments.strategy IS 'Deployment strategy: rolling, blue-green, canary, or recreate.';
COMMENT ON COLUMN deployments.auto_rollback IS 'Whether to automatically rollback on failure.';
