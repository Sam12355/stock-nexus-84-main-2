# Stock Nexus Backend Setup Guide

This guide will help you set up the Node.js + PostgreSQL backend for the Stock Nexus application.

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation Steps

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Set Up PostgreSQL Database

#### Option A: Local PostgreSQL Installation
1. Install PostgreSQL on your system
2. Create a database named `stock_nexus`
3. Create a user with appropriate permissions

#### Option B: Docker PostgreSQL (Recommended)
```bash
# Run PostgreSQL in Docker
docker run --name stock-nexus-db \
  -e POSTGRES_DB=stock_nexus \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Configure Environment Variables

1. Copy the example environment file:
```bash
cp env.example .env
```

2. Edit `.env` file with your database credentials:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stock_nexus
DB_USER=postgres
DB_PASSWORD=password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### 4. Run Database Migration

```bash
npm run migrate
```

This will create all necessary tables and functions in your PostgreSQL database.

### 5. Seed Sample Data (Optional)

```bash
npm run seed
```

This will create sample users, items, and branches for testing.

### 6. Start the Backend Server

#### Development Mode (with auto-reload):
```bash
npm run dev
```

#### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile
- `POST /api/auth/refresh` - Refresh JWT token

### Moveout Lists
- `GET /api/moveout` - Get user's moveout lists
- `POST /api/moveout` - Create new moveout list
- `GET /api/moveout/:id` - Get specific moveout list
- `PATCH /api/moveout/:id/status` - Update moveout list status
- `DELETE /api/moveout/:id` - Delete moveout list

### Other Endpoints
- `GET /api/items` - Get items
- `GET /api/stock` - Get stock data
- `GET /api/notifications` - Get user notifications
- `GET /api/health` - Health check

## Sample Users (After Seeding)

- **Admin**: `admin@stocknexus.com` / `admin123`
- **Manager**: `manager@stocknexus.com` / `manager123`
- **Staff**: `staff@stocknexus.com` / `staff123`

## Database Schema

The migration creates the following tables:
- `regions` - Geographic regions
- `districts` - Districts within regions
- `branches` - Business branches
- `users` - System users with roles
- `items` - Inventory items
- `stock` - Current stock levels
- `stock_movements` - Stock movement history
- `moveout_lists` - Moveout list records
- `notifications` - User notifications
- `activity_logs` - User activity tracking

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Rate limiting
- CORS protection
- Input validation
- SQL injection protection

## Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL is running
2. Check database credentials in `.env`
3. Verify database exists
4. Check firewall settings

### Port Already in Use
```bash
# Kill process using port 5000
lsof -ti:5000 | xargs kill -9
```

### Permission Issues
```bash
# Make sure you have proper PostgreSQL permissions
sudo -u postgres psql
CREATE USER your_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE stock_nexus TO your_user;
```

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use a production PostgreSQL instance
3. Set up SSL certificates
4. Configure reverse proxy (nginx)
5. Set up process manager (PM2)
6. Configure monitoring and logging

## Next Steps

1. Update your frontend to use the new API endpoints
2. Replace Supabase client calls with fetch/axios calls
3. Update authentication flow
4. Test all functionality

For frontend integration, you'll need to:
1. Remove Supabase dependencies
2. Update API calls to use the new backend
3. Implement JWT token management
4. Update authentication context


