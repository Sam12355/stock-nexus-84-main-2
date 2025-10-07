# 🚀 Quick Live Deployment Guide

## Option 1: Railway (Recommended - Easiest)

### Backend Deployment
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Choose the `backend` folder
6. Set environment variables:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `JWT_SECRET=your-secure-secret-key`
   - `OPENWEATHER_API_KEY=cce3be258bc74ac704ddac710486be0c`
7. Add PostgreSQL database service
8. Copy DATABASE_URL to environment variables

### Frontend Deployment
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project" → Import your repository
4. Set build command: `npm run build`
5. Set output directory: `dist`
6. Add environment variable:
   - `VITE_API_URL=https://your-backend-url.railway.app/api`
7. Deploy!

## Option 2: Netlify (Alternative)

### Frontend
1. Go to [netlify.com](https://netlify.com)
2. Sign up and click "New site from Git"
3. Connect your GitHub repository
4. Set build command: `npm run build`
5. Set publish directory: `dist`
6. Add environment variable:
   - `VITE_API_URL=https://your-backend-url.railway.app/api`

## Option 3: Local Docker (For Testing)

```bash
# Build and run everything locally
docker-compose up --build

# Access the app at:
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

## Quick Start Commands

```bash
# 1. Build the frontend
npm run build

# 2. Test locally
npm run preview

# 3. Deploy to Railway (backend)
cd backend
railway login
railway up

# 4. Deploy to Vercel (frontend)
vercel --prod
```

## Environment Variables Needed

### Backend (Railway)
- `NODE_ENV=production`
- `PORT=5000`
- `DATABASE_URL=postgresql://...` (from Railway)
- `JWT_SECRET=your-secure-secret`
- `OPENWEATHER_API_KEY=cce3be258bc74ac704ddac710486be0c`
- `FRONTEND_URL=https://your-frontend-url.vercel.app`

### Frontend (Vercel/Netlify)
- `VITE_API_URL=https://your-backend-url.railway.app/api`

## Testing Your Live App

1. **Health Check**: `https://your-backend-url.railway.app/api/health`
2. **Frontend**: `https://your-frontend-url.vercel.app`
3. **Features to test**:
   - User registration/login
   - Inventory management
   - Stock tracking
   - Real-time notifications
   - Weather display
   - Calendar events

## Share Your App

Once deployed, share these URLs with testers:
- **App URL**: `https://your-frontend-url.vercel.app`
- **API URL**: `https://your-backend-url.railway.app/api`

## Troubleshooting

- Check Railway logs for backend issues
- Check Vercel/Netlify logs for frontend issues
- Ensure environment variables are set correctly
- Verify database connection is working
- Check CORS settings allow your frontend domain
