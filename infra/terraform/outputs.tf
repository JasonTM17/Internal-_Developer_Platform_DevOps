################################################################################
# VPC Outputs
################################################################################

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

################################################################################
# EKS Outputs
################################################################################

output "eks_cluster_id" {
  description = "ID of the EKS cluster"
  value       = module.eks.cluster_id
}

output "eks_cluster_endpoint" {
  description = "Endpoint for the EKS cluster API server"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_certificate_authority" {
  description = "Certificate authority data for the EKS cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "eks_oidc_provider_arn" {
  description = "ARN of the OIDC provider for IRSA"
  value       = module.eks.oidc_provider_arn
}

################################################################################
# RDS Outputs
################################################################################

output "rds_endpoint" {
  description = "Connection endpoint for the RDS instance"
  value       = module.rds.endpoint
}

output "rds_port" {
  description = "Port of the RDS instance"
  value       = module.rds.port
}

output "rds_database_name" {
  description = "Name of the default database"
  value       = module.rds.database_name
}

################################################################################
# ElastiCache Outputs
################################################################################

output "redis_endpoint" {
  description = "Primary endpoint for the Redis replication group"
  value       = module.elasticache.primary_endpoint
}

output "redis_port" {
  description = "Port of the Redis cluster"
  value       = module.elasticache.port
}

################################################################################
# ECR Outputs
################################################################################

output "ecr_repository_urls" {
  description = "URLs of the ECR repositories"
  value       = module.ecr.repository_urls
}

################################################################################
# S3 Outputs
################################################################################

output "s3_artifacts_bucket" {
  description = "Name of the S3 artifacts bucket"
  value       = module.s3.artifacts_bucket_id
}

output "s3_backups_bucket" {
  description = "Name of the S3 backups bucket"
  value       = module.s3.backups_bucket_id
}

output "s3_logs_bucket" {
  description = "Name of the S3 logs bucket"
  value       = module.s3.logs_bucket_id
}
