#!/bin/bash

# Simple database setup script for Render
# This will create a clean database with proper schema

echo "🚀 Setting up database for Render deployment..."

# Navigate to backend directory
cd backend

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
sleep 10

# Run migration to create tables
echo "📊 Running database migration..."
node scripts/migrate.js

# Run seed to create initial data
echo "🌱 Running database seed..."
node scripts/seed.js

echo "✅ Database setup completed!"

# Start the server
echo "🚀 Starting server..."
node server.js
