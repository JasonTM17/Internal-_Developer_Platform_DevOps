# Scripts

Utility scripts for development, operations, and maintenance of the Internal Developer Platform.

## Script Inventory

| Script | Description | Platform |
|--------|-------------|----------|
| `setup.sh` | Initial project setup (Linux/macOS) | Bash |
| `setup.ps1` | Initial project setup (Windows) | PowerShell |
| `db-migrate.sh` | Run database migrations | Bash |
| `db-seed.sh` | Seed database with sample data | Bash |
| `init-db.sql` | Initial database schema creation | SQL |
| `backup.sh` | Create database and config backups | Bash |
| `restore.sh` | Restore from backup archive | Bash |
| `health-check.sh` | Verify service health endpoints | Bash |
| `cleanup-envs.sh` | Remove stale preview environments | Bash |
| `generate-certs.sh` | Generate TLS certificates for local dev | Bash |
| `port-forward.sh` | Kubectl port-forward for local access | Bash |

## Usage Examples

### Initial Setup

```bash
# Linux/macOS
chmod +x scripts/setup.sh
./scripts/setup.sh

# Windows
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
```

### Database Operations

```bash
# Run pending migrations
./scripts/db-migrate.sh --env dev

# Seed with test data
./scripts/db-seed.sh --env dev --dataset full

# Backup production database
./scripts/backup.sh --env production --output ./backups/
```

### Health Checks

```bash
# Check all services
./scripts/health-check.sh --all

# Check specific service
./scripts/health-check.sh --service api --env staging
```

### Local Development

```bash
# Generate local TLS certs
./scripts/generate-certs.sh

# Port-forward Kubernetes services
./scripts/port-forward.sh --namespace idp-system
```

## Prerequisites

- Bash >= 4.0 (or PowerShell 7+ for Windows scripts)
- `kubectl` configured with cluster access
- `psql` client for database scripts
- `openssl` for certificate generation
- AWS CLI v2 for backup/restore operations
