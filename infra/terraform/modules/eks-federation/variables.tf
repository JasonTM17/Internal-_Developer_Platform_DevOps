###############################################################################
# EKS Federation Module - Variables
###############################################################################

# -----------------------------------------------------------------------------
# Cluster Configuration
# -----------------------------------------------------------------------------

variable "cluster_name_prefix" {
  description = "Prefix for EKS cluster names (e.g., 'idp' creates 'idp-primary' and 'idp-secondary')"
  type        = string
  default     = "idp"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,20}$", var.cluster_name_prefix))
    error_message = "Cluster name prefix must be lowercase alphanumeric with hyphens, 3-21 characters."
  }
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS clusters"
  type        = string
  default     = "1.28"

  validation {
    condition     = can(regex("^1\\.(2[6-9]|3[0-9])$", var.kubernetes_version))
    error_message = "Kubernetes version must be 1.26 or higher."
  }
}

variable "enable_multi_cluster" {
  description = "Enable secondary cluster deployment for multi-region setup"
  type        = bool
  default     = true
}

variable "enable_federation" {
  description = "Enable KubeFed installation on primary cluster"
  type        = bool
  default     = true
}

variable "enable_public_access" {
  description = "Enable public access to EKS API endpoints"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Networking
# -----------------------------------------------------------------------------

variable "primary_vpc_id" {
  description = "VPC ID for the primary cluster"
  type        = string
}

variable "primary_subnet_ids" {
  description = "Subnet IDs for the primary cluster (minimum 2 AZs)"
  type        = list(string)

  validation {
    condition     = length(var.primary_subnet_ids) >= 2
    error_message = "At least 2 subnet IDs are required for high availability."
  }
}

variable "secondary_vpc_id" {
  description = "VPC ID for the secondary cluster"
  type        = string
  default     = ""
}

variable "secondary_subnet_ids" {
  description = "Subnet IDs for the secondary cluster"
  type        = list(string)
  default     = []
}

variable "secondary_region" {
  description = "AWS region for the secondary cluster"
  type        = string
  default     = "us-west-2"
}

variable "secondary_cluster_sg_id" {
  description = "Security group ID of the secondary cluster for cross-cluster communication"
  type        = string
  default     = ""
}

# -----------------------------------------------------------------------------
# Node Groups - System
# -----------------------------------------------------------------------------

variable "system_node_instance_types" {
  description = "Instance types for system node group"
  type        = list(string)
  default     = ["m6i.large", "m5.large"]
}

variable "system_node_min_size" {
  description = "Minimum number of system nodes"
  type        = number
  default     = 2
}

variable "system_node_max_size" {
  description = "Maximum number of system nodes"
  type        = number
  default     = 5
}

variable "system_node_desired_size" {
  description = "Desired number of system nodes"
  type        = number
  default     = 3
}

# -----------------------------------------------------------------------------
# Node Groups - Workload
# -----------------------------------------------------------------------------

variable "workload_node_instance_types" {
  description = "Instance types for workload node group"
  type        = list(string)
  default     = ["m6i.xlarge", "m5.xlarge", "m6a.xlarge"]
}

variable "workload_node_min_size" {
  description = "Minimum number of workload nodes"
  type        = number
  default     = 3
}

variable "workload_node_max_size" {
  description = "Maximum number of workload nodes"
  type        = number
  default     = 20
}

variable "workload_node_desired_size" {
  description = "Desired number of workload nodes"
  type        = number
  default     = 5
}

# -----------------------------------------------------------------------------
# Federation Configuration
# -----------------------------------------------------------------------------

variable "kubefed_version" {
  description = "KubeFed Helm chart version"
  type        = string
  default     = "0.10.0"
}

# -----------------------------------------------------------------------------
# Global Accelerator
# -----------------------------------------------------------------------------

variable "enable_global_accelerator" {
  description = "Enable AWS Global Accelerator for multi-region traffic routing"
  type        = bool
  default     = false
}

variable "primary_traffic_percentage" {
  description = "Percentage of traffic routed to primary region (0-100)"
  type        = number
  default     = 100

  validation {
    condition     = var.primary_traffic_percentage >= 0 && var.primary_traffic_percentage <= 100
    error_message = "Traffic percentage must be between 0 and 100."
  }
}

variable "primary_nlb_arn" {
  description = "ARN of the primary region Network Load Balancer"
  type        = string
  default     = ""
}

variable "flow_logs_bucket" {
  description = "S3 bucket for Global Accelerator flow logs"
  type        = string
  default     = ""
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
    Environment = "production"
  }
}
