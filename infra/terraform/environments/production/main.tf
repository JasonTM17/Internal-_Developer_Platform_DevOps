################################################################################
# Production Environment Configuration
################################################################################

terraform {
  required_version = ">= 1.5.0, < 2.0.0"

  backend "s3" {
    bucket         = "idp-terraform-state"
    key            = "environments/production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "idp-terraform-locks"
  }
}

module "infrastructure" {
  source = "../../"

  # General
  project_name   = "idp"
  environment    = "production"
  aws_region     = "us-east-1"
  aws_account_id = var.aws_account_id

  # Networking - full HA with NAT per AZ
  vpc_cidr           = "10.2.0.0/16"
  enable_nat_gateway = true
  single_nat_gateway = false # One NAT per AZ for HA

  # EKS - production sizing
  kubernetes_version      = "1.28"
  eks_node_instance_types = ["m5.xlarge", "m5.2xlarge"]
  eks_node_min_size       = 3
  eks_node_max_size       = 20
  eks_node_desired_size   = 5

  # RDS - production sizing with full HA
  rds_instance_class          = "db.r5.large"
  rds_allocated_storage       = 100
  rds_max_allocated_storage   = 500
  rds_multi_az                = true
  rds_backup_retention_period = 30

  # ElastiCache - production sizing
  redis_node_type          = "cache.r5.large"
  redis_num_cache_clusters = 3

  tags = {
    CostCenter   = "production"
    Compliance   = "soc2"
    DataClass    = "confidential"
    BackupPolicy = "daily"
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
  value     = module.infrastructure.eks_cluster_endpoint
  sensitive = true
}

output "rds_endpoint" {
  value     = module.infrastructure.rds_endpoint
  sensitive = true
}

output "ecr_repository_urls" {
  value = module.infrastructure.ecr_repository_urls
}

output "vpc_id" {
  value = module.infrastructure.vpc_id
}
