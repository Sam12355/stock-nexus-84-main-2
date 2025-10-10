const { Client } = require('@microsoft/microsoft-graph-client');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const fetch = require('isomorphic-fetch');

class EmailService {
  constructor() {
    this.graphClient = null;
    this.isConfigured = false;
    this.configure();
  }

  async configure() {
    try {
      // Check if Microsoft Graph configuration is available
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
      const tenantId = process.env.MICROSOFT_TENANT_ID;
      const userEmail = process.env.EMAIL_USER;
      
      if (!clientId || !clientSecret || !tenantId || !userEmail) {
        console.log('⚠️ Microsoft Graph credentials not configured. Email service will be disabled.');
        console.log('⚠️ Please set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID, and EMAIL_USER environment variables.');
        console.log('⚠️ Current MICROSOFT_CLIENT_ID:', clientId ? 'Set' : 'Not set');
        console.log('⚠️ Current MICROSOFT_CLIENT_SECRET:', clientSecret ? 'Set' : 'Not set');
        console.log('⚠️ Current MICROSOFT_TENANT_ID:', tenantId ? 'Set' : 'Not set');
        console.log('⚠️ Current EMAIL_USER:', userEmail ? 'Set' : 'Not set');
        this.isConfigured = false;
        return;
      }

      console.log('🔧 Configuring Microsoft Graph API email service...');
      console.log('🔧 Environment check:');
      console.log('   - MICROSOFT_CLIENT_ID:', clientId ? 'Set' : 'Not set');
      console.log('   - MICROSOFT_CLIENT_SECRET:', clientSecret ? 'Set' : 'Not set');
      console.log('   - MICROSOFT_TENANT_ID:', tenantId ? 'Set' : 'Not set');
      console.log('   - EMAIL_USER:', userEmail ? 'Set' : 'Not set');
      
      // Configure MSAL
      const msalConfig = {
        auth: {
          clientId: clientId,
          clientSecret: clientSecret,
          authority: `https://login.microsoftonline.com/${tenantId}`
        }
      };

      const cca = new ConfidentialClientApplication(msalConfig);

      // Configure Graph client
      this.graphClient = Client.initWithMiddleware({
        authProvider: {
          getAccessToken: async () => {
            try {
              const clientCredentialRequest = {
                scopes: ['https://graph.microsoft.com/.default']
              };
              
              const response = await cca.acquireTokenByClientCredential(clientCredentialRequest);
              return response.accessToken;
            } catch (error) {
              console.error('❌ Failed to acquire access token:', error);
              throw error;
            }
          }
        }
      });

      // Test the Graph client
      console.log('🔧 Graph client initialized:', typeof this.graphClient);
      console.log('🔧 Graph client users method:', typeof this.graphClient.users);

      this.isConfigured = true;
      console.log('✅ Microsoft Graph API email service configured successfully');
      console.log(`📧 Using account: ${userEmail}`);

    } catch (error) {
      console.error('❌ Failed to configure Microsoft Graph email service:', error);
      this.isConfigured = false;
    }
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    if (!this.isConfigured) {
      console.log('⚠️ Email service not configured, skipping email send');
      return {
        success: false,
        error: 'Email service not configured'
      };
    }

    try {
      const userEmail = process.env.EMAIL_USER;
      
      // Convert HTML to text if textContent not provided
      if (!textContent) {
        textContent = this.htmlToText(htmlContent);
      }

      const message = {
        message: {
          subject: subject,
          body: {
            contentType: 'HTML',
            content: htmlContent
          },
          toRecipients: [
            {
              emailAddress: {
                address: to
              }
            }
          ]
        },
        saveToSentItems: true
      };

      console.log(`📧 Attempting to send email via Microsoft Graph API to: ${to}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📧 From: ${userEmail}`);
      console.log(`📧 Graph client configured: ${this.isConfigured}`);

      // Send email using Microsoft Graph API
      const result = await this.graphClient
        .users(userEmail)
        .sendMail(message)
        .post();

      console.log('✅ Email sent successfully via Microsoft Graph API!');
      console.log(`   Graph API Response: ${JSON.stringify(result)}`);

      return {
        success: true,
        messageId: result.id || 'graph-api-sent',
        response: result
      };

    } catch (error) {
      console.error('❌ Failed to send email via Microsoft Graph API:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode
      });
      
      // Provide helpful error messages
      if (error.statusCode === 401) {
        console.error('❌ Authentication failed - Check MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID');
        console.error('❌ Make sure the app has Mail.Send permission');
      } else if (error.statusCode === 403) {
        console.error('❌ Permission denied - App needs Mail.Send permission');
        console.error('❌ Check Entra app registration permissions');
      } else if (error.statusCode === 400) {
        console.error('❌ Bad request - Check email format and message structure');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error('❌ Network error - Check internet connectivity');
      }
      
      return {
        success: false,
        error: error.message,
        code: error.code,
        statusCode: error.statusCode
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
            <h2 style="color: #2c3e50; margin-top: 0;">Hello ${userName},</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              We're alerting you about a stock level that requires immediate attention.
            </p>
            
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
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-weight: bold;">⚠️ Action Required</p>
              <p style="margin: 5px 0 0 0; color: #856404;">
                Please restock this item immediately to avoid stockout and maintain service quality.
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
              <p style="margin: 0;">This alert was generated automatically by the Inventory Management System.</p>
              <p style="margin: 5px 0 0 0;">Time: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  async sendScheduledStockAlert(userEmail, userName, frequency, lowStockItems, branchName = 'All Branches') {
    const subject = `${frequency} Stock Alert - ${lowStockItems.length} Items Need Attention`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${frequency} Stock Alert</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background-color: #007bff; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: normal;">📊 ${frequency} STOCK ALERT</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Inventory Management System</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <h2 style="color: #2c3e50; margin-top: 0;">Hello ${userName},</h2>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
              This is your ${frequency.toLowerCase()} stock level report. The following items need attention:
            </p>
            
            <div style="background-color: #f8f9fa; border-radius: 4px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #2c3e50;">📦 Items Requiring Attention (${lowStockItems.length})</h3>
              
              ${lowStockItems.map((item, index) => `
                <div style="border-bottom: 1px solid #dee2e6; padding: 10px 0; ${index === lowStockItems.length - 1 ? 'border-bottom: none;' : ''}">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <strong style="color: #2c3e50;">${item.name}</strong>
                      <br>
                      <small style="color: #6c757d;">Category: ${item.category}</small>
                    </div>
                    <div style="text-align: right;">
                      <span style="color: ${item.current_quantity <= item.critical_level ? '#dc3545' : '#fd7e14'}; font-weight: bold;">
                        ${item.current_quantity}
                      </span>
                      <br>
                      <small style="color: #6c757d;">Threshold: ${item.threshold_level}</small>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #0c5460; font-weight: bold;">📋 Action Required</p>
              <p style="margin: 5px 0 0 0; color: #0c5460;">
                Please review these items and restock as needed to maintain adequate inventory levels.
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
              <p style="margin: 0;">Branch: ${branchName}</p>
              <p style="margin: 5px 0 0 0;">This ${frequency.toLowerCase()} report was generated automatically by the Inventory Management System.</p>
              <p style="margin: 5px 0 0 0;">Time: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  htmlToText(html) {
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
      method: 'Microsoft Graph API',
      from: process.env.EMAIL_USER || 'noreply@stocknexus.com',
      clientId: process.env.MICROSOFT_CLIENT_ID ? 'Set' : 'Not set',
      tenantId: process.env.MICROSOFT_TENANT_ID ? 'Set' : 'Not set'
    };
  }
}

module.exports = new EmailService();
