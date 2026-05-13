###############################################################################
# CloudFront CDN Module
# Content delivery for the developer portal with edge caching
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
# S3 Origin Bucket (for static portal assets)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "portal_assets" {
  bucket = "${var.environment}-platform-portal-assets"

  tags = merge(var.tags, {
    Name        = "${var.environment}-platform-portal-assets"
    Environment = var.environment
  })
}

resource "aws_s3_bucket_versioning" "portal_assets" {
  bucket = aws_s3_bucket.portal_assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "portal_assets" {
  bucket = aws_s3_bucket.portal_assets.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "portal_assets" {
  bucket = aws_s3_bucket.portal_assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─────────────────────────────────────────────────────────────────────────────
# Origin Access Control
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "portal" {
  name                              = "${var.environment}-portal-oac"
  description                       = "OAC for portal S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ─────────────────────────────────────────────────────────────────────────────
# CloudFront Distribution
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "portal" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "IDP Portal - ${var.environment}"
  default_root_object = "index.html"
  price_class         = var.price_class
  http_version        = "http2and3"
  aliases             = var.domain_aliases
  web_acl_id          = var.waf_web_acl_arn

  # S3 Origin (static assets)
  origin {
    domain_name              = aws_s3_bucket.portal_assets.bucket_regional_domain_name
    origin_id                = "s3-portal-assets"
    origin_access_control_id = aws_cloudfront_origin_access_control.portal.id
  }

  # API Origin (for /api/* paths)
  origin {
    domain_name = var.api_origin_domain
    origin_id   = "api-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 30
    }

    custom_header {
      name  = "X-Origin-Verify"
      value = var.origin_verify_header
    }
  }

  # Default behavior (S3 static assets)
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-portal-assets"

    cache_policy_id          = aws_cloudfront_cache_policy.static_assets.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.cors.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_routing.arn
    }
  }

  # API behavior (pass-through to ALB)
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "api-origin"

    cache_policy_id            = aws_cloudfront_cache_policy.api.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.api.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    viewer_protocol_policy = "https-only"
    compress               = true
  }

  # Static assets with long cache
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-portal-assets"

    cache_policy_id = aws_cloudfront_cache_policy.immutable_assets.id

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # Custom error responses (SPA routing)
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = merge(var.tags, {
    Name        = "${var.environment}-portal-cdn"
    Environment = var.environment
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# Cache Policies
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${var.environment}-static-assets"
  comment     = "Cache policy for portal static assets"
  default_ttl = 86400    # 1 day
  max_ttl     = 604800   # 7 days
  min_ttl     = 3600     # 1 hour

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

resource "aws_cloudfront_cache_policy" "immutable_assets" {
  name        = "${var.environment}-immutable-assets"
  comment     = "Long cache for hashed/immutable assets"
  default_ttl = 31536000 # 1 year
  max_ttl     = 31536000
  min_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

resource "aws_cloudfront_cache_policy" "api" {
  name        = "${var.environment}-api-no-cache"
  comment     = "No caching for API requests"
  default_ttl = 0
  max_ttl     = 0
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "all"
    }
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Authorization", "Accept", "Content-Type"]
      }
    }
    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Origin Request Policies
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_cloudfront_origin_request_policy" "cors" {
  name    = "${var.environment}-cors-s3"
  comment = "Forward CORS headers to S3"

  cookies_config {
    cookie_behavior = "none"
  }
  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]
    }
  }
  query_strings_config {
    query_string_behavior = "none"
  }
}

resource "aws_cloudfront_origin_request_policy" "api" {
  name    = "${var.environment}-api-passthrough"
  comment = "Forward all headers to API origin"

  cookies_config {
    cookie_behavior = "all"
  }
  headers_config {
    header_behavior = "allViewer"
  }
  query_strings_config {
    query_string_behavior = "all"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Response Headers Policy (Security Headers)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "${var.environment}-security-headers"
  comment = "Security headers for all responses"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# CloudFront Function (SPA Routing)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_cloudfront_function" "spa_routing" {
  name    = "${var.environment}-spa-routing"
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite paths for SPA client-side routing"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      var uri = request.uri;

      // If the URI has a file extension, serve it directly
      if (uri.includes('.')) {
        return request;
      }

      // For all other paths, serve index.html (SPA routing)
      request.uri = '/index.html';
      return request;
    }
  EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# S3 Bucket Policy (allow CloudFront access)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket_policy" "portal_assets" {
  bucket = aws_s3_bucket.portal_assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontServicePrincipal"
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.portal_assets.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.portal.arn
        }
      }
    }]
  })
}
