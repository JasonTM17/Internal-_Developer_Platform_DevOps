################################################################################
# CloudWatch Metric Alarms
################################################################################

################################################################################
# EKS Alarms
################################################################################

resource "aws_cloudwatch_metric_alarm" "eks_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-eks-cpu-high"
  alarm_description   = "EKS cluster CPU utilization is above ${var.cpu_alarm_threshold}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "node_cpu_utilization"
  namespace           = "ContainerInsights"
  period              = var.alarm_period_seconds
  statistic           = "Average"
  threshold           = var.cpu_alarm_threshold
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.eks_cluster_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "eks_memory" {
  alarm_name          = "${var.project_name}-${var.environment}-eks-memory-high"
  alarm_description   = "EKS cluster memory utilization is above ${var.memory_alarm_threshold}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "node_memory_utilization"
  namespace           = "ContainerInsights"
  period              = var.alarm_period_seconds
  statistic           = "Average"
  threshold           = var.memory_alarm_threshold
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.eks_cluster_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "eks_pod_restart" {
  alarm_name          = "${var.project_name}-${var.environment}-eks-pod-restarts"
  alarm_description   = "Pod restart count is abnormally high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "pod_number_of_container_restarts"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Maximum"
  threshold           = 5
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.eks_cluster_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

################################################################################
# RDS Alarms
################################################################################

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-cpu-high"
  alarm_description   = "RDS CPU utilization is above ${var.cpu_alarm_threshold}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = var.alarm_period_seconds
  statistic           = "Average"
  threshold           = var.cpu_alarm_threshold
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "rds_free_storage" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-storage-low"
  alarm_description   = "RDS free storage space is below 5GB"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5368709120 # 5 GB in bytes
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.critical.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-connections-high"
  alarm_description   = "RDS connection count is above ${var.rds_connection_threshold}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = var.rds_connection_threshold
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "rds_replica_lag" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-replica-lag"
  alarm_description   = "RDS replica lag is above 30 seconds"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReplicaLag"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 30
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.critical.arn]

  tags = var.tags
}

################################################################################
# ElastiCache Redis Alarms
################################################################################

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-memory-high"
  alarm_description   = "Redis memory utilization is above ${var.memory_alarm_threshold}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = var.alarm_period_seconds
  statistic           = "Average"
  threshold           = var.memory_alarm_threshold
  treat_missing_data  = "notBreaching"

  dimensions = {
    ReplicationGroupId = var.redis_cluster_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-evictions"
  alarm_description   = "Redis evictions detected - cache may be undersized"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  treat_missing_data  = "notBreaching"

  dimensions = {
    ReplicationGroupId = var.redis_cluster_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-cpu-high"
  alarm_description   = "Redis CPU utilization is above 75%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "EngineCPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  treat_missing_data  = "notBreaching"

  dimensions = {
    ReplicationGroupId = var.redis_cluster_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = var.tags
}
