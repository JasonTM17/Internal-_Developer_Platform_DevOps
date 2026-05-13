################################################################################
# S3 Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "aws_region" {
  description = "AWS region for bucket naming"
  type        = string
}

variable "enable_versioning" {
  description = "Enable versioning on all buckets"
  type        = bool
  default     = true
}

variable "artifacts_lifecycle_ia_days" {
  description = "Days before transitioning artifacts to Infrequent Access"
  type        = number
  default     = 30
}

variable "artifacts_lifecycle_glacier_days" {
  description = "Days before transitioning artifacts to Glacier"
  type        = number
  default     = 90
}

variable "logs_retention_days" {
  description = "Days to retain logs before expiration"
  type        = number
  default     = 180
}

variable "backups_retention_days" {
  description = "Days to retain backups before expiration"
  type        = number
  default     = 365
}

variable "tags" {
  description = "Tags to apply to all S3 resources"
  type        = map(string)
  default     = {}
}
