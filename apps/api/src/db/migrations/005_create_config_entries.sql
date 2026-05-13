-- Migration: Create config_entries table
-- Description: Configuration management with hierarchical scoping, encryption, and version history

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

  -- Unique constraint: key must be unique within a scope+scopeId combination
  CONSTRAINT config_entries_key_scope_unique UNIQUE (key, scope, scope_id)
);

-- Configuration version history
CREATE TABLE config_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_id UUID NOT NULL REFERENCES config_entries(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  value TEXT NOT NULL,
  changed_by VARCHAR(128) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT config_versions_config_version_unique UNIQUE (config_id, version)
);

-- Index for key lookup within scope
CREATE INDEX idx_config_entries_key_scope ON config_entries (key, scope, scope_id);

-- Index for listing by scope
CREATE INDEX idx_config_entries_scope ON config_entries (scope, scope_id);

-- Index for tag-based queries
CREATE INDEX idx_config_entries_tags ON config_entries USING GIN (tags);

-- Index for searching by key pattern
CREATE INDEX idx_config_entries_key_pattern ON config_entries (key varchar_pattern_ops);

-- Index for version history retrieval
CREATE INDEX idx_config_versions_config_id ON config_versions (config_id, version DESC);

-- Index for audit queries (who changed what)
CREATE INDEX idx_config_entries_updated_by ON config_entries (updated_by, updated_at DESC);
CREATE INDEX idx_config_versions_changed_by ON config_versions (changed_by, changed_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER trigger_config_entries_updated_at
  BEFORE UPDATE ON config_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_deployments_updated_at();

-- Validate that scope_id is set for non-global scopes
ALTER TABLE config_entries ADD CONSTRAINT config_entries_scope_id_required
  CHECK (scope = 'global' OR scope_id IS NOT NULL);

COMMENT ON TABLE config_entries IS 'Hierarchical configuration entries with scope-based inheritance (global → environment → service).';
COMMENT ON TABLE config_versions IS 'Version history for configuration changes, enabling rollback.';
COMMENT ON COLUMN config_entries.scope IS 'Configuration scope: global applies everywhere, environment/service override global.';
COMMENT ON COLUMN config_entries.is_encrypted IS 'Whether the value is encrypted at rest (for secrets).';
COMMENT ON COLUMN config_entries.validation_schema IS 'Optional JSON Schema for validating configuration values.';
