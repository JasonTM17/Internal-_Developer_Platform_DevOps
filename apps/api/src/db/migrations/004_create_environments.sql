-- Migration: Create environments table
-- Description: Environment provisioning and management with resource quotas and variables

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

  -- Namespace must be unique within a cluster
  CONSTRAINT environments_cluster_namespace_unique UNIQUE (cluster_name, namespace),
  -- TTL only for preview environments
  CONSTRAINT environments_ttl_preview_only CHECK (ttl_hours IS NULL OR tier = 'preview')
);

-- Environment variables table (key-value pairs with optional encryption)
CREATE TABLE environment_variables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  key VARCHAR(256) NOT NULL,
  value TEXT NOT NULL,
  is_secret BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each key must be unique within an environment
  CONSTRAINT env_variables_env_key_unique UNIQUE (environment_id, key)
);

-- Index for listing environments by tier
CREATE INDEX idx_environments_tier ON environments (tier);

-- Index for filtering by status
CREATE INDEX idx_environments_status ON environments (status);

-- Index for region-based queries
CREATE INDEX idx_environments_region ON environments (region);

-- Index for label-based queries (GIN for JSONB)
CREATE INDEX idx_environments_labels ON environments USING GIN (labels);

-- Index for environment variables lookup
CREATE INDEX idx_env_variables_environment_id ON environment_variables (environment_id);

-- Index for finding expired preview environments
CREATE INDEX idx_environments_ttl ON environments (created_at, ttl_hours)
  WHERE tier = 'preview' AND ttl_hours IS NOT NULL AND status != 'deleted';

-- Trigger to update updated_at
CREATE TRIGGER trigger_environments_updated_at
  BEFORE UPDATE ON environments
  FOR EACH ROW
  EXECUTE FUNCTION update_deployments_updated_at();

CREATE TRIGGER trigger_env_variables_updated_at
  BEFORE UPDATE ON environment_variables
  FOR EACH ROW
  EXECUTE FUNCTION update_deployments_updated_at();

COMMENT ON TABLE environments IS 'Managed environments with resource quotas and lifecycle tracking.';
COMMENT ON TABLE environment_variables IS 'Key-value configuration for environments. Secrets are stored encrypted.';
COMMENT ON COLUMN environments.name IS 'Unique environment name (Kubernetes namespace compatible, max 63 chars).';
COMMENT ON COLUMN environments.tier IS 'Environment tier determining resource limits and policies.';
COMMENT ON COLUMN environments.namespace IS 'Kubernetes namespace for workload isolation.';
COMMENT ON COLUMN environment_variables.is_secret IS 'Whether this value is encrypted at rest and masked in API responses.';
