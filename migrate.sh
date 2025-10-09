#!/bin/bash

# Database migration script for Render deployment
echo "🚀 Starting database migration..."

# Check if we're in production
if [ "$NODE_ENV" = "production" ]; then
    echo "📊 Running in production mode"
    cd backend
    npm run migrate
    echo "✅ Migration completed"
else
    echo "⚠️ Not in production mode, skipping migration"
fi
