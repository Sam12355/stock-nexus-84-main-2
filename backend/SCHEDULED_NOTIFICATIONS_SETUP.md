# Automated Scheduled Stock Alerts

## Overview
This system automatically sends stock level alerts via WhatsApp at scheduled times:
- **Daily**: Every day at a specific time
- **Weekly**: On a specific day of the week at a specific time  
- **Monthly**: On a specific date of the month at a specific time
- **Immediate**: Real-time alerts when stock levels change

## How It Works

### 1. User Configuration
Users can configure their alert schedule in the Settings page:
1. Enable "Stock Level Alerts" toggle
2. Choose frequency (Daily/Weekly/Monthly)
3. Select day/date and time
4. Save preferences

### 2. Database Storage
Alert preferences are stored in the `users` table:
- `stock_alert_frequency`: 'immediate', 'daily', 'weekly', 'monthly'
- `stock_alert_schedule_day`: 0-6 (for weekly, Sunday=0)
- `stock_alert_schedule_date`: 1-31 (for monthly)
- `stock_alert_schedule_time`: HH:MM format

### 3. Automated Execution
The system automatically runs every minute when the server is running:
- **Built-in Scheduler**: Runs automatically when server starts
- **No Manual Setup Required**: Works out of the box
- **Background Process**: Checks for scheduled alerts every minute

## Setup Instructions

### 1. Database Migration
The alert scheduling columns are automatically added to the `users` table.

### 2. Automatic Startup
The scheduler starts automatically when you start the backend server:
```bash
cd backend
npm start
# or
node server.js
```

### 3. No Additional Configuration Required
The system works automatically - no cron jobs or manual setup needed!

## API Endpoints

### Get Scheduler Status (Admin)
```http
GET /api/scheduled-notifications/status
Authorization: Bearer <admin-token>
```

### Manually Trigger Alerts (Admin - for testing)
```http
POST /api/scheduled-notifications/trigger-alerts
Authorization: Bearer <admin-token>
```

### Get User's Alert Schedule
```http
GET /api/scheduled-notifications/status
Authorization: Bearer <user-token>
```

## Message Format

Scheduled alerts include:
- Alert frequency (Daily/Weekly/Monthly)
- Branch name
- Current date
- List of low stock items with:
  - Item name
  - Current quantity vs threshold
  - Status (CRITICAL/LOW/BELOW THRESHOLD)

## Testing

### Automatic Testing
1. Set up a user with scheduled alerts in Settings
2. Create some low stock items
3. Set the alert time to the current time (or 1 minute from now)
4. Wait for the automatic scheduler to trigger
5. Check WhatsApp for the scheduled alert

### Manual Testing (Admin)
1. Set up a user with scheduled alerts
2. Create some low stock items
3. Manually trigger alerts via API:
   ```bash
   curl -X POST http://localhost:5000/api/scheduled-notifications/trigger-alerts \
   -H "Authorization: Bearer <admin-token>"
   ```
4. Check WhatsApp for the scheduled alert

## Troubleshooting

### No Alerts Sent
- Check if users have `stock_alert_frequency` set
- Verify phone numbers are valid
- Ensure WhatsApp sandbox is properly configured
- Check server logs for errors

### Wrong Timing
- Check if the backend server is running
- Verify timezone settings
- Ensure `stock_alert_schedule_time` is in HH:MM format
- Check server logs for scheduler status

### Missing Items
- Check if items have `threshold_level` set
- Verify branch context is correct
- Ensure stock quantities are below threshold
