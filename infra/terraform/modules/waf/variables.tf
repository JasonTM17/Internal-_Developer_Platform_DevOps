variable "environment" {
  description = "Environment name"
  type        = string
}

variable "scope" {
  description = "WAF scope - REGIONAL for ALB, CLOUDFRONT for CloudFront"
  type        = string
  default     = "REGIONAL"

  validation {
    condition     = contains(["REGIONAL", "CLOUDFRONT"], var.scope)
    error_message = "Scope must be REGIONAL or CLOUDFRONT."
  }
}

variable "alb_arn" {
  description = "ARN of the ALB to associate with WAF (for REGIONAL scope)"
  type        = string
  default     = ""
}

variable "rate_limit_threshold" {
  description = "Maximum requests per 5-minute window per IP before blocking"
  type        = number
  default     = 2000
}

variable "allowlisted_ips" {
  description = "List of CIDR blocks exempt from rate limiting"
  type        = list(string)
  default     = []
}

variable "blocked_countries" {
  description = "List of country codes to block (ISO 3166-1 alpha-2)"
  type        = list(string)
  default     = []
}

variable "log_destination_arn" {
  description = "ARN of the log destination (Kinesis Firehose, CloudWatch, or S3)"
  type        = string
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
