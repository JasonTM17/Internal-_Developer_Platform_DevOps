###############################################################################
# CloudFront CDN Module - Variables
###############################################################################

# -----------------------------------------------------------------------------
# General Configuration
# -----------------------------------------------------------------------------

variable "environment" {
  description = "Environment name (e.g., dev, staging, production)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Domain and Certificate Configuration
# -----------------------------------------------------------------------------

variable "domain_aliases" {
  description = "List of domain aliases for the CloudFront distribution"
  type        = list(string)
  default     = []
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS (must be in us-east-1)"
  type        = string
}

# -----------------------------------------------------------------------------
# Origin Configuration
# -----------------------------------------------------------------------------

variable "api_origin_domain" {
  description = "Domain name of the API origin (ALB DNS name)"
  type        = string
}

variable "origin_verify_header" {
  description = "Secret header value to verify requests come from CloudFront"
  type        = string
  sensitive   = true
}

# -----------------------------------------------------------------------------
# Cache and Performance
# -----------------------------------------------------------------------------

variable "price_class" {
  description = "CloudFront price class (PriceClass_All, PriceClass_200, PriceClass_100)"
  type        = string
  default     = "PriceClass_200"

  validation {
    condition     = contains(["PriceClass_All", "PriceClass_200", "PriceClass_100"], var.price_class)
    error_message = "Price class must be one of: PriceClass_All, PriceClass_200, PriceClass_100."
  }
}

# -----------------------------------------------------------------------------
# Security
# -----------------------------------------------------------------------------

variable "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL to associate with the distribution"
  type        = string
  default     = null
}
