################################################################################
# RDS Security Group
################################################################################

resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-${var.environment}-rds-"
  description = "Security group for RDS PostgreSQL instance"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rds-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Allow inbound PostgreSQL from EKS nodes
resource "aws_security_group_rule" "rds_ingress_eks" {
  description              = "Allow PostgreSQL access from EKS nodes"
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = var.eks_security_group_id
  security_group_id        = aws_security_group.rds.id
}

# Allow inbound PostgreSQL from within VPC (for bastion/admin access)
resource "aws_security_group_rule" "rds_ingress_vpc" {
  description       = "Allow PostgreSQL access from VPC CIDR"
  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = [data.aws_vpc.selected.cidr_block]
  security_group_id = aws_security_group.rds.id
}

# Deny all outbound (RDS doesn't need outbound access)
resource "aws_security_group_rule" "rds_egress_none" {
  description       = "Deny all outbound traffic"
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["127.0.0.1/32"]
  security_group_id = aws_security_group.rds.id
}

################################################################################
# Data source for VPC CIDR
################################################################################

data "aws_vpc" "selected" {
  id = var.vpc_id
}
