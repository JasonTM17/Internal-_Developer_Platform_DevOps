-- =============================================================================
-- IDP Platform - Database Initialization Script
-- =============================================================================
-- This script is mounted into PostgreSQL's docker-entrypoint-initdb.d
-- and runs automatically on first container start.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- Migration 001: Create audit_log table
-- =============================================================================

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

CREATE INDEX idx_audit_log_actor ON audit_log (actor);
CREATE INDEX idx_audit_log_action ON audit_log (action);
CREATE INDEX idx_audit_log_timestamp ON audit_log (timestamp DESC);
CREATE INDEX idx_audit_log_actor_timestamp ON audit_log (actor, timestamp DESC);
CREATE INDEX idx_audit_log_integrity_hash ON audit_log (integrity_hash);

COMMENT ON TABLE audit_log IS 'Append-only audit log with SHA-256 hash chain integrity. Entries must never be modified or deleted.';
COMMENT ON COLUMN audit_log.integrity_hash IS 'SHA-256 hash of (previous_hash + actor + action + resource + timestamp + outcome)';
COMMENT ON COLUMN audit_log.previous_hash IS 'integrity_hash of the preceding entry, forming a verifiable chain. First entry uses a genesis hash of 64 zeros.';

-- =============================================================================
-- Migration 002: Create catalog_entities table
-- =============================================================================

CREATE TABLE catalog_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(128) NOT NULL,
  namespace VARCHAR(128) NOT NULL,
  owner VARCHAR(128) NOT NULL,
  description VARCHAR(1024) NOT NULL,
  lifecycle_stage VARCHAR(32) NOT NULL CHECK (lifecycle_stage IN ('experimental', 'development', 'production', 'deprecated')),
  repository_url TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  source_repository TEXT NOT NULL,
  created_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT catalog_entities_name_namespace_unique UNIQUE (name, namespace)
);

CREATE INDEX idx_catalog_entities_name_lower ON catalog_entities (LOWER(name));
CREATE INDEX idx_catalog_entities_owner_lower ON catalog_entities (LOWER(owner));
CREATE INDEX idx_catalog_entities_namespace ON catalog_entities (namespace);
CREATE INDEX idx_catalog_entities_lifecycle ON catalog_entities (lifecycle_stage);
CREATE INDEX idx_catalog_entities_tags ON catalog_entities USING GIN (tags);

CREATE TABLE catalog_entity_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES catalog_entities(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  changed_by VARCHAR(128) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT catalog_entity_versions_entity_version_unique UNIQUE (entity_id, version)
);

CREATE INDEX idx_catalog_entity_versions_entity_id ON catalog_entity_versions (entity_id, version DESC);

CREATE TABLE catalog_entity_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_entity_id UUID NOT NULL REFERENCES catalog_entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES catalog_entities(id) ON DELETE CASCADE,
  dependency_type VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT catalog_entity_dependencies_unique UNIQUE (source_entity_id, target_entity_id),
  CONSTRAINT catalog_entity_dependencies_no_self_ref CHECK (source_entity_id != target_entity_id)
);

CREATE INDEX idx_catalog_entity_dependencies_source ON catalog_entity_dependencies (source_entity_id);
CREATE INDEX idx_catalog_entity_dependencies_target ON catalog_entity_dependencies (target_entity_id);

-- =============================================================================
-- Migration 003: Create deployments table
-- =============================================================================

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

CREATE INDEX idx_deployments_service_id ON deployments (service_id, created_at DESC);
CREATE INDEX idx_deployments_environment ON deployments (environment, created_at DESC);
CREATE INDEX idx_deployments_state ON deployments (state);
CREATE INDEX idx_deployments_active ON deployments (environment, state)
  WHERE state NOT IN ('completed', 'failed', 'cancelled', 'rolled_back', 'rollback_failed');
CREATE INDEX idx_deployments_initiated_by ON deployments (initiated_by, created_at DESC);

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

CREATE INDEX idx_deployment_events_deployment_id ON deployment_events (deployment_id, created_at ASC);
CREATE INDEX idx_deployment_events_type ON deployment_events (event_type, created_at DESC);

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

-- =============================================================================
-- Migration 004: Create environments table
-- =============================================================================

