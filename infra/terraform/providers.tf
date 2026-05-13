################################################################################
# AWS Provider Configuration
################################################################################

provider "aws" {
  region = var.aws_region

  # Ensure we're deploying to the correct account
  allowed_account_ids = [var.aws_account_id]

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Repository  = "internal-developer-platform"
    }
  }
}

# Secondary region provider for disaster recovery resources
provider "aws" {
  alias  = "dr"
  region = "us-west-2"

  allowed_account_ids = [var.aws_account_id]

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Repository  = "internal-developer-platform"
      Purpose     = "disaster-recovery"
    }
  }
}

################################################################################
# Kubernetes Provider (configured after EKS cluster creation)
################################################################################

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_id]
  }
}

################################################################################
# Helm Provider
################################################################################

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_id]
    }
  }
}
