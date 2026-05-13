################################################################################
# EKS Cluster Security Group
################################################################################

resource "aws_security_group" "cluster" {
  name_prefix = "${var.project_name}-${var.environment}-eks-cluster-"
  description = "Security group for EKS cluster control plane"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-eks-cluster-sg"
    "kubernetes.io/cluster/${var.project_name}-${var.environment}-cluster" = "owned"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Allow nodes to communicate with the cluster API server
resource "aws_security_group_rule" "cluster_ingress_nodes" {
  description              = "Allow worker nodes to communicate with cluster API"
  type                     = "ingress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.node.id
  security_group_id        = aws_security_group.cluster.id
}

# Allow cluster API to communicate with nodes (for webhooks, logs, etc.)
resource "aws_security_group_rule" "cluster_egress_nodes" {
  description              = "Allow cluster API to communicate with worker nodes"
  type                     = "egress"
  from_port                = 1025
  to_port                  = 65535
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.node.id
  security_group_id        = aws_security_group.cluster.id
}

# Allow cluster API to communicate with nodes on port 443 (metrics-server, etc.)
resource "aws_security_group_rule" "cluster_egress_nodes_https" {
  description              = "Allow cluster API to communicate with nodes on HTTPS"
  type                     = "egress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.node.id
  security_group_id        = aws_security_group.cluster.id
}

################################################################################
# EKS Node Security Group
################################################################################

resource "aws_security_group" "node" {
  name_prefix = "${var.project_name}-${var.environment}-eks-node-"
  description = "Security group for EKS worker nodes"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-eks-node-sg"
    "kubernetes.io/cluster/${var.project_name}-${var.environment}-cluster" = "owned"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Allow nodes to communicate with each other
resource "aws_security_group_rule" "node_ingress_self" {
  description              = "Allow nodes to communicate with each other"
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "-1"
  source_security_group_id = aws_security_group.node.id
  security_group_id        = aws_security_group.node.id
}

# Allow cluster API to communicate with nodes
resource "aws_security_group_rule" "node_ingress_cluster" {
  description              = "Allow cluster API to communicate with nodes"
  type                     = "ingress"
  from_port                = 1025
  to_port                  = 65535
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.cluster.id
  security_group_id        = aws_security_group.node.id
}

# Allow cluster API to communicate with nodes on HTTPS
resource "aws_security_group_rule" "node_ingress_cluster_https" {
  description              = "Allow cluster API to reach nodes on HTTPS"
  type                     = "ingress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.cluster.id
  security_group_id        = aws_security_group.node.id
}

# Allow nodes to reach the internet (for pulling images, etc.)
resource "aws_security_group_rule" "node_egress_all" {
  description       = "Allow nodes all outbound traffic"
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.node.id
}

# Allow CoreDNS UDP
resource "aws_security_group_rule" "node_ingress_dns_udp" {
  description              = "Allow DNS UDP traffic between nodes"
  type                     = "ingress"
  from_port                = 53
  to_port                  = 53
  protocol                 = "udp"
  source_security_group_id = aws_security_group.node.id
  security_group_id        = aws_security_group.node.id
}

# Allow CoreDNS TCP
resource "aws_security_group_rule" "node_ingress_dns_tcp" {
  description              = "Allow DNS TCP traffic between nodes"
  type                     = "ingress"
  from_port                = 53
  to_port                  = 53
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.node.id
  security_group_id        = aws_security_group.node.id
}
