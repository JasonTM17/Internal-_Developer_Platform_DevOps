###############################################################################
# EKS Federation Module - Outputs
###############################################################################

# -----------------------------------------------------------------------------
# Primary Cluster Outputs
# -----------------------------------------------------------------------------

output "primary_cluster_id" {
  description = "EKS cluster ID for the primary cluster"
  value       = module.primary_cluster.cluster_id
}

output "primary_cluster_name" {
  description = "EKS cluster name for the primary cluster"
  value       = module.primary_cluster.cluster_name
}

output "primary_cluster_endpoint" {
  description = "Endpoint for the primary EKS cluster API server"
  value       = module.primary_cluster.cluster_endpoint
}

output "primary_cluster_certificate_authority" {
  description = "Base64 encoded certificate data for the primary cluster"
  value       = module.primary_cluster.cluster_certificate_authority_data
  sensitive   = true
}

output "primary_cluster_oidc_provider_arn" {
  description = "OIDC provider ARN for the primary cluster"
  value       = module.primary_cluster.oidc_provider_arn
}

output "primary_cluster_security_group_id" {
  description = "Security group ID attached to the primary EKS cluster"
  value       = module.primary_cluster.cluster_security_group_id
}

output "primary_cluster_iam_role_arn" {
  description = "IAM role ARN of the primary EKS cluster"
  value       = module.primary_cluster.cluster_iam_role_arn
}

# -----------------------------------------------------------------------------
# Secondary Cluster Outputs
# -----------------------------------------------------------------------------

output "secondary_cluster_id" {
  description = "EKS cluster ID for the secondary cluster"
  value       = var.enable_multi_cluster ? module.secondary_cluster[0].cluster_id : null
}

output "secondary_cluster_name" {
  description = "EKS cluster name for the secondary cluster"
  value       = var.enable_multi_cluster ? module.secondary_cluster[0].cluster_name : null
}

output "secondary_cluster_endpoint" {
  description = "Endpoint for the secondary EKS cluster API server"
  value       = var.enable_multi_cluster ? module.secondary_cluster[0].cluster_endpoint : null
}

output "secondary_cluster_certificate_authority" {
  description = "Base64 encoded certificate data for the secondary cluster"
  value       = var.enable_multi_cluster ? module.secondary_cluster[0].cluster_certificate_authority_data : null
  sensitive   = true
}

output "secondary_cluster_oidc_provider_arn" {
  description = "OIDC provider ARN for the secondary cluster"
  value       = var.enable_multi_cluster ? module.secondary_cluster[0].oidc_provider_arn : null
}

# -----------------------------------------------------------------------------
# Federation Outputs
# -----------------------------------------------------------------------------

output "federation_namespace" {
  description = "Namespace where KubeFed is installed"
  value       = var.enable_federation ? "kube-federation-system" : null
}

output "kubefed_version" {
  description = "Installed KubeFed version"
  value       = var.enable_federation ? var.kubefed_version : null
}

# -----------------------------------------------------------------------------
# Networking Outputs
# -----------------------------------------------------------------------------

output "vpc_peering_connection_id" {
  description = "VPC peering connection ID between primary and secondary clusters"
  value       = var.enable_multi_cluster ? aws_vpc_peering_connection.cross_cluster[0].id : null
}

output "vpc_peering_status" {
  description = "Status of the VPC peering connection"
  value       = var.enable_multi_cluster ? aws_vpc_peering_connection.cross_cluster[0].status : null
}

# -----------------------------------------------------------------------------
# Global Accelerator Outputs
# -----------------------------------------------------------------------------

output "global_accelerator_dns_name" {
  description = "DNS name of the Global Accelerator"
  value       = var.enable_global_accelerator ? aws_globalaccelerator_accelerator.platform[0].dns_name : null
}

output "global_accelerator_ip_addresses" {
  description = "IP addresses assigned to the Global Accelerator"
  value       = var.enable_global_accelerator ? aws_globalaccelerator_accelerator.platform[0].ip_sets[0].ip_addresses : null
}

# -----------------------------------------------------------------------------
# Kubeconfig Outputs
# -----------------------------------------------------------------------------

output "primary_kubeconfig_command" {
  description = "AWS CLI command to update kubeconfig for primary cluster"
  value       = "aws eks update-kubeconfig --name ${module.primary_cluster.cluster_name} --region ${data.aws_region.current.name}"
}

output "secondary_kubeconfig_command" {
  description = "AWS CLI command to update kubeconfig for secondary cluster"
  value       = var.enable_multi_cluster ? "aws eks update-kubeconfig --name ${module.secondary_cluster[0].cluster_name} --region ${var.secondary_region}" : null
}
