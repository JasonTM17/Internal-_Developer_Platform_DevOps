################################################################################
# NAT Gateways - One per AZ for High Availability
################################################################################

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.availability_zones)) : 0
  domain = "vpc"

  tags = merge(var.tags, {
    Name = var.single_nat_gateway ? "${var.project_name}-${var.environment}-nat-eip" : "${var.project_name}-${var.environment}-nat-eip-${var.availability_zones[count.index]}"
  })

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways in public subnets
resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.availability_zones)) : 0

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(var.tags, {
    Name = var.single_nat_gateway ? "${var.project_name}-${var.environment}-nat" : "${var.project_name}-${var.environment}-nat-${var.availability_zones[count.index]}"
  })

  depends_on = [aws_internet_gateway.main]
}
