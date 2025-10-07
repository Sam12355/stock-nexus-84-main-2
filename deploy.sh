#!/bin/bash

echo "🚀 Starting deployment process..."

# Install Railway CLI if not already installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "🔐 Logging into Railway..."
railway login

# Create new project
echo "🏗️ Creating Railway project..."
railway project new

# Set environment variables
echo "⚙️ Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set PORT=5000
railway variables set FRONTEND_URL=https://stock-nexus-frontend.railway.app
railway variables set JWT_SECRET=your-super-secure-jwt-secret-key-for-production
railway variables set OPENWEATHER_API_KEY=cce3be258bc74ac704ddac710486be0c

# Deploy backend
echo "🚀 Deploying backend..."
cd backend
railway up

echo "✅ Backend deployed! Now deploying frontend..."

# Deploy frontend
cd ../frontend
railway up

echo "🎉 Deployment complete!"
echo "Backend URL: https://stock-nexus-backend.railway.app"
echo "Frontend URL: https://stock-nexus-frontend.railway.app"
