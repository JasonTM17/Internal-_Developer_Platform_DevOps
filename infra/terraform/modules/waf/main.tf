###############################################################################
# AWS WAF Module
# Web Application Firewall for platform API and portal protection
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
# WAF Web ACL
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_wafv2_web_acl" "main" {
  name        = "${var.environment}-platform-waf"
  description = "WAF rules for the IDP platform - ${var.environment}"
  scope       = var.scope # REGIONAL for ALB, CLOUDFRONT for CF

  default_action {
    allow {}
  }

  # ─── AWS Managed Rules: Common Rule Set ───────────────────────────────────
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Exclude rules that may conflict with API usage
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "CrossSiteScripting_BODY"
          action_to_use {
            count {}
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # ─── AWS Managed Rules: Known Bad Inputs ──────────────────────────────────
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputs"
      sampled_requests_enabled   = true
    }
  }

  # ─── AWS Managed Rules: SQL Injection ─────────────────────────────────────
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 30

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLi"
      sampled_requests_enabled   = true
    }
  }

  # ─── Rate Limiting Rule ───────────────────────────────────────────────────
  rule {
    name     = "RateLimitRule"
    priority = 40

    action {
      block {
        custom_response {
          response_code = 429
          custom_response_body_key = "rate-limited"
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_threshold
        aggregate_key_type = "IP"

        scope_down_statement {
          not_statement {
            statement {
              ip_set_reference_statement {
                arn = aws_wafv2_ip_set.allowlist.arn
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # ─── Geo Restriction (optional) ──────────────────────────────────────────
  dynamic "rule" {
    for_each = length(var.blocked_countries) > 0 ? [1] : []
    content {
      name     = "GeoBlockRule"
      priority = 50

      action {
        block {}
      }

      statement {
        geo_match_statement {
          country_codes = var.blocked_countries
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "GeoBlockRule"
        sampled_requests_enabled   = true
      }
    }
  }

  # ─── Bot Control ─────────────────────────────────────────────────────────
  rule {
    name     = "AWSManagedRulesBotControlRuleSet"
    priority = 60

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"

        managed_rule_group_configs {
          aws_managed_rules_bot_control_rule_set {
            inspection_level = "COMMON"
          }
        }

        # Allow verified bots (search engines, monitoring)
        rule_action_override {
          name = "CategoryVerifiedSearchEngine"
          action_to_use {
            allow {}
          }
        }
        rule_action_override {
          name = "CategoryMonitoring"
          action_to_use {
            allow {}
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "BotControlRule"
      sampled_requests_enabled   = true
    }
  }

  # Custom response bodies
  custom_response_body {
    key          = "rate-limited"
    content      = "{\"error\":{\"code\":\"RATE_LIMIT_EXCEEDED\",\"message\":\"Too many requests. Please retry later.\"}}"
    content_type = "APPLICATION_JSON"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.environment}-platform-waf"
    sampled_requests_enabled   = true
  }

  tags = merge(var.tags, {
    Name        = "${var.environment}-platform-waf"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# IP Allowlist (for internal services, monitoring, etc.)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_wafv2_ip_set" "allowlist" {
  name               = "${var.environment}-platform-allowlist"
  description        = "Trusted IP addresses exempt from rate limiting"
  scope              = var.scope
  ip_address_version = "IPV4"
  addresses          = var.allowlisted_ips

  tags = merge(var.tags, {
    Name = "${var.environment}-platform-allowlist"
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# WAF Association with ALB
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_wafv2_web_acl_association" "alb" {
  count        = var.scope == "REGIONAL" && var.alb_arn != "" ? 1 : 0
  resource_arn = var.alb_arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# ─────────────────────────────────────────────────────────────────────────────
# WAF Logging
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_wafv2_web_acl_logging_configuration" "main" {
  log_destination_configs = [var.log_destination_arn]
  resource_arn            = aws_wafv2_web_acl.main.arn

  logging_filter {
    default_behavior = "DROP"

    filter {
      behavior    = "KEEP"
      requirement = "MEETS_ANY"

      condition {
        action_condition {
          action = "BLOCK"
        }
      }
      condition {
        action_condition {
          action = "COUNT"
        }
      }
    }
  }
}
