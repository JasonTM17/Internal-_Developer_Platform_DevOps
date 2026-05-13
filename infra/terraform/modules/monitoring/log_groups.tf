################################################################################
# CloudWatch Log Groups
################################################################################

################################################################################
# Application Log Groups
################################################################################

resource "aws_cloudwatch_log_group" "application" {
  name              = "/${var.project_name}/${var.environment}/application"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-application-logs"
    Purpose = "application"
  })
}

resource "aws_cloudwatch_log_group" "platform" {
  name              = "/${var.project_name}/${var.environment}/platform"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-platform-logs"
    Purpose = "platform"
  })
}

resource "aws_cloudwatch_log_group" "security" {
  name              = "/${var.project_name}/${var.environment}/security"
  retention_in_days = 90 # Security logs retained longer

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-security-logs"
    Purpose = "security"
  })
}

################################################################################
# Infrastructure Log Groups
################################################################################

resource "aws_cloudwatch_log_group" "nginx_ingress" {
  name              = "/${var.project_name}/${var.environment}/nginx-ingress"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-nginx-ingress-logs"
    Purpose = "ingress"
  })
}

resource "aws_cloudwatch_log_group" "cert_manager" {
  name              = "/${var.project_name}/${var.environment}/cert-manager"
  retention_in_days = 14

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-cert-manager-logs"
    Purpose = "certificates"
  })
}

resource "aws_cloudwatch_log_group" "external_dns" {
  name              = "/${var.project_name}/${var.environment}/external-dns"
  retention_in_days = 14

  tags = merge(var.tags, {
    Name    = "${var.project_name}-${var.environment}-external-dns-logs"
    Purpose = "dns"
  })
}

################################################################################
# Metric Filters for Error Detection
################################################################################

resource "aws_cloudwatch_log_metric_filter" "application_errors" {
  name           = "${var.project_name}-${var.environment}-app-errors"
  pattern        = "[timestamp, level = \"ERROR\", ...]"
  log_group_name = aws_cloudwatch_log_group.application.name

  metric_transformation {
    name          = "ApplicationErrors"
    namespace     = "${var.project_name}/${var.environment}"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "application_5xx" {
  name           = "${var.project_name}-${var.environment}-5xx-errors"
  pattern        = "{ $.statusCode >= 500 }"
  log_group_name = aws_cloudwatch_log_group.application.name

  metric_transformation {
    name          = "HTTP5xxErrors"
    namespace     = "${var.project_name}/${var.environment}"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "security_auth_failures" {
  name           = "${var.project_name}-${var.environment}-auth-failures"
  pattern        = "{ $.event = \"authentication_failed\" }"
  log_group_name = aws_cloudwatch_log_group.security.name

  metric_transformation {
    name          = "AuthenticationFailures"
    namespace     = "${var.project_name}/${var.environment}"
    value         = "1"
    default_value = "0"
  }
}

################################################################################
# Alarms based on Metric Filters
################################################################################

resource "aws_cloudwatch_metric_alarm" "application_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-app-error-rate"
  alarm_description   = "Application error rate is above threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ApplicationErrors"
  namespace           = "${var.project_name}/${var.environment}"
  period              = 300
  statistic           = "Sum"
  threshold           = 50
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "auth_failures" {
  alarm_name          = "${var.project_name}-${var.environment}-auth-failure-rate"
  alarm_description   = "Authentication failure rate is abnormally high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "AuthenticationFailures"
  namespace           = "${var.project_name}/${var.environment}"
  period              = 300
  statistic           = "Sum"
  threshold           = 20
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.critical.arn]

  tags = var.tags
}
