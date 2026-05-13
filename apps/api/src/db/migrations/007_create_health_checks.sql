-- Migration: Create health_checks table
-- Description: Health check results and service availability tracking

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

-- Health check configuration per service/environment
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

-- Service availability summary (materialized for dashboards)
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

-- Index for querying health checks by service and environment
CREATE INDEX idx_health_checks_service_env ON health_checks (service_id, environment, checked_at DESC);

-- Index for finding unhealthy services
CREATE INDEX idx_health_checks_status ON health_checks (status, checked_at DESC)
  WHERE status != 'healthy';

-- Index for response time analysis
CREATE INDEX idx_health_checks_response_time ON health_checks (service_id, environment, response_time_ms)
  WHERE response_time_ms IS NOT NULL;

-- Index for health check configs lookup
CREATE INDEX idx_health_check_configs_enabled ON health_check_configs (is_enabled)
  WHERE is_enabled = true;

-- Index for availability queries
CREATE INDEX idx_service_availability_date ON service_availability (service_id, environment, date DESC);

-- Partition health_checks by month for efficient data management
-- (In production, use pg_partman or native partitioning)
-- This comment documents the intended partitioning strategy:
-- CREATE TABLE health_checks (...) PARTITION BY RANGE (checked_at);

-- Retention policy: health check records older than 90 days can be archived
-- Availability summaries are retained indefinitely

COMMENT ON TABLE health_checks IS 'Individual health check probe results for service monitoring.';
COMMENT ON TABLE health_check_configs IS 'Health check configuration per service and environment.';
COMMENT ON TABLE service_availability IS 'Daily availability summary for SLA reporting and dashboards.';
COMMENT ON COLUMN health_checks.response_time_ms IS 'Response time in milliseconds (NULL if check timed out).';
COMMENT ON COLUMN service_availability.uptime_percentage IS 'Percentage of successful checks for the day (0.00-100.00).';
