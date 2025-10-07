const whatsappService = require('./whatsapp');
const emailService = require('./email');
const { query } = require('../config/database');

// Global notification trigger for scheduler (no req object available)
const triggerSchedulerNotificationUpdate = () => {
  console.log('📢 Scheduler: Triggering notification update for all connected clients');
  
  // Import the app to get Socket.IO instance
  const app = require('../server');
  const io = app.get('io');
  if (io) {
    io.emit('notification-update', {
      type: 'notification-update',
      message: 'New scheduled notifications available',
      timestamp: new Date().toISOString()
    });
    console.log('📢 Sent scheduled notification update to all clients');
  } else {
    console.log('⚠️ Socket.IO not available, scheduled notification update not sent');
  }
};

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.lastCheckTime = null;
  }

  start() {
    if (this.isRunning) {
      console.log('📅 Scheduler is already running');
      return;
    }

    console.log('📅 Starting automated stock alert scheduler...');
    this.isRunning = true;
    
    // Run every minute
    this.intervalId = setInterval(() => {
      this.checkAndSendScheduledAlerts();
      this.checkAndSendEventReminders();
    }, 60000); // 60 seconds

    // Run immediately on start
    this.checkAndSendScheduledAlerts();
    this.checkAndSendEventReminders();
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('📅 Stopping automated stock alert scheduler...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async checkAndSendScheduledAlerts() {
    try {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const currentDate = now.getDate(); // 1-31
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      // Only log every 10 minutes to avoid spam
      const shouldLog = !this.lastCheckTime || 
        (now.getTime() - this.lastCheckTime.getTime()) > 10 * 60 * 1000;

      if (shouldLog) {
        console.log(`🕐 Checking scheduled alerts at ${currentTime} (Day: ${currentDay}, Date: ${currentDate})`);
        this.lastCheckTime = now;
      }

      // Get users with scheduled stock alerts
      const usersResult = await query(`
        SELECT u.id, u.name, u.phone, u.email, u.stock_alert_frequency, u.stock_alert_schedule_day, 
               u.stock_alert_schedule_date, u.stock_alert_schedule_time, u.branch_context,
               u.notification_settings, u.stock_alert_frequencies, b.name as branch_name,
               u.daily_schedule_time, u.weekly_schedule_day, u.weekly_schedule_time,
               u.monthly_schedule_date, u.monthly_schedule_time
        FROM users u
        LEFT JOIN branches b ON u.branch_context = b.id
        WHERE (u.stock_alert_frequency IS NOT NULL AND u.stock_alert_frequency != 'immediate')
           OR (u.stock_alert_frequencies IS NOT NULL AND u.stock_alert_frequencies != '[]')
        AND (u.phone IS NOT NULL OR u.email IS NOT NULL)
        AND u.is_active = true
      `);

      const eligibleUsers = [];

             for (const user of usersResult.rows) {
               const { 
                 stock_alert_frequency, 
                 stock_alert_schedule_day, 
                 stock_alert_schedule_date, 
                 stock_alert_schedule_time, 
                 notification_settings, 
                 stock_alert_frequencies,
                 daily_schedule_time,
                 weekly_schedule_day,
                 weekly_schedule_time,
                 monthly_schedule_date,
                 monthly_schedule_time
               } = user;
               
               // Check if stock level alerts are enabled in notification settings
               let stockAlertsEnabled = true; // Default to true for backward compatibility
               
               if (notification_settings) {
                 try {
                   const settings = typeof notification_settings === 'string' ? 
                     JSON.parse(notification_settings) : notification_settings;
                   stockAlertsEnabled = settings.stockLevelAlerts !== false;
                 } catch (error) {
                   console.error('Error parsing notification settings for user', user.name, error);
                 }
               }
               
               if (!stockAlertsEnabled) {
                 continue; // Skip this user if stock alerts are disabled
               }
               
               // Check both old single frequency and new multiple frequencies
               let frequenciesToCheck = [];
               
               // Legacy single frequency
               if (stock_alert_frequency && stock_alert_frequency !== 'immediate') {
                 frequenciesToCheck.push(stock_alert_frequency);
               }
               
               // New multiple frequencies
               if (stock_alert_frequencies) {
                 try {
                   const parsedFrequencies = typeof stock_alert_frequencies === 'string' ? 
                     JSON.parse(stock_alert_frequencies) : stock_alert_frequencies;
                   if (Array.isArray(parsedFrequencies)) {
                     frequenciesToCheck = [...frequenciesToCheck, ...parsedFrequencies];
                   }
                 } catch (error) {
                   console.error('Error parsing stock_alert_frequencies for user', user.name, error);
                 }
               }
               
               // Remove duplicates
               frequenciesToCheck = [...new Set(frequenciesToCheck)];
               
               const matchedFrequencies = [];
               
               for (const freq of frequenciesToCheck) {
                 switch (freq) {
                   case 'daily':
                     // Use separate daily schedule time, fallback to legacy time
                     const dailyTime = daily_schedule_time ? daily_schedule_time.slice(0, 5) : 
                                     (stock_alert_schedule_time ? stock_alert_schedule_time.slice(0, 5) : null);
                     if (dailyTime && currentTime === dailyTime) {
                       matchedFrequencies.push('daily');
                     }
                     break;
                   case 'weekly':
                     // Use separate weekly schedule day and time, fallback to legacy values
                     const weeklyDay = weekly_schedule_day !== null ? weekly_schedule_day : stock_alert_schedule_day;
                     const weeklyTime = weekly_schedule_time ? weekly_schedule_time.slice(0, 5) : 
                                      (stock_alert_schedule_time ? stock_alert_schedule_time.slice(0, 5) : null);
                     if (weeklyDay !== null && weeklyTime && currentDay === weeklyDay && currentTime === weeklyTime) {
                       matchedFrequencies.push('weekly');
                     }
                     break;
                   case 'monthly':
                     // Use separate monthly schedule date and time, fallback to legacy values
                     const monthlyDate = monthly_schedule_date !== null ? monthly_schedule_date : stock_alert_schedule_date;
                     const monthlyTime = monthly_schedule_time ? monthly_schedule_time.slice(0, 5) : 
                                       (stock_alert_schedule_time ? stock_alert_schedule_time.slice(0, 5) : null);
                     if (monthlyDate !== null && monthlyTime && currentDate === monthlyDate && currentTime === monthlyTime) {
                       matchedFrequencies.push('monthly');
                     }
                     break;
                 }
               }

        if (matchedFrequencies.length > 0) {
          eligibleUsers.push({...user, matchedFrequencies});
          console.log(`✅ User ${user.name} is eligible for ${matchedFrequencies.join(', ')} alerts`);
        }
      }

      if (eligibleUsers.length === 0) {
        return;
      }

      if (shouldLog) {
        console.log(`📊 Found ${eligibleUsers.length} users eligible for scheduled alerts`);
      }

      // Get low stock items for each user's branch
      const alertsSent = [];

      for (const user of eligibleUsers) {
        try {

          let stockQuery = `
            SELECT s.*, i.name, i.category, i.threshold_level, i.low_level, i.critical_level
            FROM stock s
            JOIN items i ON s.item_id = i.id
            WHERE s.current_quantity <= i.threshold_level
          `;

          let params = [];

          // Filter by user's branch if they have one
          if (user.branch_context) {
            stockQuery += ' AND i.branch_id = $1';
            params.push(user.branch_context);
          }

          const stockResult = await query(stockQuery, params);
          const lowStockItems = stockResult.rows;

          if (lowStockItems.length === 0) {
            if (shouldLog) {
              console.log(`📦 No low stock items for user ${user.name}`);
            }
            continue;
          }

          // Send separate alerts for each matched frequency
          for (const frequency of user.matchedFrequencies) {
            // Parse notification settings for this frequency check
            let whatsappEnabled = true; // Default to true for backward compatibility
            let emailEnabled = true; // Default to true for backward compatibility
            
            if (user.notification_settings) {
              try {
                const settings = typeof user.notification_settings === 'string' ? 
                  JSON.parse(user.notification_settings) : user.notification_settings;
                whatsappEnabled = settings.whatsapp !== false;
                emailEnabled = settings.email !== false;
              } catch (error) {
                console.error('Error parsing notification settings for user', user.name, error);
              }
            }

            const frequencyText = frequency === 'daily' ? 'Daily' :
                                frequency === 'weekly' ? 'Weekly' : 'Monthly';
            
            let message = `📊 ${frequencyText} Stock Alert Summary\n\n`;
            message += `Branch: ${user.branch_name || 'All Branches'}\n`;
            message += `Date: ${now.toLocaleDateString()}\n\n`;
            message += `Low Stock Items (${lowStockItems.length}):\n\n`;

            lowStockItems.forEach((item, index) => {
              const status = item.current_quantity <= (item.critical_level || Math.floor(item.threshold_level * 0.2)) ? '🚨 CRITICAL' :
                            item.current_quantity <= (item.low_level || Math.floor(item.threshold_level * 0.5)) ? '⚠️ LOW' : '📉 BELOW THRESHOLD';
              
              message += `${index + 1}. ${item.name}\n`;
              message += `   Current: ${item.current_quantity} | Threshold: ${item.threshold_level}\n`;
              message += `   Status: ${status}\n\n`;
            });

            message += `Please restock these items to maintain adequate inventory levels.\n\n`;
            message += `Time: ${now.toLocaleString()}`;

            // Send notifications based on user preferences
            const remindersSent = { whatsapp: false, email: false };

            // Send WhatsApp message if enabled and phone available
            if (whatsappEnabled && user.phone) {
              const whatsappResult = await whatsappService.sendMessage(user.phone, message);
              if (whatsappResult.success) {
                remindersSent.whatsapp = true;
                console.log(`✅ ${frequencyText} WhatsApp alert sent to ${user.name} (${lowStockItems.length} items)`);
              } else {
                console.error(`❌ Failed to send ${frequencyText} WhatsApp alert to ${user.name}:`, whatsappResult.error);
              }
            }

            // Send email if enabled and email available
            if (emailEnabled && user.email) {
              const emailResult = await emailService.sendScheduledStockAlert(
                user.email,
                user.name,
                frequencyText,
                lowStockItems,
                user.branch_name || 'All Branches'
              );
              if (emailResult.success) {
                remindersSent.email = true;
                console.log(`✅ ${frequencyText} email alert sent to ${user.name} (${lowStockItems.length} items)`);
              } else {
                console.error(`❌ Failed to send ${frequencyText} email alert to ${user.name}:`, emailResult.error);
              }
            }

            // Add to alerts sent if any notification was sent
            if (remindersSent.whatsapp || remindersSent.email) {
              alertsSent.push({
                user: user.name,
                phone: user.phone,
                email: user.email,
                frequency: frequency,
                items: lowStockItems.length,
                whatsapp: remindersSent.whatsapp,
                email: remindersSent.email
              });
            }
          }

        } catch (error) {
          console.error(`❌ Error processing scheduled alert for user ${user.name}:`, error);
        }
      }

      if (alertsSent.length > 0 && shouldLog) {
        console.log(`📤 Sent ${alertsSent.length} scheduled alerts`);
        
        // Trigger frontend notification update
        triggerSchedulerNotificationUpdate();
      }

    } catch (error) {
      console.error('❌ Error in scheduled alerts check:', error);
    }
  }

  async checkAndSendEventReminders() {
    try {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const currentDate = now.getDate(); // 1-31
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      const currentTimeWithSeconds = now.toTimeString().slice(0, 8); // HH:MM:SS format

      // Only log every 10 minutes to avoid spam
      const shouldLog = !this.lastCheckTime || (now.getTime() - this.lastCheckTime.getTime()) >= 10 * 60 * 1000;
      this.lastCheckTime = now;

      if (shouldLog) {
        console.log(`📅 Checking event reminders at ${currentTime} (Day: ${currentDay}, Date: ${currentDate})`);
      }

      // Get users with event reminder scheduling enabled
      const usersResult = await query(`
        SELECT u.id, u.name, u.phone, u.email, u.notification_settings, u.event_reminder_frequencies, u.branch_context,
               u.event_daily_schedule_time, u.event_weekly_schedule_day, u.event_weekly_schedule_time,
               u.event_monthly_schedule_date, u.event_monthly_schedule_time, b.name as branch_name
        FROM users u
        LEFT JOIN branches b ON u.branch_context = b.id
        WHERE u.event_reminder_frequencies IS NOT NULL 
        AND u.event_reminder_frequencies != '[]'
        AND (u.phone IS NOT NULL OR u.email IS NOT NULL)
        AND u.is_active = true
      `);

      if (usersResult.rows.length === 0) {
        return;
      }

      const eligibleUsers = [];

      // Check each user's event reminder schedule
      for (const user of usersResult.rows) {
        try {
          const frequencies = Array.isArray(user.event_reminder_frequencies) 
            ? user.event_reminder_frequencies 
            : JSON.parse(user.event_reminder_frequencies);
          const matchedFrequencies = [];

          for (const frequency of frequencies) {
            switch (frequency) {
              case 'daily':
                // Compare only hours and minutes, ignore seconds
                const userDailyTime = user.event_daily_schedule_time ? user.event_daily_schedule_time.slice(0, 5) : null;
                if (userDailyTime === currentTime) {
                  matchedFrequencies.push('daily');
                }
                break;
              case 'weekly':
                const userWeeklyTime = user.event_weekly_schedule_time ? user.event_weekly_schedule_time.slice(0, 5) : null;
                if (user.event_weekly_schedule_day === currentDay && userWeeklyTime === currentTime) {
                  matchedFrequencies.push('weekly');
                }
                break;
              case 'monthly':
                const userMonthlyTime = user.event_monthly_schedule_time ? user.event_monthly_schedule_time.slice(0, 5) : null;
                if (user.event_monthly_schedule_date === currentDate && userMonthlyTime === currentTime) {
                  matchedFrequencies.push('monthly');
                }
                break;
            }
          }

          if (matchedFrequencies.length > 0) {
            eligibleUsers.push({...user, matchedFrequencies});
            if (shouldLog) {
              console.log(`✅ User ${user.name} is eligible for ${matchedFrequencies.join(', ')} event reminders`);
            }
          }
        } catch (error) {
          console.error(`❌ Error parsing event reminder frequencies for user ${user.name}:`, error);
        }
      }

      if (eligibleUsers.length === 0) {
        return;
      }

      if (shouldLog) {
        console.log(`📊 Found ${eligibleUsers.length} users eligible for event reminders`);
      }

      // Get upcoming events for each user's branch
      const remindersSent = [];

      for (const user of eligibleUsers) {
        try {
          let eventQuery = `
            SELECT ce.*, b.name as branch_name
            FROM calendar_events ce
            LEFT JOIN branches b ON ce.branch_id = b.id
            WHERE ce.event_date >= CURRENT_DATE
            AND ce.event_date <= CURRENT_DATE + INTERVAL '30 days'
          `;

          let params = [];

          // Filter by user's branch if they have one
          if (user.branch_context) {
            eventQuery += ' AND ce.branch_id = $1';
            params.push(user.branch_context);
          }

          eventQuery += ' ORDER BY ce.event_date ASC LIMIT 10';

          const eventResult = await query(eventQuery, params);
          let upcomingEvents = eventResult.rows;

          if (upcomingEvents.length === 0) {
            if (shouldLog) {
              console.log(`📅 No upcoming events for user ${user.name} in their branch. Checking all events...`);
            }
            
            // If no events in user's branch, get events from all branches
            const allEventsResult = await query(`
              SELECT ce.*, b.name as branch_name
              FROM calendar_events ce
              LEFT JOIN branches b ON ce.branch_id = b.id
              WHERE ce.event_date >= CURRENT_DATE
              AND ce.event_date <= CURRENT_DATE + INTERVAL '30 days'
              ORDER BY ce.event_date ASC LIMIT 10
            `);
            
            upcomingEvents = allEventsResult.rows;
            
            if (upcomingEvents.length === 0) {
              if (shouldLog) {
                console.log(`📅 No upcoming events found for user ${user.name}`);
              }
              continue;
            }
          }

          // Send separate reminders for each matched frequency
          for (const frequency of user.matchedFrequencies) {
            const frequencyText = frequency === 'daily' ? 'Daily' :
                                frequency === 'weekly' ? 'Weekly' : 'Monthly';
            
            let message = `📅 ${frequencyText} Event Reminder\n\n`;
            message += `Branch: ${user.branch_name || 'All Branches'}\n`;
            message += `Date: ${now.toLocaleDateString()}\n\n`;
            message += `Upcoming Events (${upcomingEvents.length}):\n\n`;

            upcomingEvents.forEach((event, index) => {
              const eventDate = new Date(event.event_date);
              const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              message += `${index + 1}. ${event.title}\n`;
              message += `   📅 Date: ${eventDate.toLocaleDateString()}\n`;
              message += `   ⏰ Days until: ${daysUntil} day${daysUntil !== 1 ? 's' : ''}\n`;
              if (event.description) {
                message += `   📝 ${event.description}\n`;
              }
              message += `   🏢 Branch: ${event.branch_name || 'All Branches'}\n\n`;
            });

            message += `\nDon't forget to prepare for these upcoming events!`;

            // Check notification settings
            let whatsappEnabled = false;
            let emailEnabled = false;
            if (user.notification_settings) {
              try {
                const settings = typeof user.notification_settings === 'string' ? 
                  JSON.parse(user.notification_settings) : user.notification_settings;
                whatsappEnabled = settings.whatsapp === true;
                emailEnabled = settings.email === true;
              } catch (error) {
                console.error(`❌ Error parsing notification settings for user ${user.name}:`, error);
              }
            }

            let reminderSent = false;

            // Send WhatsApp reminder
            if (user.phone && whatsappEnabled) {
              const whatsappResult = await whatsappService.sendEventReminder(
                user.phone,
                message
              );

              if (whatsappResult.success) {
                reminderSent = true;
                if (shouldLog) {
                  console.log(`✅ WhatsApp event reminder sent to ${user.name} (${frequency})`);
                }
              } else {
                console.error(`❌ Failed to send WhatsApp event reminder to ${user.name}:`, whatsappResult.error);
              }
            }

            // Send email reminder
            if (user.email && emailEnabled) {
              const emailResult = await emailService.sendEventReminder(
                user.email,
                user.name,
                frequency,
                upcomingEvents,
                user.branch_name
              );

              if (emailResult.success) {
                reminderSent = true;
                if (shouldLog) {
                  console.log(`✅ Email event reminder sent to ${user.name} (${frequency})`);
                }
              } else {
                console.error(`❌ Failed to send email event reminder to ${user.name}:`, emailResult.error);
              }
            }

            if (reminderSent) {
              remindersSent.push({
                user: user.name,
                frequency,
                events: upcomingEvents.length,
                phone: user.phone,
                email: user.email
              });
            }
          }

        } catch (error) {
          console.error(`❌ Error processing event reminder for user ${user.name}:`, error);
        }
      }

      if (remindersSent.length > 0 && shouldLog) {
        console.log(`📤 Sent ${remindersSent.length} event reminders`);
        
        // Trigger frontend notification update
        triggerSchedulerNotificationUpdate();
      }

    } catch (error) {
      console.error('❌ Error in event reminders check:', error);
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheckTime: this.lastCheckTime,
      nextCheckIn: this.isRunning ? 'Every minute' : 'Not running'
    };
  }
}

module.exports = new SchedulerService();
