const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.configure().catch(error => {
      console.error('❌ Failed to configure email service:', error);
    });
  }

  async configure() {
    try {
      // Check if email configuration is available
      const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
      const emailPort = process.env.EMAIL_PORT || 587;
      const emailUser = process.env.EMAIL_USER;
      const emailPass = process.env.EMAIL_PASS;
      
      if (!emailUser || !emailPass) {
        console.log('⚠️ Email credentials not configured. Email service will be disabled.');
        console.log('⚠️ Please set EMAIL_USER and EMAIL_PASS environment variables in Render dashboard.');
        console.log('⚠️ Current EMAIL_USER:', emailUser ? 'Set' : 'Not set');
        console.log('⚠️ Current EMAIL_PASS:', emailPass ? 'Set' : 'Not set');
        this.isConfigured = false;
        return;
      }

      console.log(`🔧 Configuring email service with ${emailHost}...`);
      
      // Microsoft 365/Office 365 specific configuration
      let smtpConfig = {
        host: emailHost,
        port: parseInt(emailPort),
        secure: false, // Always use STARTTLS for Microsoft 365
        auth: {
          user: emailUser,
          pass: emailPass
        },
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false
        },
        connectionTimeout: 30000, // 30 seconds
        greetingTimeout: 15000, // 15 seconds
        socketTimeout: 30000, // 30 seconds
        requireTLS: true,
        pool: true,
        maxConnections: 1,
        maxMessages: 1
      };

      console.log('🔧 Using Microsoft 365/Office 365 SMTP configuration');

      // Special configuration for Gmail
      if (emailHost.includes('gmail.com')) {
        smtpConfig.tls = {
          ciphers: 'SSLv3',
          rejectUnauthorized: false
        };
        smtpConfig.secure = false; // Force STARTTLS
        smtpConfig.requireTLS = true;
      }

      // Special configuration for SendGrid
      if (emailHost.includes('sendgrid.net')) {
        smtpConfig.secure = false;
        smtpConfig.requireTLS = true;
      }

      this.transporter = nodemailer.createTransport(smtpConfig);

      console.log(`📧 ${emailHost} transporter created, verifying connection...`);

      // Set as configured without verification (verification can be slow)
      console.log(`✅ Email service configured successfully with ${emailHost}`);
      this.isConfigured = true;
    } catch (error) {
      console.error('❌ Error configuring email service:', error);
      this.isConfigured = false;
    }
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    if (!this.isConfigured || !this.transporter) {
      console.error('❌ Email service not configured');
      return {
        success: false,
        error: 'Email service not configured'
      };
    }

    try {
      const mailOptions = {
        from: {
          name: 'Inventory Management System',
          address: process.env.EMAIL_USER || 'noreply@stocknexus.com'
        },
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent || this.htmlToText(htmlContent),
        headers: {
          'X-Mailer': 'Inventory Management System v1.0',
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal',
          'X-Spam-Status': 'No',
          'X-Spam-Level': '0',
          'X-Spam-Score': '0',
          'X-Spam-Checker-Version': 'SpamAssassin 3.4.0',
          'List-Unsubscribe': '<mailto:unsubscribe@syinventoryms.com>',
          'List-Id': 'Inventory Management System <stock-nexus.syinventoryms.com>',
          'Precedence': 'bulk',
          'Return-Path': 'noreply@syinventoryms.com',
          'X-Auto-Response-Suppress': 'All',
          'X-MS-Exchange-Organization-AuthAs': 'Internal',
          'X-MS-Exchange-Organization-AuthMechanism': '04',
          'X-MS-Exchange-Organization-AuthSource': 'syinventoryms.com'
        },
        replyTo: 'noreply@syinventoryms.com',
        messageId: `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@syinventoryms.com>`,
        date: new Date(),
        priority: 'normal'
      };

      console.log(`📧 Attempting to send email to: ${to}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📧 Email service configured: ${this.isConfigured}`);
      console.log(`📧 Transporter exists: ${!!this.transporter}`);

      // Add timeout to prevent hanging - longer timeout for Microsoft 365
      const sendEmailWithTimeout = () => {
        return Promise.race([
          this.transporter.sendMail(mailOptions),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email send timeout after 45 seconds')), 45000)
          )
        ]);
      };

      const result = await sendEmailWithTimeout();
      
      console.log('✅ Email sent successfully!');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Response: ${result.response}`);

      return {
        success: true,
        messageId: result.messageId,
        response: result.response
      };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      console.error('❌ Error details:', {
        code: error.code,
        command: error.command,
        message: error.message
      });
      
      // Provide helpful error messages
      if (error.code === 'ETIMEDOUT') {
        console.error('❌ Connection timeout - Microsoft 365 SMTP may be slow from cloud servers');
        console.error('❌ Try increasing timeout or check Microsoft 365 admin settings');
      } else if (error.code === 'EAUTH') {
        console.error('❌ Authentication failed - Check EMAIL_USER and EMAIL_PASS credentials');
        console.error('❌ Make sure SMTP AUTH is enabled in Microsoft 365 admin center');
      } else if (error.code === 'ECONNECTION') {
        console.error('❌ Connection failed - Check network connectivity and SMTP settings');
        console.error('❌ Microsoft 365 may block connections from cloud providers');
      } else if (error.code === 'ECONNRESET') {
        console.error('❌ Connection reset - Microsoft 365 may have dropped the connection');
        console.error('❌ This is common with cloud hosting providers');
      }
      
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async sendStockAlert(userEmail, userName, itemName, currentQuantity, threshold, alertType, districtName = null, branchName = null) {
    const urgency = alertType === 'critical' ? 'CRITICAL' : 'LOW';
    const alertColor = alertType === 'critical' ? '#dc3545' : '#fd7e14';
    
    const subject = `Stock Alert - ${urgency} Level: ${itemName}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Stock Alert - ${urgency} Level</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background-color: ${alertColor}; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: normal;">⚠️ STOCK ALERT - ${urgency} LEVEL</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Inventory Management System</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
                 <div style="background-color: #f8f9fa; border-left: 4px solid ${alertColor}; padding: 20px; margin: 20px 0;">
                   <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;">📦 Item: ${itemName}</h3>
                   <div style="margin-top: 10px;">
                     <p style="margin: 8px 0; color: #555;"><strong>📊 Current Stock:</strong> <span style="color: ${alertColor}; font-weight: bold; font-size: 16px;">${currentQuantity}</span></p>
                     <p style="margin: 8px 0; color: #555;"><strong>🎯 Threshold Level:</strong> ${threshold}</p>
                     <p style="margin: 8px 0; color: #555;"><strong>📱 Alert Type:</strong> <span style="color: ${alertColor}; font-weight: bold;">${alertType.toUpperCase()}</span></p>
                     ${districtName ? `<p style="margin: 8px 0; color: #555;"><strong>🏢 District:</strong> ${districtName}</p>` : ''}
                     ${branchName ? `<p style="margin: 8px 0; color: #555;"><strong>🏪 Branch:</strong> ${branchName}</p>` : ''}
                   </div>
                 </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-weight: bold;">
                Please restock immediately to avoid stockout!
              </p>
            </div>
            
            <p style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
              Time: ${new Date().toLocaleString()}
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              <strong>Inventory Management System</strong><br>
              This is an automated alert. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