CREATE TABLE environments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(63) NOT NULL UNIQUE,
  tier VARCHAR(32) NOT NULL CHECK (tier IN ('development', 'staging', 'production', 'preview')),
  status VARCHAR(32) NOT NULL DEFAULT 'provisioning' CHECK (status IN (
    'provisioning', 'active', 'degraded', 'maintenance', 'decommissioning', 'deleted'
  )),
  description TEXT NOT NULL DEFAULT '',
  region VARCHAR(64) NOT NULL DEFAULT 'us-east-1',
  cluster_name VARCHAR(128) NOT NULL,
  namespace VARCHAR(63) NOT NULL,
  quota_max_cpu_cores INTEGER NOT NULL DEFAULT 4,
  quota_max_memory_mb INTEGER NOT NULL DEFAULT 8192,
  quota_max_storage_gb INTEGER NOT NULL DEFAULT 50,
  quota_max_instances INTEGER NOT NULL DEFAULT 10,
  quota_max_services INTEGER NOT NULL DEFAULT 20,
  labels JSONB NOT NULL DEFAULT '{}',
  auto_scaling BOOLEAN NOT NULL DEFAULT false,
  ttl_hours INTEGER,
  created_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT environments_cluster_namespace_unique UNIQUE (cluster_name, namespace),
  CONSTRAINT environments_ttl_preview_only CHECK (ttl_hours IS NULL OR tier = 'preview')
);

CREATE TABLE environment_variables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  key VARCHAR(256) NOT NULL,
  value TEXT NOT NULL,
  is_secret BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT env_variables_env_key_unique UNIQUE (environment_id, key)
);

CREATE INDEX idx_environments_tier ON environments (tier);
CREATE INDEX idx_environments_status ON environments (status);
CREATE INDEX idx_environments_region ON environments (region);
CREATE INDEX idx_environments_labels ON environments USING GIN (labels);
CREATE INDEX idx_env_variables_environment_id ON environment_variables (environment_id);
CREATE INDEX idx_environments_ttl ON environments (created_at, ttl_hours)
  WHERE tier = 'preview' AND ttl_hours IS NOT NULL AND status != 'deleted';

CREATE TRIGGER trigger_environments_updated_at
  BEFORE UPDATE ON environments
  FOR EACH ROW
  EXECUTE FUNCTION update_deployments_updated_at();

CREATE TRIGGER trigger_env_variables_updated_at
  BEFORE UPDATE ON environment_variables
  FOR EACH ROW
  EXECUTE FUNCTION update_deployments_updated_at();

-- =============================================================================
-- Migration 005: Create config_entries table
-- =============================================================================

CREATE TABLE config_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(256) NOT NULL,
  value TEXT NOT NULL,
  scope VARCHAR(32) NOT NULL CHECK (scope IN ('global', 'environment', 'service')),
  scope_id VARCHAR(256),
  value_type VARCHAR(32) NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'json', 'secret')),
  description TEXT NOT NULL DEFAULT '',
  validation_schema TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  is_encrypted BOOLEAN NOT NULL DEFAULT false,
  created_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(128) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT config_entries_key_scope_unique UNIQUE (key, scope, scope_id)
);

CREATE TABLE config_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_id UUID NOT NULL REFERENCES config_entries(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  value TEXT NOT NULL,
  changed_by VARCHAR(128) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT config_versions_config_version_unique UNIQUE (config_id, version)
);

CREATE INDEX idx_config_entries_key_scope ON config_entries (key, scope, scope_id);
CREATE INDEX idx_config_entries_scope ON config_entries (scope, scope_id);
CREATE INDEX idx_config_entries_tags ON config_entries USING GIN (tags);
CREATE INDEX idx_config_entries_key_pattern ON config_entries (key varchar_pattern_ops);
CREATE INDEX idx_config_versions_config_id ON config_versions (config_id, version DESC);
CREATE INDEX idx_config_entries_updated_by ON config_entries (updated_by, updated_at DESC);
CREATE INDEX idx_config_versions_changed_by ON config_versions (changed_by, changed_at DESC);

CREATE TRIGGER trigger_config_entries_updated_at
  BEFORE UPDATE ON config_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_deployments_updated_at();

ALTER TABLE config_entries ADD CONSTRAINT config_entries_scope_id_required
  CHECK (scope = 'global' OR scope_id IS NOT NULL);

-- =============================================================================
-- Migration 006: Create notifications table
-- =============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(64) NOT NULL,
  severity VARCHAR(16) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title VARCHAR(512) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE notification_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel VARCHAR(32) NOT NULL CHECK (channel IN ('slack', 'email', 'webhook')),
  recipient VARCHAR(256),
  success BOOLEAN NOT NULL DEFAULT false,
  message_id VARCHAR(256),
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_routing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(128) NOT NULL,
  event_type VARCHAR(64) NOT NULL DEFAULT '*',
  severity VARCHAR(16),
  channels TEXT[] NOT NULL DEFAULT '{}',
  recipients TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(128) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  event_types TEXT[] NOT NULL DEFAULT '{}',
  min_severity VARCHAR(16) NOT NULL DEFAULT 'info',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  channel_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_prefs_user_channel_unique UNIQUE (user_id, channel)
);

