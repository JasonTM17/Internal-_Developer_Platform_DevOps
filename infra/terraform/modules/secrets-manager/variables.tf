variable "environment" {
  description = "Environment name"
  type        = string
}

variable "secrets" {
  description = "Map of secrets to manage"
  type = map(object({
    description       = string
    initial_value     = optional(string)
    rotation_enabled  = bool
    rotation_type     = optional(string, "generic")
    rotation_days     = optional(number, 30)
    rotation_schedule = optional(string)
  }))
  default = {}
}

variable "vpc_id" {
  description = "VPC ID for rotation Lambda security group"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for rotation Lambda"
  type        = list(string)
}

variable "database_cidr_blocks" {
  description = "CIDR blocks for database access from rotation Lambda"
  type        = list(string)
  default     = []
}

variable "eks_pod_role_arns" {
  description = "IAM role ARNs for EKS pods that need secret access"
  type        = list(string)
  default     = []
}

variable "replica_region" {
  description = "AWS region for secret replication"
  type        = string
  default     = "us-west-2"
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
