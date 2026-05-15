#!/bin/bash
# ─────────────────────────────────────────
# backup.sh — Servio Dev Backup Script
# HomiLabs | Servio
# Run after every session:
#   bash /mnt/storage/projects/servio_dev/backup.sh
# ─────────────────────────────────────────

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PROJECT_DIR="/mnt/storage/projects/servio_dev"
BACKUP_DIR="/mnt/storage/project_backups/servio_dev_backup"
GDRIVE_FOLDER="1cX9RhPxk-wd2aN6TPIK3fuYcliS3boUI"
GDRIVE_REMOTE="gdrive"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Servio Dev Backup — $TIMESTAMP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Local Backup ──────────────────────
echo ""
echo "[ 1/3 ] Local backup..."

mkdir -p "$BACKUP_DIR"

tar --exclude="$PROJECT_DIR/core/functions/node_modules" \
    --exclude="$PROJECT_DIR/core/functions/build" \
    --exclude="$PROJECT_DIR/core/web/node_modules" \
    --exclude="$PROJECT_DIR/core/mobile/node_modules" \
    -czf "$BACKUP_DIR/servio_dev_$TIMESTAMP.tar.gz" \
    -C /mnt/storage/projects servio_dev

if [ $? -eq 0 ]; then
  echo "  ✅ Local backup saved: servio_dev_$TIMESTAMP.tar.gz"
else
  echo "  ❌ Local backup failed"
fi

# Keep only last 10 local backups
cd "$BACKUP_DIR"
ls -t servio_dev_*.tar.gz | tail -n +11 | xargs -r rm
echo "  ✅ Old local backups cleaned (keeping last 10)"

# ── 2. Git Backup ────────────────────────
echo ""
echo "[ 2/3 ] Git backup..."

cd "$PROJECT_DIR"

git add .

git diff --cached --quiet
if [ $? -eq 0 ]; then
  echo "  ℹ️  No changes to commit"
else
  git commit -m "backup: session snapshot $TIMESTAMP"
  git push origin main

  if [ $? -eq 0 ]; then
    echo "  ✅ Git push successful"
  else
    echo "  ❌ Git push failed — check credentials"
  fi
fi

# ── 3. Google Drive Sync ─────────────────
echo ""
echo "[ 3/3 ] Google Drive sync..."

rclone sync "$PROJECT_DIR" \
  "$GDRIVE_REMOTE:drive/id:$GDRIVE_FOLDER" \
  --exclude "node_modules/**" \
  --exclude "build/**" \
  --exclude ".git/**" \
  --exclude "*.tar.gz" \
  --progress

if [ $? -eq 0 ]; then
  echo "  ✅ Google Drive sync complete"
else
  echo "  ❌ Google Drive sync failed"
fi

# ── Summary ──────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Backup complete — $TIMESTAMP"
echo "  Local:  $BACKUP_DIR/servio_dev_$TIMESTAMP.tar.gz"
echo "  Git:    github.com/AwaizFatima08/servio_dev"
echo "  Drive:  drive.google.com/drive/folders/$GDRIVE_FOLDER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
