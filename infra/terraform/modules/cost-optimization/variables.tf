###############################################################################
# Cost Optimization Module - Variables
###############################################################################

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "idp-platform"
}

variable "eks_cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "node_role_arn" {
  description = "IAM role ARN for EKS node groups"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for node groups"
  type        = list(string)
}

# Kubecost
variable "kubecost_version" {
  description = "Kubecost Helm chart version"
  type        = string
  default     = "1.106.0"
}

variable "kubecost_token" {
  description = "Kubecost product token"
  type        = string
  default     = ""
  sensitive   = true
}

variable "metrics_retention_days" {
  description = "Prometheus metrics retention in days"
  type        = number
  default     = 15
}

# Spot Instances
variable "spot_instance_types" {
  description = "Instance types for Spot node group (diversified for availability)"
  type        = list(string)
  default     = ["m6i.large", "m5.large", "m6a.large", "m5a.large", "c6i.large", "c5.large"]
}

variable "spot_desired_size" {
  description = "Desired number of Spot nodes"
  type        = number
  default     = 3
}

variable "spot_min_size" {
  description = "Minimum number of Spot nodes"
  type        = number
  default     = 1
}

variable "spot_max_size" {
  description = "Maximum number of Spot nodes"
  type        = number
  default     = 15
}

# Karpenter
variable "enable_karpenter" {
  description = "Enable Karpenter provisioner for intelligent scaling"
  type        = bool
  default     = true
}

variable "karpenter_cpu_limit" {
  description = "Maximum CPU cores Karpenter can provision"
  type        = string
  default     = "100"
}

variable "karpenter_memory_limit" {
  description = "Maximum memory Karpenter can provision"
  type        = string
  default     = "400Gi"
}

# Budget Alerts
variable "monthly_budget_limit" {
  description = "Monthly budget limit in USD"
  type        = string
  default     = "5000"
}

variable "compute_budget_limit" {
  description = "Monthly compute budget limit in USD"
  type        = string
  default     = "3000"
}

variable "budget_alert_emails" {
  description = "Email addresses for budget alerts"
  type        = list(string)
  default     = ["platform-team@example.com"]
}

variable "budget_sns_topic_arns" {
  description = "SNS topic ARNs for critical budget alerts"
  type        = list(string)
  default     = []
}

# Resource Quotas
variable "namespace_cpu_quota" {
  description = "CPU request quota for platform namespace"
  type        = string
  default     = "20"
}

variable "namespace_memory_quota" {
  description = "Memory request quota for platform namespace"
  type        = string
  default     = "40Gi"
}

variable "namespace_cpu_limit" {
  description = "CPU limit quota for platform namespace"
  type        = string
  default     = "40"
}

variable "namespace_memory_limit" {
  description = "Memory limit quota for platform namespace"
  type        = string
  default     = "80Gi"
}

variable "namespace_pod_limit" {
  description = "Maximum pods in platform namespace"
  type        = string
  default     = "100"
}

# Tags
variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "idp-platform"
    ManagedBy   = "terraform"
    CostCenter  = "engineering"
  }
}
