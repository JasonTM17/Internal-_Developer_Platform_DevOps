output "kms_key_arn" {
  description = "ARN of the KMS key used for secret encryption"
  value       = aws_kms_key.secrets.arn
}

output "kms_key_id" {
  description = "ID of the KMS key"
  value       = aws_kms_key.secrets.key_id
}

output "secret_arns" {
  description = "Map of secret names to their ARNs"
  value       = { for k, v in aws_secretsmanager_secret.secrets : k => v.arn }
}

output "secret_ids" {
  description = "Map of secret names to their IDs"
  value       = { for k, v in aws_secretsmanager_secret.secrets : k => v.id }
}

output "rotation_lambda_arns" {
  description = "Map of rotation type to Lambda function ARNs"
  value       = { for k, v in aws_lambda_function.rotation : k => v.arn }
}

output "rotation_security_group_id" {
  description = "Security group ID for rotation Lambda"
  value       = aws_security_group.rotation_lambda.id
}
