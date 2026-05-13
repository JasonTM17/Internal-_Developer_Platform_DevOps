-- Migration: Create notifications table
-- Description: Notification delivery tracking and routing configuration

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

-- Notification deliveries (one per channel per notification)
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

-- Notification routing rules
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

-- Notification preferences per user/team
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

-- Index for querying notifications by event type
CREATE INDEX idx_notifications_event_type ON notifications (event_type, created_at DESC);

-- Index for querying by severity
CREATE INDEX idx_notifications_severity ON notifications (severity, created_at DESC);

-- Index for delivery status tracking
CREATE INDEX idx_notification_deliveries_notification_id ON notification_deliveries (notification_id);

-- Index for failed deliveries (for retry processing)
CREATE INDEX idx_notification_deliveries_failed ON notification_deliveries (success, created_at)
  WHERE success = false;

-- Index for routing rules lookup
CREATE INDEX idx_notification_routing_event_type ON notification_routing_rules (event_type)
  WHERE is_active = true;

-- Index for user preferences
CREATE INDEX idx_notification_prefs_user_id ON notification_preferences (user_id);

-- Trigger for updated_at
CREATE TRIGGER trigger_notification_routing_updated_at
  BEFORE UPDATE ON notification_routing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_deployments_updated_at();

CREATE TRIGGER trigger_notification_prefs_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_deployments_updated_at();

COMMENT ON TABLE notifications IS 'Notification records with delivery tracking across multiple channels.';
COMMENT ON TABLE notification_deliveries IS 'Individual delivery attempts per channel for each notification.';
COMMENT ON TABLE notification_routing_rules IS 'Rules mapping event types and severities to notification channels.';
COMMENT ON TABLE notification_preferences IS 'Per-user notification channel preferences and filters.';
