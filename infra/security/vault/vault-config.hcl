# HashiCorp Vault Server Configuration
# Production-grade configuration for IDP secret management

# Storage backend - using Raft for HA
storage "raft" {
  path    = "/vault/data"
  node_id = "vault-0"

  retry_join {
    leader_api_addr = "https://vault-0.vault-internal:8200"
  }
  retry_join {
    leader_api_addr = "https://vault-1.vault-internal:8200"
  }
  retry_join {
    leader_api_addr = "https://vault-2.vault-internal:8200"
  }
}

# Listener configuration
listener "tcp" {
  address       = "0.0.0.0:8200"
  cluster_address = "0.0.0.0:8201"
  tls_cert_file = "/vault/tls/tls.crt"
  tls_key_file  = "/vault/tls/tls.key"
  tls_min_version = "tls12"

  # Enable request logging
  telemetry {
    unauthenticated_metrics_access = true
  }
}

# API address
api_addr     = "https://vault.idp.example.com:8200"
cluster_addr = "https://vault-0.vault-internal:8201"

# UI
ui = true

# Seal configuration - AWS KMS auto-unseal
seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "alias/vault-unseal-key"
}

# Telemetry
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = true
  
  statsite_address = "statsite:8125"
}

# Audit logging
audit {
  type = "file"
  path = "file"
  options {
    file_path = "/vault/logs/audit.log"
    log_raw   = false
    hmac_accessor = true
  }
}

# Performance tuning
max_lease_ttl     = "768h"  # 32 days
default_lease_ttl = "768h"

# Disable mlock for containerized deployment
disable_mlock = true

# Cluster name
cluster_name = "idp-vault-cluster"

# Plugin directory
plugin_directory = "/vault/plugins"

# Service registration for Kubernetes
service_registration "kubernetes" {}
