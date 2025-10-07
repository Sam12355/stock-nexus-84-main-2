#!/bin/bash

# Stock Nexus Database Backup Script
# Usage: ./backup_database.sh

# Configuration
DB_NAME="stock_nexus"
DB_HOST="localhost"
DB_PORT="5432"
DB_USER=$(whoami)
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup filename
BACKUP_FILE="$BACKUP_DIR/stock_nexus_backup_$TIMESTAMP.sql"

echo "🔄 Creating database backup..."
echo "📅 Timestamp: $TIMESTAMP"
echo "📁 Backup file: $BACKUP_FILE"

# Create the backup
/usr/local/Cellar/postgresql@16/*/bin/pg_dump \
  -h $DB_HOST \
  -p $DB_PORT \
  -U $DB_USER \
  -d $DB_NAME \
  --verbose \
  --clean \
  --if-exists \
  --create \
  > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully!"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    echo "🗜️  Backup compressed: ${BACKUP_FILE}.gz"
    
    # Show file size
    echo "📊 Backup size: $(du -h "${BACKUP_FILE}.gz" | cut -f1)"
    
    # Keep only last 5 backups (optional)
    echo "🧹 Cleaning old backups (keeping last 5)..."
    ls -t "$BACKUP_DIR"/stock_nexus_backup_*.sql.gz | tail -n +6 | xargs -r rm
    echo "✅ Cleanup completed!"
    
else
    echo "❌ Backup failed!"
    exit 1
fi

echo "🎉 Database backup completed successfully!"




