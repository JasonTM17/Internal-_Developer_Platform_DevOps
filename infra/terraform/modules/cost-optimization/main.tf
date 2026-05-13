###############################################################################
# Cost Optimization Module
# Implements Kubecost for cost visibility, Spot instance management,
# right-sizing recommendations, and automated cost controls.
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

# -----------------------------------------------------------------------------
# Kubecost Installation
# -----------------------------------------------------------------------------

resource "helm_release" "kubecost" {
  name       = "kubecost"
  repository = "https://kubecost.github.io/cost-analyzer/"
  chart      = "cost-analyzer"
  version    = var.kubecost_version
  namespace  = "kubecost"

  create_namespace = true

  values = [file("${path.module}/kubecost-values.yaml")]

  set {
    name  = "kubecostToken"
    value = var.kubecost_token
  }

  set {
    name  = "prometheus.server.retention"
    value = "${var.metrics_retention_days}d"
  }

  set {
    name  = "kubecostModel.etlBucketConfigSecret"
    value = kubernetes_secret.kubecost_s3.metadata[0].name
  }

  depends_on = [kubernetes_namespace.kubecost]
}

resource "kubernetes_namespace" "kubecost" {
  metadata {
    name = "kubecost"
    labels = {
      "app.kubernetes.io/part-of"    = "idp-platform"
      "app.kubernetes.io/managed-by" = "terraform"
      "istio-injection"              = "disabled"
    }
  }
}

resource "kubernetes_secret" "kubecost_s3" {
  metadata {
    name      = "kubecost-etl-bucket"
    namespace = "kubecost"
  }

  data = {
    "bucket-config.json" = jsonencode({
      bucket_name = aws_s3_bucket.kubecost_data.id
      region      = data.aws_region.current.name
    })
  }

  depends_on = [kubernetes_namespace.kubecost]
}

# -----------------------------------------------------------------------------
# Kubecost Data Storage
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "kubecost_data" {
  bucket = "${var.project_name}-kubecost-${data.aws_caller_identity.current.account_id}"

  tags = merge(var.tags, {
    Purpose = "kubecost-etl-data"
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "kubecost_data" {
  bucket = aws_s3_bucket.kubecost_data.id

  rule {
    id     = "expire-old-data"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 365
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "kubecost_data" {
  bucket = aws_s3_bucket.kubecost_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# -----------------------------------------------------------------------------
# Spot Instance Node Groups
# -----------------------------------------------------------------------------

resource "aws_eks_node_group" "spot_workload" {
  cluster_name    = var.eks_cluster_name
  node_group_name = "${var.project_name}-spot-workload"
  node_role_arn   = var.node_role_arn
  subnet_ids      = var.subnet_ids

  capacity_type = "SPOT"

  instance_types = var.spot_instance_types

  scaling_config {
    desired_size = var.spot_desired_size
    max_size     = var.spot_max_size
    min_size     = var.spot_min_size
  }

  labels = {
    "node-role"                        = "workload"
    "node-lifecycle"                   = "spot"
    "kubernetes.io/os"                 = "linux"
    "karpenter.sh/capacity-type"       = "spot"
  }

  taint {
    key    = "node-lifecycle"
    value  = "spot"
    effect = "NO_SCHEDULE"
  }

  update_config {
    max_unavailable_percentage = 50
  }

  tags = merge(var.tags, {
    "k8s.io/cluster-autoscaler/enabled"             = "true"
    "k8s.io/cluster-autoscaler/${var.eks_cluster_name}" = "owned"
  })
}

# -----------------------------------------------------------------------------
# Karpenter Provisioner for Spot Instances
# -----------------------------------------------------------------------------

resource "kubernetes_manifest" "karpenter_provisioner" {
  count = var.enable_karpenter ? 1 : 0

  manifest = {
    apiVersion = "karpenter.sh/v1alpha5"
    kind       = "Provisioner"
    metadata = {
      name = "spot-workload"
    }
    spec = {
      requirements = [
        {
          key      = "karpenter.sh/capacity-type"
          operator = "In"
          values   = ["spot", "on-demand"]
        },
        {
          key      = "kubernetes.io/arch"
          operator = "In"
          values   = ["amd64"]
        },
        {
          key      = "karpenter.k8s.aws/instance-category"
          operator = "In"
          values   = ["m", "c", "r"]
        },
        {
          key      = "karpenter.k8s.aws/instance-generation"
          operator = "Gte"
          values   = ["5"]
        }
      ]
      limits = {
        resources = {
          cpu    = var.karpenter_cpu_limit
          memory = var.karpenter_memory_limit
        }
      }
      consolidation = {
        enabled = true
      }
      ttlSecondsAfterEmpty  = 30
      ttlSecondsUntilExpired = 2592000  # 30 days
      providerRef = {
        name = "default"
      }
    }
  }
}

# -----------------------------------------------------------------------------
# Cost Allocation Tags
# -----------------------------------------------------------------------------

resource "aws_ce_cost_allocation_tag" "team" {
  tag_key = "team"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "service" {
  tag_key = "service"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "environment" {
  tag_key = "environment"
  status  = "Active"
}

# -----------------------------------------------------------------------------
# AWS Budget Alerts
# -----------------------------------------------------------------------------

resource "aws_budgets_budget" "monthly_total" {
  name         = "${var.project_name}-monthly-budget"
  budget_type  = "COST"
  limit_amount = var.monthly_budget_limit
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Project$${var.project_name}"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.budget_alert_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 120
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_emails
    subscriber_sns_topic_arns  = var.budget_sns_topic_arns
  }
}

resource "aws_budgets_budget" "compute" {
  name         = "${var.project_name}-compute-budget"
  budget_type  = "COST"
  limit_amount = var.compute_budget_limit
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = ["Amazon Elastic Compute Cloud - Compute", "Amazon Elastic Kubernetes Service"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 90
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.budget_alert_emails
  }
}

# -----------------------------------------------------------------------------
# Resource Quotas for Cost Control
# -----------------------------------------------------------------------------

resource "kubernetes_resource_quota" "platform_quota" {
  metadata {
    name      = "platform-resource-quota"
    namespace = "idp-platform"
  }

  spec {
    hard = {
      "requests.cpu"    = var.namespace_cpu_quota
      "requests.memory" = var.namespace_memory_quota
      "limits.cpu"      = var.namespace_cpu_limit
      "limits.memory"   = var.namespace_memory_limit
      "pods"            = var.namespace_pod_limit
      "services"        = "20"
      "persistentvolumeclaims" = "10"
    }
  }
}

resource "kubernetes_limit_range" "platform_defaults" {
  metadata {
    name      = "platform-limit-range"
    namespace = "idp-platform"
  }

  spec {
    limit {
      type = "Container"
      default = {
        cpu    = "500m"
        memory = "512Mi"
      }
      default_request = {
        cpu    = "100m"
        memory = "128Mi"
      }
      max = {
        cpu    = "4"
        memory = "8Gi"
      }
      min = {
        cpu    = "10m"
        memory = "16Mi"
      }
    }
  }
}
