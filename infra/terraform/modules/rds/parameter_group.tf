################################################################################
# RDS Parameter Group - PostgreSQL Tuning
################################################################################

resource "aws_db_parameter_group" "main" {
  name_prefix = "${var.project_name}-${var.environment}-postgres15-"
  family      = "postgres15"
  description = "Custom parameter group for ${var.project_name}-${var.environment}"

  # Connection settings
  parameter {
    name  = "max_connections"
    value = "200"
  }

  # Memory settings
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4}"
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4}"
  }

  parameter {
    name  = "work_mem"
    value = "65536"
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "524288"
  }

  # WAL settings
  parameter {
    name  = "wal_buffers"
    value = "16384"
  }

  parameter {
    name  = "checkpoint_completion_target"
    value = "0.9"
  }

  # Query planning
  parameter {
    name  = "random_page_cost"
    value = "1.1"
  }

  parameter {
    name  = "effective_io_concurrency"
    value = "200"
  }

  # Logging
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  parameter {
    name  = "log_temp_files"
    value = "0"
  }

  # Security
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "password_encryption"
    value = "scram-sha-256"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres15-params"
  })

  lifecycle {
    create_before_destroy = true
  }
}
