###############################################################################
# Disaster Recovery Module - Variables
###############################################################################

# -----------------------------------------------------------------------------
# General Configuration
# -----------------------------------------------------------------------------

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "idp-platform"
}

variable "domain_name" {
  description = "Base domain name for the platform"
  type        = string
  default     = "idp.example.com"
}

# -----------------------------------------------------------------------------
# DR Strategy Configuration
# -----------------------------------------------------------------------------

variable "rto_minutes" {
  description = "Recovery Time Objective in minutes"
  type        = number
  default     = 15

  validation {
    condition     = var.rto_minutes >= 1 && var.rto_minutes <= 1440
    error_message = "RTO must be between 1 and 1440 minutes (24 hours)."
  }
}

variable "rpo_minutes" {
  description = "Recovery Point Objective in minutes"
  type        = number
  default     = 5

  validation {
    condition     = var.rpo_minutes >= 0 && var.rpo_minutes <= 60
    error_message = "RPO must be between 0 and 60 minutes."
  }
}

# -----------------------------------------------------------------------------
# Database DR Configuration
# -----------------------------------------------------------------------------

variable "enable_database_dr" {
  description = "Enable cross-region database replication"
  type        = bool
  default     = true
}

variable "primary_db_arn" {
  description = "ARN of the primary RDS instance to replicate"
  type        = string
  default     = ""
}

variable "dr_db_instance_class" {
  description = "Instance class for the DR database replica"
  type        = string
  default     = "db.r6g.large"
}

variable "dr_db_storage_size" {
  description = "Allocated storage for DR database in GB"
  type        = number
  default     = 100
}

variable "dr_db_max_storage_size" {
  description = "Maximum storage for DR database autoscaling in GB"
  type        = number
  default     = 500
}

variable "dr_db_iops" {
  description = "Provisioned IOPS for DR database"
  type        = number
  default     = 3000
}

variable "max_replication_lag_seconds" {
  description = "Maximum acceptable replication lag before alerting"
  type        = number
  default     = 30
}

# -----------------------------------------------------------------------------
# Networking
# -----------------------------------------------------------------------------

variable "dr_vpc_id" {
  description = "VPC ID for the DR region"
  type        = string
  default     = ""
}

variable "dr_subnet_ids" {
  description = "Subnet IDs for DR resources"
  type        = list(string)
  default     = []
}

variable "dr_app_security_group_ids" {
  description = "Security group IDs that need access to DR database"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# DNS and Load Balancing
# -----------------------------------------------------------------------------

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS records"
  type        = string
  default     = ""
}

variable "primary_endpoint" {
  description = "FQDN of the primary endpoint for health checks"
  type        = string
  default     = "api.idp.example.com"
}

variable "secondary_endpoint" {
  description = "FQDN of the secondary endpoint for health checks"
  type        = string
  default     = "api-dr.idp.example.com"
}

variable "primary_lb_dns_name" {
  description = "DNS name of the primary load balancer"
  type        = string
  default     = ""
}

variable "primary_lb_zone_id" {
  description = "Zone ID of the primary load balancer"
  type        = string
  default     = ""
}

variable "secondary_lb_dns_name" {
  description = "DNS name of the secondary load balancer"
  type        = string
  default     = ""
}

variable "secondary_lb_zone_id" {
  description = "Zone ID of the secondary load balancer"
  type        = string
  default     = ""
}

# -----------------------------------------------------------------------------
# Backup Configuration
# -----------------------------------------------------------------------------

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 90

  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 3650
    error_message = "Backup retention must be between 7 and 3650 days."
  }
}

variable "backup_destination_vault_arn" {
  description = "ARN of the backup vault in the DR region for cross-region copies"
  type        = string
  default     = ""
}

# -----------------------------------------------------------------------------
# Alerting
# -----------------------------------------------------------------------------

variable "alarm_sns_topic_arns" {
  description = "SNS topic ARNs for CloudWatch alarm notifications"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "idp-platform"
    ManagedBy   = "terraform"
    Environment = "dr"
    Component   = "disaster-recovery"
  }
}
