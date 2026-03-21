#!/bin/bash
#
# PostgreSQL Database Backup Script for ClinicalVision AI
# Creates compressed, timestamped backups with retention policy
#
# Usage:./backup_database.sh [backup_dir]
#

set -e # Exit on error
set -u # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env"

# Default backup directory
BACKUP_DIR="${1:-${PROJECT_ROOT}/backups}"
RETENTION_DAYS=30
MAX_BACKUPS=90

# Logging
log_info() {
 echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
 echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
 echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Load environment variables
if [ -f "$ENV_FILE" ]; then
 log_info "Loading environment from $ENV_FILE"
 # Export only DATABASE_URL, POSTGRES_* variables
 export $(grep -E '^(DATABASE_URL|POSTGRES_)' "$ENV_FILE" | xargs)
else
 log_error ".env file not found at $ENV_FILE"
 exit 1
fi

# Parse DATABASE_URL or use individual POSTGRES_* variables
if [ -n "${DATABASE_URL:-}" ]; then
 # Extract from DATABASE_URL: postgresql://user:pass@host:port/dbname
 DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
 DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
 DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
 DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
 DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
else
 # Use individual variables
 DB_USER="${POSTGRES_USER:-clinicalvision}"
 DB_PASS="${POSTGRES_PASSWORD:-}"
 DB_HOST="${POSTGRES_HOST:-localhost}"
 DB_PORT="${POSTGRES_PORT:-5432}"
 DB_NAME="${POSTGRES_DB:-clinicalvision}"
fi

# Validate required variables
if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
 log_error "Database configuration incomplete. Check DATABASE_URL or POSTGRES_* variables."
 exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"
log_info "Backup directory: $BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="${BACKUP_DIR}/clinicalvision_${TIMESTAMP}.sql"
BACKUP_COMPRESSED="${BACKUP_FILE}.gz"

log_info "Starting database backup..."
log_info "Database: $DB_NAME"
log_info "Host: $DB_HOST:$DB_PORT"
log_info "User: $DB_USER"

# Set password for pg_dump (if provided)
if [ -n "${DB_PASS:-}" ]; then
 export PGPASSWORD="$DB_PASS"
fi

# Perform backup using pg_dump
log_info "Creating backup: $BACKUP_FILE"

if pg_dump \
 -h "$DB_HOST" \
 -p "$DB_PORT" \
 -U "$DB_USER" \
 -d "$DB_NAME" \
 --verbose \
 --format=plain \
 --no-owner \
 --no-acl \
 --compress=0 \
 --file="$BACKUP_FILE" 2>&1 | tee /tmp/backup_log.txt; then
 
 log_info "Database dump completed successfully"
 
 # Compress the backup
 log_info "Compressing backup..."
 gzip "$BACKUP_FILE"
 
 # Get compressed file size
 BACKUP_SIZE=$(du -h "$BACKUP_COMPRESSED" | cut -f1)
 log_info "Backup created: $BACKUP_COMPRESSED ($BACKUP_SIZE)"
 
 # Create checksum for integrity verification
 CHECKSUM=$(sha256sum "$BACKUP_COMPRESSED" | cut -d' ' -f1)
 echo "$CHECKSUM $(basename $BACKUP_COMPRESSED)" > "${BACKUP_COMPRESSED}.sha256"
 log_info "Checksum: $CHECKSUM"
 
 # Create metadata file
 cat > "${BACKUP_COMPRESSED}.meta" <<EOF
{
 "timestamp": "$(date -Iseconds)",
 "database": "$DB_NAME",
 "host": "$DB_HOST",
 "size_bytes": $(stat -f%z "$BACKUP_COMPRESSED" 2>/dev/null || stat -c%s "$BACKUP_COMPRESSED"),
 "size_human": "$BACKUP_SIZE",
 "checksum_sha256": "$CHECKSUM",
 "postgres_version": "$(pg_dump --version | head -n1)"
}
EOF
 
 log_info "Metadata saved to ${BACKUP_COMPRESSED}.meta"
 
else
 log_error "Database backup failed!"
 cat /tmp/backup_log.txt
 exit 1
fi

# Cleanup old backups (retention policy)
log_info "Applying retention policy (keep last $RETENTION_DAYS days, max $MAX_BACKUPS backups)..."

# Remove backups older than retention period
find "$BACKUP_DIR" -name "clinicalvision_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "clinicalvision_*.sha256" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "clinicalvision_*.meta" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# Keep only the most recent N backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "clinicalvision_*.sql.gz" -type f | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
 log_warn "Too many backups ($BACKUP_COUNT). Removing oldest..."
 REMOVE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
 find "$BACKUP_DIR" -name "clinicalvision_*.sql.gz" -type f -printf '%T+ %p\n' | \
 sort | head -n "$REMOVE_COUNT" | cut -d' ' -f2- | xargs rm -f
fi

# Summary
REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "clinicalvision_*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log_info "================================"
log_info "Backup Summary:"
log_info " Latest backup: $BACKUP_COMPRESSED"
log_info " Size: $BACKUP_SIZE"
log_info " Total backups: $REMAINING_BACKUPS"
log_info " Total size: $TOTAL_SIZE"
log_info "================================"

# Unset password variable
unset PGPASSWORD

log_info "Backup completed successfully!"
exit 0
