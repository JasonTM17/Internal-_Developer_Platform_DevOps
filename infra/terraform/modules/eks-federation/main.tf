###############################################################################
# EKS Multi-Cluster Federation Module
# Provisions federated EKS clusters across multiple regions with shared
# control plane, cross-cluster service discovery, and unified networking.
###############################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

# -----------------------------------------------------------------------------
# Primary EKS Cluster (Host Cluster for Federation)
# -----------------------------------------------------------------------------

module "primary_cluster" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.21"

  cluster_name    = "${var.cluster_name_prefix}-primary"
  cluster_version = var.kubernetes_version

  vpc_id     = var.primary_vpc_id
  subnet_ids = var.primary_subnet_ids

  cluster_endpoint_public_access  = var.enable_public_access
  cluster_endpoint_private_access = true

  cluster_addons = {
    coredns = {
      most_recent = true
      configuration_values = jsonencode({
        replicaCount = 3
        resources = {
          limits = {
            cpu    = "100m"
            memory = "150Mi"
          }
          requests = {
            cpu    = "50m"
            memory = "64Mi"
          }
        }
      })
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
      configuration_values = jsonencode({
        enableNetworkPolicy = "true"
        env = {
          ENABLE_PREFIX_DELEGATION = "true"
          WARM_PREFIX_TARGET       = "1"
        }
      })
    }
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = aws_iam_role.ebs_csi_primary.arn
    }
  }

  eks_managed_node_groups = {
    system = {
      name           = "system-ng"
      instance_types = var.system_node_instance_types
      min_size       = var.system_node_min_size
      max_size       = var.system_node_max_size
      desired_size   = var.system_node_desired_size

      labels = {
        "node-role" = "system"
        "cluster"   = "primary"
      }

      taints = [{
        key    = "node-role"
        value  = "system"
        effect = "NO_SCHEDULE"
      }]

      iam_role_additional_policies = {
        AmazonSSMManagedInstanceCore = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
      }
    }

    workload = {
      name           = "workload-ng"
      instance_types = var.workload_node_instance_types
      min_size       = var.workload_node_min_size
      max_size       = var.workload_node_max_size
      desired_size   = var.workload_node_desired_size

      labels = {
        "node-role" = "workload"
        "cluster"   = "primary"
      }

      iam_role_additional_policies = {
        AmazonSSMManagedInstanceCore = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
      }
    }
  }

  # Cluster security group rules
  cluster_security_group_additional_rules = {
    ingress_from_secondary = {
      description              = "Allow traffic from secondary cluster"
      protocol                 = "tcp"
      from_port                = 443
      to_port                  = 443
      type                     = "ingress"
      source_security_group_id = var.secondary_cluster_sg_id
    }
  }

  tags = merge(var.tags, {
    "federation/role"    = "primary"
    "federation/cluster" = "${var.cluster_name_prefix}-primary"
  })
}

# -----------------------------------------------------------------------------
# Secondary EKS Cluster (Member Cluster)
# -----------------------------------------------------------------------------

module "secondary_cluster" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.21"

  count = var.enable_multi_cluster ? 1 : 0

  cluster_name    = "${var.cluster_name_prefix}-secondary"
  cluster_version = var.kubernetes_version

  vpc_id     = var.secondary_vpc_id
  subnet_ids = var.secondary_subnet_ids

  cluster_endpoint_public_access  = var.enable_public_access
  cluster_endpoint_private_access = true

  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
      configuration_values = jsonencode({
        enableNetworkPolicy = "true"
      })
    }
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = aws_iam_role.ebs_csi_secondary[0].arn
    }
  }

  eks_managed_node_groups = {
    system = {
      name           = "system-ng"
      instance_types = var.system_node_instance_types
      min_size       = 2
      max_size       = var.system_node_max_size
      desired_size   = 2

      labels = {
        "node-role" = "system"
        "cluster"   = "secondary"
      }

      taints = [{
        key    = "node-role"
        value  = "system"
        effect = "NO_SCHEDULE"
      }]
    }

    workload = {
      name           = "workload-ng"
      instance_types = var.workload_node_instance_types
      min_size       = var.workload_node_min_size
      max_size       = var.workload_node_max_size
      desired_size   = var.workload_node_desired_size

      labels = {
        "node-role" = "workload"
        "cluster"   = "secondary"
      }
    }
  }

  tags = merge(var.tags, {
    "federation/role"    = "secondary"
    "federation/cluster" = "${var.cluster_name_prefix}-secondary"
  })
}

