#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Database Seed Script
# =============================================================================
# Seeds the development database with sample data for local development.
# Usage: ./scripts/db-seed.sh
# =============================================================================

DATABASE_URL="${DATABASE_URL:-postgresql://idp:idp_secret@localhost:5432/idp_dev}"

echo "=============================================="
echo "  Database Seed - Development Data"
echo "=============================================="
echo ""

echo "Seeding teams..."
psql "$DATABASE_URL" << 'SQL'
INSERT INTO teams (id, name, slug, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Platform Engineering', 'platform-eng', 'Core platform team'),
  ('22222222-2222-2222-2222-222222222222', 'Backend Team', 'backend', 'Backend services team'),
  ('33333333-3333-3333-3333-333333333333', 'Frontend Team', 'frontend', 'Frontend applications team'),
  ('44444444-4444-4444-4444-444444444444', 'Data Engineering', 'data-eng', 'Data pipeline team')
ON CONFLICT (id) DO NOTHING;
SQL

echo "Seeding users..."
psql "$DATABASE_URL" << 'SQL'
INSERT INTO users (id, email, name, role, team_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@idp.local', 'Platform Admin', 'org-admin', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'dev@idp.local', 'Dev User', 'developer', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'lead@idp.local', 'Team Lead', 'team-admin', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;
SQL

echo "Seeding service catalog..."
psql "$DATABASE_URL" << 'SQL'
INSERT INTO catalog_entities (id, kind, name, namespace, description, owner_team_id, metadata) VALUES
  ('s1000001-0000-0000-0000-000000000001', 'service', 'user-service', 'backend', 'User management microservice', '22222222-2222-2222-2222-222222222222', '{"language": "typescript", "framework": "express", "tier": "critical"}'),
  ('s1000002-0000-0000-0000-000000000002', 'service', 'payment-service', 'backend', 'Payment processing service', '22222222-2222-2222-2222-222222222222', '{"language": "go", "framework": "gin", "tier": "critical"}'),
  ('s1000003-0000-0000-0000-000000000003', 'service', 'notification-service', 'backend', 'Email and push notifications', '22222222-2222-2222-2222-222222222222', '{"language": "typescript", "framework": "nestjs", "tier": "standard"}'),
  ('s1000004-0000-0000-0000-000000000004', 'website', 'customer-portal', 'frontend', 'Customer-facing web application', '33333333-3333-3333-3333-333333333333', '{"language": "typescript", "framework": "react", "tier": "critical"}'),
  ('s1000005-0000-0000-0000-000000000005', 'service', 'data-pipeline', 'data', 'ETL data processing pipeline', '44444444-4444-4444-4444-444444444444', '{"language": "python", "framework": "airflow", "tier": "standard"}')
ON CONFLICT (id) DO NOTHING;
SQL

echo "Seeding environments..."
psql "$DATABASE_URL" << 'SQL'
INSERT INTO environments (id, name, slug, cluster, namespace) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'Development', 'dev', 'idp-dev', 'idp-dev'),
  ('e0000002-0000-0000-0000-000000000002', 'Staging', 'staging', 'idp-staging', 'idp-staging'),
  ('e0000003-0000-0000-0000-000000000003', 'Production', 'production', 'idp-production', 'idp-production')
ON CONFLICT (id) DO NOTHING;
SQL

echo ""
echo "✓ Database seeded successfully!"
echo ""
echo "Test credentials:"
echo "  Admin: admin@idp.local"
echo "  Dev:   dev@idp.local"
echo "  Lead:  lead@idp.local"
