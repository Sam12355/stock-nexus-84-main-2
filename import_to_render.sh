#!/bin/bash

# Import local database to Render PostgreSQL
# Usage: ./import_to_render.sh

echo "🚀 Importing local database to Render PostgreSQL..."

# Get Render database connection details from user
echo "📋 Please provide your Render PostgreSQL connection details:"
echo "You can find these in your Render PostgreSQL dashboard"
echo ""

read -p "Render Database Host (e.g., dpg-d3ju1g33fgac73ealotg-a): " RENDER_HOST
read -p "Render Database Port (usually 5432): " RENDER_PORT
read -p "Render Database Name: " RENDER_DB
read -p "Render Database Username: " RENDER_USER
read -s -p "Render Database Password: " RENDER_PASSWORD
echo ""

# Set default port if not provided
if [ -z "$RENDER_PORT" ]; then
    RENDER_PORT=5432
fi

echo ""
echo "🔗 Connecting to Render database..."
echo "Host: $RENDER_HOST"
echo "Port: $RENDER_PORT"
echo "Database: $RENDER_DB"
echo "User: $RENDER_USER"
echo ""

# Test connection first
echo "🧪 Testing connection..."
PGPASSWORD="$RENDER_PASSWORD" psql -h "$RENDER_HOST" -p "$RENDER_PORT" -U "$RENDER_USER" -d "$RENDER_DB" -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Connection successful!"
else
    echo "❌ Connection failed. Please check your credentials."
    exit 1
fi

# Import the data
echo "📥 Importing data from stock_nexus_complete_backup_20251008_032316.sql..."
PGPASSWORD="$RENDER_PASSWORD" psql -h "$RENDER_HOST" -p "$RENDER_PORT" -U "$RENDER_USER" -d "$RENDER_DB" -f stock_nexus_complete_backup_20251008_032316.sql

if [ $? -eq 0 ]; then
    echo "✅ Data import completed successfully!"
    echo ""
    echo "🎉 Your local database has been migrated to Render!"
    echo "You can now test your application with the migrated data."
else
    echo "❌ Data import failed. Please check the error messages above."
    exit 1
fi
