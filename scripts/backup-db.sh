#!/bin/bash
BACKUP_DIR="$HOME/tikstream/backups"
mkdir -p "$BACKUP_DIR"
cp "$HOME/tikstream/data/auction.db" "$BACKUP_DIR/auction.$(date +%Y%m%d_%H%M%S).db"
find "$BACKUP_DIR" -name "*.db" -mtime +7 -delete
echo "Backup done: $(ls -1 $BACKUP_DIR/*.db 2>/dev/null | tail -1)"