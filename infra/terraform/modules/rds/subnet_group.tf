################################################################################
# RDS Subnet Group
################################################################################

resource "aws_db_subnet_group" "main" {
  name        = "${var.project_name}-${var.environment}-db-subnet-group"
  description = "Database subnet group for ${var.project_name}-${var.environment}"
  subnet_ids  = var.private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  })
}
