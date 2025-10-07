# Stock Nexus - Live Deployment Guide

## Quick Deployment Steps

### 1. Backend Deployment (Railway)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Navigate to backend directory
cd backend

# Deploy backend
railway up

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=5000
railway variables set JWT_SECRET=your-super-secure-jwt-secret-key
railway variables set OPENWEATHER_API_KEY=cce3be258bc74ac704ddac710486be0c
```

### 2. Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to project root
cd ..

# Deploy frontend
vercel

# Set environment variable for API URL
vercel env add VITE_API_URL
# Enter: https://your-backend-url.railway.app/api
```

### 3. Database Setup

The app will use Railway's PostgreSQL database. Make sure to:

1. Add PostgreSQL service in Railway
2. Copy the DATABASE_URL to your backend environment variables
3. Run database migrations

### 4. Environment Variables

#### Backend (Railway)
- `NODE_ENV=production`
- `PORT=5000`
- `DATABASE_URL=postgresql://...` (from Railway PostgreSQL)
- `JWT_SECRET=your-secure-secret`
- `OPENWEATHER_API_KEY=cce3be258bc74ac704ddac710486be0c`
- `FRONTEND_URL=https://your-frontend-url.vercel.app`

#### Frontend (Vercel)
- `VITE_API_URL=https://your-backend-url.railway.app/api`

## Testing the Live App

1. **Backend Health Check**: `https://your-backend-url.railway.app/api/health`
2. **Frontend**: `https://your-frontend-url.vercel.app`
3. **Database**: Connected via Railway PostgreSQL

## Features Available

✅ User Authentication  
✅ Inventory Management  
✅ Stock Tracking  
✅ Real-time Notifications  
✅ Weather Integration  
✅ Calendar Events  
✅ Reports & Analytics  
✅ Multi-branch Support  

## Support

If you encounter any issues during deployment, check:
1. Environment variables are set correctly
2. Database connection is working
3. CORS settings allow your frontend domain
4. All required services are running
