################################################################################
# EKS Managed Node Groups
################################################################################

# Default node group for general workloads
resource "aws_eks_node_group" "default" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.project_name}-${var.environment}-default"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids

  instance_types = var.node_instance_types
  capacity_type  = var.node_capacity_type
  disk_size      = var.node_disk_size

  scaling_config {
    min_size     = var.node_min_size
    max_size     = var.node_max_size
    desired_size = var.node_desired_size
  }

  update_config {
    max_unavailable_percentage = 25
  }

  labels = {
    role        = "general"
    environment = var.environment
  }

  tags = merge(var.tags, {
    Name                                                                    = "${var.project_name}-${var.environment}-default-node"
    "k8s.io/cluster-autoscaler/enabled"                                    = "true"
    "k8s.io/cluster-autoscaler/${var.project_name}-${var.environment}-cluster" = "owned"
  })

  depends_on = [
    aws_iam_role_policy_attachment.node_policy,
    aws_iam_role_policy_attachment.node_cni_policy,
    aws_iam_role_policy_attachment.node_ecr_policy,
  ]

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }
}

# System node group for critical add-ons (CoreDNS, kube-proxy, etc.)
resource "aws_eks_node_group" "system" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.project_name}-${var.environment}-system"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids

  instance_types = ["t3.medium"]
  capacity_type  = "ON_DEMAND"
  disk_size      = 30

  scaling_config {
    min_size     = 2
    max_size     = 4
    desired_size = 2
  }

  update_config {
    max_unavailable = 1
  }

  labels = {
    role        = "system"
    environment = var.environment
  }

  taint {
    key    = "CriticalAddonsOnly"
    value  = "true"
    effect = "PREFER_NO_SCHEDULE"
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-system-node"
  })

  depends_on = [
    aws_iam_role_policy_attachment.node_policy,
    aws_iam_role_policy_attachment.node_cni_policy,
    aws_iam_role_policy_attachment.node_ecr_policy,
  ]

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }
}
