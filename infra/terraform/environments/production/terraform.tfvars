# =============================================================================
# IDP Platform - Production Environment Variables
# =============================================================================

# General
environment = "production"
project     = "idp-platform"
region      = "us-east-1"

# Networking
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]
public_subnet_cidrs  = ["10.0.0.0/22", "10.0.4.0/22", "10.0.8.0/22"]
private_subnet_cidrs = ["10.0.16.0/22", "10.0.20.0/22", "10.0.24.0/22"]
data_subnet_cidrs    = ["10.0.32.0/22", "10.0.36.0/22", "10.0.40.0/22"]

# EKS
eks_cluster_version = "1.28"
eks_node_groups = {
  platform = {
    instance_types = ["m6i.xlarge"]
    min_size       = 3
    max_size       = 10
    desired_size   = 6
    disk_size      = 100
    labels = {
      "node-role" = "platform"
    }
  }
}

# RDS
rds_instance_class       = "db.r6g.xlarge"
rds_allocated_storage    = 500
rds_storage_type         = "io2"
rds_iops                 = 16000
rds_multi_az             = true
rds_backup_retention     = 35
rds_deletion_protection  = true
rds_performance_insights = true

# ElastiCache
redis_node_type       = "cache.r6g.large"
redis_num_cache_nodes = 3
redis_engine_version  = "7.0"

# DNS
domain_name     = "idp.example.com"
hosted_zone_id  = "Z1234567890"

# Tags
tags = {
  Environment = "production"
  Project     = "idp-platform"
  ManagedBy   = "terraform"
  Team        = "platform-engineering"
  CostCenter  = "engineering"
}
