###############################################################################
# AWS Secrets Manager Module
# Manages secrets with automatic rotation for platform services
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
# KMS Key for Secret Encryption
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_kms_key" "secrets" {
  description             = "KMS key for platform secrets encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  rotation_period_in_days = 365

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowSecretsManagerAccess"
        Effect = "Allow"
        Principal = {
          Service = "secretsmanager.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey",
          "kms:ReEncrypt*",
          "kms:DescribeKey",
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowEKSPodAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.eks_pod_role_arns
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.environment}-platform-secrets-key"
  })
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${var.environment}-platform-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}

data "aws_caller_identity" "current" {}

# ─────────────────────────────────────────────────────────────────────────────
# Secrets
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "secrets" {
  for_each = var.secrets

  name        = "${var.environment}/platform/${each.key}"
  description = each.value.description
  kms_key_id  = aws_kms_key.secrets.arn

  recovery_window_in_days = var.environment == "production" ? 30 : 7

  replica {
    region = var.replica_region
  }

  tags = merge(var.tags, {
    Name        = each.key
    Environment = var.environment
    Rotation    = each.value.rotation_enabled ? "enabled" : "disabled"
  })
}

resource "aws_secretsmanager_secret_version" "secrets" {
  for_each = { for k, v in var.secrets : k => v if v.initial_value != null }

  secret_id     = aws_secretsmanager_secret.secrets[each.key].id
  secret_string = each.value.initial_value

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Secret Rotation (Lambda-based)
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret_rotation" "rotating_secrets" {
  for_each = { for k, v in var.secrets : k => v if v.rotation_enabled }

  secret_id           = aws_secretsmanager_secret.secrets[each.key].id
  rotation_lambda_arn = aws_lambda_function.rotation[each.value.rotation_type].arn

  rotation_rules {
    automatically_after_days = each.value.rotation_days
    schedule_expression      = each.value.rotation_schedule
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Rotation Lambda Functions
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_lambda_function" "rotation" {
  for_each = toset(distinct([for s in var.secrets : s.rotation_type if s.rotation_enabled]))

  function_name = "${var.environment}-secret-rotation-${each.key}"
  description   = "Rotates ${each.key} secrets for the platform"
  runtime       = "python3.11"
  handler       = "lambda_function.lambda_handler"
  timeout       = 60
  memory_size   = 128

  filename         = "${path.module}/lambda/${each.key}/rotation.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda/${each.key}/rotation.zip")

  role = aws_iam_role.rotation_lambda.arn

  environment {
    variables = {
      ENVIRONMENT = var.environment
      KMS_KEY_ID  = aws_kms_key.secrets.key_id
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.rotation_lambda.id]
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-secret-rotation-${each.key}"
  })
}

resource "aws_lambda_permission" "secrets_manager" {
  for_each = toset(distinct([for s in var.secrets : s.rotation_type if s.rotation_enabled]))

  statement_id  = "AllowSecretsManagerInvocation"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rotation[each.key].function_name
  principal     = "secretsmanager.amazonaws.com"
}

# ─────────────────────────────────────────────────────────────────────────────
# IAM Role for Rotation Lambda
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_iam_role" "rotation_lambda" {
  name = "${var.environment}-secret-rotation-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "rotation_lambda" {
  name = "secret-rotation-policy"
  role = aws_iam_role.rotation_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage",
        ]
        Resource = [for s in aws_secretsmanager_secret.secrets : s.arn]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey",
        ]
        Resource = [aws_kms_key.secrets.arn]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
    ]
  })
}

# ─────────────────────────────────────────────────────────────────────────────
# Security Group for Rotation Lambda
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_security_group" "rotation_lambda" {
  name_prefix = "${var.environment}-secret-rotation-"
  description = "Security group for secret rotation Lambda"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS to Secrets Manager and RDS"
  }

  egress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.database_cidr_blocks
    description = "PostgreSQL for DB credential rotation"
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-secret-rotation-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}