CREATE INDEX idx_notifications_event_type ON notifications (event_type, created_at DESC);
CREATE INDEX idx_notifications_severity ON notifications (severity, created_at DESC);
CREATE INDEX idx_notification_deliveries_notification_id ON notification_deliveries (notification_id);
CREATE INDEX idx_notification_deliveries_failed ON notification_deliveries (success, created_at)
  WHERE success = false;
CREATE INDEX idx_notification_routing_event_type ON notification_routing_rules (event_type)
  WHERE is_active = true;
CREATE INDEX idx_notification_prefs_user_id ON notification_preferences (user_id);

CREATE TRIGGER trigger_notification_routing_updated_at
  BEFORE UPDATE ON notification_routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_deployments_updated_at();

CREATE TRIGGER trigger_notification_prefs_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_deployments_updated_at();

-- =============================================================================
-- Migration 007: Create health_checks table
-- =============================================================================

CREATE TABLE health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES catalog_entities(id) ON DELETE CASCADE,
  environment VARCHAR(64) NOT NULL,
  endpoint_url TEXT NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE health_check_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES catalog_entities(id) ON DELETE CASCADE,
  environment VARCHAR(64) NOT NULL,
  endpoint_path VARCHAR(512) NOT NULL DEFAULT '/health',
  interval_seconds INTEGER NOT NULL DEFAULT 30,
  timeout_seconds INTEGER NOT NULL DEFAULT 10,
  healthy_threshold INTEGER NOT NULL DEFAULT 3,
  unhealthy_threshold INTEGER NOT NULL DEFAULT 2,
  expected_status_codes INTEGER[] NOT NULL DEFAULT '{200}',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT health_check_configs_service_env_unique UNIQUE (service_id, environment)
);

CREATE TABLE service_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES catalog_entities(id) ON DELETE CASCADE,
  environment VARCHAR(64) NOT NULL,
  date DATE NOT NULL,
  total_checks INTEGER NOT NULL DEFAULT 0,
  successful_checks INTEGER NOT NULL DEFAULT 0,
  failed_checks INTEGER NOT NULL DEFAULT 0,
  avg_response_time_ms NUMERIC(10, 2),
  p95_response_time_ms NUMERIC(10, 2),
  p99_response_time_ms NUMERIC(10, 2),
  uptime_percentage NUMERIC(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_availability_unique UNIQUE (service_id, environment, date)
);

CREATE INDEX idx_health_checks_service_env ON health_checks (service_id, environment, checked_at DESC);
CREATE INDEX idx_health_checks_status ON health_checks (status, checked_at DESC)
  WHERE status != 'healthy';
CREATE INDEX idx_health_checks_response_time ON health_checks (service_id, environment, response_time_ms)
  WHERE response_time_ms IS NOT NULL;
CREATE INDEX idx_health_check_configs_enabled ON health_check_configs (is_enabled)
  WHERE is_enabled = true;
CREATE INDEX idx_service_availability_date ON service_availability (service_id, environment, date DESC);

-- =============================================================================
-- Migration 008: Add performance indexes
-- =============================================================================

CREATE INDEX idx_catalog_entities_namespace_lifecycle
  ON catalog_entities (namespace, lifecycle_stage, updated_at DESC);
CREATE INDEX idx_catalog_entities_updated_at
  ON catalog_entities (updated_at DESC);
CREATE INDEX idx_catalog_entities_active
  ON catalog_entities (namespace, name)
  WHERE lifecycle_stage != 'deprecated';
CREATE INDEX idx_catalog_entities_description_fts
  ON catalog_entities USING GIN (to_tsvector('english', description));

CREATE INDEX idx_deployments_env_state_created
  ON deployments (environment, state, created_at DESC);
CREATE INDEX idx_deployments_completed_recent
  ON deployments (service_id, environment, completed_at DESC)
  WHERE state = 'completed';
CREATE INDEX idx_deployments_duration
  ON deployments (service_id, created_at, completed_at)
  WHERE completed_at IS NOT NULL;

CREATE INDEX idx_environments_tier_status
  ON environments (tier, status, created_at DESC);
CREATE INDEX idx_environments_created_by
  ON environments (created_by, created_at DESC);

CREATE INDEX idx_config_entries_resolution
  ON config_entries (key, scope, scope_id)
  INCLUDE (value, value_type, is_encrypted, version);
