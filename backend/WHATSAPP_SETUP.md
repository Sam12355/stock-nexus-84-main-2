# WhatsApp Integration Setup Guide

## 🚀 Quick Setup with Twilio WhatsApp Sandbox

### Step 1: Get Twilio Account
1. Go to [Twilio Console](https://console.twilio.com/)
2. Sign up for a free account
3. Verify your phone number

### Step 2: Enable WhatsApp Sandbox
1. In Twilio Console, go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Follow the instructions to join the WhatsApp sandbox
3. Send `join <sandbox-code>` to the Twilio WhatsApp number

### Step 3: Get Your Credentials
1. Go to **Account** → **API keys & tokens**
2. Copy your **Account SID** and **Auth Token**
3. Note the **WhatsApp Sandbox Number** (usually `whatsapp:+14155238886`)

### Step 4: Update Environment Variables
Add these to your `backend/.env` file:

```env
# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### Step 5: Test the Integration
1. Restart your backend server
2. Go to Stock Management page
3. Reduce stock of any item below threshold
4. Check your WhatsApp for the alert!

## 📱 How It Works

### Stock Alerts
- **LOW**: When stock ≤ threshold (e.g., 12 out of 15)
- **CRITICAL**: When stock ≤ 50% of threshold (e.g., 2 out of 5)

### Message Format
```
🚨 STOCK ALERT - CRITICAL LEVEL

📦 Item: Wasabi Powder
📊 Current Stock: 2
🎯 Threshold: 5
📱 Alert Type: CRITICAL

Please restock immediately to avoid stockout!

Time: 9/29/2025, 3:59:03 AM
```

## 🔧 Production Setup

For production, you'll need:
1. **WhatsApp Business Account**
2. **Twilio WhatsApp Business API** (paid)
3. **Phone number verification**

## 🧪 Testing

### Test Stock Alert
1. Go to Stock Management
2. Reduce any item's stock below threshold
3. You should receive WhatsApp message

### Test Notification
1. Go to Settings page
2. Click "Send Test Message"
3. Check your WhatsApp

## 🚨 Troubleshooting

### No WhatsApp Messages?
1. Check if you joined the sandbox correctly
2. Verify environment variables are set
3. Check backend console for errors
4. Ensure your phone number is in international format (+46722204924)

### Sandbox Limitations
- Only works with verified phone numbers
- Limited to 1000 messages/month (free tier)
- Messages must start with sandbox code

## 📞 Support

If you need help:
1. Check Twilio documentation
2. Verify your phone number format
3. Test with console logs first
4. Check backend server logs

---

**Note**: The system will work immediately once you add your Twilio credentials to the `.env` file!



