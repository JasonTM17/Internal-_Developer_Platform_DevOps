#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Database Backup Script
# =============================================================================
# Creates a compressed backup of the PostgreSQL database and uploads to S3.
# Usage: ./scripts/backup.sh [environment]
# =============================================================================

ENVIRONMENT="${1:-local}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/idp-backups"
S3_BUCKET="idp-backups-${ENVIRONMENT}"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "=============================================="
echo "  Database Backup - $ENVIRONMENT"
echo "  Timestamp: $TIMESTAMP"
echo "=============================================="

# Get database URL
case "$ENVIRONMENT" in
  local)
    DATABASE_URL="${DATABASE_URL:-postgresql://idp:idp_secret@localhost:5432/idp_dev}"
    ;;
  dev|staging|production)
    DATABASE_URL=$(aws ssm get-parameter --name "/idp/${ENVIRONMENT}/database/url" --with-decryption --query "Parameter.Value" --output text)
    ;;
esac

BACKUP_FILE="$BACKUP_DIR/idp_${ENVIRONMENT}_${TIMESTAMP}.sql.gz"

# Create backup
echo "Creating backup..."
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --verbose \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# Calculate checksum
CHECKSUM=$(sha256sum "$BACKUP_FILE" | cut -d' ' -f1)
echo "Checksum (SHA-256): $CHECKSUM"

# Upload to S3 (skip for local)
if [[ "$ENVIRONMENT" != "local" ]]; then
  echo "Uploading to S3..."
  aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/daily/${TIMESTAMP}/" \
    --storage-class STANDARD_IA \
    --metadata "checksum=${CHECKSUM},environment=${ENVIRONMENT}"
  
  echo "Upload complete: s3://${S3_BUCKET}/daily/${TIMESTAMP}/"
  
  # Clean up old backups
  echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
  CUTOFF_DATE=$(date -d "-${RETENTION_DAYS} days" +%Y%m%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y%m%d)
  aws s3 ls "s3://${S3_BUCKET}/daily/" | while read -r line; do
    BACKUP_DATE=$(echo "$line" | awk '{print $2}' | tr -d '/' | cut -c1-8)
    if [[ "$BACKUP_DATE" < "$CUTOFF_DATE" ]]; then
      FOLDER=$(echo "$line" | awk '{print $2}')
      aws s3 rm "s3://${S3_BUCKET}/daily/${FOLDER}" --recursive
      echo "  Deleted: $FOLDER"
    fi
  done
fi

# Clean up local file
rm -f "$BACKUP_FILE"

echo ""
echo "✓ Backup completed successfully"
echo "  Environment: $ENVIRONMENT"
echo "  Size: $BACKUP_SIZE"
echo "  Checksum: $CHECKSUM"
