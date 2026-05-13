################################################################################
# ECR Module Outputs
################################################################################

output "repository_urls" {
  description = "Map of repository names to their URLs"
  value       = { for name, repo in aws_ecr_repository.main : name => repo.repository_url }
}

output "repository_arns" {
  description = "Map of repository names to their ARNs"
  value       = { for name, repo in aws_ecr_repository.main : name => repo.arn }
}

output "registry_id" {
  description = "Registry ID where the repositories are created"
  value       = values(aws_ecr_repository.main)[0].registry_id
}

output "repository_names" {
  description = "List of created repository names"
  value       = [for repo in aws_ecr_repository.main : repo.name]
}
