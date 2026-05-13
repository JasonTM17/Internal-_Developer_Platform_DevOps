-- Seed Data: Development Environment
-- Description: Realistic sample data for local development and demos

-- ============================================================
-- Sample Users
-- ============================================================

INSERT INTO users (id, external_id, email, display_name, is_active) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'auth0|dev-admin', 'admin@idp.dev', 'Platform Admin', true),
  ('a1000000-0000-0000-0000-000000000002', 'auth0|dev-alice', 'alice@idp.dev', 'Alice Engineer', true),
  ('a1000000-0000-0000-0000-000000000003', 'auth0|dev-bob', 'bob@idp.dev', 'Bob DevOps', true),
  ('a1000000-0000-0000-0000-000000000004', 'auth0|dev-carol', 'carol@idp.dev', 'Carol SRE', true),
  ('a1000000-0000-0000-0000-000000000005', 'auth0|dev-dave', 'dave@idp.dev', 'Dave Frontend', true);

-- ============================================================
-- Sample Teams
-- ============================================================

INSERT INTO teams (id, name, slug, description, created_by) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Platform Engineering', 'platform-eng', 'Core platform team', 'a1000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000002', 'Backend Services', 'backend', 'Backend microservices team', 'a1000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000003', 'Frontend', 'frontend', 'Frontend applications team', 'a1000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000004', 'SRE', 'sre', 'Site Reliability Engineering', 'a1000000-0000-0000-0000-000000000001');

-- Team memberships
INSERT INTO team_members (team_id, user_id, role) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'owner'),
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'member'),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'owner'),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000005', 'owner'),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', 'owner');

-- ============================================================
-- Sample Catalog Entities
-- ============================================================

INSERT INTO catalog_entities (id, name, namespace, owner, description, lifecycle_stage, repository_url, tags, version, source_repository, created_by) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'user-service', 'backend', 'backend', 'User authentication and profile management service', 'production', 'https://github.com/org/user-service', ARRAY['auth', 'users', 'core'], 12, 'https://github.com/org/user-service', 'alice@idp.dev'),
  ('c1000000-0000-0000-0000-000000000002', 'order-service', 'backend', 'backend', 'Order processing and management', 'production', 'https://github.com/org/order-service', ARRAY['orders', 'payments', 'core'], 8, 'https://github.com/org/order-service', 'alice@idp.dev'),
  ('c1000000-0000-0000-0000-000000000003', 'notification-service', 'backend', 'platform-eng', 'Multi-channel notification delivery', 'production', 'https://github.com/org/notification-service', ARRAY['notifications', 'email', 'slack'], 5, 'https://github.com/org/notification-service', 'bob@idp.dev'),
  ('c1000000-0000-0000-0000-000000000004', 'web-app', 'frontend', 'frontend', 'Main customer-facing web application', 'production', 'https://github.com/org/web-app', ARRAY['react', 'frontend', 'customer'], 24, 'https://github.com/org/web-app', 'dave@idp.dev'),
  ('c1000000-0000-0000-0000-000000000005', 'analytics-pipeline', 'data', 'sre', 'Real-time analytics data pipeline', 'development', 'https://github.com/org/analytics-pipeline', ARRAY['analytics', 'kafka', 'streaming'], 3, 'https://github.com/org/analytics-pipeline', 'carol@idp.dev'),
  ('c1000000-0000-0000-0000-000000000006', 'legacy-api', 'backend', 'backend', 'Legacy REST API (being migrated)', 'deprecated', 'https://github.com/org/legacy-api', ARRAY['legacy', 'migration'], 45, 'https://github.com/org/legacy-api', 'alice@idp.dev');

-- Dependencies
INSERT INTO catalog_entity_dependencies (source_entity_id, target_entity_id, dependency_type) VALUES
  ('c1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'runtime'),
  ('c1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000003', 'runtime'),
  ('c1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001', 'runtime'),
  ('c1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002', 'runtime'),
  ('c1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000002', 'data-source');

-- ============================================================
-- Sample Environments
-- ============================================================

INSERT INTO environments (id, name, tier, status, description, region, cluster_name, namespace, created_by) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'dev', 'development', 'active', 'Shared development environment', 'us-east-1', 'cluster-dev', 'ns-dev', 'admin@idp.dev'),
  ('d1000000-0000-0000-0000-000000000002', 'staging', 'staging', 'active', 'Pre-production staging environment', 'us-east-1', 'cluster-staging', 'ns-staging', 'admin@idp.dev'),
  ('d1000000-0000-0000-0000-000000000003', 'production', 'production', 'active', 'Production environment', 'us-east-1', 'cluster-prod', 'ns-production', 'admin@idp.dev'),
  ('d1000000-0000-0000-0000-000000000004', 'preview-feat-123', 'preview', 'active', 'Preview for feature branch feat/user-profiles', 'us-east-1', 'cluster-dev', 'ns-preview-feat-123', 'alice@idp.dev');

-- Environment variables
INSERT INTO environment_variables (environment_id, key, value, is_secret) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'DATABASE_URL', 'postgresql://dev:dev@localhost:5432/idp_dev', false),
  ('d1000000-0000-0000-0000-000000000001', 'REDIS_URL', 'redis://localhost:6379/0', false),
  ('d1000000-0000-0000-0000-000000000001', 'LOG_LEVEL', 'debug', false),
  ('d1000000-0000-0000-0000-000000000002', 'DATABASE_URL', 'postgresql://staging:****@db-staging:5432/idp', true),
  ('d1000000-0000-0000-0000-000000000002', 'LOG_LEVEL', 'info', false),
  ('d1000000-0000-0000-0000-000000000003', 'LOG_LEVEL', 'warn', false);

-- ============================================================
-- Sample Deployments
-- ============================================================

INSERT INTO deployments (id, service_id, environment, version, previous_version, strategy, state, initiated_by, description, created_at, completed_at) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'production', 'v1.12.0', 'v1.11.3', 'rolling', 'completed', 'alice@idp.dev', 'Release v1.12.0 with OAuth2 improvements', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 45 minutes'),
  ('e1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'staging', 'v2.3.0-rc1', 'v2.2.5', 'canary', 'in_progress', 'alice@idp.dev', 'Testing new payment flow', NOW() - INTERVAL '30 minutes', NULL),
  ('e1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000004', 'production', 'v3.1.0', 'v3.0.8', 'blue-green', 'pending_approval', 'dave@idp.dev', 'New dashboard redesign', NOW() - INTERVAL '15 minutes', NULL);

-- ============================================================
-- Sample Config Entries
-- ============================================================

INSERT INTO config_entries (id, key, value, scope, scope_id, value_type, description, version, is_encrypted, created_by, updated_by) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'app.feature-flags.dark-mode', 'true', 'global', NULL, 'boolean', 'Enable dark mode across all services', 3, false, 'admin@idp.dev', 'admin@idp.dev'),
  ('f1000000-0000-0000-0000-000000000002', 'app.rate-limit.max-requests', '100', 'environment', 'production', 'number', 'Max API requests per minute in production', 2, false, 'carol@idp.dev', 'carol@idp.dev'),
  ('f1000000-0000-0000-0000-000000000003', 'app.rate-limit.max-requests', '1000', 'environment', 'development', 'number', 'Relaxed rate limit for development', 1, false, 'carol@idp.dev', 'carol@idp.dev'),
  ('f1000000-0000-0000-0000-000000000004', 'db.connection-pool.max', '20', 'service', 'c1000000-0000-0000-0000-000000000001', 'number', 'Max DB connections for user-service', 1, false, 'alice@idp.dev', 'alice@idp.dev');