⚠️ STOCK ALERT - ${urgency} LEVEL

📦 Item: ${itemName}
📊 Current Stock: ${currentQuantity}
🎯 Threshold: ${threshold}
📱 Alert Type: ${alertType.toUpperCase()}
${districtName ? `🏢 District: ${districtName}` : ''}
${branchName ? `🏪 Branch: ${branchName}` : ''}

Please restock immediately to avoid stockout!

Time: ${new Date().toLocaleString()}

---
Inventory Management System
This is an automated alert. Please do not reply to this email.
    `;

    return await this.sendEmail(userEmail, subject, htmlContent, textContent);
  }

  async sendScheduledStockAlert(userEmail, userName, frequency, lowStockItems, branchName = null) {
    const subject = `📊 ${frequency} Stock Alert Summary - ${lowStockItems.length} Low Stock Items`;
    
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${frequency} Stock Alert Summary</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background-color: #ff6b35; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: normal;">📊 ${frequency} Stock Alert Summary</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Inventory Management System</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <div style="background-color: #f8f9fa; border-left: 4px solid #ff6b35; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;">📦 Low Stock Items (${lowStockItems.length})</h3>
              ${branchName ? `<p style="margin: 8px 0; color: #555;"><strong>🏢 Branch:</strong> ${branchName}</p>` : ''}
              <p style="margin: 8px 0; color: #555;"><strong>📅 Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
    `;

    lowStockItems.forEach((item, index) => {
      const status = item.current_quantity <= (item.critical_level || Math.floor(item.threshold_level * 0.2)) ? '🚨 CRITICAL' :
                    item.current_quantity <= (item.low_level || Math.floor(item.threshold_level * 0.5)) ? '⚠️ LOW' : '📉 BELOW THRESHOLD';
      const statusColor = status.includes('CRITICAL') ? '#dc3545' : status.includes('LOW') ? '#ffc107' : '#17a2b8';
      
      htmlContent += `
        <div style="border: 1px solid #e9ecef; border-radius: 6px; padding: 15px; margin: 10px 0; background-color: #f8f9fa;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4 style="margin: 0; color: #333; font-size: 16px;">${index + 1}. ${item.name}</h4>
            <span style="background-color: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${status}</span>
          </div>
          <div style="margin-top: 10px;">
            <p style="margin: 5px 0; color: #555;"><strong>📊 Current Stock:</strong> <span style="color: ${statusColor}; font-weight: bold;">${item.current_quantity}</span></p>
            <p style="margin: 5px 0; color: #555;"><strong>🎯 Threshold:</strong> ${item.threshold_level}</p>
            <p style="margin: 5px 0; color: #555;"><strong>📦 Category:</strong> ${item.category || 'N/A'}</p>
            <p style="margin: 5px 0; color: #555;"><strong>📈 Low Level:</strong> ${item.low_level || 'N/A'}</p>
          </div>
        </div>
      `;
    });

    htmlContent += `
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-weight: bold;">
                Please restock these items to maintain adequate inventory levels.
              </p>
            </div>
            
            <p style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
              Time: ${new Date().toLocaleString()}
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              <strong>Inventory Management System</strong><br>
              This is an automated alert. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
📊 ${frequency} Stock Alert Summary

📦 Low Stock Items (${lowStockItems.length}):
${branchName ? `🏢 Branch: ${branchName}` : ''}
📅 Date: ${new Date().toLocaleDateString()}

${lowStockItems.map((item, index) => {
  const status = item.current_quantity <= (item.critical_level || Math.floor(item.threshold_level * 0.2)) ? '🚨 CRITICAL' :
                item.current_quantity <= (item.low_level || Math.floor(item.threshold_level * 0.5)) ? '⚠️ LOW' : '📉 BELOW THRESHOLD';
  return `${index + 1}. ${item.name}
   Current: ${item.current_quantity} | Threshold: ${item.threshold_level}
   Status: ${status}
   Category: ${item.category || 'N/A'}`;
}).join('\n\n')}

Please restock these items to maintain adequate inventory levels.

Time: ${new Date().toLocaleString()}

---
Inventory Management System
This is an automated alert. Please do not reply to this email.
    `;

    return await this.sendEmail(userEmail, subject, htmlContent, textContent);
  }

  async sendEventReminder(userEmail, userName, frequency, events, branchName = null) {
    const frequencyText = frequency === 'daily' ? 'Daily' : frequency === 'weekly' ? 'Weekly' : 'Monthly';
    const subject = `📅 ${frequencyText} Event Reminder - ${events.length} Upcoming Events`;
    
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="background-color: #007bff; color: white; padding: 15px; border-radius: 5px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">📅 ${frequencyText} Event Reminder</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2 style="color: #333; margin-top: 0;">Upcoming Events</h2>
          ${branchName ? `<p style="color: #666;"><strong>Branch:</strong> ${branchName}</p>` : ''}
          <p style="color: #666;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <h3 style="margin-top: 0; color: #333;">Events (${events.length}):</h3>
    `;

    events.forEach((event, index) => {
      const eventDate = new Date(event.event_date);
      const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      htmlContent += `
        <div style="border-left: 4px solid #007bff; padding-left: 15px; margin: 15px 0;">
          <h4 style="margin: 0; color: #333;">${index + 1}. ${event.title}</h4>
          <p style="margin: 5px 0; color: #666;"><strong>📅 Date:</strong> ${eventDate.toLocaleDateString()}</p>
          <p style="margin: 5px 0; color: #666;"><strong>⏰ Days until:</strong> ${daysUntil} day${daysUntil !== 1 ? 's' : ''}</p>
          ${event.description ? `<p style="margin: 5px 0; color: #666;"><strong>📝 Description:</strong> ${event.description}</p>` : ''}
          ${event.branch_name ? `<p style="margin: 5px 0; color: #666;"><strong>🏢 Branch:</strong> ${event.branch_name}</p>` : ''}
        </div>
      `;
    });

    htmlContent += `
          </div>
          
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 0; color: #155724;"><strong>💡 Reminder:</strong> Don't forget to prepare for these upcoming events!</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 15px; background-color: #e9ecef; border-radius: 5px;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              <strong>Inventory Management System</strong><br>
              This is an automated alert. Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  async sendTestEmail(userEmail, userName) {
    const subject = 'Stock Nexus System - Email Configuration Test';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Configuration Test</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background-color: #2c3e50; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: normal;">Stock Nexus System</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Inventory Management System</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <h2 style="color: #2c3e50; margin-top: 0; font-size: 20px;">Email Configuration Test</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              Hello ${userName},
            </p>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              This is a test email to verify that your email notifications are properly configured in the Stock Nexus inventory management system.
            </p>
            
            <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 16px;">Configuration Details</h3>
              <p style="margin: 5px 0; color: #555;"><strong>Recipient:</strong> ${userName}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Email Address:</strong> ${userEmail}</p>
              <p style="margin: 5px 0; color: #555;"><strong>Status:</strong> <span style="color: #28a745;">✓ Working Correctly</span></p>
            </div>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              If you received this email, your email notification system is properly configured and you will receive alerts for:
            </p>
            
            <ul style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              <li>Low stock level alerts</li>
              <li>Critical stock level alerts</li>
              <li>Event reminders</li>
              <li>System notifications</li>
            </ul>
            
            <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; color: #1565c0; font-size: 14px;">
                <strong>Note:</strong> This is an automated message from your inventory management system. 
                Please do not reply to this email.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              <strong>Stock Nexus Inventory Management System</strong><br>
              Test Email - ${new Date().toLocaleString()}
            </p>
            <p style="margin: 10px 0 0 0; color: #6c757d; font-size: 11px;">
              This email was sent to ${userEmail}. If you believe you received this in error, please contact your system administrator.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Stock Nexus System - Email Configuration Test

Hello ${userName},

This is a test email to verify that your email notifications are properly configured in the Stock Nexus inventory management system.

Configuration Details:
- Recipient: ${userName}
- Email Address: ${userEmail}
- Status: Working Correctly

If you received this email, your email notification system is properly configured and you will receive alerts for:
- Low stock level alerts
- Critical stock level alerts
- Event reminders
- System notifications

Note: This is an automated message from your inventory management system. Please do not reply to this email.

---
Stock Nexus Inventory Management System
Test Email - ${new Date().toLocaleString()}

This email was sent to ${userEmail}. If you believe you received this in error, please contact your system administrator.
    `;

    return await this.sendEmail(userEmail, subject, htmlContent, textContent);
  }

  htmlToText(html) {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  getStatus() {
    return {
      configured: this.isConfigured,
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      from: process.env.EMAIL_USER || 'noreply@stocknexus.com'
    };
  }
}

module.exports = new EmailService();