CREATE INDEX idx_config_entries_recent_changes
  ON config_entries (updated_at DESC)
  INCLUDE (key, scope, updated_by);

CREATE INDEX idx_notifications_timeline
  ON notifications (created_at DESC)
  INCLUDE (event_type, severity, title);
CREATE INDEX idx_notifications_unprocessed
  ON notifications (created_at)
  WHERE processed_at IS NULL;

CREATE STATISTICS IF NOT EXISTS stat_deployments_service_env
  (dependencies) ON service_id, environment FROM deployments;
CREATE STATISTICS IF NOT EXISTS stat_health_checks_service_env
  (dependencies) ON service_id, environment FROM health_checks;

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

-- =============================================================================
-- Migration 009: Create deployment history views and aggregation
-- =============================================================================

CREATE MATERIALIZED VIEW deployment_history_summary AS
SELECT
  d.service_id,
  ce.name AS service_name,
  ce.namespace,
  d.environment,
  COUNT(*) AS total_deployments,
  COUNT(*) FILTER (WHERE d.state = 'completed') AS successful_deployments,
  COUNT(*) FILTER (WHERE d.state = 'failed') AS failed_deployments,
  COUNT(*) FILTER (WHERE d.state = 'cancelled') AS cancelled_deployments,
  COUNT(*) FILTER (WHERE d.state = 'rolled_back') AS rolled_back_deployments,
  ROUND(
    COUNT(*) FILTER (WHERE d.state = 'completed')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2
  ) AS success_rate_pct,
  AVG(EXTRACT(EPOCH FROM (d.completed_at - d.created_at))) FILTER (WHERE d.completed_at IS NOT NULL) AS avg_duration_seconds,
  PERCENTILE_CONT(0.50) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (d.completed_at - d.created_at))
  ) FILTER (WHERE d.completed_at IS NOT NULL) AS p50_duration_seconds,
  PERCENTILE_CONT(0.95) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (d.completed_at - d.created_at))
  ) FILTER (WHERE d.completed_at IS NOT NULL) AS p95_duration_seconds,
  MAX(d.created_at) AS last_deployment_at,
  MAX(d.version) FILTER (WHERE d.state = 'completed') AS current_version
FROM deployments d
JOIN catalog_entities ce ON ce.id = d.service_id
GROUP BY d.service_id, ce.name, ce.namespace, d.environment;

CREATE UNIQUE INDEX idx_deployment_history_summary_pk
  ON deployment_history_summary (service_id, environment);
CREATE INDEX idx_deployment_history_summary_service
  ON deployment_history_summary (service_name, environment);

CREATE TABLE deployment_daily_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  environment VARCHAR(64) NOT NULL,
  total_deployments INTEGER NOT NULL DEFAULT 0,
  successful_deployments INTEGER NOT NULL DEFAULT 0,
  failed_deployments INTEGER NOT NULL DEFAULT 0,
  avg_duration_seconds NUMERIC(10, 2),
  deployment_frequency NUMERIC(10, 4),
  change_failure_rate NUMERIC(5, 2),
  mean_time_to_recovery_seconds NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT deployment_daily_metrics_unique UNIQUE (date, environment)
);

CREATE INDEX idx_deployment_daily_metrics_date
  ON deployment_daily_metrics (date DESC, environment);

CREATE OR REPLACE FUNCTION calculate_dora_metrics(
  p_environment VARCHAR,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  deployment_frequency NUMERIC,
  lead_time_for_changes_seconds NUMERIC,
  change_failure_rate NUMERIC,
  mean_time_to_recovery_seconds NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::NUMERIC / GREATEST(1, (p_end_date - p_start_date)) AS deployment_frequency,
    AVG(EXTRACT(EPOCH FROM (d.completed_at - d.created_at)))
      FILTER (WHERE d.state = 'completed') AS lead_time_for_changes_seconds,
    ROUND(
      COUNT(*) FILTER (WHERE d.state IN ('failed', 'rolled_back'))::NUMERIC /
      NULLIF(COUNT(*), 0) * 100, 2
    ) AS change_failure_rate,
    AVG(recovery_time.duration_seconds) AS mean_time_to_recovery_seconds
  FROM deployments d
  LEFT JOIN LATERAL (
    SELECT EXTRACT(EPOCH FROM (
      (SELECT MIN(d2.completed_at) FROM deployments d2
       WHERE d2.service_id = d.service_id
         AND d2.environment = d.environment
         AND d2.state = 'completed'
         AND d2.completed_at > d.created_at)
      - d.created_at
    )) AS duration_seconds
    WHERE d.state IN ('failed', 'rolled_back')
  ) recovery_time ON true
  WHERE d.environment = p_environment
    AND d.created_at >= p_start_date
    AND d.created_at < p_end_date + INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION refresh_deployment_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY deployment_history_summary;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Migration 010: Add RBAC tables
-- =============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id VARCHAR(256) NOT NULL UNIQUE,
  email VARCHAR(256) NOT NULL UNIQUE,
  display_name VARCHAR(256) NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(128) NOT NULL UNIQUE,
  slug VARCHAR(128) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  parent_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_members_unique UNIQUE (team_id, user_id)
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(128) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  CONSTRAINT permissions_resource_action_unique UNIQUE (resource, action)
);

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  scope VARCHAR(32) DEFAULT 'global',
  scope_id VARCHAR(256),
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT user_roles_unique UNIQUE (user_id, role_id, scope, scope_id)
);

