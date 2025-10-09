# 🔧 MICROSOFT 365 EMAIL FIX - Render Deployment

## 🎯 **The Real Problem**

Your Microsoft 365 email works locally but times out on Render. This is a **common issue with Microsoft 365 from cloud hosting providers**.

## ✅ **What I Fixed**

1. **Optimized Microsoft 365 SMTP configuration** for cloud deployment
2. **Increased timeouts** (30s connection, 45s send) - Microsoft 365 is slower from cloud
3. **Added connection pooling** and proper TLS settings
4. **Better error handling** with specific Microsoft 365 troubleshooting

## 🔧 **Current Configuration**

```javascript
// Microsoft 365 optimized settings
{
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false, // STARTTLS
  connectionTimeout: 30000, // 30 seconds
  greetingTimeout: 15000, // 15 seconds  
  socketTimeout: 30000, // 30 seconds
  requireTLS: true,
  pool: true,
  maxConnections: 1,
  maxMessages: 1
}
```

## 🚀 **Next Steps**

### 1. **Update Render Environment Variables**
Make sure these are set in your Render dashboard:

```
EMAIL_HOST = smtp-mail.outlook.com
EMAIL_PORT = 587
EMAIL_USER = info@lbdhospitals.com
EMAIL_PASS = Alivexbs12355@
```

### 2. **Check Microsoft 365 Admin Settings**
- **Enable SMTP AUTH** in Microsoft 365 admin center
- **Check if your account has SMTP permissions**
- **Verify the password is correct**

### 3. **Alternative SMTP Settings**
If `smtp-mail.outlook.com` still times out, try:

```
EMAIL_HOST = smtp.office365.com
EMAIL_PORT = 587
```

Or:

```
EMAIL_HOST = smtp-mail.outlook.com
EMAIL_PORT = 25
```

## 📊 **Expected Results**

After Render redeploys, you should see:

```
🔧 Configuring email service with smtp-mail.outlook.com...
🔧 Using Microsoft 365/Office 365 SMTP configuration
✅ Email service configured successfully with smtp-mail.outlook.com
```

And when sending emails:
```
📧 Attempting to send email to: user@example.com
📧 Subject: Stock Alert - CRITICAL Level: Surami
📧 Email service configured: true
📧 Transporter exists: true
✅ Email sent successfully!
   Message ID: <message-id>
   Response: 250 OK
```

## 🆘 **If Still Having Issues**

### **Microsoft 365 Admin Center:**
1. Go to **Microsoft 365 admin center**
2. **Users** → **Active users** → Select your user
3. **Mail** tab → **Manage email apps**
4. **Enable "Authenticated SMTP"**

### **Check Account Permissions:**
- Make sure the account has **SMTP sending permissions**
- Check if **2FA is enabled** (may need app password)
- Verify **account is not locked** or restricted

### **Network Issues:**
- Microsoft 365 sometimes **blocks cloud providers**
- Try **different SMTP ports** (25, 465, 587)
- **Contact Microsoft support** if persistent issues

## 🎉 **This Should Work Now!**

The optimized configuration should resolve the timeout issues. Microsoft 365 SMTP is just slower from cloud servers, so the longer timeouts should help.

**Your WhatsApp notifications are already working perfectly!** 📱✅

**Once this deploys, both WhatsApp and Email should work flawlessly!** 🚀
