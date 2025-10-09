# Email Service Setup Instructions

## Overview
The email service has been updated to use environment variables instead of hardcoded credentials. The following changes have been made:

### ✅ Completed Changes

1. **Updated Email Service Configuration** (`backend/services/email.js`)
   - Removed hardcoded Office365 credentials
   - Added support for environment variables: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`
   - Added fallback to Gmail SMTP if no custom configuration is provided
   - Made the service gracefully disable if credentials are not provided

2. **Enabled Email Notifications**
   - Updated `backend/routes/notifications.js` to enable email notifications
   - Updated `backend/routes/stock.js` to enable email notifications

3. **Updated Render Configuration** (`render.yaml`)
   - Added email environment variables
   - Updated frontend URL to match your deployed app
   - Added placeholder values for email configuration

4. **Added Debug Endpoints** (`backend/routes/debug.js`)
   - `/api/debug/test-email` - POST endpoint to test email sending
   - `/api/debug/email-status` - GET endpoint to check email service status

## 🔧 Required Actions

### 1. Configure Email Credentials in Render

You need to update the environment variables in your Render dashboard:

1. Go to your Render dashboard
2. Navigate to your `stock-nexus-backend` service
3. Go to Environment tab
4. Update the following variables:

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_actual_email@gmail.com
EMAIL_PASS=your_app_password
```

### 2. Gmail App Password Setup (Recommended)

If using Gmail, you'll need to create an App Password:

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security → App passwords
4. Generate a new app password for "Mail"
5. Use this app password as `EMAIL_PASS`

### 3. Alternative Email Providers

You can also use other email providers by updating the environment variables:

**Outlook/Hotmail:**
```
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your_email@outlook.com
EMAIL_PASS=your_password
```

**Custom SMTP:**
```
EMAIL_HOST=your_smtp_server.com
EMAIL_PORT=587
EMAIL_PASS=your_password
```

## 🧪 Testing Email Service

### Test Email Configuration
```bash
curl -X GET https://your-render-app.onrender.com/api/debug/email-status
```

### Send Test Email
```bash
curl -X POST https://your-render-app.onrender.com/api/debug/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## 📧 Email Features

The email service now supports:

1. **Stock Alerts** - Low stock and critical stock notifications
2. **Event Reminders** - Calendar event notifications
3. **Scheduled Reports** - Daily/weekly/monthly stock summaries
4. **Test Emails** - Configuration verification

## 🔍 Troubleshooting

### Common Issues:

1. **"Email service not configured"**
   - Check that `EMAIL_USER` and `EMAIL_PASS` are set in Render
   - Verify the credentials are correct

2. **"Authentication failed"**
   - For Gmail: Use App Password instead of regular password
   - Check if 2FA is enabled and App Password is generated

3. **"Connection timeout"**
   - Verify `EMAIL_HOST` and `EMAIL_PORT` are correct
   - Check firewall settings

### Debug Commands:

Check email service status:
```bash
curl https://your-render-app.onrender.com/api/debug/email-status
```

Test email sending:
```bash
curl -X POST https://your-render-app.onrender.com/api/debug/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

## 🚀 Deployment

After updating the environment variables in Render:

1. The service will automatically redeploy
2. Check the logs for email service configuration messages
3. Test the email functionality using the debug endpoints

The email service will now work with your deployed app at: https://stock-nexus-84-main-2-kmth.vercel.app
