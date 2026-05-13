################################################################################
# Local Values and Computed Variables
################################################################################

locals {
  # Use provided AZs or default to first 3 in the region
  availability_zones = length(var.availability_zones) > 0 ? var.availability_zones : slice(data.aws_availability_zones.available.names, 0, 3)

  # Resource naming convention: {project}-{environment}-{resource}
  name_prefix = "${var.project_name}-${var.environment}"

  # Common tags applied to all resources
  common_tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Team        = "platform-engineering"
      CostCenter  = "infrastructure"
    },
    var.tags
  )

  # Subnet CIDR calculations for 3 AZs
  # Public subnets:  10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24
  # Private subnets: 10.0.11.0/24, 10.0.12.0/24, 10.0.13.0/24
  # Database subnets: 10.0.21.0/24, 10.0.22.0/24, 10.0.23.0/24
  public_subnet_cidrs = [
    cidrsubnet(var.vpc_cidr, 8, 1),
    cidrsubnet(var.vpc_cidr, 8, 2),
    cidrsubnet(var.vpc_cidr, 8, 3),
  ]

  private_subnet_cidrs = [
    cidrsubnet(var.vpc_cidr, 8, 11),
    cidrsubnet(var.vpc_cidr, 8, 12),
    cidrsubnet(var.vpc_cidr, 8, 13),
  ]

  database_subnet_cidrs = [
    cidrsubnet(var.vpc_cidr, 8, 21),
    cidrsubnet(var.vpc_cidr, 8, 22),
    cidrsubnet(var.vpc_cidr, 8, 23),
  ]

  # EKS cluster name
  eks_cluster_name = "${local.name_prefix}-cluster"

  # Database configuration
  db_name     = replace(var.project_name, "-", "_")
  db_port     = 5432
  redis_port  = 6379

  # Environment-specific configurations
  is_production = var.environment == "production"

  # Encryption settings
  enable_encryption = true
  kms_deletion_window = local.is_production ? 30 : 7
}
