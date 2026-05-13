###############################################################################
# Disaster Recovery Module
# Implements cross-region DR with automated failover, backup management,
# and recovery procedures for the IDP platform.
###############################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# RDS Cross-Region Read Replica (Database DR)
# -----------------------------------------------------------------------------

resource "aws_db_instance" "dr_replica" {
  count = var.enable_database_dr ? 1 : 0

  identifier     = "${var.project_name}-dr-replica"
  instance_class = var.dr_db_instance_class

  replicate_source_db = var.primary_db_arn

  # DR-specific configuration
  multi_az               = true
  storage_encrypted      = true
  kms_key_id             = aws_kms_key.dr_encryption[0].arn
  deletion_protection    = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "${var.project_name}-dr-final-${formatdate("YYYY-MM-DD", timestamp())}"

  # Performance configuration
  storage_type          = "gp3"
  allocated_storage     = var.dr_db_storage_size
  max_allocated_storage = var.dr_db_max_storage_size
  iops                  = var.dr_db_iops

  # Monitoring
  monitoring_interval          = 30
  monitoring_role_arn          = aws_iam_role.rds_monitoring[0].arn
  performance_insights_enabled = true
  performance_insights_retention_period = 7

  # Maintenance
  auto_minor_version_upgrade = true
  maintenance_window         = "sun:04:00-sun:05:00"

  # Network
  db_subnet_group_name   = aws_db_subnet_group.dr[0].name
  vpc_security_group_ids = [aws_security_group.dr_database[0].id]

  tags = merge(var.tags, {
    "dr/role"     = "replica"
    "dr/priority" = "1"
    "dr/rto"      = var.rto_minutes
    "dr/rpo"      = var.rpo_minutes
  })
}

resource "aws_db_subnet_group" "dr" {
  count = var.enable_database_dr ? 1 : 0

  name       = "${var.project_name}-dr-subnet-group"
  subnet_ids = var.dr_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.project_name}-dr-subnet-group"
  })
}

resource "aws_security_group" "dr_database" {
  count = var.enable_database_dr ? 1 : 0

  name_prefix = "${var.project_name}-dr-db-"
  vpc_id      = var.dr_vpc_id
  description = "Security group for DR database replica"

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.dr_app_security_group_ids
    description     = "PostgreSQL access from DR application"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-dr-database-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# S3 Cross-Region Replication (Object Storage DR)
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "dr_backup" {
  bucket = "${var.project_name}-dr-backup-${data.aws_caller_identity.current.account_id}"

  tags = merge(var.tags, {
    "dr/role" = "backup-target"
  })
}

resource "aws_s3_bucket_versioning" "dr_backup" {
  bucket = aws_s3_bucket.dr_backup.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "dr_backup" {
  bucket = aws_s3_bucket.dr_backup.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.dr_encryption[0].arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "dr_backup" {
  bucket = aws_s3_bucket.dr_backup.id

  rule {
    id     = "backup-lifecycle"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = var.backup_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_public_access_block" "dr_backup" {
  bucket = aws_s3_bucket.dr_backup.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# -----------------------------------------------------------------------------
# KMS Key for DR Encryption
# -----------------------------------------------------------------------------

resource "aws_kms_key" "dr_encryption" {
  count = var.enable_database_dr ? 1 : 0

  description             = "KMS key for DR encryption - ${var.project_name}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  multi_region            = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowRDSAccess"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-dr-kms"
  })
}

resource "aws_kms_alias" "dr_encryption" {
  count = var.enable_database_dr ? 1 : 0

  name          = "alias/${var.project_name}-dr"
  target_key_id = aws_kms_key.dr_encryption[0].key_id
}

# -----------------------------------------------------------------------------
# Route53 Health Checks for Automated Failover
# -----------------------------------------------------------------------------

resource "aws_route53_health_check" "primary" {
  fqdn              = var.primary_endpoint
  port              = 443
  type              = "HTTPS"
  resource_path     = "/healthz"
  failure_threshold = 3
  request_interval  = 10

  regions = ["us-east-1", "us-west-2", "eu-west-1"]

  tags = merge(var.tags, {
    Name = "${var.project_name}-primary-health"
  })
}

resource "aws_route53_health_check" "secondary" {
  fqdn              = var.secondary_endpoint
  port              = 443
  type              = "HTTPS"
  resource_path     = "/healthz"
  failure_threshold = 3
  request_interval  = 10

  regions = ["us-west-2", "us-east-1", "eu-west-1"]

  tags = merge(var.tags, {
    Name = "${var.project_name}-secondary-health"
  })
}

# Failover DNS records
resource "aws_route53_record" "primary" {
  zone_id = var.route53_zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier  = "primary"
  health_check_id = aws_route53_health_check.primary.id

  alias {
    name                   = var.primary_lb_dns_name
    zone_id                = var.primary_lb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "secondary" {
  zone_id = var.route53_zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  failover_routing_policy {
    type = "SECONDARY"
  }

  set_identifier  = "secondary"
  health_check_id = aws_route53_health_check.secondary.id

  alias {
    name                   = var.secondary_lb_dns_name
    zone_id                = var.secondary_lb_zone_id
    evaluate_target_health = true
  }
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms for DR Monitoring
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "dr_replication_lag" {
  count = var.enable_database_dr ? 1 : 0

  alarm_name          = "${var.project_name}-dr-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReplicaLag"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = var.max_replication_lag_seconds
  alarm_description   = "DR database replication lag exceeds ${var.max_replication_lag_seconds}s"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.dr_replica[0].identifier
  }

  alarm_actions = var.alarm_sns_topic_arns
  ok_actions    = var.alarm_sns_topic_arns

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "primary_health" {
  alarm_name          = "${var.project_name}-primary-health-failed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Primary endpoint health check failing - DR failover may be triggered"

  dimensions = {
    HealthCheckId = aws_route53_health_check.primary.id
  }

  alarm_actions = var.alarm_sns_topic_arns
  ok_actions    = var.alarm_sns_topic_arns

  tags = var.tags
}

# -----------------------------------------------------------------------------
# IAM Role for RDS Enhanced Monitoring
# -----------------------------------------------------------------------------

resource "aws_iam_role" "rds_monitoring" {
  count = var.enable_database_dr ? 1 : 0

  name = "${var.project_name}-dr-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count = var.enable_database_dr ? 1 : 0

  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# -----------------------------------------------------------------------------
# AWS Backup for Automated Backup Management
# -----------------------------------------------------------------------------

resource "aws_backup_vault" "dr" {
  name        = "${var.project_name}-dr-vault"
  kms_key_arn = var.enable_database_dr ? aws_kms_key.dr_encryption[0].arn : null

  tags = var.tags
}

resource "aws_backup_plan" "dr" {
  name = "${var.project_name}-dr-backup-plan"

  rule {
    rule_name         = "daily-backup"
    target_vault_name = aws_backup_vault.dr.name
    schedule          = "cron(0 3 * * ? *)"
    start_window      = 60
    completion_window = 180

    lifecycle {
      cold_storage_after = 30
      delete_after       = var.backup_retention_days
    }

    copy_action {
      destination_vault_arn = var.backup_destination_vault_arn
      lifecycle {
        delete_after = var.backup_retention_days
      }
    }
  }

  rule {
    rule_name         = "hourly-backup"
    target_vault_name = aws_backup_vault.dr.name
    schedule          = "cron(0 * * * ? *)"
    start_window      = 60
    completion_window = 120

    lifecycle {
      delete_after = 7
    }
  }

  tags = var.tags
}
