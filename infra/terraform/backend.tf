################################################################################
# Remote State Configuration
# 
# Prerequisites:
# - S3 bucket must be created manually or via bootstrap script
# - DynamoDB table for state locking must exist
# - Bucket versioning and encryption should be enabled
################################################################################

terraform {
  backend "s3" {
    bucket         = "idp-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "idp-terraform-locks"

    # Enable state file versioning for rollback capability
    # Bucket-level versioning must be enabled separately

    # Access logging
    # Ensure the S3 bucket has access logging enabled to the logs bucket
  }
}

# Remote state data source for cross-stack references
data "terraform_remote_state" "network" {
  backend = "s3"

  config = {
    bucket = "idp-terraform-state"
    key    = "network/terraform.tfstate"
    region = "us-east-1"
  }
}
