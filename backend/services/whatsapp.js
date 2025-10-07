const twilio = require('twilio');

class WhatsAppService {
  constructor() {
    // Initialize Twilio client
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.whatsappNumber = process.env.TWILIO_PHONE_NUMBER; // Note: using TWILIO_PHONE_NUMBER
    
    if (this.accountSid && this.authToken && this.whatsappNumber) {
      this.client = twilio(this.accountSid, this.authToken);
      this.isConfigured = true;
      console.log('✅ WhatsApp service configured with Twilio');
      console.log(`📱 WhatsApp Number: ${this.whatsappNumber}`);
    } else {
      this.isConfigured = false;
      console.log('⚠️ WhatsApp not configured. Missing credentials in .env');
    }
  }

  async sendMessage(phoneNumber, message) {
    if (!this.isConfigured) {
      console.log('📱 WhatsApp not configured - logging message instead:');
      console.log(`To: ${phoneNumber}`);
      console.log(`Message: ${message}`);
      console.log('---');
      return { success: true, message: 'WhatsApp not configured - message logged' };
    }

    try {
      // Format phone number for WhatsApp sandbox
      let formattedNumber = phoneNumber;
      
      // Remove any existing whatsapp: prefix
      if (formattedNumber.startsWith('whatsapp:')) {
        formattedNumber = formattedNumber.replace('whatsapp:', '');
      }
      
      // Ensure it starts with +
      if (!formattedNumber.startsWith('+')) {
        formattedNumber = '+' + formattedNumber;
      }
      
      // Add whatsapp: prefix for Twilio
      formattedNumber = `whatsapp:${formattedNumber}`;

      console.log(`📱 Attempting to send WhatsApp message:`);
      console.log(`   From: ${this.whatsappNumber}`);
      console.log(`   To: ${formattedNumber}`);
      console.log(`   Message: ${message.substring(0, 50)}...`);

      const result = await this.client.messages.create({
        from: this.whatsappNumber,
        to: formattedNumber,
        body: message
      });

      console.log(`✅ WhatsApp message sent successfully!`);
      console.log(`   Message SID: ${result.sid}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   To: ${formattedNumber}`);
      console.log(`   From: ${this.whatsappNumber}`);
      
      // Check if this is a sandbox environment
      if (this.whatsappNumber.includes('14155238886')) {
        console.log(`⚠️  SANDBOX MODE: Make sure ${formattedNumber} is verified in Twilio WhatsApp sandbox`);
        console.log(`   Send "join <sandbox-code>" to +1 415 523 8886 to verify your number`);
      }
      
      return { 
        success: true, 
        message: 'WhatsApp message sent successfully',
        sid: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('❌ Error sending WhatsApp message:');
      console.error(`   Error Code: ${error.code}`);
      console.error(`   Error Message: ${error.message}`);
      console.error(`   More Info: ${error.moreInfo || 'N/A'}`);
      
      // Common sandbox errors
      if (error.code === 21211) {
        console.error('💡 Hint: Make sure you joined the WhatsApp sandbox!');
        console.error('   Send "join <sandbox-code>" to +1 415 523 8886');
      } else if (error.code === 63016) {
        console.error('💡 Hint: Phone number not verified in sandbox');
        console.error('   Make sure your phone number is registered in the sandbox');
      }
      
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
  }

  async sendStockAlert(phoneNumber, itemName, currentQuantity, threshold, alertType) {
    const emoji = alertType === 'critical' ? '🚨' : '⚠️';
    const urgency = alertType === 'critical' ? 'CRITICAL' : 'LOW';
    
    const message = `${emoji} STOCK ALERT - ${urgency} LEVEL

📦 Item: ${itemName}
📊 Current Stock: ${currentQuantity}
🎯 Threshold: ${threshold}
📱 Alert Type: ${alertType.toUpperCase()}

Please restock immediately to avoid stockout!

Time: ${new Date().toLocaleString()}`;

    return await this.sendMessage(phoneNumber, message);
  }

  async sendTestMessage(phoneNumber, message) {
    const testMessage = `🧪 TEST MESSAGE

${message}

This is a test from your Stock Nexus inventory management system.

Time: ${new Date().toLocaleString()}`;

    return await this.sendMessage(phoneNumber, testMessage);
  }

  async sendEventReminder(phoneNumber, message) {
    return await this.sendMessage(phoneNumber, message);
  }
}

module.exports = new WhatsAppService();