CREATE TABLE team_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  scope VARCHAR(32) DEFAULT 'global',
  scope_id VARCHAR(256),
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_roles_unique UNIQUE (team_id, role_id, scope, scope_id)
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(128) NOT NULL,
  key_hash VARCHAR(256) NOT NULL UNIQUE,
  key_prefix VARCHAR(8) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT api_keys_name_user_unique UNIQUE (name, user_id)
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_external_id ON users (external_id);
CREATE INDEX idx_users_active ON users (is_active) WHERE is_active = true;
CREATE INDEX idx_teams_slug ON teams (slug);
CREATE INDEX idx_teams_parent ON teams (parent_team_id);
CREATE INDEX idx_team_members_user_id ON team_members (user_id);
CREATE INDEX idx_team_members_team_id ON team_members (team_id);
CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);
CREATE INDEX idx_user_roles_active ON user_roles (user_id, role_id)
  WHERE expires_at IS NULL OR expires_at > NOW();
CREATE INDEX idx_team_roles_team_id ON team_roles (team_id);
CREATE INDEX idx_api_keys_user_id ON api_keys (user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys (key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys (is_active, expires_at)
  WHERE is_active = true;

-- Seed default roles
INSERT INTO roles (name, display_name, description, is_system) VALUES
  ('platform_admin', 'Platform Administrator', 'Full access to all platform resources', true),
  ('developer', 'Developer', 'Can manage services, deploy to non-production, and view configs', true),
  ('deployer', 'Deployer', 'Can deploy to all environments and approve deployments', true),
  ('viewer', 'Viewer', 'Read-only access to all platform resources', true),
  ('service_owner', 'Service Owner', 'Full access to owned services and their deployments', true);

-- Seed default permissions
INSERT INTO permissions (resource, action, description) VALUES
  ('catalog', 'create', 'Register new services in the catalog'),
  ('catalog', 'read', 'View service catalog entries'),
  ('catalog', 'update', 'Update service catalog entries'),
  ('catalog', 'delete', 'Remove services from the catalog'),
  ('deployment', 'create', 'Initiate deployments'),
  ('deployment', 'read', 'View deployment status and history'),
  ('deployment', 'approve', 'Approve pending deployments'),
  ('deployment', 'cancel', 'Cancel active deployments'),
  ('deployment', 'rollback', 'Trigger deployment rollbacks'),
  ('environment', 'create', 'Create new environments'),
  ('environment', 'read', 'View environment details'),
  ('environment', 'update', 'Modify environment configuration'),
  ('environment', 'delete', 'Delete environments'),
  ('config', 'create', 'Create configuration entries'),
  ('config', 'read', 'View configuration values'),
  ('config', 'read_secrets', 'View decrypted secret values'),
  ('config', 'update', 'Modify configuration entries'),
  ('config', 'delete', 'Delete configuration entries'),
  ('admin', 'manage_users', 'Manage user accounts and roles'),
  ('admin', 'manage_teams', 'Manage teams and membership'),
  ('admin', 'view_audit', 'View audit logs');

-- Assign all permissions to platform_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'platform_admin';

-- Assign developer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'developer'
  AND (p.resource, p.action) IN (
    ('catalog', 'create'), ('catalog', 'read'), ('catalog', 'update'),
    ('deployment', 'create'), ('deployment', 'read'), ('deployment', 'cancel'),
    ('environment', 'read'),
    ('config', 'create'), ('config', 'read'), ('config', 'update')
  );

-- Assign viewer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'viewer'
  AND p.action = 'read';

-- Triggers for RBAC tables
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_deployments_updated_at();

CREATE TRIGGER trigger_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_deployments_updated_at();

CREATE TRIGGER trigger_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_deployments_updated_at();
