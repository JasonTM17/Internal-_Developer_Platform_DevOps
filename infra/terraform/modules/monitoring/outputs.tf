################################################################################
# Monitoring Module Outputs
################################################################################

output "alerts_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "critical_topic_arn" {
  description = "ARN of the SNS topic for critical alerts"
  value       = aws_sns_topic.critical.arn
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "log_group_names" {
  description = "Map of log group names"
  value = {
    application = aws_cloudwatch_log_group.application.name
    platform    = aws_cloudwatch_log_group.platform.name
    security    = aws_cloudwatch_log_group.security.name
  }
}

output "alarm_arns" {
  description = "ARNs of all CloudWatch alarms"
  value = {
    eks_cpu      = aws_cloudwatch_metric_alarm.eks_cpu.arn
    rds_cpu      = aws_cloudwatch_metric_alarm.rds_cpu.arn
    redis_memory = aws_cloudwatch_metric_alarm.redis_memory.arn
  }
}
