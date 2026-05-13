-- Migration: Create deployment history views and aggregation
-- Description: Materialized views and functions for deployment analytics and reporting

-- ============================================================
-- Deployment History Summary View
-- ============================================================

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

-- Index on the materialized view
CREATE UNIQUE INDEX idx_deployment_history_summary_pk
  ON deployment_history_summary (service_id, environment);

CREATE INDEX idx_deployment_history_summary_service
  ON deployment_history_summary (service_name, environment);

-- ============================================================
-- Daily Deployment Metrics
-- ============================================================

CREATE TABLE deployment_daily_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  environment VARCHAR(64) NOT NULL,
  total_deployments INTEGER NOT NULL DEFAULT 0,
  successful_deployments INTEGER NOT NULL DEFAULT 0,
  failed_deployments INTEGER NOT NULL DEFAULT 0,
  avg_duration_seconds NUMERIC(10, 2),
  deployment_frequency NUMERIC(10, 4), -- deployments per hour
  change_failure_rate NUMERIC(5, 2), -- percentage
  mean_time_to_recovery_seconds NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT deployment_daily_metrics_unique UNIQUE (date, environment)
);

-- Index for DORA metrics queries
CREATE INDEX idx_deployment_daily_metrics_date
  ON deployment_daily_metrics (date DESC, environment);

-- ============================================================
-- Function: Calculate DORA Metrics
-- ============================================================

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
    -- Deployment Frequency (deployments per day)
    COUNT(*)::NUMERIC / GREATEST(1, (p_end_date - p_start_date)) AS deployment_frequency,

    -- Lead Time for Changes (avg time from commit to deploy)
    AVG(EXTRACT(EPOCH FROM (d.completed_at - d.created_at)))
      FILTER (WHERE d.state = 'completed') AS lead_time_for_changes_seconds,

    -- Change Failure Rate (% of deployments that fail)
    ROUND(
      COUNT(*) FILTER (WHERE d.state IN ('failed', 'rolled_back'))::NUMERIC /
      NULLIF(COUNT(*), 0) * 100, 2
    ) AS change_failure_rate,

    -- Mean Time to Recovery (avg time from failure to next success)
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

-- ============================================================
-- Function: Refresh Deployment Summary
-- ============================================================

CREATE OR REPLACE FUNCTION refresh_deployment_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY deployment_history_summary;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Scheduled refresh (requires pg_cron extension in production)
-- ============================================================
-- SELECT cron.schedule('refresh-deployment-summary', '*/15 * * * *', 'SELECT refresh_deployment_summary()');

COMMENT ON MATERIALIZED VIEW deployment_history_summary IS 'Aggregated deployment statistics per service and environment. Refreshed every 15 minutes.';
COMMENT ON TABLE deployment_daily_metrics IS 'Daily deployment metrics for DORA performance tracking.';
COMMENT ON FUNCTION calculate_dora_metrics IS 'Calculate DORA metrics (deployment frequency, lead time, change failure rate, MTTR) for a given environment and date range.';
