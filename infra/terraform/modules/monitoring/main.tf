################################################################################
# Monitoring Module - CloudWatch Configuration
################################################################################

################################################################################
# SNS Topic for Alerts
################################################################################

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"

  kms_master_key_id = "alias/aws/sns"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-alerts"
  })
}

resource "aws_sns_topic_policy" "alerts" {
  arn = aws_sns_topic.alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudWatchAlarms"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.alerts.arn
      },
      {
        Sid    = "AllowRDSEvents"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.alerts.arn
      }
    ]
  })
}

################################################################################
# SNS Topic for Critical Alerts (PagerDuty/OpsGenie integration)
################################################################################

resource "aws_sns_topic" "critical" {
  name = "${var.project_name}-${var.environment}-critical-alerts"

  kms_master_key_id = "alias/aws/sns"

  tags = merge(var.tags, {
    Name     = "${var.project_name}-${var.environment}-critical-alerts"
    Severity = "critical"
  })
}

################################################################################
# RDS Event Subscription
################################################################################

resource "aws_db_event_subscription" "main" {
  name      = "${var.project_name}-${var.environment}-rds-events"
  sns_topic = aws_sns_topic.alerts.arn

  source_type = "db-instance"
  source_ids  = [var.rds_instance_id]

  event_categories = [
    "availability",
    "deletion",
    "failover",
    "failure",
    "low storage",
    "maintenance",
    "recovery",
  ]

  tags = var.tags
}

################################################################################
# Composite Alarm for Platform Health
################################################################################

resource "aws_cloudwatch_composite_alarm" "platform_health" {
  alarm_name        = "${var.project_name}-${var.environment}-platform-health"
  alarm_description = "Composite alarm for overall platform health"

  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.eks_cpu.alarm_name}) OR ALARM(${aws_cloudwatch_metric_alarm.rds_cpu.alarm_name}) OR ALARM(${aws_cloudwatch_metric_alarm.redis_memory.alarm_name})"

  alarm_actions = [aws_sns_topic.critical.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = var.tags
}
