# =============================================================================
# IDP Platform - Development Environment Variables
# =============================================================================

# General
environment = "dev"
project     = "idp-platform"
region      = "us-east-1"

# Networking
vpc_cidr             = "10.1.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b"]
public_subnet_cidrs  = ["10.1.0.0/22", "10.1.4.0/22"]
private_subnet_cidrs = ["10.1.16.0/22", "10.1.20.0/22"]
data_subnet_cidrs    = ["10.1.32.0/22", "10.1.36.0/22"]

# EKS
eks_cluster_version = "1.28"
eks_node_groups = {
  platform = {
    instance_types = ["t3.large"]
    min_size       = 2
    max_size       = 4
    desired_size   = 2
    disk_size      = 50
    labels = {
      "node-role" = "platform"
    }
  }
}

# RDS
rds_instance_class       = "db.t3.medium"
rds_allocated_storage    = 20
rds_storage_type         = "gp3"
rds_multi_az             = false
rds_backup_retention     = 1
rds_deletion_protection  = false
rds_performance_insights = false

# ElastiCache
redis_node_type       = "cache.t3.small"
redis_num_cache_nodes = 1
redis_engine_version  = "7.0"

# DNS
domain_name    = "dev.idp.example.com"
hosted_zone_id = "Z1234567890"

# Tags
tags = {
  Environment = "development"
  Project     = "idp-platform"
  ManagedBy   = "terraform"
  Team        = "platform-engineering"
}
