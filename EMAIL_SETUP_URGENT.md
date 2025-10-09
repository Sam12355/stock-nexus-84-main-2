# URGENT: Email Setup Required for Render Deployment

## 🚨 Current Issue
Your deployed app is showing **"Connection timeout"** errors because email credentials are not configured in Render.

## ✅ Quick Fix Steps

### 1. Go to Render Dashboard
1. Visit [render.com](https://render.com) and log in
2. Find your `stock-nexus-backend` service
3. Click on it to open the service details

### 2. Add Email Environment Variables
1. Go to the **"Environment"** tab
2. Add these environment variables:

```
EMAIL_HOST = smtp.gmail.com
EMAIL_PORT = 587
EMAIL_USER = your_gmail@gmail.com
EMAIL_PASS = your_app_password
```

### 3. Get Gmail App Password
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click **Security** → **2-Step Verification** (enable if not already)
3. Click **Security** → **App passwords**
4. Select **Mail** and generate a password
5. Use this password as `EMAIL_PASS` (NOT your regular Gmail password)

### 4. Alternative Email Providers

**If you don't want to use Gmail, here are other options:**

#### Outlook/Hotmail:
```
EMAIL_HOST = smtp-mail.outlook.com
EMAIL_PORT = 587
EMAIL_USER = your_email@outlook.com
EMAIL_PASS = your_password
```

#### SendGrid (Recommended for production):
```
EMAIL_HOST = smtp.sendgrid.net
EMAIL_PORT = 587
EMAIL_USER = apikey
EMAIL_PASS = your_sendgrid_api_key
```

### 5. Deploy Changes
1. After adding the environment variables, Render will automatically redeploy
2. Check the logs to see if email service is now configured
3. Test with the debug endpoint: `https://your-app.onrender.com/api/debug/email-status`

## 🧪 Testing Email Service

### Test Email Configuration
```bash
curl https://your-render-app.onrender.com/api/debug/email-status
```

### Send Test Email
```bash
curl -X POST https://your-render-app.onrender.com/api/debug/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## 🔍 Expected Log Messages

**After proper configuration, you should see:**
```
🔧 Configuring email service with smtp.gmail.com...
📧 smtp.gmail.com transporter created, verifying connection...
✅ Email service configured successfully with smtp.gmail.com
```

**If credentials are missing, you'll see:**
```
⚠️ Email credentials not configured. Email service will be disabled.
⚠️ Please set EMAIL_USER and EMAIL_PASS environment variables in Render dashboard.
⚠️ Current EMAIL_USER: Not set
⚠️ Current EMAIL_PASS: Not set
```

## 🚀 After Setup

Once configured, your app will:
- ✅ Send stock alert emails
- ✅ Send event reminder emails  
- ✅ Send scheduled report emails
- ✅ Work with WhatsApp notifications (already working)

## 📞 Need Help?

If you're still having issues:
1. Check Render logs for detailed error messages
2. Verify your Gmail App Password is correct
3. Make sure 2-Factor Authentication is enabled on Gmail
4. Try a different email provider if Gmail doesn't work
