#!/bin/bash
# ─────────────────────────────────────────
# servio_backup.sh — Servio Dev Backup Script
# HomiLabs | Servio
# ─────────────────────────────────────────

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PROJECT_DIR="/mnt/storage/projects/servio_dev"
BACKUP_DIR="/mnt/storage/project_backups/servio_dev_backup"
GDRIVE_FOLDER="gdrive:/servio_dev_backup"

echo "Starting Servio backup — $TIMESTAMP"

# --- 1. Local backup ---
mkdir -p "$BACKUP_DIR"
rsync -av --exclude='node_modules' --exclude='.git' \
  "$PROJECT_DIR/" "$BACKUP_DIR/servio_dev_$TIMESTAMP/"

echo "Local backup complete: $BACKUP_DIR/servio_dev_$TIMESTAMP/"

# --- 2. Git push ---
cd "$PROJECT_DIR"
git add .
git status

# --- 3. Google Drive sync ---
echo "Syncing to Google Drive..."
rclone sync "$BACKUP_DIR/servio_dev_$TIMESTAMP/" \
  "$GDRIVE_FOLDER/servio_dev_$TIMESTAMP/" \
  --progress

echo "Google Drive sync complete."
echo "Drive folder: https://drive.google.com/drive/folders/1cX9RhPxk-wd2aN6TPIK3fuYcliS3boUI"
echo "Backup complete — $TIMESTAMP"
