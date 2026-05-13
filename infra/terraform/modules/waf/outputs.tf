output "web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.arn
}

output "web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.id
}

output "web_acl_capacity" {
  description = "Web ACL capacity units consumed"
  value       = aws_wafv2_web_acl.main.capacity
}

output "ip_set_arn" {
  description = "ARN of the IP allowlist set"
  value       = aws_wafv2_ip_set.allowlist.arn
}

output "cloudwatch_metric_name" {
  description = "CloudWatch metric name for WAF"
  value       = "${var.environment}-platform-waf"
}
