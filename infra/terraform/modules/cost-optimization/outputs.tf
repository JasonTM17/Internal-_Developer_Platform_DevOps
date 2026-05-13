###############################################################################
# Cost Optimization Module - Outputs
###############################################################################

output "kubecost_namespace" {
  description = "Namespace where Kubecost is installed"
  value       = kubernetes_namespace.kubecost.metadata[0].name
}

output "kubecost_endpoint" {
  description = "Internal endpoint for Kubecost UI"
  value       = "http://kubecost-cost-analyzer.kubecost.svc.cluster.local:9090"
}

output "spot_node_group_name" {
  description = "Name of the Spot instance node group"
  value       = aws_eks_node_group.spot_workload.node_group_name
}

output "spot_node_group_status" {
  description = "Status of the Spot node group"
  value       = aws_eks_node_group.spot_workload.status
}

output "kubecost_s3_bucket" {
  description = "S3 bucket for Kubecost ETL data"
  value       = aws_s3_bucket.kubecost_data.id
}

output "monthly_budget_id" {
  description = "AWS Budget ID for monthly cost tracking"
  value       = aws_budgets_budget.monthly_total.id
}

output "compute_budget_id" {
  description = "AWS Budget ID for compute cost tracking"
  value       = aws_budgets_budget.compute.id
}

output "resource_quota_name" {
  description = "Name of the Kubernetes resource quota"
  value       = kubernetes_resource_quota.platform_quota.metadata[0].name
}

output "cost_allocation_tags" {
  description = "Active cost allocation tags"
  value = [
    aws_ce_cost_allocation_tag.team.tag_key,
    aws_ce_cost_allocation_tag.service.tag_key,
    aws_ce_cost_allocation_tag.environment.tag_key,
  ]
}
