#!/bin/bash

# Startup script for Render deployment
echo "🚀 Starting Stock Nexus Backend..."

# Change to backend directory
cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
sleep 5

# Run migration
echo "📊 Running database migration..."
npm run migrate

# Run seed if no users exist
echo "🌱 Checking if users exist..."
USER_COUNT=$(node -e "
const { query } = require('./config/database');
query('SELECT COUNT(*) as count FROM users').then(result => {
  console.log(result.rows[0].count);
  process.exit(0);
}).catch(err => {
  console.log('0');
  process.exit(0);
});
")

if [ "$USER_COUNT" = "0" ]; then
    echo "👥 No users found, running seed..."
    npm run seed
else
    echo "👥 Users already exist, skipping seed"
fi

# Start the server
echo "🚀 Starting server..."
npm start
