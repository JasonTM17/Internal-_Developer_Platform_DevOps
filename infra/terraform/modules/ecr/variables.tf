################################################################################
# ECR Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "repository_names" {
  description = "List of ECR repository names to create"
  type        = list(string)

  validation {
    condition     = length(var.repository_names) > 0
    error_message = "At least one repository name must be specified."
  }
}

variable "image_tag_mutability" {
  description = "Image tag mutability setting (MUTABLE or IMMUTABLE)"
  type        = string
  default     = "IMMUTABLE"

  validation {
    condition     = contains(["MUTABLE", "IMMUTABLE"], var.image_tag_mutability)
    error_message = "Image tag mutability must be MUTABLE or IMMUTABLE."
  }
}

variable "max_image_count" {
  description = "Maximum number of images to retain per repository"
  type        = number
  default     = 30
}

variable "untagged_image_expiry_days" {
  description = "Number of days to retain untagged images"
  type        = number
  default     = 7
}

variable "cross_account_ids" {
  description = "AWS account IDs for cross-account ECR access"
  type        = list(string)
  default     = null
}

variable "enable_replication" {
  description = "Enable cross-region replication for DR"
  type        = bool
  default     = false
}

variable "replication_region" {
  description = "Target region for ECR replication"
  type        = string
  default     = "us-west-2"
}

variable "tags" {
  description = "Tags to apply to all ECR resources"
  type        = map(string)
  default     = {}
}
