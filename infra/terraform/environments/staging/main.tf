################################################################################
# Staging Environment Configuration
################################################################################

terraform {
  required_version = ">= 1.5.0, < 2.0.0"

  backend "s3" {
    bucket         = "idp-terraform-state"
    key            = "environments/staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "idp-terraform-locks"
  }
}

module "infrastructure" {
  source = "../../"

  # General
  project_name   = "idp"
  environment    = "staging"
  aws_region     = "us-east-1"
  aws_account_id = var.aws_account_id

  # Networking - production-like but with single NAT
  vpc_cidr           = "10.1.0.0/16"
  enable_nat_gateway = true
  single_nat_gateway = true # Single NAT for cost savings

  # EKS - production-like sizing
  kubernetes_version      = "1.28"
  eks_node_instance_types = ["t3.large"]
  eks_node_min_size       = 2
  eks_node_max_size       = 8
  eks_node_desired_size   = 3

  # RDS - production-like but smaller
  rds_instance_class          = "db.t3.medium"
  rds_allocated_storage       = 50
  rds_max_allocated_storage   = 100
  rds_multi_az                = true
  rds_backup_retention_period = 3

  # ElastiCache - production-like
  redis_node_type          = "cache.t3.small"
  redis_num_cache_clusters = 2

  tags = {
    CostCenter = "staging"
  }
}

################################################################################
# Variables
################################################################################

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
  sensitive   = true
}

################################################################################
# Outputs
################################################################################

output "eks_cluster_endpoint" {
  value = module.infrastructure.eks_cluster_endpoint
}

output "rds_endpoint" {
  value = module.infrastructure.rds_endpoint
}

output "ecr_repository_urls" {
  value = module.infrastructure.ecr_repository_urls
}
