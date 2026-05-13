###############################################################################
# Route53 DNS Management Module
# Manages hosted zones, records, and health checks for platform services
###############################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Hosted Zone
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_route53_zone" "main" {
  name    = var.domain_name
  comment = "Managed by Terraform - ${var.environment} platform DNS"

  tags = merge(var.tags, {
    Name        = var.domain_name
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

resource "aws_route53_zone" "private" {
  count   = var.create_private_zone ? 1 : 0
  name    = "internal.${var.domain_name}"
  comment = "Private hosted zone for internal services"

  vpc {
    vpc_id = var.vpc_id
  }

  tags = merge(var.tags, {
    Name        = "internal.${var.domain_name}"
    Environment = var.environment
    Visibility  = "private"
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# Platform Service Records
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "portal" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "portal.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "argocd" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "argocd.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "grafana" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "grafana.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Wildcard for preview environments
resource "aws_route53_record" "preview_wildcard" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "*.preview.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = false
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Health Checks
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_route53_health_check" "api" {
  fqdn              = "api.${var.domain_name}"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30
  measure_latency   = true

  regions = ["us-east-1", "eu-west-1", "ap-southeast-1"]

  tags = merge(var.tags, {
    Name = "api-health-check"
  })
}

resource "aws_route53_health_check" "portal" {
  fqdn              = "portal.${var.domain_name}"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/"
  failure_threshold = 3
  request_interval  = 30

  tags = merge(var.tags, {
    Name = "portal-health-check"
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# ACM Certificate (for TLS)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = [
    "*.${var.domain_name}",
    "*.preview.${var.domain_name}",
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, {
    Name = "${var.domain_name}-certificate"
  })
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ─────────────────────────────────────────────────────────────────────────────
# CloudWatch Alarms for Health Checks
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "api_health" {
  alarm_name          = "${var.environment}-api-health-check-failed"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "API health check is failing"
  alarm_actions       = var.alarm_sns_topic_arns

  dimensions = {
    HealthCheckId = aws_route53_health_check.api.id
  }

  tags = var.tags
}
