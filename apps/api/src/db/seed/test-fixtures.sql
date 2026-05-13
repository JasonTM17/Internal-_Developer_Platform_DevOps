-- Seed Data: Test Fixtures
-- Description: Deterministic test data for integration and e2e tests
-- Note: Uses fixed UUIDs for predictable test assertions

-- ============================================================
-- Test Users (fixed IDs for assertions)
-- ============================================================

INSERT INTO users (id, external_id, email, display_name, is_active) VALUES
  ('00000000-test-0000-0000-000000000001', 'test|admin', 'test-admin@test.local', 'Test Admin', true),
  ('00000000-test-0000-0000-000000000002', 'test|developer', 'test-dev@test.local', 'Test Developer', true),
  ('00000000-test-0000-0000-000000000003', 'test|viewer', 'test-viewer@test.local', 'Test Viewer', true),
  ('00000000-test-0000-0000-000000000004', 'test|deployer', 'test-deployer@test.local', 'Test Deployer', true),
  ('00000000-test-0000-0000-000000000005', 'test|inactive', 'test-inactive@test.local', 'Inactive User', false);

-- ============================================================
-- Test Teams
-- ============================================================

INSERT INTO teams (id, name, slug, description, created_by) VALUES
  ('00000000-team-0000-0000-000000000001', 'Test Team Alpha', 'test-alpha', 'Primary test team', '00000000-test-0000-0000-000000000001'),
  ('00000000-team-0000-0000-000000000002', 'Test Team Beta', 'test-beta', 'Secondary test team', '00000000-test-0000-0000-000000000001');

INSERT INTO team_members (team_id, user_id, role) VALUES
  ('00000000-team-0000-0000-000000000001', '00000000-test-0000-0000-000000000001', 'owner'),
  ('00000000-team-0000-0000-000000000001', '00000000-test-0000-0000-000000000002', 'member'),
  ('00000000-team-0000-0000-000000000002', '00000000-test-0000-0000-000000000003', 'viewer');

-- ============================================================
-- Test Catalog Entities
-- ============================================================

INSERT INTO catalog_entities (id, name, namespace, owner, description, lifecycle_stage, repository_url, tags, version, source_repository, created_by) VALUES
  ('00000000-svc-0000-0000-000000000001', 'test-service-a', 'test-ns', 'test-alpha', 'Test service A for integration tests', 'production', 'https://github.com/test/service-a', ARRAY['test', 'api'], 5, 'https://github.com/test/service-a', 'test-dev@test.local'),
  ('00000000-svc-0000-0000-000000000002', 'test-service-b', 'test-ns', 'test-alpha', 'Test service B for integration tests', 'development', 'https://github.com/test/service-b', ARRAY['test', 'worker'], 2, 'https://github.com/test/service-b', 'test-dev@test.local'),
  ('00000000-svc-0000-0000-000000000003', 'test-service-c', 'test-ns', 'test-beta', 'Test service C (deprecated)', 'deprecated', 'https://github.com/test/service-c', ARRAY['test', 'legacy'], 10, 'https://github.com/test/service-c', 'test-dev@test.local'),
  ('00000000-svc-0000-0000-000000000004', 'test-frontend', 'test-ns', 'test-beta', 'Test frontend application', 'production', 'https://github.com/test/frontend', ARRAY['test', 'react', 'frontend'], 8, 'https://github.com/test/frontend', 'test-dev@test.local');

-- Test dependencies
INSERT INTO catalog_entity_dependencies (source_entity_id, target_entity_id, dependency_type) VALUES
  ('00000000-svc-0000-0000-000000000002', '00000000-svc-0000-0000-000000000001', 'runtime'),
  ('00000000-svc-0000-0000-000000000004', '00000000-svc-0000-0000-000000000001', 'runtime'),
  ('00000000-svc-0000-0000-000000000004', '00000000-svc-0000-0000-000000000002', 'build-time');

-- ============================================================
-- Test Environments
-- ============================================================

INSERT INTO environments (id, name, tier, status, description, region, cluster_name, namespace, created_by) VALUES
  ('00000000-env-0000-0000-000000000001', 'test-dev', 'development', 'active', 'Test development environment', 'us-east-1', 'test-cluster', 'ns-test-dev', 'test-admin@test.local'),
  ('00000000-env-0000-0000-000000000002', 'test-staging', 'staging', 'active', 'Test staging environment', 'us-east-1', 'test-cluster', 'ns-test-staging', 'test-admin@test.local'),
  ('00000000-env-0000-0000-000000000003', 'test-prod', 'production', 'active', 'Test production environment', 'us-east-1', 'test-cluster-prod', 'ns-test-prod', 'test-admin@test.local'),
  ('00000000-env-0000-0000-000000000004', 'test-preview', 'preview', 'active', 'Test preview environment', 'us-east-1', 'test-cluster', 'ns-test-preview', 'test-dev@test.local');

INSERT INTO environment_variables (environment_id, key, value, is_secret) VALUES
  ('00000000-env-0000-0000-000000000001', 'DATABASE_URL', 'postgresql://test:test@localhost:5432/test', false),
  ('00000000-env-0000-0000-000000000001', 'API_KEY', 'dGVzdC1hcGkta2V5', true),
  ('00000000-env-0000-0000-000000000002', 'DATABASE_URL', 'postgresql://staging:****@db:5432/staging', true),
  ('00000000-env-0000-0000-000000000003', 'LOG_LEVEL', 'error', false);

