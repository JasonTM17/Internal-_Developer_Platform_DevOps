#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Database Migration Runner
# =============================================================================
# Runs pending database migrations against the target environment.
# Usage: ./scripts/db-migrate.sh [environment]
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_ROOT/apps/api/src/db/migrations"

ENVIRONMENT="${1:-local}"

# Load environment-specific database URL
case "$ENVIRONMENT" in
  local)
    DATABASE_URL="${DATABASE_URL:-postgresql://idp:idp_secret@localhost:5432/idp_dev}"
    ;;
  dev)
    DATABASE_URL=$(aws ssm get-parameter --name "/idp/dev/database/url" --with-decryption --query "Parameter.Value" --output text)
    ;;
  staging)
    DATABASE_URL=$(aws ssm get-parameter --name "/idp/staging/database/url" --with-decryption --query "Parameter.Value" --output text)
    ;;
  production)
    echo "⚠️  Production migrations require explicit confirmation"
    read -p "Are you sure you want to run migrations on PRODUCTION? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
      echo "Aborted."
      exit 1
    fi
    DATABASE_URL=$(aws ssm get-parameter --name "/idp/production/database/url" --with-decryption --query "Parameter.Value" --output text)
    ;;
  *)
    echo "Unknown environment: $ENVIRONMENT"
    echo "Usage: $0 [local|dev|staging|production]"
    exit 1
    ;;
esac

echo "=============================================="
echo "  Database Migration - $ENVIRONMENT"
echo "=============================================="
echo ""

# Create migrations tracking table if not exists
psql "$DATABASE_URL" -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  checksum VARCHAR(64)
);" 2>/dev/null

# Get applied migrations
APPLIED=$(psql "$DATABASE_URL" -t -c "SELECT version FROM schema_migrations ORDER BY version;" 2>/dev/null | tr -d ' ')

# Find pending migrations
PENDING=0
for migration in "$MIGRATIONS_DIR"/*.sql; do
  if [[ ! -f "$migration" ]]; then
    continue
  fi
  
  VERSION=$(basename "$migration" | cut -d'_' -f1)
  
  if echo "$APPLIED" | grep -q "^${VERSION}$"; then
    echo "  ✓ $VERSION (already applied)"
  else
    PENDING=$((PENDING + 1))
    echo "  → $VERSION (pending)"
    
    # Calculate checksum
    CHECKSUM=$(sha256sum "$migration" | cut -d' ' -f1)
    
    # Apply migration
    echo "    Applying $(basename "$migration")..."
    psql "$DATABASE_URL" -f "$migration"
    
    # Record migration
    psql "$DATABASE_URL" -c "
      INSERT INTO schema_migrations (version, checksum) 
      VALUES ('$VERSION', '$CHECKSUM');"
    
    echo "    ✓ Applied successfully"
  fi
done

echo ""
if [[ $PENDING -eq 0 ]]; then
  echo "✓ Database is up to date. No pending migrations."
else
  echo "✓ Applied $PENDING migration(s) successfully."
fi