# -----------------------------------------------------------------------------
# Cross-Cluster VPC Peering
# -----------------------------------------------------------------------------

resource "aws_vpc_peering_connection" "cross_cluster" {
  count = var.enable_multi_cluster ? 1 : 0

  vpc_id      = var.primary_vpc_id
  peer_vpc_id = var.secondary_vpc_id
  peer_region = var.secondary_region
  auto_accept = false

  tags = merge(var.tags, {
    Name = "${var.cluster_name_prefix}-cross-cluster-peering"
  })
}

resource "aws_vpc_peering_connection_accepter" "cross_cluster" {
  count = var.enable_multi_cluster ? 1 : 0

  provider                  = aws.secondary
  vpc_peering_connection_id = aws_vpc_peering_connection.cross_cluster[0].id
  auto_accept               = true

  tags = merge(var.tags, {
    Name = "${var.cluster_name_prefix}-cross-cluster-peering"
  })
}

# -----------------------------------------------------------------------------
# IAM Roles for EBS CSI Driver
# -----------------------------------------------------------------------------

resource "aws_iam_role" "ebs_csi_primary" {
  name = "${var.cluster_name_prefix}-primary-ebs-csi"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = module.primary_cluster.oidc_provider_arn
      }
      Condition = {
        StringEquals = {
          "${module.primary_cluster.oidc_provider}:aud" = "sts.amazonaws.com"
          "${module.primary_cluster.oidc_provider}:sub" = "system:serviceaccount:kube-system:ebs-csi-controller-sa"
        }
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ebs_csi_primary" {
  role       = aws_iam_role.ebs_csi_primary.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

resource "aws_iam_role" "ebs_csi_secondary" {
  count = var.enable_multi_cluster ? 1 : 0
  name  = "${var.cluster_name_prefix}-secondary-ebs-csi"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = module.secondary_cluster[0].oidc_provider_arn
      }
      Condition = {
        StringEquals = {
          "${module.secondary_cluster[0].oidc_provider}:aud" = "sts.amazonaws.com"
          "${module.secondary_cluster[0].oidc_provider}:sub" = "system:serviceaccount:kube-system:ebs-csi-controller-sa"
        }
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ebs_csi_secondary" {
  count      = var.enable_multi_cluster ? 1 : 0
  role       = aws_iam_role.ebs_csi_secondary[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

# -----------------------------------------------------------------------------
# KubeFed Installation on Primary Cluster
# -----------------------------------------------------------------------------

resource "helm_release" "kubefed" {
  count = var.enable_federation ? 1 : 0

  name       = "kubefed"
  repository = "https://raw.githubusercontent.com/kubernetes-sigs/kubefed/master/charts"
  chart      = "kubefed"
  version    = var.kubefed_version
  namespace  = "kube-federation-system"

  create_namespace = true

  set {
    name  = "controllermanager.replicaCount"
    value = "2"
  }

  set {
    name  = "controllermanager.resources.requests.cpu"
    value = "100m"
  }

  set {
    name  = "controllermanager.resources.requests.memory"
    value = "128Mi"
  }

  depends_on = [module.primary_cluster]
}

# -----------------------------------------------------------------------------
# Global Accelerator for Multi-Region Traffic
# -----------------------------------------------------------------------------

resource "aws_globalaccelerator_accelerator" "platform" {
  count = var.enable_global_accelerator ? 1 : 0

  name            = "${var.cluster_name_prefix}-global"
  ip_address_type = "IPV4"
  enabled         = true

  attributes {
    flow_logs_enabled   = true
    flow_logs_s3_bucket = var.flow_logs_bucket
    flow_logs_s3_prefix = "global-accelerator/"
  }

  tags = var.tags
}

resource "aws_globalaccelerator_listener" "https" {
  count = var.enable_global_accelerator ? 1 : 0

  accelerator_arn = aws_globalaccelerator_accelerator.platform[0].id
  protocol        = "TCP"

  port_range {
    from_port = 443
    to_port   = 443
  }
}

resource "aws_globalaccelerator_endpoint_group" "primary" {
  count = var.enable_global_accelerator ? 1 : 0

  listener_arn                  = aws_globalaccelerator_listener.https[0].id
  endpoint_group_region         = data.aws_region.current.name
  health_check_port             = 443
  health_check_protocol         = "TCP"
  health_check_interval_seconds = 10
  threshold_count               = 3
  traffic_dial_percentage       = var.primary_traffic_percentage

  endpoint_configuration {
    endpoint_id                    = var.primary_nlb_arn
    weight                         = 100
    client_ip_preservation_enabled = true
  }
}
