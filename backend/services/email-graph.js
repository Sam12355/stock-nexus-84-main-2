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
      console.log(`📧 Graph client type: ${typeof this.graphClient}`);
      console.log(`📧 Graph client has api method: ${typeof this.graphClient.api}`);

      // Check if Graph client is properly initialized
      if (!this.graphClient || typeof this.graphClient.api !== 'function') {
        console.error('❌ Graph client is not properly initialized');
        return { success: false, error: 'Graph client not properly initialized' };
      }

      // Send email using Microsoft Graph API
      const result = await this.graphClient
        .api(`/users/${userEmail}/sendMail`)
        .post(message);

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
    const alertColor = alertType === 'critical' ? '#dc2626' : '#ea580c';
    const urgencyIcon = alertType === 'critical' ? '🚨' : '⚠️';
    
    const subject = `🚨 ${urgency} Stock Alert: ${itemName} - Immediate Action Required`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${urgency} Stock Alert - ${itemName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5; line-height: 1.6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: ${alertColor}; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <div style="font-size: 40px; margin-bottom: 15px;">${urgencyIcon}</div>
                          <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: white;">${urgency} STOCK ALERT</h1>
                          <p style="margin: 8px 0 0 0; font-size: 14px; color: white; opacity: 0.9;">Inventory Management System</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">Hello ${userName},</h2>
                          <p style="color: #666; font-size: 16px; margin: 0 0 25px 0;">
                            We're alerting you about a stock level that requires <strong style="color: ${alertColor};">immediate attention</strong>.
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Alert Card -->
                      <tr>
                        <td>
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border: 2px solid ${alertColor}; border-radius: 6px;">
                            <tr>
                              <td style="padding: 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="background: ${alertColor}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block;">
                                      ${urgency} LEVEL
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-top: 15px;">
                                      <h3 style="margin: 0 0 20px 0; color: #333; font-size: 18px;">📦 ${itemName}</h3>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                          <td width="50%" style="padding-right: 10px;">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: white; border: 1px solid #ddd; border-radius: 4px;">
                                              <tr>
                                                <td style="padding: 15px; text-align: center;">
                                                  <div style="font-size: 12px; color: #666; font-weight: bold; margin-bottom: 5px;">CURRENT STOCK</div>
                                                  <div style="font-size: 24px; font-weight: bold; color: ${alertColor};">${currentQuantity}</div>
                                                </td>
                                              </tr>
                                            </table>
                                          </td>
                                          <td width="50%" style="padding-left: 10px;">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: white; border: 1px solid #ddd; border-radius: 4px;">
                                              <tr>
                                                <td style="padding: 15px; text-align: center;">
                                                  <div style="font-size: 12px; color: #666; font-weight: bold; margin-bottom: 5px;">THRESHOLD LEVEL</div>
                                                  <div style="font-size: 24px; font-weight: bold; color: #333;">${threshold}</div>
                                                </td>
                                              </tr>
                                            </table>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                  ${branchName ? `
                                  <tr>
                                    <td style="padding-top: 15px;">
                                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: white; border: 1px solid #ddd; border-radius: 4px;">
                                        <tr>
                                          <td style="padding: 12px;">
                                            <span style="font-size: 14px; color: #666; font-weight: bold;">🏢 Branch:</span>
                                            <span style="font-size: 16px; color: #333; font-weight: bold; margin-left: 8px;">${branchName}</span>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                  ` : ''}
                                  ${districtName ? `
                                  <tr>
                                    <td style="padding-top: 10px;">
                                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: white; border: 1px solid #ddd; border-radius: 4px;">
                                        <tr>
                                          <td style="padding: 12px;">
                                            <span style="font-size: 14px; color: #666; font-weight: bold;">📍 District:</span>
                                            <span style="font-size: 16px; color: #333; font-weight: bold; margin-left: 8px;">${districtName}</span>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                  ` : ''}
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Action Required -->
                      <tr>
                        <td style="padding-top: 25px;">
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
                            <tr>
                              <td style="padding: 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td>
                                      <div style="font-size: 20px; margin-right: 10px; display: inline-block;">💡</div>
                                      <h3 style="margin: 0; color: #1976d2; font-size: 16px; font-weight: bold; display: inline-block;">IMMEDIATE ACTION REQUIRED</h3>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-top: 10px;">
                                      <p style="margin: 0; color: #1976d2; font-size: 14px;">
                                        Please contact your supplier immediately to place an urgent restock order to prevent stockout and maintain smooth operations.
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Priority Badge -->
                      <tr>
                        <td style="padding-top: 25px; text-align: center;">
                          <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                            <tr>
                              <td style="background: ${alertColor}; color: white; padding: 12px 24px; border-radius: 20px; font-weight: bold; font-size: 14px;">
                                ${alertType === 'critical' ? '🔴 HIGHEST PRIORITY' : '🟠 HIGH PRIORITY'}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Timestamp -->
                      <tr>
                        <td style="padding-top: 25px; border-top: 1px solid #eee;">
                          <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">
                            Alert generated on ${new Date().toLocaleString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #eee;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 5px;">Inventory Management System</div>
                          <div style="font-size: 10px; color: #999; margin-top: 10px;">
                            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Inventory Management System. All rights reserved.</p>
                            <p style="margin: 2px 0 0 0;">This is an automated notification. Please do not reply to this email.</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  async sendScheduledStockAlert(userEmail, userName, frequency, lowStockItems, branchName = 'All Branches') {
    const frequencyText = frequency === 'daily' ? 'Daily' : frequency === 'weekly' ? 'Weekly' : 'Monthly';
    const subject = `📊 ${frequencyText} Stock Report - ${lowStockItems.length} Items Need Attention`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${frequencyText} Stock Report</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5; line-height: 1.6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: #3b82f6; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <div style="font-size: 40px; margin-bottom: 15px;">📊</div>
                          <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: white;">${frequencyText.toUpperCase()} STOCK REPORT</h1>
                          <p style="margin: 8px 0 0 0; font-size: 14px; color: white; opacity: 0.9;">Inventory Management System</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">Hello ${userName},</h2>
                          <p style="color: #666; font-size: 16px; margin: 0 0 25px 0;">
                            Here's your ${frequencyText.toLowerCase()} stock level report for <strong style="color: #3b82f6;">${branchName}</strong>.
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Summary Stats -->
                      <tr>
                        <td>
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px;">
                            <tr>
                              <td style="padding: 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td width="33%" style="text-align: center; padding: 0 10px;">
                                      <div style="font-size: 28px; font-weight: bold; color: #0369a1; margin-bottom: 5px;">${lowStockItems.length}</div>
                                      <div style="font-size: 12px; color: #0369a1; font-weight: bold;">ITEMS NEEDING ATTENTION</div>
                                    </td>
                                    <td width="33%" style="text-align: center; padding: 0 10px;">
                                      <div style="font-size: 28px; font-weight: bold; color: #dc2626; margin-bottom: 5px;">${lowStockItems.filter(item => item.current_quantity <= (item.critical_level || Math.floor(item.threshold_level * 0.2))).length}</div>
                                      <div style="font-size: 12px; color: #dc2626; font-weight: bold;">CRITICAL LEVEL</div>
                                    </td>
                                    <td width="33%" style="text-align: center; padding: 0 10px;">
                                      <div style="font-size: 28px; font-weight: bold; color: #ea580c; margin-bottom: 5px;">${lowStockItems.filter(item => item.current_quantity > (item.critical_level || Math.floor(item.threshold_level * 0.2)) && item.current_quantity <= (item.low_level || Math.floor(item.threshold_level * 0.5))).length}</div>
                                      <div style="font-size: 12px; color: #ea580c; font-weight: bold;">LOW LEVEL</div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Items List -->
                      <tr>
                        <td style="padding-top: 25px;">
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px;">
                            <tr>
                              <td style="padding: 20px;">
                                <h3 style="margin: 0 0 20px 0; color: #333; font-size: 18px;">📦 Items Requiring Attention</h3>
                                
                                ${lowStockItems.map((item, index) => {
                                  const isCritical = item.current_quantity <= (item.critical_level || Math.floor(item.threshold_level * 0.2));
                                  const isLow = item.current_quantity <= (item.low_level || Math.floor(item.threshold_level * 0.5));
                                  const statusColor = isCritical ? '#dc2626' : isLow ? '#ea580c' : '#f59e0b';
                                  const statusText = isCritical ? 'CRITICAL' : isLow ? 'LOW' : 'BELOW THRESHOLD';
                                  const statusIcon = isCritical ? '🚨' : isLow ? '⚠️' : '📉';
                                  const bgColor = isCritical ? '#fef2f2' : isLow ? '#fff7ed' : '#fffbeb';
                                  
                                  return `
                                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${bgColor}; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 12px;">
                                      <tr>
                                        <td style="padding: 15px;">
                                          <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                              <td>
                                                <h4 style="margin: 0 0 5px 0; color: #333; font-size: 16px;">${item.name}</h4>
                                                <p style="margin: 0; color: #666; font-size: 14px;">Category: ${item.category || 'General'}</p>
                                              </td>
                                              <td align="right">
                                                <table cellpadding="0" cellspacing="0">
                                                  <tr>
                                                    <td style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                                                      ${statusIcon} ${statusText}
                                                    </td>
                                                  </tr>
                                                </table>
                                              </td>
                                            </tr>
                                            <tr>
                                              <td colspan="2" style="padding-top: 12px;">
                                                <table width="100%" cellpadding="0" cellspacing="0">
                                                  <tr>
                                                    <td width="50%" style="padding-right: 8px;">
                                                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: white; border: 1px solid #ddd; border-radius: 4px;">
                                                        <tr>
                                                          <td style="padding: 10px; text-align: center;">
                                                            <div style="font-size: 10px; color: #666; font-weight: bold; margin-bottom: 3px;">CURRENT STOCK</div>
                                                            <div style="font-size: 18px; font-weight: bold; color: ${statusColor};">${item.current_quantity}</div>
                                                          </td>
                                                        </tr>
                                                      </table>
                                                    </td>
                                                    <td width="50%" style="padding-left: 8px;">
                                                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: white; border: 1px solid #ddd; border-radius: 4px;">
                                                        <tr>
                                                          <td style="padding: 10px; text-align: center;">
                                                            <div style="font-size: 10px; color: #666; font-weight: bold; margin-bottom: 3px;">THRESHOLD</div>
                                                            <div style="font-size: 18px; font-weight: bold; color: #333;">${item.threshold_level}</div>
                                                          </td>
                                                        </tr>
                                                      </table>
                                                    </td>
                                                  </tr>
                                                </table>
                                              </td>
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                  `;
                                }).join('')}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Action Required -->
                      <tr>
                        <td style="padding-top: 25px;">
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
                            <tr>
                              <td style="padding: 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td>
                                      <div style="font-size: 20px; margin-right: 10px; display: inline-block;">💡</div>
                                      <h3 style="margin: 0; color: #1976d2; font-size: 16px; font-weight: bold; display: inline-block;">RECOMMENDED ACTIONS</h3>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-top: 10px;">
                                      <ul style="margin: 0; padding-left: 20px; color: #1976d2; font-size: 14px;">
                                        <li style="margin-bottom: 5px;">Review critical items and place urgent orders</li>
                                        <li style="margin-bottom: 5px;">Update reorder points for frequently low items</li>
                                        <li style="margin-bottom: 5px;">Consider increasing order quantities for high-demand items</li>
                                        <li>Schedule regular inventory reviews to prevent future shortages</li>
                                      </ul>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Timestamp -->
                      <tr>
                        <td style="padding-top: 25px; border-top: 1px solid #eee;">
                          <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">
                            Report generated on ${new Date().toLocaleString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #eee;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 5px;">Inventory Management System</div>
                          <div style="font-size: 10px; color: #999; margin-top: 10px;">
                            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Inventory Management System. All rights reserved.</p>
                            <p style="margin: 2px 0 0 0;">This is an automated notification. Please do not reply to this email.</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  async sendEventNotification(userEmail, userName, events, frequency = 'Daily') {
    const subject = `📅 ${frequency} Event Reminder - ${events.length} Upcoming Events`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${frequency} Event Reminder</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; line-height: 1.6;">
        <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 32px 24px; text-align: center; position: relative;">
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #ffffff20, #ffffff40, #ffffff20);"></div>
            <div style="font-size: 48px; margin-bottom: 16px;">📅</div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">${frequency.toUpperCase()} EVENT REMINDER</h1>
            <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.95; font-weight: 500;">Inventory Management System</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 32px;">
            <div style="margin-bottom: 32px;">
              <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Hello ${userName},</h2>
              <p style="color: #64748b; font-size: 16px; margin: 0;">
                Here are your upcoming events that require attention and preparation.
              </p>
            </div>
            
            <!-- Summary Stats -->
            <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #d8b4fe;">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px; text-align: center;">
                <div>
                  <div style="font-size: 32px; font-weight: 700; color: #7c3aed; margin-bottom: 4px;">${events.length}</div>
                  <div style="font-size: 14px; color: #7c3aed; font-weight: 500;">UPCOMING EVENTS</div>
                </div>
                <div>
                  <div style="font-size: 32px; font-weight: 700; color: #dc2626; margin-bottom: 4px;">${events.filter(event => {
                    const eventDate = new Date(event.event_date);
                    const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return daysUntil <= 3;
                  }).length}</div>
                  <div style="font-size: 14px; color: #dc2626; font-weight: 500;">URGENT (≤3 DAYS)</div>
                </div>
                <div>
                  <div style="font-size: 32px; font-weight: 700; color: #ea580c; margin-bottom: 4px;">${events.filter(event => {
                    const eventDate = new Date(event.event_date);
                    const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return daysUntil > 3 && daysUntil <= 7;
                  }).length}</div>
                  <div style="font-size: 14px; color: #ea580c; font-weight: 500;">THIS WEEK</div>
                </div>
              </div>
            </div>
            
            <!-- Events List -->
            <div style="background: #ffffff; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e2e8f0;">
              <h3 style="margin: 0 0 20px 0; color: #1e293b; font-size: 20px; font-weight: 600;">📅 Upcoming Events</h3>
              
              ${events.map((event, index) => {
                const eventDate = new Date(event.event_date);
                const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isUrgent = daysUntil <= 3;
                const isThisWeek = daysUntil <= 7;
                const urgencyColor = isUrgent ? '#dc2626' : isThisWeek ? '#ea580c' : '#059669';
                const urgencyText = isUrgent ? 'URGENT' : isThisWeek ? 'THIS WEEK' : 'UPCOMING';
                const urgencyIcon = isUrgent ? '🚨' : isThisWeek ? '⚠️' : '📅';
                
                return `
                  <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: ${isUrgent ? '#fef2f2' : isThisWeek ? '#fff7ed' : '#f0fdf4'};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                      <div style="flex: 1;">
                        <h4 style="margin: 0 0 4px 0; color: #1e293b; font-size: 16px; font-weight: 600;">${event.title}</h4>
                        <p style="margin: 0; color: #64748b; font-size: 14px;">${event.description || 'No description provided'}</p>
                      </div>
                      <div style="text-align: right;">
                        <div style="display: inline-block; background: ${urgencyColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                          ${urgencyIcon} ${urgencyText}
                        </div>
                      </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
                      <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        <div style="font-size: 12px; color: #64748b; font-weight: 500; margin-bottom: 4px;">EVENT DATE</div>
                        <div style="font-size: 16px; font-weight: 700; color: #1e293b;">${eventDate.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}</div>
                      </div>
                      <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        <div style="font-size: 12px; color: #64748b; font-weight: 500; margin-bottom: 4px;">DAYS UNTIL</div>
                        <div style="font-size: 16px; font-weight: 700; color: ${urgencyColor};">${daysUntil} day${daysUntil !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    ${event.branch_name ? `
                    <div style="background: white; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; margin-top: 8px;">
                      <span style="font-size: 12px; color: #64748b; font-weight: 500;">🏢 Branch:</span>
                      <span style="font-size: 14px; color: #1e293b; font-weight: 600; margin-left: 8px;">${event.branch_name}</span>
                    </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
            
            <!-- Action Required -->
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #f59e0b;">
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <div style="font-size: 24px; margin-right: 12px;">💡</div>
                <h3 style="margin: 0; color: #92400e; font-size: 18px; font-weight: 600;">PREPARATION CHECKLIST</h3>
              </div>
              <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 16px;">
                <li style="margin-bottom: 8px;">Review event requirements and prepare necessary materials</li>
                <li style="margin-bottom: 8px;">Ensure adequate stock levels for event-related items</li>
                <li style="margin-bottom: 8px;">Coordinate with team members and stakeholders</li>
                <li>Set reminders for final preparations closer to event dates</li>
              </ul>
            </div>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
              <p style="margin: 0; color: #94a3b8; font-size: 14px; text-align: center;">
                Reminder generated on ${new Date().toLocaleString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8fafc; padding: 32px; text-align: center; border-top: 1px solid #e2e8f0;">
            <div style="margin-bottom: 16px;">
              <div style="font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">Inventory Management System</div>
              <div style="font-size: 14px; color: #64748b;">Professional Event Management Solution</div>
            </div>
            <div style="font-size: 12px; color: #94a3b8;">
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} Inventory Management System. All rights reserved.</p>
              <p style="margin: 4px 0 0 0;">This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
          
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, htmlContent);
  }

  async sendSoftdrinkTrendAlert(userEmail, userName, decliningItems, branchName = null, districtName = null) {
    const subject = `📉 Softdrink Trend Alert: Declining Stock Trends Detected`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Softdrink Trend Alert</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5; line-height: 1.6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

                <!-- Header -->
                <tr>
                  <td style="background: #dc2626; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <div style="font-size: 40px; margin-bottom: 15px;">📉</div>
                          <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: white;">SOFTDRINK TREND ALERT</h1>
                          <p style="margin: 8px 0 0 0; font-size: 14px; color: white; opacity: 0.9;">Inventory Management System</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 30px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">Hello ${userName},</h2>
                          <p style="color: #666; font-size: 16px; margin: 0 0 25px 0;">
                            We've detected <strong style="color: #dc2626;">declining trends</strong> in your softdrink inventory that require attention.
                          </p>
                        </td>
                      </tr>

                      <!-- Alert Summary -->
                      <tr>
                        <td>
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 6px;">
                            <tr>
                              <td style="padding: 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td>
                                      <div style="background: #dc2626; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block;">
                                        DECLINING TRENDS
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-top: 15px;">
                                      <h3 style="margin: 0 0 20px 0; color: #333; font-size: 18px;">📊 ${decliningItems.length} Items Showing Negative Trends</h3>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      ${decliningItems.map(item => `
                                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: white; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px;">
                                          <tr>
                                            <td style="padding: 15px;">
                                              <table width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                  <td width="40%">
                                                    <div style="font-size: 16px; font-weight: bold; color: #333;">${item.item_name}</div>
                                                  </td>
                                                  <td width="20%" style="text-align: center;">
                                                    <div style="font-size: 12px; color: #666; font-weight: bold; margin-bottom: 5px;">STOCK IN</div>
                                                    <div style="font-size: 18px; font-weight: bold; color: #059669;">${item.stock_in}</div>
                                                  </td>
                                                  <td width="20%" style="text-align: center;">
                                                    <div style="font-size: 12px; color: #666; font-weight: bold; margin-bottom: 5px;">STOCK OUT</div>
                                                    <div style="font-size: 18px; font-weight: bold; color: #dc2626;">${item.stock_out}</div>
                                                  </td>
                                                  <td width="20%" style="text-align: center;">
                                                    <div style="font-size: 12px; color: #666; font-weight: bold; margin-bottom: 5px;">NET CHANGE</div>
                                                    <div style="font-size: 18px; font-weight: bold; color: #dc2626;">${item.net_change}</div>
                                                  </td>
                                                </tr>
                                              </table>
                                            </td>
                                          </tr>
                                        </table>
                                      `).join('')}
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Action Required -->
                      <tr>
                        <td style="padding-top: 25px;">
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                            <tr>
                              <td style="padding: 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td>
                                      <div style="font-size: 20px; margin-right: 10px; display: inline-block;">💡</div>
                                      <h3 style="margin: 0; color: #92400e; font-size: 16px; font-weight: bold; display: inline-block;">RECOMMENDED ACTIONS</h3>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-top: 10px;">
                                      <ul style="margin: 0; color: #92400e; font-size: 14px; padding-left: 20px;">
                                        <li>Review your ordering patterns for these items</li>
                                        <li>Consider increasing stock-in quantities</li>
                                        <li>Analyze customer demand patterns</li>
                                        <li>Check for any supply chain issues</li>
                                        <li>Monitor these trends closely in the coming weeks</li>
                                      </ul>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      ${branchName ? `
                      <tr>
                        <td style="padding-top: 20px;">
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: white; border: 1px solid #ddd; border-radius: 4px;">
                            <tr>
                              <td style="padding: 12px;">
                                <span style="font-size: 14px; color: #666; font-weight: bold;">🏢 Branch:</span>
                                <span style="font-size: 16px; color: #333; font-weight: bold; margin-left: 8px;">${branchName}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}
                      ${districtName ? `
                      <tr>
                        <td style="padding-top: 10px;">
                          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: white; border: 1px solid #ddd; border-radius: 4px;">
                            <tr>
                              <td style="padding: 12px;">
                                <span style="font-size: 14px; color: #666; font-weight: bold;">📍 District:</span>
                                <span style="font-size: 16px; color: #333; font-weight: bold; margin-left: 8px;">${districtName}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}

                      <!-- Priority Badge -->
                      <tr>
                        <td style="padding-top: 25px; text-align: center;">
                          <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                            <tr>
                              <td style="background: #dc2626; color: white; padding: 12px 24px; border-radius: 20px; font-weight: bold; font-size: 14px;">
                                🔴 HIGH PRIORITY REVIEW
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Timestamp -->
                      <tr>
                        <td style="padding-top: 25px; border-top: 1px solid #eee;">
                          <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">
                            Alert generated on ${new Date().toLocaleString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #eee;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 5px;">Inventory Management System</div>
                          <div style="font-size: 10px; color: #999; margin-top: 10px;">
                            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Inventory Management System. All rights reserved.</p>
                            <p style="margin: 2px 0 0 0;">This is an automated notification. Please do not reply to this email.</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
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
