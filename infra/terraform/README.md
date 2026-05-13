# Terraform Infrastructure

Infrastructure as Code for the Internal Developer Platform, managing AWS resources across multiple environments.

## Module Overview

| Module | Description |
|--------|-------------|
| `vpc` | VPC, subnets, NAT gateways, and flow logs |
| `eks` | EKS cluster, node groups, and IRSA configuration |
| `eks-federation` | Multi-cluster federation and service mesh |
| `rds` | PostgreSQL RDS instances with Multi-AZ |
| `elasticache` | Redis clusters for caching and sessions |
| `s3` | S3 buckets for artifacts, backups, and static assets |
| `ecr` | Container registries with lifecycle policies |
| `iam` | IAM roles, policies, and service accounts |
| `dns` | Route53 zones and DNS records |
| `cloudfront` | CDN distributions for portal and assets |
| `waf` | Web Application Firewall rules |
| `monitoring` | CloudWatch dashboards, alarms, and log groups |
| `secrets-manager` | Secrets rotation and management |
| `cost-optimization` | Budget alerts and resource scheduling |
| `dr` | Disaster recovery and cross-region replication |

## Prerequisites

- AWS account with appropriate IAM permissions
- Terraform >= 1.7.0
- AWS CLI v2 configured with SSO or access keys
- S3 backend bucket and DynamoDB lock table (see `backend.tf`)
- Access to the shared Terraform state

## Quick Start

```bash
# Initialize Terraform with remote backend
terraform init

# Select workspace (environment)
terraform workspace select dev

# Plan changes
terraform plan -var-file=environments/dev/terraform.tfvars -out=plan.out

# Apply changes
terraform apply plan.out
```

## Environment Configuration

| Environment | Account | Region | Description |
|-------------|---------|--------|-------------|
| `dev` | Development | us-east-1 | Development and testing |
| `staging` | Staging | us-east-1 | Pre-production validation |
| `production` | Production | us-east-1 | Live production workloads |

Each environment has its own `terraform.tfvars` file in `environments/<env>/`.

## State Management

State is stored remotely in S3 with DynamoDB locking:

- **Bucket**: `idp-terraform-state-<account-id>`
- **Lock Table**: `terraform-state-lock`
- **Encryption**: AES-256 server-side encryption
- **Versioning**: Enabled for state recovery

## Cost Estimation

Use `infracost` for cost estimation before applying changes:

```bash
infracost breakdown --path . --terraform-var-file=environments/dev/terraform.tfvars
```

## Best Practices

- Always run `terraform plan` before `apply`
- Use `-target` sparingly; prefer full plans
- Tag all resources with `environment`, `team`, and `managed-by`
- Keep modules small and composable
- Pin provider versions in `versions.tf`
