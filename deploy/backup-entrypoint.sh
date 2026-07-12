#!/bin/bash
set -eu

CRON_EXPR="${BACKUP_CRON:-0 2 * * *}"
echo "[backup-service] Scheduling automatic backup with cron: ${CRON_EXPR}"

# Build the crontab, passing through the environment variables the
# backup.sh script needs (cron jobs run with a minimal environment).
{
  echo "PGHOST=${PGHOST:-db}"
  echo "PGUSER=${PGUSER:-acy_admin}"
  echo "PGPASSWORD=${PGPASSWORD:-}"
  echo "PGDATABASE=${PGDATABASE:-acy_quotation}"
  echo "BACKUP_PATH=${BACKUP_PATH:-/app/storage/backups}"
  echo "STORAGE_PATH=${STORAGE_PATH:-/app/storage}"
  echo "BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}"
  echo "${CRON_EXPR} /app/scripts/backup.sh automatic >> /app/storage/backups/backup.log 2>&1"
} > /etc/crontabs/root

mkdir -p /app/storage/backups
echo "[backup-service] Running an initial backup now..."
/app/scripts/backup.sh automatic || echo "[backup-service] initial backup failed, will retry on schedule"

exec crond -f -l 2
