################################################################################
# IAM Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "eks_oidc_provider" {
  description = "EKS OIDC provider URL (without https://)"
  type        = string
}

variable "eks_oidc_issuer" {
  description = "EKS OIDC issuer URL"
  type        = string
}

variable "s3_artifacts_arn" {
  description = "ARN of the S3 artifacts bucket"
  type        = string
}

variable "s3_backups_arn" {
  description = "ARN of the S3 backups bucket"
  type        = string
}

variable "ecr_repository_arns" {
  description = "Map of ECR repository ARNs"
  type        = map(string)
}

variable "github_org" {
  description = "GitHub organization for OIDC federation"
  type        = string
  default     = "platform-engineering"
}

variable "github_repo" {
  description = "GitHub repository for OIDC federation"
  type        = string
  default     = "internal-developer-platform"
}

variable "tags" {
  description = "Tags to apply to all IAM resources"
  type        = map(string)
  default     = {}
}