-- ============================================================
-- Test Deployments (various states for testing)
-- ============================================================

INSERT INTO deployments (id, service_id, environment, version, previous_version, strategy, state, initiated_by, description, auto_rollback, created_at, completed_at) VALUES
  -- Completed deployment
  ('00000000-dep-0000-0000-000000000001', '00000000-svc-0000-0000-000000000001', 'test-prod', 'v1.5.0', 'v1.4.2', 'rolling', 'completed', 'test-dev@test.local', 'Completed test deployment', true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours'),
  -- In-progress deployment
  ('00000000-dep-0000-0000-000000000002', '00000000-svc-0000-0000-000000000001', 'test-staging', 'v1.6.0-rc1', 'v1.5.0', 'canary', 'in_progress', 'test-dev@test.local', 'Canary deployment in progress', true, NOW() - INTERVAL '10 minutes', NULL),
  -- Pending approval
  ('00000000-dep-0000-0000-000000000003', '00000000-svc-0000-0000-000000000002', 'test-prod', 'v2.3.0', 'v2.2.1', 'blue-green', 'pending_approval', 'test-dev@test.local', 'Awaiting production approval', true, NOW() - INTERVAL '5 minutes', NULL),
  -- Failed deployment
  ('00000000-dep-0000-0000-000000000004', '00000000-svc-0000-0000-000000000001', 'test-staging', 'v1.5.1-bad', 'v1.5.0', 'rolling', 'failed', 'test-dev@test.local', 'Failed deployment for testing', true, NOW() - INTERVAL '2 days', NULL),
  -- Cancelled deployment
  ('00000000-dep-0000-0000-000000000005', '00000000-svc-0000-0000-000000000004', 'test-dev', 'v3.0.0-alpha', NULL, 'recreate', 'cancelled', 'test-dev@test.local', 'Cancelled by user', false, NOW() - INTERVAL '3 days', NULL);

-- Deployment events for the completed deployment
INSERT INTO deployment_events (deployment_id, event_type, state, message, actor, created_at) VALUES
  ('00000000-dep-0000-0000-000000000001', 'deployment_created', 'queued', 'Deployment initiated', 'test-dev@test.local', NOW() - INTERVAL '1 day'),
  ('00000000-dep-0000-0000-000000000001', 'deployment_started', 'in_progress', 'Deployment execution started', 'system', NOW() - INTERVAL '23 hours 55 minutes'),
  ('00000000-dep-0000-0000-000000000001', 'health_check_passed', 'verifying', 'All health checks passed', 'system', NOW() - INTERVAL '23 hours 5 minutes'),
  ('00000000-dep-0000-0000-000000000001', 'deployment_completed', 'completed', 'Deployment completed successfully', 'system', NOW() - INTERVAL '23 hours');

-- ============================================================
-- Test Config Entries
-- ============================================================

INSERT INTO config_entries (id, key, value, scope, scope_id, value_type, description, version, is_encrypted, created_by, updated_by) VALUES
  ('00000000-cfg-0000-0000-000000000001', 'test.feature.enabled', 'true', 'global', NULL, 'boolean', 'Test feature flag', 1, false, 'test-admin@test.local', 'test-admin@test.local'),
  ('00000000-cfg-0000-0000-000000000002', 'test.timeout.seconds', '30', 'environment', 'test-prod', 'number', 'Request timeout for production', 2, false, 'test-admin@test.local', 'test-admin@test.local'),
  ('00000000-cfg-0000-0000-000000000003', 'test.api.secret', 'ZW5jcnlwdGVkLXZhbHVl', 'service', '00000000-svc-0000-0000-000000000001', 'secret', 'Encrypted API secret', 1, true, 'test-admin@test.local', 'test-admin@test.local');

-- Config version history
INSERT INTO config_versions (config_id, version, value, changed_by, changed_at) VALUES
  ('00000000-cfg-0000-0000-000000000002', 1, '60', 'test-admin@test.local', NOW() - INTERVAL '7 days');

-- ============================================================
-- Test Health Check Configs
-- ============================================================

INSERT INTO health_check_configs (service_id, environment, endpoint_path, interval_seconds, timeout_seconds, is_enabled) VALUES
  ('00000000-svc-0000-0000-000000000001', 'test-prod', '/health', 30, 5, true),
  ('00000000-svc-0000-0000-000000000001', 'test-staging', '/health', 60, 10, true),
  ('00000000-svc-0000-0000-000000000002', 'test-dev', '/healthz', 60, 10, true);

-- Sample health check results
INSERT INTO health_checks (service_id, environment, endpoint_url, status, response_time_ms, status_code, checked_at) VALUES
  ('00000000-svc-0000-0000-000000000001', 'test-prod', 'https://service-a.prod/health', 'healthy', 45, 200, NOW() - INTERVAL '1 minute'),
  ('00000000-svc-0000-0000-000000000001', 'test-prod', 'https://service-a.prod/health', 'healthy', 52, 200, NOW() - INTERVAL '2 minutes'),
  ('00000000-svc-0000-0000-000000000001', 'test-prod', 'https://service-a.prod/health', 'degraded', 1200, 200, NOW() - INTERVAL '3 minutes'),
  ('00000000-svc-0000-0000-000000000001', 'test-staging', 'https://service-a.staging/health', 'unhealthy', NULL, 503, NOW() - INTERVAL '1 minute');
