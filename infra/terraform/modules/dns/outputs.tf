output "zone_id" {
  description = "Route53 hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "zone_name_servers" {
  description = "Name servers for the hosted zone (delegate from registrar)"
  value       = aws_route53_zone.main.name_servers
}

output "private_zone_id" {
  description = "Private hosted zone ID"
  value       = var.create_private_zone ? aws_route53_zone.private[0].zone_id : null
}

output "certificate_arn" {
  description = "ACM certificate ARN for TLS"
  value       = aws_acm_certificate.main.arn
}

output "certificate_validation_arn" {
  description = "Validated ACM certificate ARN"
  value       = aws_acm_certificate_validation.main.certificate_arn
}

output "api_health_check_id" {
  description = "Route53 health check ID for the API"
  value       = aws_route53_health_check.api.id
}

output "portal_health_check_id" {
  description = "Route53 health check ID for the portal"
  value       = aws_route53_health_check.portal.id
}

output "api_fqdn" {
  description = "Fully qualified domain name for the API"
  value       = aws_route53_record.api.fqdn
}

output "portal_fqdn" {
  description = "Fully qualified domain name for the portal"
  value       = aws_route53_record.portal.fqdn
}

output "argocd_fqdn" {
  description = "Fully qualified domain name for ArgoCD"
  value       = aws_route53_record.argocd.fqdn
}

output "grafana_fqdn" {
  description = "Fully qualified domain name for Grafana"
  value       = aws_route53_record.grafana.fqdn
}
