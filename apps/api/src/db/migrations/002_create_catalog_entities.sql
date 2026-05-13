-- Migration: Create catalog_entities table
-- Description: Service Catalog entity persistence with unique constraint on (name, namespace)
-- Requirements: 1.1, 1.3, 1.5, 1.6

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

  -- Unique constraint: entity name must be unique within a namespace (Requirement 1.3, 1.6)
  CONSTRAINT catalog_entities_name_namespace_unique UNIQUE (name, namespace)
);

-- Index for search by name (case-insensitive)
CREATE INDEX idx_catalog_entities_name_lower ON catalog_entities (LOWER(name));

-- Index for search by owner (case-insensitive)
CREATE INDEX idx_catalog_entities_owner_lower ON catalog_entities (LOWER(owner));

-- Index for namespace lookups
CREATE INDEX idx_catalog_entities_namespace ON catalog_entities (namespace);

-- Index for lifecycle stage filtering
CREATE INDEX idx_catalog_entities_lifecycle ON catalog_entities (lifecycle_stage);

-- GIN index for tag array search
CREATE INDEX idx_catalog_entities_tags ON catalog_entities USING GIN (tags);

-- Version history table for tracking entity changes (Requirement 2.4)
CREATE TABLE catalog_entity_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES catalog_entities(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  changed_by VARCHAR(128) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT catalog_entity_versions_entity_version_unique UNIQUE (entity_id, version)
);

-- Index for efficient version history queries
CREATE INDEX idx_catalog_entity_versions_entity_id ON catalog_entity_versions (entity_id, version DESC);

COMMENT ON TABLE catalog_entities IS 'Service Catalog entities with unique name constraint per namespace.';
COMMENT ON COLUMN catalog_entities.version IS 'Auto-incremented version counter, starts at 1 on registration.';
COMMENT ON COLUMN catalog_entities.created_by IS 'Identity of the user who registered this entity (audit metadata).';
COMMENT ON COLUMN catalog_entities.source_repository IS 'Source repository URL recorded as audit metadata at registration.';
COMMENT ON TABLE catalog_entity_versions IS 'Version history snapshots for catalog entities. Retains at least 50 most recent versions per entity.';
