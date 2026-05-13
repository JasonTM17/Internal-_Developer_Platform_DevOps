#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Database Restore Script
# =============================================================================
# Restores a database from a backup file or S3.
# Usage: ./scripts/restore.sh [environment] [backup-file|s3-path]
# =============================================================================

ENVIRONMENT="${1:-local}"
BACKUP_SOURCE="${2:-}"

echo "=============================================="
echo "  Database Restore - $ENVIRONMENT"
echo "=============================================="

# Safety check for production
if [[ "$ENVIRONMENT" == "production" ]]; then
  echo ""
  echo "⚠️  WARNING: You are about to restore the PRODUCTION database!"
  echo "   This will OVERWRITE all current data."
  echo ""
  read -p "Type 'RESTORE PRODUCTION' to confirm: " confirm
  if [[ "$confirm" != "RESTORE PRODUCTION" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

# Get database URL
case "$ENVIRONMENT" in
  local)
    DATABASE_URL="${DATABASE_URL:-postgresql://idp:idp_secret@localhost:5432/idp_dev}"
    ;;
  dev|staging|production)
    DATABASE_URL=$(aws ssm get-parameter --name "/idp/${ENVIRONMENT}/database/url" --with-decryption --query "Parameter.Value" --output text)
    ;;
esac

# Determine backup source
RESTORE_FILE="/tmp/idp-restore-$$.sql.gz"

if [[ -z "$BACKUP_SOURCE" ]]; then
  # List available backups
  S3_BUCKET="idp-backups-${ENVIRONMENT}"
  echo "Available backups:"
  aws s3 ls "s3://${S3_BUCKET}/daily/" --recursive | tail -10
  echo ""
  read -p "Enter S3 path to restore: " BACKUP_SOURCE
fi

if [[ "$BACKUP_SOURCE" == s3://* ]]; then
  echo "Downloading backup from S3..."
  aws s3 cp "$BACKUP_SOURCE" "$RESTORE_FILE"
elif [[ -f "$BACKUP_SOURCE" ]]; then
  RESTORE_FILE="$BACKUP_SOURCE"
else
  echo "Error: Backup source not found: $BACKUP_SOURCE"
  exit 1
fi

echo "Backup file: $RESTORE_FILE"
echo "Target: $ENVIRONMENT"
echo ""

# Verify checksum if available
if [[ "$BACKUP_SOURCE" == s3://* ]]; then
  EXPECTED_CHECKSUM=$(aws s3api head-object --bucket "${S3_BUCKET}" --key "${BACKUP_SOURCE#s3://${S3_BUCKET}/}" --query "Metadata.checksum" --output text 2>/dev/null || echo "")
  if [[ -n "$EXPECTED_CHECKSUM" && "$EXPECTED_CHECKSUM" != "None" ]]; then
    ACTUAL_CHECKSUM=$(sha256sum "$RESTORE_FILE" | cut -d' ' -f1)
    if [[ "$EXPECTED_CHECKSUM" == "$ACTUAL_CHECKSUM" ]]; then
      echo "✓ Checksum verified"
    else
      echo "✗ Checksum mismatch! Backup may be corrupted."
      exit 1
    fi
  fi
fi

# Perform restore
echo "Restoring database..."
pg_restore "$RESTORE_FILE" \
  --dbname="$DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --verbose \
  2>&1 | tail -5

# Clean up
if [[ "$BACKUP_SOURCE" == s3://* ]]; then
  rm -f "$RESTORE_FILE"
fi

echo ""
echo "✓ Database restored successfully"
echo "  Environment: $ENVIRONMENT"
echo "  Source: $BACKUP_SOURCE"
