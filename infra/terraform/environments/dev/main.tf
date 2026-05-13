################################################################################
# Development Environment Configuration
################################################################################

terraform {
  required_version = ">= 1.5.0, < 2.0.0"

  backend "s3" {
    bucket         = "idp-terraform-state"
    key            = "environments/dev/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "idp-terraform-locks"
  }
}

module "infrastructure" {
  source = "../../"

  # General
  project_name   = "idp"
  environment    = "dev"
  aws_region     = "us-east-1"
  aws_account_id = var.aws_account_id

  # Networking - cost optimized for dev
  vpc_cidr           = "10.0.0.0/16"
  enable_nat_gateway = true
  single_nat_gateway = true # Single NAT to save costs in dev

  # EKS - smaller cluster for dev
  kubernetes_version      = "1.28"
  eks_node_instance_types = ["t3.medium"]
  eks_node_min_size       = 1
  eks_node_max_size       = 5
  eks_node_desired_size   = 2

  # RDS - smaller instance for dev
  rds_instance_class          = "db.t3.small"
  rds_allocated_storage       = 20
  rds_max_allocated_storage   = 50
  rds_multi_az                = false # No Multi-AZ in dev
  rds_backup_retention_period = 1

  # ElastiCache - minimal for dev
  redis_node_type          = "cache.t3.micro"
  redis_num_cache_clusters = 1

  tags = {
    CostCenter  = "development"
    AutoShutdown = "true"
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
