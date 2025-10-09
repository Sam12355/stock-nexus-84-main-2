#!/bin/bash

# Simple database setup script for Render
# This will create a clean database with proper schema

echo "🚀 Setting up database for Render deployment..."

# Navigate to backend directory
cd backend

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
sleep 10

# Test database connection
echo "🔍 Testing database connection..."
if node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
pool.query('SELECT NOW()').then(() => {
  console.log('✅ Database connection successful');
  process.exit(0);
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});
"; then
    echo "✅ Database connection verified"
else
    echo "❌ Database connection failed!"
    exit 1
fi

# Run migration to create tables
echo "📊 Running database migration..."
if node scripts/migrate.js; then
    echo "✅ Migration completed successfully"
else
    echo "❌ Migration failed!"
    exit 1
fi

# Run seed to create initial data
echo "🌱 Running database seed..."
if node scripts/seed.js; then
    echo "✅ Seeding completed successfully"
else
    echo "❌ Seeding failed!"
    exit 1
fi

echo "✅ Database setup completed!"

# Start the server
echo "🚀 Starting server..."
node server.js
