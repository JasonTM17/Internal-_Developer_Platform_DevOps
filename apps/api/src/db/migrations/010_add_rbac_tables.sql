-- Migration: Add RBAC (Role-Based Access Control) tables
-- Description: Users, roles, permissions, and team management for platform access control

-- ============================================================
-- Users Table
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id VARCHAR(256) NOT NULL UNIQUE, -- SSO/IdP subject identifier
  email VARCHAR(256) NOT NULL UNIQUE,
  display_name VARCHAR(256) NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Teams Table
-- ============================================================

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

-- Team membership
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT team_members_unique UNIQUE (team_id, user_id)
);

-- ============================================================
-- Roles and Permissions
-- ============================================================

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(128) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT false, -- System roles cannot be deleted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permissions (fine-grained access control)
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource VARCHAR(64) NOT NULL, -- e.g., 'catalog', 'deployment', 'environment', 'config'
  action VARCHAR(64) NOT NULL, -- e.g., 'create', 'read', 'update', 'delete', 'deploy', 'approve'
  description TEXT NOT NULL DEFAULT '',

  CONSTRAINT permissions_resource_action_unique UNIQUE (resource, action)
);

-- Role-Permission mapping
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

  CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

-- User-Role assignments (direct)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  scope VARCHAR(32) DEFAULT 'global', -- 'global', 'team', 'service'
  scope_id VARCHAR(256), -- team_id or service_id for scoped roles
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional expiration for temporary access

  CONSTRAINT user_roles_unique UNIQUE (user_id, role_id, scope, scope_id)
);

-- Team-Role assignments
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

-- ============================================================
-- API Keys for Service Accounts
-- ============================================================

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(128) NOT NULL,
  key_hash VARCHAR(256) NOT NULL UNIQUE, -- bcrypt hash of the API key
  key_prefix VARCHAR(8) NOT NULL, -- First 8 chars for identification
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL DEFAULT '{}', -- Allowed permission scopes
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT api_keys_name_user_unique UNIQUE (name, user_id)
);

-- ============================================================
-- Indexes
-- ============================================================

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

-- ============================================================
-- Seed Default Roles and Permissions
-- ============================================================

-- Default system roles
INSERT INTO roles (name, display_name, description, is_system) VALUES
  ('platform_admin', 'Platform Administrator', 'Full access to all platform resources', true),
  ('developer', 'Developer', 'Can manage services, deploy to non-production, and view configs', true),
  ('deployer', 'Deployer', 'Can deploy to all environments and approve deployments', true),
  ('viewer', 'Viewer', 'Read-only access to all platform resources', true),
  ('service_owner', 'Service Owner', 'Full access to owned services and their deployments', true);

-- Default permissions
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

-- Triggers
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

COMMENT ON TABLE users IS 'Platform users synced from external identity provider.';
COMMENT ON TABLE teams IS 'Organizational teams with hierarchical structure.';
COMMENT ON TABLE roles IS 'Named roles grouping sets of permissions.';
COMMENT ON TABLE permissions IS 'Fine-grained permissions on platform resources.';
COMMENT ON TABLE api_keys IS 'API keys for programmatic access (CLI, CI/CD).';
