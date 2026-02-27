#!/bin/bash
#
# PostgreSQL Database Restore Script for ClinicalVision AI
# Restores database from compressed backup with integrity verification
#
# Usage: ./restore_database.sh <backup_file> [--force]
#

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env"

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

# Check arguments
if [ $# -lt 1 ]; then
    log_error "Usage: $0 <backup_file> [--force]"
    log_error "Example: $0 backups/clinicalvision_20260113_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"
FORCE_RESTORE=false

if [ "${2:-}" = "--force" ]; then
    FORCE_RESTORE=true
fi

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

log_info "Restore file: $BACKUP_FILE"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    log_info "Loading environment from $ENV_FILE"
    export $(grep -E '^(DATABASE_URL|POSTGRES_)' "$ENV_FILE" | xargs)
else
    log_error ".env file not found at $ENV_FILE"
    exit 1
fi

# Parse DATABASE_URL or use individual POSTGRES_* variables
if [ -n "${DATABASE_URL:-}" ]; then
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
else
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

log_info "Database: $DB_NAME"
log_info "Host: $DB_HOST:$DB_PORT"
log_info "User: $DB_USER"

# Verify checksum if available
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "$CHECKSUM_FILE" ]; then
    log_info "Verifying backup integrity..."
    if sha256sum -c "$CHECKSUM_FILE" > /dev/null 2>&1; then
        log_info "Checksum verification: PASSED"
    else
        log_error "Checksum verification: FAILED"
        log_error "Backup file may be corrupted. Aborting restore."
        exit 1
    fi
else
    log_warn "No checksum file found. Skipping integrity verification."
fi

# Read metadata if available
META_FILE="${BACKUP_FILE}.meta"
if [ -f "$META_FILE" ]; then
    log_info "Backup metadata:"
    cat "$META_FILE"
fi

# Warning prompt (unless --force)
if [ "$FORCE_RESTORE" = false ]; then
    log_warn "================================"
    log_warn "WARNING: This will REPLACE the current database!"
    log_warn "Database: $DB_NAME"
    log_warn "All existing data will be LOST!"
    log_warn "================================"
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        log_info "Restore cancelled by user"
        exit 0
    fi
fi

# Set password for psql (if provided)
if [ -n "${DB_PASS:-}" ]; then
    export PGPASSWORD="$DB_PASS"
fi

# Create temporary restore directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

log_info "Decompressing backup..."
TEMP_SQL="${TEMP_DIR}/restore.sql"
gunzip -c "$BACKUP_FILE" > "$TEMP_SQL"

log_info "Creating pre-restore backup (safety measure)..."
SAFETY_BACKUP="${TEMP_DIR}/pre_restore_safety_backup.sql.gz"
pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-acl | gzip > "$SAFETY_BACKUP" 2>/dev/null || log_warn "Safety backup failed (database may not exist yet)"

log_info "Terminating existing connections to database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
    2>/dev/null || log_warn "Could not terminate connections"

log_info "Dropping existing database..."
dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || log_warn "Database drop failed (may not exist)"

log_info "Creating new database..."
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

log_info "Restoring database from backup..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$TEMP_SQL" 2>&1 | tee /tmp/restore_log.txt; then
    log_info "Database restored successfully!"
    
    # Verify restoration
    log_info "Verifying restored database..."
    TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    
    log_info "Restored tables: $TABLE_COUNT"
    
    if [ "$TABLE_COUNT" -eq 0 ]; then
        log_error "No tables found in restored database!"
        
        if [ -f "$SAFETY_BACKUP" ]; then
            log_warn "Attempting to restore from safety backup..."
            dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
            createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
            gunzip -c "$SAFETY_BACKUP" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null
            log_info "Original database restored from safety backup"
        fi
        
        exit 1
    fi
    
    # List restored tables
    log_info "Restored tables:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
        "\dt" 2>/dev/null || true
    
    log_info "================================"
    log_info "Restore completed successfully!"
    log_info "Safety backup saved at: $SAFETY_BACKUP"
    log_info "================================"
    
else
    log_error "Database restore failed!"
    cat /tmp/restore_log.txt
    
    if [ -f "$SAFETY_BACKUP" ]; then
        log_warn "Attempting to restore from safety backup..."
        dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
        createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
        gunzip -c "$SAFETY_BACKUP" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null
        log_info "Original database restored from safety backup"
    fi
    
    exit 1
fi

# Unset password variable
unset PGPASSWORD

exit 0
