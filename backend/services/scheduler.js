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
      this.checkAndSendSoftdrinkTrendsAlerts();
    }, 60000); // 60 seconds

    // Run immediately on start
    this.checkAndSendScheduledAlerts();
    this.checkAndSendEventReminders();
    this.checkAndSendSoftdrinkTrendsAlerts();
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
      
      // Convert to Sweden timezone (UTC+1 or UTC+2)
      const swedenTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Stockholm"}));
      const currentDay = swedenTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const currentDate = swedenTime.getDate(); // 1-31
      const currentTime = swedenTime.toTimeString().slice(0, 5); // HH:MM format
      
      console.log(`🕐 Server UTC time: ${now.toTimeString().slice(0, 5)}`);
      console.log(`🕐 Sweden time: ${currentTime}`);

      // Only log every 10 minutes to avoid spam
      const shouldLog = !this.lastCheckTime || 
        (now.getTime() - this.lastCheckTime.getTime()) > 10 * 60 * 1000;

      if (shouldLog) {
        console.log(`🕐 Checking scheduled alerts at ${currentTime} (Day: ${currentDay}, Date: ${currentDate})`);
        this.lastCheckTime = now;
      }

      // Get users with scheduled stock alerts
      const usersResult = await query(`
        SELECT u.id, u.name, u.phone, u.email, u.branch_context,
               b.name as branch_name, u.notification_settings,
               u.stock_alert_frequency, u.stock_alert_schedule_day,
               u.stock_alert_schedule_date, u.stock_alert_schedule_time,
               u.stock_alert_frequencies, u.daily_schedule_time,
               u.weekly_schedule_day, u.weekly_schedule_time,
               u.monthly_schedule_date, u.monthly_schedule_time
        FROM users u
        LEFT JOIN branches b ON u.branch_context = b.id
        WHERE (u.phone IS NOT NULL OR u.email IS NOT NULL)
        AND u.is_active = true
      `);

      const eligibleUsers = [];

      for (const user of usersResult.rows) {
        // Parse notification settings
        let notificationSettings = {};
        try {
          console.log(`🔍 DEBUG: User ${user.email} notification_settings:`, user.notification_settings);
          console.log(`🔍 DEBUG: Type of notification_settings:`, typeof user.notification_settings);
          
          if (typeof user.notification_settings === 'string') {
            notificationSettings = user.notification_settings ? JSON.parse(user.notification_settings) : {};
          } else if (typeof user.notification_settings === 'object' && user.notification_settings !== null) {
            notificationSettings = user.notification_settings;
          } else {
            notificationSettings = {};
          }
          
          console.log(`✅ DEBUG: Parsed successfully:`, notificationSettings);
        } catch (e) {
          console.log('⚠️ Error parsing notification settings for user:', user.email);
          console.log('⚠️ Raw notification_settings value:', user.notification_settings);
          console.log('⚠️ Error details:', e.message);
          continue;
        }

        // Check if stock alerts are enabled
        if (notificationSettings.stockLevelAlerts !== true) {
          continue;
        }

        // Parse alert frequencies
        let alertFrequencies = [];
        try {
          console.log(`🔍 DEBUG: User ${user.email} stock_alert_frequencies:`, user.stock_alert_frequencies);
          console.log(`🔍 DEBUG: Type of stock_alert_frequencies:`, typeof user.stock_alert_frequencies);
          
          if (Array.isArray(user.stock_alert_frequencies)) {
            alertFrequencies = user.stock_alert_frequencies;
          } else if (typeof user.stock_alert_frequencies === 'string') {
            // Handle PostgreSQL array format like {"daily"} or '["daily"]'
            const cleaned = user.stock_alert_frequencies.replace(/[{}"]/g, '');
            alertFrequencies = cleaned ? cleaned.split(',') : [];
          } else {
            alertFrequencies = [];
          }
          
          console.log(`✅ DEBUG: Parsed frequencies successfully:`, alertFrequencies);
        } catch (e) {
          console.log('⚠️ Error parsing alert frequencies for user:', user.email);
          console.log('⚠️ Raw stock_alert_frequencies value:', user.stock_alert_frequencies);
          console.log('⚠️ Error details:', e.message);
          continue;
        }

        if (alertFrequencies.length === 0) {
          continue;
        }

        // Check if current time matches any scheduled frequency
        const matchedFrequencies = [];
        
        console.log(`🔍 DEBUG: Checking time match for ${user.email}`);
        console.log(`🔍 DEBUG: Current time: ${currentTime}, Day: ${currentDay}, Date: ${currentDate}`);
        console.log(`🔍 DEBUG: User daily_schedule_time: ${user.daily_schedule_time}`);
        
        for (const frequency of alertFrequencies) {
          let shouldSend = false;
          
          switch (frequency) {
            case 'daily':
              const dailyTime = user.daily_schedule_time || '09:00';
              // Normalize time format - remove seconds if present
              const normalizedDailyTime = dailyTime.includes(':') ? dailyTime.split(':').slice(0, 2).join(':') : dailyTime;
              console.log(`🔍 DEBUG: Daily check - User time: ${dailyTime} -> ${normalizedDailyTime}, Current: ${currentTime}, Match: ${currentTime === normalizedDailyTime}`);
              if (currentTime === normalizedDailyTime) {
                shouldSend = true;
              }
              break;
              
            case 'weekly':
              const weeklyDay = user.weekly_schedule_day || 0;
              const weeklyTime = user.weekly_schedule_time || '09:00';
              const normalizedWeeklyTime = weeklyTime.includes(':') ? weeklyTime.split(':').slice(0, 2).join(':') : weeklyTime;
              console.log(`🔍 DEBUG: Weekly check - User day: ${weeklyDay}, time: ${weeklyTime} -> ${normalizedWeeklyTime}, Current day: ${currentDay}, time: ${currentTime}`);
              if (currentDay === weeklyDay && currentTime === normalizedWeeklyTime) {
                shouldSend = true;
              }
              break;
              
            case 'monthly':
              const monthlyDate = user.monthly_schedule_date || 1;
              const monthlyTime = user.monthly_schedule_time || '09:00';
              const normalizedMonthlyTime = monthlyTime.includes(':') ? monthlyTime.split(':').slice(0, 2).join(':') : monthlyTime;
              console.log(`🔍 DEBUG: Monthly check - User date: ${monthlyDate}, time: ${monthlyTime} -> ${normalizedMonthlyTime}, Current date: ${currentDate}, time: ${currentTime}`);
              if (currentDate === monthlyDate && currentTime === normalizedMonthlyTime) {
                shouldSend = true;
              }
              break;
          }
          
          if (shouldSend) {
            console.log(`✅ DEBUG: Frequency ${frequency} matched for ${user.email}`);
            matchedFrequencies.push(frequency);
          }
        }

        if (matchedFrequencies.length > 0) {
          eligibleUsers.push({
            ...user,
            notification_settings: notificationSettings,
            matchedFrequencies
          });
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
                let settings = {};
                if (typeof user.notification_settings === 'string') {
                  settings = user.notification_settings ? JSON.parse(user.notification_settings) : {};
                } else if (typeof user.notification_settings === 'object' && user.notification_settings !== null) {
                  settings = user.notification_settings;
                }
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
      
      // Convert to Sweden timezone (UTC+1 or UTC+2)
      const swedenTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Stockholm"}));
      const currentDay = swedenTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const currentDate = swedenTime.getDate(); // 1-31
      const currentTime = swedenTime.toTimeString().slice(0, 5); // HH:MM format
      const currentTimeWithSeconds = swedenTime.toTimeString().slice(0, 8); // HH:MM:SS format

      // Only log every 10 minutes to avoid spam
      const shouldLog = !this.lastCheckTime || (now.getTime() - this.lastCheckTime.getTime()) >= 10 * 60 * 1000;
      this.lastCheckTime = now;

      if (shouldLog) {
        console.log(`📅 Checking event reminders at ${currentTime} (Day: ${currentDay}, Date: ${currentDate})`);
      }

      // Get users with event reminder scheduling enabled
      const usersResult = await query(`
        SELECT u.id, u.name, u.phone, u.email, u.branch_context,
               b.name as branch_name
        FROM users u
        LEFT JOIN branches b ON u.branch_context = b.id
        WHERE (u.phone IS NOT NULL OR u.email IS NOT NULL)
        AND u.is_active = true
      `);

      if (usersResult.rows.length === 0) {
        return;
      }

      const eligibleUsers = [];

      // Check each user's event reminder schedule
      for (const user of usersResult.rows) {
        try {
          let frequencies = [];
          if (Array.isArray(user.event_reminder_frequencies)) {
            frequencies = user.event_reminder_frequencies;
          } else if (typeof user.event_reminder_frequencies === 'string') {
            // Handle PostgreSQL array format like {"daily"} or '["daily"]'
            const cleaned = user.event_reminder_frequencies.replace(/[{}"]/g, '');
            frequencies = cleaned ? cleaned.split(',') : [];
          } else {
            frequencies = [];
          }
          const matchedFrequencies = [];

          console.log(`🔍 DEBUG: Checking event reminders for ${user.email}`);
          console.log(`🔍 DEBUG: Event frequencies:`, frequencies);
          console.log(`🔍 DEBUG: Current time: ${currentTime}, Day: ${currentDay}, Date: ${currentDate}`);
          
          for (const frequency of frequencies) {
            switch (frequency) {
              case 'daily':
                // Compare only hours and minutes, ignore seconds
                const userDailyTime = user.event_daily_schedule_time ? user.event_daily_schedule_time.slice(0, 5) : null;
                console.log(`🔍 DEBUG: Event daily check - User time: ${user.event_daily_schedule_time} -> ${userDailyTime}, Current: ${currentTime}, Match: ${userDailyTime === currentTime}`);
                if (userDailyTime === currentTime) {
                  matchedFrequencies.push('daily');
                }
                break;
              case 'weekly':
                const userWeeklyTime = user.event_weekly_schedule_time ? user.event_weekly_schedule_time.slice(0, 5) : null;
                console.log(`🔍 DEBUG: Event weekly check - User day: ${user.event_weekly_schedule_day}, time: ${user.event_weekly_schedule_time} -> ${userWeeklyTime}, Current day: ${currentDay}, time: ${currentTime}`);
                if (user.event_weekly_schedule_day === currentDay && userWeeklyTime === currentTime) {
                  matchedFrequencies.push('weekly');
                }
                break;
              case 'monthly':
                const userMonthlyTime = user.event_monthly_schedule_time ? user.event_monthly_schedule_time.slice(0, 5) : null;
                console.log(`🔍 DEBUG: Event monthly check - User date: ${user.event_monthly_schedule_date}, time: ${user.event_monthly_schedule_time} -> ${userMonthlyTime}, Current date: ${currentDate}, time: ${currentTime}`);
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
                let settings = {};
                if (typeof user.notification_settings === 'string') {
                  settings = user.notification_settings ? JSON.parse(user.notification_settings) : {};
                } else if (typeof user.notification_settings === 'object' && user.notification_settings !== null) {
                  settings = user.notification_settings;
                }
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

  async checkAndSendSoftdrinkTrendsAlerts() {
    try {
      const now = new Date();
      
      // Convert to Sweden timezone (UTC+1 or UTC+2)
      const swedenTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Stockholm"}));
      const currentDay = swedenTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const currentDate = swedenTime.getDate(); // 1-31
      const currentTime = swedenTime.toTimeString().slice(0, 5); // HH:MM format

      // Only log every 10 minutes to avoid spam
      const shouldLog = !this.lastCheckTime || 
        (now.getTime() - this.lastCheckTime.getTime()) > 10 * 60 * 1000;

      if (shouldLog) {
        console.log(`📉 Checking softdrink trends alerts at ${currentTime} (Day: ${currentDay}, Date: ${currentDate})`);
      }

      // Get users with softdrink trends alerts enabled
      const usersResult = await query(`
        SELECT u.id, u.name, u.phone, u.email, u.branch_context,
               b.name as branch_name, d.name as district_name, r.name as region_name,
               u.notification_settings, u.softdrink_trends_frequencies,
               u.softdrink_trends_daily_schedule_time, u.softdrink_trends_weekly_schedule_day,
               u.softdrink_trends_weekly_schedule_time, u.softdrink_trends_monthly_schedule_date,
               u.softdrink_trends_monthly_schedule_time
        FROM users u
        LEFT JOIN branches b ON u.branch_context = b.id
        LEFT JOIN districts d ON b.district_id = d.id
        LEFT JOIN regions r ON d.region_id = r.id
        WHERE (u.phone IS NOT NULL OR u.email IS NOT NULL)
        AND u.is_active = true
      `);

      const eligibleUsers = [];

      for (const user of usersResult.rows) {
        let notificationSettings = {};
        try {
          if (typeof user.notification_settings === 'string') {
            notificationSettings = user.notification_settings ? JSON.parse(user.notification_settings) : {};
          } else if (typeof user.notification_settings === 'object' && user.notification_settings !== null) {
            notificationSettings = user.notification_settings;
          } else {
            notificationSettings = {};
          }
        } catch (e) {
          console.log('⚠️ Error parsing notification settings for user:', user.email);
          continue;
        }

        // Check if softdrink trends alerts are enabled
        if (notificationSettings.softdrinkTrends !== true) {
          continue;
        }

        // Parse softdrink trends frequencies
        let alertFrequencies = [];
        try {
          console.log(`🔍 DEBUG: User ${user.email} softdrink_trends_frequencies:`, user.softdrink_trends_frequencies);
          console.log(`🔍 DEBUG: Type of softdrink_trends_frequencies:`, typeof user.softdrink_trends_frequencies);
          
          if (Array.isArray(user.softdrink_trends_frequencies)) {
            alertFrequencies = user.softdrink_trends_frequencies;
          } else if (typeof user.softdrink_trends_frequencies === 'string') {
            // Handle PostgreSQL array format like {"daily"} or '["daily"]'
            const cleaned = user.softdrink_trends_frequencies.replace(/[{}"]/g, '');
            alertFrequencies = cleaned ? cleaned.split(',') : [];
          } else {
            alertFrequencies = [];
          }
          
          console.log(`✅ DEBUG: Parsed softdrink frequencies successfully:`, alertFrequencies);
        } catch (e) {
          console.log('⚠️ Error parsing softdrink trends frequencies for user:', user.email);
          console.log('⚠️ Raw softdrink_trends_frequencies value:', user.softdrink_trends_frequencies);
          console.log('⚠️ Error details:', e.message);
          continue;
        }

        if (alertFrequencies.length === 0) {
          continue;
        }

        // Check if current time matches any scheduled frequency
        const matchedFrequencies = [];
        
        console.log(`🔍 DEBUG: Checking softdrink trends time match for ${user.email}`);
        console.log(`🔍 DEBUG: Current time: ${currentTime}, Day: ${currentDay}, Date: ${currentDate}`);
        
        for (const frequency of alertFrequencies) {
          let shouldSend = false;
          
          switch (frequency) {
            case 'daily':
              const dailyTime = user.softdrink_trends_daily_schedule_time || '09:00';
              // Normalize time format - remove seconds if present
              const normalizedDailyTime = dailyTime.includes(':') ? dailyTime.split(':').slice(0, 2).join(':') : dailyTime;
              console.log(`🔍 DEBUG: Softdrink daily check - User time: ${dailyTime} -> ${normalizedDailyTime}, Current: ${currentTime}, Match: ${currentTime === normalizedDailyTime}`);
              if (currentTime === normalizedDailyTime) {
                shouldSend = true;
              }
              break;
              
            case 'weekly':
              const weeklyDay = user.softdrink_trends_weekly_schedule_day || 0;
              const weeklyTime = user.softdrink_trends_weekly_schedule_time || '09:00';
              const normalizedWeeklyTime = weeklyTime.includes(':') ? weeklyTime.split(':').slice(0, 2).join(':') : weeklyTime;
              console.log(`🔍 DEBUG: Softdrink weekly check - User day: ${weeklyDay}, time: ${weeklyTime} -> ${normalizedWeeklyTime}, Current day: ${currentDay}, time: ${currentTime}`);
              if (currentDay === weeklyDay && currentTime === normalizedWeeklyTime) {
                shouldSend = true;
              }
              break;
              
            case 'monthly':
              const monthlyDate = user.softdrink_trends_monthly_schedule_date || 1;
              const monthlyTime = user.softdrink_trends_monthly_schedule_time || '09:00';
              const normalizedMonthlyTime = monthlyTime.includes(':') ? monthlyTime.split(':').slice(0, 2).join(':') : monthlyTime;
              console.log(`🔍 DEBUG: Softdrink monthly check - User date: ${monthlyDate}, time: ${monthlyTime} -> ${normalizedMonthlyTime}, Current date: ${currentDate}, time: ${currentTime}`);
              if (currentDate === monthlyDate && currentTime === normalizedMonthlyTime) {
                shouldSend = true;
              }
              break;
          }
          
          if (shouldSend) {
            console.log(`✅ DEBUG: Softdrink frequency ${frequency} matched for ${user.email}`);
            matchedFrequencies.push(frequency);
          }
        }

        if (matchedFrequencies.length > 0) {
          eligibleUsers.push({
            ...user,
            notification_settings: notificationSettings,
            matchedFrequencies
          });
        }
      }

      if (eligibleUsers.length === 0) {
        if (shouldLog) {
          console.log('📉 No users eligible for softdrink trends alerts');
          console.log('📉 Debug: Checking why no users are eligible...');
          console.log('📉 Total users checked:', usersResult.rows.length);
          for (const user of usersResult.rows) {
            let notificationSettings = {};
            try {
              if (typeof user.notification_settings === 'string') {
                notificationSettings = user.notification_settings ? JSON.parse(user.notification_settings) : {};
              } else if (typeof user.notification_settings === 'object' && user.notification_settings !== null) {
                notificationSettings = user.notification_settings;
              }
            } catch (e) {
              console.log('📉 Error parsing notification settings for user:', user.email);
            }
            console.log(`📉 User ${user.email}: softdrinkTrends=${notificationSettings.softdrinkTrends}, frequencies=${user.softdrink_trends_frequencies}`);
          }
        }
        return;
      }

      if (shouldLog) {
        console.log(`📉 Found ${eligibleUsers.length} users eligible for softdrink trends alerts`);
      }

      // Get softdrink trends data for the last week
      const trendsResult = await query(`
        WITH weekly_data AS (
          SELECT 
            i.name as item_name,
            DATE_TRUNC('week', sm.created_at) as week_start,
            SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE 0 END) as stock_in,
            SUM(CASE WHEN sm.movement_type = 'out' THEN sm.quantity ELSE 0 END) as stock_out,
            SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE -sm.quantity END) as net_change
          FROM stock_movements sm
          JOIN items i ON sm.item_id = i.id
          WHERE i.category = 'softdrinks'
            AND sm.created_at >= DATE_TRUNC('week', NOW()) - INTERVAL '1 week'
            AND sm.created_at < DATE_TRUNC('week', NOW()) + INTERVAL '1 week'
          GROUP BY i.name, DATE_TRUNC('week', sm.created_at)
        )
        SELECT 
          item_name,
          stock_in,
          stock_out,
          net_change,
          CASE 
            WHEN net_change < 0 THEN 'declining'
            WHEN net_change = 0 THEN 'stable'
            ELSE 'growing'
          END as trend
        FROM weekly_data
        WHERE net_change < 0
        ORDER BY net_change ASC
      `);

      const decliningItems = trendsResult.rows;

      if (shouldLog) {
        console.log(`📉 Softdrink trends query returned ${decliningItems.length} declining items`);
        if (decliningItems.length > 0) {
          console.log('📉 Declining items:', decliningItems.map(item => `${item.item_name}: ${item.net_change} (${item.trend})`));
        }
      }

      if (decliningItems.length === 0) {
        if (shouldLog) {
          console.log('📉 No declining softdrink trends found - no alerts will be sent');
        }
        return;
      }

      // Send alerts to eligible users
      const alertsSent = [];

      for (const user of eligibleUsers) {
        try {
          // Send email alert if enabled
          if (user.notification_settings.email === true) {
            await emailService.sendSoftdrinkTrendAlert(
              user.email,
              user.name,
              decliningItems,
              user.branch_name,
              user.district_name
            );
            console.log(`📧 Softdrink trend alert sent via email to ${user.email}`);
          }

          // Send WhatsApp alert if enabled and phone number exists
          if (user.notification_settings.whatsapp === true && user.phone) {
            const message = `📉 Softdrink Trend Alert\n\nHello ${user.name},\n\nWe've detected declining trends in the following softdrink items:\n\n${decliningItems.map(item => `• ${item.item_name}: Net change ${item.net_change} (${item.trend})`).join('\n')}\n\nPlease review your inventory and consider adjusting your ordering strategy.\n\nBest regards,\nInventory Management System`;
            
            await whatsappService.sendMessage(user.phone, message);
            console.log(`📱 Softdrink trend alert sent via WhatsApp to ${user.phone}`);
          }

          alertsSent.push({
            userId: user.id,
            email: user.email,
            phone: user.phone,
            itemsCount: decliningItems.length
          });
        } catch (error) {
          console.error(`❌ Error sending softdrink trend alert to ${user.email}:`, error);
        }
      }

      if (alertsSent.length > 0) {
        console.log(`📉 Softdrink trends alerts sent successfully to ${alertsSent.length} users`);
        
        // Trigger frontend notification update
        triggerSchedulerNotificationUpdate();
      }

    } catch (error) {
      console.error('❌ Error in softdrink trends alerts check:', error);
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
