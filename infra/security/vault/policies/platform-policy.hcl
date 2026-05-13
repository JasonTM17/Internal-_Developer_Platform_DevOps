# Vault Policy: IDP Platform Services
# Grants access to secrets needed by the IDP platform components

# ============================================================================
# Database credentials
# ============================================================================
path "secret/data/idp/+/database" {
  capabilities = ["read"]
}

path "secret/metadata/idp/+/database" {
  capabilities = ["read", "list"]
}

# Dynamic database credentials
path "database/creds/idp-api-role" {
  capabilities = ["read"]
}

# ============================================================================
# Application secrets
# ============================================================================
path "secret/data/idp/+/app/*" {
  capabilities = ["read"]
}

path "secret/metadata/idp/+/app/*" {
  capabilities = ["read", "list"]
}

# ============================================================================
# JWT signing keys
# ============================================================================
path "secret/data/idp/+/auth/jwt" {
  capabilities = ["read"]
}

path "transit/sign/idp-jwt-key" {
  capabilities = ["update"]
}

path "transit/verify/idp-jwt-key" {
  capabilities = ["update"]
}

# ============================================================================
# TLS certificates
# ============================================================================
path "pki/issue/idp-platform" {
  capabilities = ["create", "update"]
}

path "pki/cert/*" {
  capabilities = ["read"]
}

# ============================================================================
# Encryption as a Service
# ============================================================================
path "transit/encrypt/idp-data-key" {
  capabilities = ["update"]
}

path "transit/decrypt/idp-data-key" {
  capabilities = ["update"]
}

# ============================================================================
# AWS dynamic credentials
# ============================================================================
path "aws/creds/idp-deploy-role" {
  capabilities = ["read"]
}

path "aws/sts/idp-deploy-role" {
  capabilities = ["create", "update"]
}

# ============================================================================
# KV secrets engine - team-scoped
# ============================================================================
# Platform team can manage all secrets
path "secret/data/idp/*" {
  capabilities = ["create", "read", "update", "delete"]
}

path "secret/metadata/idp/*" {
  capabilities = ["read", "list", "delete"]
}

# ============================================================================
# Self-service token management
# ============================================================================
path "auth/token/renew-self" {
  capabilities = ["update"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}

# ============================================================================
# Deny access to other team secrets
# ============================================================================
path "secret/data/other-teams/*" {
  capabilities = ["deny"]
}

# ============================================================================
# Audit log access (read-only)
# ============================================================================
path "sys/audit" {
  capabilities = ["read"]
}
