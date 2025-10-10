// Use Microsoft Graph API instead of SMTP for better reliability
const EmailService = require('./email-graph');

// Export the Graph API email service
module.exports = EmailService;