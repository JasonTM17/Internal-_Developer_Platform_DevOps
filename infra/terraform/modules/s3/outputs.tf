################################################################################
# S3 Module Outputs
################################################################################

output "artifacts_bucket_id" {
  description = "Name of the artifacts S3 bucket"
  value       = aws_s3_bucket.artifacts.id
}

output "artifacts_bucket_arn" {
  description = "ARN of the artifacts S3 bucket"
  value       = aws_s3_bucket.artifacts.arn
}

output "artifacts_bucket_domain" {
  description = "Domain name of the artifacts bucket"
  value       = aws_s3_bucket.artifacts.bucket_regional_domain_name
}

output "backups_bucket_id" {
  description = "Name of the backups S3 bucket"
  value       = aws_s3_bucket.backups.id
}

output "backups_bucket_arn" {
  description = "ARN of the backups S3 bucket"
  value       = aws_s3_bucket.backups.arn
}

output "logs_bucket_id" {
  description = "Name of the logs S3 bucket"
  value       = aws_s3_bucket.logs.id
}

output "logs_bucket_arn" {
  description = "ARN of the logs S3 bucket"
  value       = aws_s3_bucket.logs.arn
}

output "logs_bucket_domain" {
  description = "Domain name of the logs bucket"
  value       = aws_s3_bucket.logs.bucket_regional_domain_name
}
