# 🚀 MICROSOFT GRAPH API EMAIL SETUP

## 🎯 **Why Microsoft Graph API?**

- ✅ **No SMTP ports** - Uses HTTPS (port 443)
- ✅ **No timeout issues** - Direct API calls
- ✅ **Better security** - OAuth 2.0 authentication
- ✅ **More reliable** - Microsoft's recommended approach
- ✅ **No port blocking** - Works perfectly from cloud servers

## 🔧 **Step 1: Create Entra App Registration**

### 1. **Go to Azure Portal**
- Visit [portal.azure.com](https://portal.azure.com)
- Sign in with your Microsoft 365 admin account

### 2. **Navigate to Entra ID**
- Go to **Azure Active Directory** → **App registrations**
- Click **"New registration"**

### 3. **Register Application**
- **Name**: `Stock Nexus Email Service`
- **Supported account types**: `Accounts in this organizational directory only`
- **Redirect URI**: Leave blank for now
- Click **"Register"**

### 4. **Note Important Values**
After registration, copy these values:
- **Application (client) ID** - You'll need this
- **Directory (tenant) ID** - You'll need this

## 🔑 **Step 2: Create Client Secret**

### 1. **Go to Certificates & secrets**
- In your app registration, click **"Certificates & secrets"**
- Click **"New client secret"**

### 2. **Create Secret**
- **Description**: `Stock Nexus Email Secret`
- **Expires**: `24 months` (recommended)
- Click **"Add"**

### 3. **Copy Secret Value**
- **IMPORTANT**: Copy the secret value immediately (you can't see it again!)
- This is your `MICROSOFT_CLIENT_SECRET`

## 📧 **Step 3: Add Mail.Send Permission**

### 1. **Go to API permissions**
- Click **"API permissions"**
- Click **"Add a permission"**

### 2. **Select Microsoft Graph**
- Choose **"Microsoft Graph"**
- Select **"Application permissions"**

### 3. **Add Mail.Send Permission**
- Search for **"Mail.Send"**
- Check the box next to **"Mail.Send"**
- Click **"Add permissions"**

### 4. **Grant Admin Consent**
- Click **"Grant admin consent for [Your Organization]"**
- Confirm the action

## ⚙️ **Step 4: Update Render Environment Variables**

Go to your Render dashboard and set these environment variables:

```
EMAIL_USER = info@lbdhospitals.com
MICROSOFT_CLIENT_ID = your_application_client_id
MICROSOFT_CLIENT_SECRET = your_client_secret_value
MICROSOFT_TENANT_ID = your_directory_tenant_id
```

**Replace the placeholder values with your actual values from the Azure portal!**

## 🧪 **Step 5: Test the Setup**

After Render redeploys, you should see:

```
🔧 Configuring Microsoft Graph API email service...
✅ Microsoft Graph API email service configured successfully
📧 Using account: info@lbdhospitals.com
```

And when sending emails:
```
📧 Attempting to send email via Microsoft Graph API to: user@example.com
📧 Subject: Stock Alert - CRITICAL Level: Surami
📧 From: info@lbdhospitals.com
📧 Graph client configured: true
✅ Email sent successfully via Microsoft Graph API!
   Graph API Response: {"id":"graph-api-sent"}
```

## 🎉 **Benefits of Graph API**

- ✅ **No SMTP timeouts** - Direct HTTPS calls
- ✅ **No port blocking** - Uses standard web ports
- ✅ **Better security** - OAuth 2.0 instead of passwords
- ✅ **More reliable** - Microsoft's recommended method
- ✅ **Future-proof** - Modern API approach

## 🆘 **Troubleshooting**

### **Authentication Errors (401)**
- Check `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`
- Verify the client secret hasn't expired
- Make sure admin consent was granted

### **Permission Errors (403)**
- Verify `Mail.Send` permission is added
- Check that admin consent was granted
- Ensure the app has the correct permissions

### **Bad Request (400)**
- Check email format in `EMAIL_USER`
- Verify the sending account exists
- Ensure the account has a valid mailbox

## 📋 **Required Values Summary**

You need these 4 values from Azure portal:

1. **MICROSOFT_CLIENT_ID** - Application (client) ID
2. **MICROSOFT_CLIENT_SECRET** - Client secret value
3. **MICROSOFT_TENANT_ID** - Directory (tenant) ID  
4. **EMAIL_USER** - Your Microsoft 365 email address

## 🚀 **This Will Work Perfectly!**

Microsoft Graph API is the modern, reliable way to send emails from Microsoft 365. No more SMTP timeout issues!

**Your WhatsApp notifications are already working perfectly!** 📱✅

**Once you set up the Graph API, both WhatsApp and Email will work flawlessly!** 🎯
