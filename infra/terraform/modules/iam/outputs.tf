################################################################################
# IAM Module Outputs
################################################################################

output "app_service_account_role_arn" {
  description = "ARN of the application service account IAM role"
  value       = aws_iam_role.app_service_account.arn
}

output "app_service_account_role_name" {
  description = "Name of the application service account IAM role"
  value       = aws_iam_role.app_service_account.name
}

output "cicd_pipeline_role_arn" {
  description = "ARN of the CI/CD pipeline IAM role"
  value       = aws_iam_role.cicd_pipeline.arn
}

output "cicd_pipeline_role_name" {
  description = "Name of the CI/CD pipeline IAM role"
  value       = aws_iam_role.cicd_pipeline.name
}

output "backup_service_role_arn" {
  description = "ARN of the backup service IAM role"
  value       = aws_iam_role.backup_service.arn
}

output "app_policy_arn" {
  description = "ARN of the application IAM policy"
  value       = aws_iam_policy.app_policy.arn
}

output "cicd_policy_arn" {
  description = "ARN of the CI/CD pipeline IAM policy"
  value       = aws_iam_policy.cicd_policy.arn
}
