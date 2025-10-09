#!/bin/bash

# Database export script for local to Render migration
echo "🗄️ Exporting local database..."

# Export the database
pg_dump -h localhost -U postgres -d stock_nexus --data-only --inserts > local_data.sql

echo "✅ Database exported to local_data.sql"
echo "📋 Next steps:"
echo "1. Copy the contents of local_data.sql"
echo "2. Run the SQL commands in your Render PostgreSQL database"
echo "3. Or use the Render database dashboard to import the data"
