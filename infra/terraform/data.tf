################################################################################
# Data Sources
################################################################################

# Available AZs in the current region
data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

# Current AWS region
data "aws_region" "current" {}

# Current AWS account
data "aws_caller_identity" "current" {}

# Current partition (aws, aws-cn, aws-us-gov)
data "aws_partition" "current" {}

# Latest Amazon Linux 2 AMI for bastion hosts
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }
}

# Latest EKS-optimized AMI
data "aws_ami" "eks_optimized" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amazon-eks-node-${var.kubernetes_version}-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# EKS cluster auth token
data "aws_eks_cluster_auth" "cluster" {
  name = local.eks_cluster_name
}

# ACM certificate for the domain (if exists)
data "aws_acm_certificate" "main" {
  count    = local.is_production ? 1 : 0
  domain   = "*.${var.project_name}.internal"
  statuses = ["ISSUED"]
}
