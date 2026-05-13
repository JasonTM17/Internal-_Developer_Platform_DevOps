################################################################################
# ElastiCache Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs of private subnets for the cache subnet group"
  type        = list(string)
}

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.medium"
}

variable "num_cache_clusters" {
  description = "Number of cache clusters in the replication group"
  type        = number
  default     = 2

  validation {
    condition     = var.num_cache_clusters >= 1 && var.num_cache_clusters <= 6
    error_message = "Number of cache clusters must be between 1 and 6."
  }
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "eks_security_group_id" {
  description = "Security group ID of the EKS cluster for access"
  type        = string
}

variable "sns_topic_arn" {
  description = "ARN of SNS topic for ElastiCache notifications"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply to all ElastiCache resources"
  type        = map(string)
  default     = {}
}
