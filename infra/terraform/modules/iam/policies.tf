################################################################################
# Custom IAM Policies
################################################################################

################################################################################
# Application Policy - Least privilege for application workloads
################################################################################

resource "aws_iam_policy" "app_policy" {
  name        = "${var.project_name}-${var.environment}-app-policy"
  description = "IAM policy for application workloads in ${var.project_name}-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3ArtifactsAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          var.s3_artifacts_arn,
          "${var.s3_artifacts_arn}/*"
        ]
      },
      {
        Sid    = "SecretsManagerRead"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "arn:aws:secretsmanager:*:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/${var.environment}/*"
      },
      {
        Sid    = "KMSDecrypt"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.*.amazonaws.com"
          }
        }
      },
      {
        Sid    = "SQSAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = "arn:aws:sqs:*:${data.aws_caller_identity.current.account_id}:${var.project_name}-${var.environment}-*"
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:log-group:/aws/eks/${var.project_name}-${var.environment}*:*"
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "app_policy" {
  policy_arn = aws_iam_policy.app_policy.arn
  role       = aws_iam_role.app_service_account.name
}

################################################################################
# CI/CD Pipeline Policy
################################################################################

resource "aws_iam_policy" "cicd_policy" {
  name        = "${var.project_name}-${var.environment}-cicd-policy"
  description = "IAM policy for CI/CD pipeline in ${var.project_name}-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRPushPull"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = [for arn in values(var.ecr_repository_arns) : arn]
      },
      {
        Sid    = "ECRAuth"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Sid    = "EKSDeploy"
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters"
        ]
        Resource = "arn:aws:eks:*:${data.aws_caller_identity.current.account_id}:cluster/${var.project_name}-${var.environment}-*"
      },
      {
        Sid    = "S3ArtifactsUpload"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.s3_artifacts_arn,
          "${var.s3_artifacts_arn}/*"
        ]
      },
      {
        Sid    = "TerraformState"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.project_name}-terraform-state",
          "arn:aws:s3:::${var.project_name}-terraform-state/*"
        ]
      },
      {
        Sid    = "TerraformLock"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:*:${data.aws_caller_identity.current.account_id}:table/${var.project_name}-terraform-locks"
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "cicd_policy" {
  policy_arn = aws_iam_policy.cicd_policy.arn
  role       = aws_iam_role.cicd_pipeline.name
}

################################################################################
# Deny Policy - Explicit denies for safety guardrails
################################################################################

resource "aws_iam_policy" "deny_dangerous_actions" {
  name        = "${var.project_name}-${var.environment}-deny-dangerous"
  description = "Explicit deny for dangerous actions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyRootActions"
        Effect = "Deny"
        Action = [
          "organizations:LeaveOrganization",
          "account:CloseAccount"
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyCloudTrailDisable"
        Effect = "Deny"
        Action = [
          "cloudtrail:DeleteTrail",
          "cloudtrail:StopLogging"
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyGuardDutyDisable"
        Effect = "Deny"
        Action = [
          "guardduty:DeleteDetector",
          "guardduty:DisassociateFromMasterAccount"
        ]
        Resource = "*"
      }
    ]
  })

  tags = var.tags
}
