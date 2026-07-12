#!/bin/sh
# ACY Quotation System - Restore Script
# Restores database + storage files from a backup archive created by backup.sh
#
# Usage: restore.sh /app/storage/backups/acy_backup_20260101_020000.tar.gz
set -eu

ARCHIVE="${1:-}"
STORAGE_PATH="${STORAGE_PATH:-/app/storage}"

if [ -z "$ARCHIVE" ] || [ ! -f "$ARCHIVE" ]; then
  echo "Usage: restore.sh <path-to-backup-archive.tar.gz>" >&2
  exit 1
fi

echo "[restore] WARNING: this will overwrite the current database and storage files."
echo "[restore] Restoring from: $ARCHIVE"

WORKDIR="/tmp/acy_restore_$$"
mkdir -p "$WORKDIR"
tar -xzf "$ARCHIVE" -C "$WORKDIR"

if [ ! -f "${WORKDIR}/database.sql" ]; then
  echo "[restore] ERROR: database.sql not found in archive" >&2
  rm -rf "$WORKDIR"
  exit 1
fi

echo "[restore] Restoring database..."
PGPASSWORD="${PGPASSWORD:-}" dropdb --if-exists -h "${PGHOST:-db}" -U "${PGUSER:-acy_admin}" "${PGDATABASE:-acy_quotation}"
PGPASSWORD="${PGPASSWORD:-}" createdb -h "${PGHOST:-db}" -U "${PGUSER:-acy_admin}" "${PGDATABASE:-acy_quotation}"
PGPASSWORD="${PGPASSWORD:-}" psql -h "${PGHOST:-db}" -U "${PGUSER:-acy_admin}" -d "${PGDATABASE:-acy_quotation}" -f "${WORKDIR}/database.sql" > /dev/null

if [ -d "${WORKDIR}/storage" ]; then
  echo "[restore] Restoring storage files..."
  mkdir -p "$STORAGE_PATH"
  cp -rf "${WORKDIR}/storage/." "$STORAGE_PATH/"
fi

rm -rf "$WORKDIR"
echo "[restore] Done. Restart the app container: docker compose restart app"
