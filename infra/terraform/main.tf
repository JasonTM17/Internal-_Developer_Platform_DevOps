################################################################################
# Root Module - Internal Developer Platform Infrastructure
################################################################################

module "vpc" {
  source = "./modules/vpc"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = local.availability_zones
  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = var.single_nat_gateway

  tags = local.common_tags
}

module "eks" {
  source = "./modules/eks"

  project_name        = var.project_name
  environment         = var.environment
  kubernetes_version  = var.kubernetes_version
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  node_instance_types = var.eks_node_instance_types
  node_min_size       = var.eks_node_min_size
  node_max_size       = var.eks_node_max_size
  node_desired_size   = var.eks_node_desired_size

  tags = local.common_tags

  depends_on = [module.vpc]
}

module "rds" {
  source = "./modules/rds"

  project_name              = var.project_name
  environment               = var.environment
  vpc_id                    = module.vpc.vpc_id
  private_subnet_ids        = module.vpc.private_subnet_ids
  instance_class            = var.rds_instance_class
  allocated_storage         = var.rds_allocated_storage
  max_allocated_storage     = var.rds_max_allocated_storage
  multi_az                  = var.rds_multi_az
  backup_retention_period   = var.rds_backup_retention_period
  eks_security_group_id     = module.eks.cluster_security_group_id
  kms_key_arn               = module.eks.kms_key_arn

  tags = local.common_tags

  depends_on = [module.vpc]
}

module "elasticache" {
  source = "./modules/elasticache"

  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  node_type             = var.redis_node_type
  num_cache_clusters    = var.redis_num_cache_clusters
  eks_security_group_id = module.eks.cluster_security_group_id

  tags = local.common_tags

  depends_on = [module.vpc]
}

module "ecr" {
  source = "./modules/ecr"

  project_name = var.project_name
  environment  = var.environment

  repository_names = [
    "${var.project_name}-api",
    "${var.project_name}-portal",
    "${var.project_name}-worker",
  ]

  tags = local.common_tags
}

module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  tags = local.common_tags
}

module "iam" {
  source = "./modules/iam"

  project_name       = var.project_name
  environment        = var.environment
  eks_oidc_provider  = module.eks.oidc_provider
  eks_oidc_issuer    = module.eks.oidc_issuer
  s3_artifacts_arn   = module.s3.artifacts_bucket_arn
  s3_backups_arn     = module.s3.backups_bucket_arn
  ecr_repository_arns = module.ecr.repository_arns

  tags = local.common_tags
}

module "monitoring" {
  source = "./modules/monitoring"

  project_name       = var.project_name
  environment        = var.environment
  eks_cluster_name   = module.eks.cluster_id
  rds_instance_id    = module.rds.instance_id
  redis_cluster_id   = module.elasticache.cluster_id

  tags = local.common_tags
}
