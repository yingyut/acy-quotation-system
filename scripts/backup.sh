#!/bin/sh
# ACY Quotation System - Backup Script
# Dumps the PostgreSQL database and archives the storage folder
# (product images, datasheets, generated PDFs, attachments) into
# a single timestamped .tar.gz under $BACKUP_PATH.
#
# Usage: backup.sh [manual|automatic]
set -eu

BACKUP_TYPE="${1:-manual}"
BACKUP_PATH="${BACKUP_PATH:-/app/storage/backups}"
STORAGE_PATH="${STORAGE_PATH:-/app/storage}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
WORKDIR="/tmp/acy_backup_${TIMESTAMP}"
ARCHIVE_NAME="acy_backup_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_PATH" "$WORKDIR"

echo "[backup] Starting ${BACKUP_TYPE} backup at ${TIMESTAMP}"

DUMP_FILE="${WORKDIR}/database.sql"
if ! pg_dump --format=plain --no-owner --no-privileges \
     -h "${PGHOST:-db}" -U "${PGUSER:-acy_admin}" "${PGDATABASE:-acy_quotation}" > "$DUMP_FILE" 2> "${WORKDIR}/pg_dump.err"; then
  echo "[backup] ERROR: pg_dump failed" >&2
  cat "${WORKDIR}/pg_dump.err" >&2
  rm -rf "$WORKDIR"
  exit 1
fi

# Copy files (excluding the backups folder itself to avoid recursion)
mkdir -p "${WORKDIR}/storage"
for d in uploads pdf; do
  if [ -d "${STORAGE_PATH}/${d}" ]; then
    cp -r "${STORAGE_PATH}/${d}" "${WORKDIR}/storage/${d}"
  fi
done

tar -czf "${BACKUP_PATH}/${ARCHIVE_NAME}" -C "$WORKDIR" database.sql storage

SIZE_BYTES=$(wc -c < "${BACKUP_PATH}/${ARCHIVE_NAME}" 2>/dev/null || echo 0)
rm -rf "$WORKDIR"

echo "[backup] Completed: ${BACKUP_PATH}/${ARCHIVE_NAME} (${SIZE_BYTES} bytes)"

# Retention cleanup
find "$BACKUP_PATH" -name 'acy_backup_*.tar.gz' -mtime "+${RETENTION_DAYS}" -print -delete 2>/dev/null || true

echo "${ARCHIVE_NAME}|${SIZE_BYTES}|SUCCESS"
