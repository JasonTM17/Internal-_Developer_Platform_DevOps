-- Migration: Add performance indexes
-- Description: Additional indexes for query optimization across all tables

-- ============================================================
-- Catalog Entities - Additional Indexes
-- ============================================================

-- Composite index for common listing queries (namespace + lifecycle)
CREATE INDEX idx_catalog_entities_namespace_lifecycle
  ON catalog_entities (namespace, lifecycle_stage, updated_at DESC);

-- Index for recently updated entities (dashboard queries)
CREATE INDEX idx_catalog_entities_updated_at
  ON catalog_entities (updated_at DESC);

-- Partial index for active (non-deprecated) entities
CREATE INDEX idx_catalog_entities_active
  ON catalog_entities (namespace, name)
  WHERE lifecycle_stage != 'deprecated';

-- Full-text search index for entity descriptions
CREATE INDEX idx_catalog_entities_description_fts
  ON catalog_entities USING GIN (to_tsvector('english', description));

-- ============================================================
-- Deployments - Additional Indexes
-- ============================================================

-- Composite index for deployment history dashboard
CREATE INDEX idx_deployments_env_state_created
  ON deployments (environment, state, created_at DESC);

-- Index for finding recent completed deployments (for rollback reference)
CREATE INDEX idx_deployments_completed_recent
  ON deployments (service_id, environment, completed_at DESC)
  WHERE state = 'completed';

-- Index for deployment duration analysis
CREATE INDEX idx_deployments_duration
  ON deployments (service_id, created_at, completed_at)
  WHERE completed_at IS NOT NULL;

-- ============================================================
-- Environments - Additional Indexes
-- ============================================================

-- Composite index for environment listing with status
CREATE INDEX idx_environments_tier_status
  ON environments (tier, status, created_at DESC);

-- Index for finding environments by creator
CREATE INDEX idx_environments_created_by
  ON environments (created_by, created_at DESC);

-- ============================================================
-- Configuration - Additional Indexes
-- ============================================================

-- Composite index for config resolution (scope hierarchy)
CREATE INDEX idx_config_entries_resolution
  ON config_entries (key, scope, scope_id)
  INCLUDE (value, value_type, is_encrypted, version);

-- Index for finding recently changed configs
CREATE INDEX idx_config_entries_recent_changes
  ON config_entries (updated_at DESC)
  INCLUDE (key, scope, updated_by);

-- ============================================================
-- Notifications - Additional Indexes
-- ============================================================

-- Index for notification timeline queries
CREATE INDEX idx_notifications_timeline
  ON notifications (created_at DESC)
  INCLUDE (event_type, severity, title);

-- Index for finding unprocessed notifications
CREATE INDEX idx_notifications_unprocessed
  ON notifications (created_at)
  WHERE processed_at IS NULL;

-- ============================================================
-- Cross-table Statistics
-- ============================================================

-- Create statistics for common join patterns
-- (PostgreSQL 10+ extended statistics)
CREATE STATISTICS IF NOT EXISTS stat_deployments_service_env
  (dependencies) ON service_id, environment FROM deployments;

CREATE STATISTICS IF NOT EXISTS stat_health_checks_service_env
  (dependencies) ON service_id, environment FROM health_checks;

-- ============================================================
-- Analyze tables after index creation
-- ============================================================
ANALYZE catalog_entities;
ANALYZE deployments;
ANALYZE deployment_events;
ANALYZE environments;
ANALYZE environment_variables;
ANALYZE config_entries;
ANALYZE config_versions;
ANALYZE notifications;
ANALYZE notification_deliveries;
ANALYZE health_checks;
ANALYZE service_availability;
