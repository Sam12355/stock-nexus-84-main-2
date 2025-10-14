import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { User, Bell, Building, Save } from "lucide-react";
import AlertSchedulingModal, { AlertSchedule } from "@/components/AlertSchedulingModal";
import EventReminderSchedulingModal, { EventReminderSchedule } from "@/components/EventReminderSchedulingModal";

interface ExtendedProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  photo_url?: string;
  position?: string;
  role: string;
  branch_id?: string;
  branch_context?: string;
  stock_alert_frequency?: string;
  stock_alert_schedule_day?: number;
  stock_alert_schedule_date?: number;
  stock_alert_schedule_time?: string;
  stock_alert_frequencies?: string[];
  daily_schedule_time?: string;
  weekly_schedule_day?: number;
  weekly_schedule_time?: string;
  monthly_schedule_date?: number;
  monthly_schedule_time?: string;
  notification_settings?: {
    email?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
    assistant_manager_stock_in_access?: boolean;
    [key: string]: boolean | string | number | undefined;
  };
  event_reminder_frequencies?: string[];
  event_daily_schedule_time?: string;
  event_weekly_schedule_day?: number;
  event_weekly_schedule_time?: string;
  event_monthly_schedule_date?: number;
  event_monthly_schedule_time?: string;
  softdrink_trends_frequency?: string;
  softdrink_trends_schedule_day?: number;
  softdrink_trends_schedule_date?: number;
  softdrink_trends_schedule_time?: string;
  softdrink_trends_frequencies?: string[];
  softdrink_trends_daily_schedule_time?: string;
  softdrink_trends_weekly_schedule_day?: number;
  softdrink_trends_weekly_schedule_time?: string;
  softdrink_trends_monthly_schedule_date?: number;
  softdrink_trends_monthly_schedule_time?: string;
  created_at?: string;
  updated_at?: string;
  access_count?: number;
}

interface Branch {
  id: string;
  name: string;
  location?: string;
  notification_settings: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  alert_frequency: string;
}

const Settings = () => {
  const { profile } = useAuth() as { profile: ExtendedProfile | null };
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [showAlertSchedulingModal, setShowAlertSchedulingModal] = useState(false);
  const [showEventReminderSchedulingModal, setShowEventReminderSchedulingModal] = useState(false);
  const [showSoftdrinkTrendsSchedulingModal, setShowSoftdrinkTrendsSchedulingModal] = useState(false);

  // Guards against state being reset after user edits
  const [profileInitialized, setProfileInitialized] = useState(false);
  const [hasTouchedNotifications, setHasTouchedNotifications] = useState(false);
  const hasTouchedNotificationsRef = useRef(false);

  // Phone collection dialog state
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [tempPhone, setTempPhone] = useState("");

  // Permissions state (for managers only)
  const [assistantManagerStockInAccess, setAssistantManagerStockInAccess] = useState(false);

  // Profile settings
  const [profileData, setProfileData] = useState<ExtendedProfile>({
    id: profile?.id || "",
    user_id: profile?.id || "", // Use profile.id as user_id for compatibility
    name: profile?.name || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    position: profile?.position || "",
    role: profile?.role || "",
    // Use safe fallbacks for scheduling data that might not exist yet
    stock_alert_frequencies: profile?.stock_alert_frequencies || [],
    daily_schedule_time: profile?.daily_schedule_time || undefined,
    weekly_schedule_day: profile?.weekly_schedule_day || undefined,
    weekly_schedule_time: profile?.weekly_schedule_time || undefined,
    monthly_schedule_date: profile?.monthly_schedule_date || undefined,
    monthly_schedule_time: profile?.monthly_schedule_time || undefined,
    event_reminder_frequencies: profile?.event_reminder_frequencies || [],
    event_daily_schedule_time: profile?.event_daily_schedule_time || undefined,
    event_weekly_schedule_day: profile?.event_weekly_schedule_day || undefined,
    event_weekly_schedule_time: profile?.event_weekly_schedule_time || undefined,
    event_monthly_schedule_date: profile?.event_monthly_schedule_date || undefined,
    event_monthly_schedule_time: profile?.event_monthly_schedule_time || undefined,
    softdrink_trends_frequencies: profile?.softdrink_trends_frequencies || [],
    softdrink_trends_daily_schedule_time: profile?.softdrink_trends_daily_schedule_time || undefined,
    softdrink_trends_weekly_schedule_day: profile?.softdrink_trends_weekly_schedule_day || undefined,
    softdrink_trends_weekly_schedule_time: profile?.softdrink_trends_weekly_schedule_time || undefined,
    softdrink_trends_monthly_schedule_date: profile?.softdrink_trends_monthly_schedule_date || undefined,
    softdrink_trends_monthly_schedule_time: profile?.softdrink_trends_monthly_schedule_time || undefined,
  });

  const normalizeTime = (time?: string | null) => (time ? time.slice(0, 5) : undefined);

  const buildAlertScheduleFromProfile = (profileLike: ExtendedProfile): AlertSchedule | undefined => {
    const frequencies = profileLike.stock_alert_frequencies || [];
    if (!frequencies || frequencies.length === 0) {
      return undefined;
    }

    const baseScheduleTime =
      normalizeTime(profileLike.stock_alert_schedule_time) ||
      normalizeTime(profileLike.daily_schedule_time) ||
      normalizeTime(profileLike.weekly_schedule_time) ||
      normalizeTime(profileLike.monthly_schedule_time) ||
      "09:00";

    return {
      frequencies: frequencies as ("daily" | "weekly" | "monthly")[],
      scheduleTime: baseScheduleTime,
      scheduleDay: profileLike.weekly_schedule_day ?? undefined,
      scheduleDate: profileLike.monthly_schedule_date ?? undefined,
      dailyTime: normalizeTime(profileLike.daily_schedule_time) || baseScheduleTime,
      weeklyTime: normalizeTime(profileLike.weekly_schedule_time) || baseScheduleTime,
      monthlyTime: normalizeTime(profileLike.monthly_schedule_time) || baseScheduleTime,
    };
  };

  const buildEventScheduleFromProfile = (profileLike: ExtendedProfile): EventReminderSchedule | undefined => {
    const frequencies = profileLike.event_reminder_frequencies || [];
    if (!frequencies || frequencies.length === 0) {
      return undefined;
    }

    return {
      frequencies,
      dailyTime: normalizeTime(profileLike.event_daily_schedule_time) || "09:00",
      weeklyTime: normalizeTime(profileLike.event_weekly_schedule_time) || "09:00",
      monthlyTime: normalizeTime(profileLike.event_monthly_schedule_time) || "09:00",
      scheduleDay: profileLike.event_weekly_schedule_day ?? null,
      scheduleDate: profileLike.event_monthly_schedule_date ?? null,
    };
  };

  const buildSoftdrinkTrendsScheduleFromProfile = (profileLike: ExtendedProfile): AlertSchedule | undefined => {
    const frequencies = profileLike.softdrink_trends_frequencies || [];
    if (!frequencies || frequencies.length === 0) {
      return undefined;
    }

    const baseScheduleTime = "09:00";
    return {
      frequencies,
      dailyTime: normalizeTime(profileLike.softdrink_trends_daily_schedule_time) || baseScheduleTime,
      weeklyTime: normalizeTime(profileLike.softdrink_trends_weekly_schedule_time) || baseScheduleTime,
      monthlyTime: normalizeTime(profileLike.softdrink_trends_monthly_schedule_time) || baseScheduleTime,
      scheduleDay: profileLike.softdrink_trends_weekly_schedule_day ?? null,
      scheduleDate: profileLike.softdrink_trends_monthly_schedule_date ?? null,
    };
  };

  // Notification settings - initialize from localStorage or defaults
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem(`notifications_${profile?.id}`);
    if (saved) {
      try {
        return JSON.parse(saved) as {
          email: boolean;
          sms: boolean;
          whatsapp: boolean;
          stockAlerts: boolean;
          eventReminders: boolean;
          softdrinkTrends: boolean;
        };
      } catch (e) {
        console.error('Error parsing saved notifications:', e);
      }
    }
    return {
      email: true,
      sms: false,
      whatsapp: false,
      stockAlerts: true,
      eventReminders: true,
      softdrinkTrends: false,
    };
  });

  // Save notifications to both localStorage and database
  const saveNotificationsToDatabase = async (notificationSettings: Record<string, any>) => {
    if (!profile?.id) return;
    
    try {
      await apiClient.updateNotificationSettings({
        email: notificationSettings.email,
        sms: notificationSettings.sms,
        whatsapp: notificationSettings.whatsapp,
        stockLevelAlerts: notificationSettings.stockAlerts,
        eventReminders: notificationSettings.eventReminders,
        softdrinkTrends: notificationSettings.softdrinkTrends
      });
    } catch (error) {
      console.error('Error saving notifications to database:', error);
    }
  };

  // Persist notifications to localStorage AND database on change
  useEffect(() => {
    if (profile?.id) {
      try {
        localStorage.setItem(`notifications_${profile.id}`, JSON.stringify(notifications));
        // Also save to database for edge functions to access
        saveNotificationsToDatabase(notifications);
      } catch (e) {
        console.error('Error saving notifications:', e);
      }
    }
  }, [notifications, profile?.id]);

  // Hydrate notifications from localStorage and database
  useEffect(() => {
    if (!profile?.id) return;
    
    const loadNotificationSettings = async () => {
      // First try localStorage
      const saved = localStorage.getItem(`notifications_${profile.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Ensure email field is always present
          const settingsWithEmail = {
            email: true, // Always default to true
            sms: false,
            whatsapp: false,
            stockAlerts: true,
            eventReminders: true,
            ...parsed
          };
          setNotifications(settingsWithEmail);
          hasTouchedNotificationsRef.current = true;
          return;
        } catch (e) {
          console.error('Error parsing saved notifications on hydrate:', e);
        }
      }
      
      // If no localStorage, try database
      try {
        const profileData = await apiClient.getProfile();
        
        if (profileData?.notification_settings) {
          const dbSettings = profileData.notification_settings;
          
          // Set default values based on user role
          let defaultEmail = true; // Email is always enabled by default for all roles
          let defaultSms = false;
          let defaultWhatsapp = false;
          let defaultStockAlerts = false;
          let defaultEventReminders = false;
          
          // For managers and assistant managers, turn off all notifications by default
          if (['manager', 'assistant_manager'].includes(profileData.role)) {
            defaultEmail = false;
            defaultSms = false;
            defaultWhatsapp = false;
            defaultStockAlerts = false;
            defaultEventReminders = false;
          }
          
          const mappedSettings = {
            email: dbSettings.email !== undefined ? dbSettings.email : defaultEmail,
            sms: dbSettings.sms !== undefined ? dbSettings.sms : defaultSms,
            whatsapp: dbSettings.whatsapp !== undefined ? dbSettings.whatsapp : defaultWhatsapp,
            stockAlerts: dbSettings.stockLevelAlerts !== undefined ? dbSettings.stockLevelAlerts : defaultStockAlerts,
            eventReminders: dbSettings.eventReminders !== undefined ? dbSettings.eventReminders : defaultEventReminders,
            softdrinkTrends: dbSettings.softdrinkTrends !== undefined ? dbSettings.softdrinkTrends : false,
          };
          setNotifications(mappedSettings);
          // Also save to localStorage for faster access
          localStorage.setItem(`notifications_${profile.id}`, JSON.stringify(mappedSettings));
        }
      } catch (error) {
        console.error('Error loading notification settings from database:', error);
      }
    };
    
    loadNotificationSettings();
    
  // Initialize permissions for managers
  if (profile?.role === "manager") {
    const permissions = profile?.notification_settings?.assistant_manager_stock_in_access || false;
    setAssistantManagerStockInAccess(permissions);
  }
}, [profile?.id, profile?.role, profile?.notification_settings?.assistant_manager_stock_in_access]);

  // Load alert scheduling status
  // Alert schedule data is already loaded from the profile
  // No need for additional API calls

  // Branch settings
  const [branchSettings, setBranchSettings] = useState({});

  useEffect(() => {
    if (profile && !profileInitialized) {
      setProfileData({
        id: profile.id || "",
        user_id: profile.user_id || "",
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        position: profile.position || "",
        role: profile.role || "",
        stock_alert_frequencies: profile.stock_alert_frequencies,
        daily_schedule_time: profile.daily_schedule_time,
        weekly_schedule_day: profile.weekly_schedule_day,
        weekly_schedule_time: profile.weekly_schedule_time,
        monthly_schedule_date: profile.monthly_schedule_date,
        monthly_schedule_time: profile.monthly_schedule_time,
        event_reminder_frequencies: profile.event_reminder_frequencies,
        event_daily_schedule_time: profile.event_daily_schedule_time,
        event_weekly_schedule_day: profile.event_weekly_schedule_day,
        event_weekly_schedule_time: profile.event_weekly_schedule_time,
        event_monthly_schedule_date: profile.event_monthly_schedule_date,
        event_monthly_schedule_time: profile.event_monthly_schedule_time,
      });
      setProfileInitialized(true);
    }
  }, [profile, profileInitialized]);

  useEffect(() => {
    if (profile?.branch_id || profile?.branch_context) {
      fetchBranchSettings();
    } else {
      setBranch(null);
    }
  }, [profile?.branch_id, profile?.branch_context]);

  const fetchBranchSettings = async () => {
    if (!profile?.branch_id && !profile?.branch_context) return;

    try {
      const branchId = profile.branch_id || profile.branch_context;
      const data = await apiClient.getBranches();
      const branchData = data.find(b => b.id === branchId);

      if (branchData) {
        // Always update branch data
        setBranch(branchData as Branch);
        
        // Only initialize notifications if they haven't been touched by user
        if (!hasTouchedNotificationsRef.current) {
          setNotifications((prev) => ({
            ...prev,
            email: (data as { notification_settings?: ExtendedProfile['notification_settings'] })?.notification_settings?.email ?? true,
            sms: (data as { notification_settings?: ExtendedProfile['notification_settings'] })?.notification_settings?.sms ?? false,
            whatsapp: (data as { notification_settings?: ExtendedProfile['notification_settings'] })?.notification_settings?.whatsapp ?? false,
          }));
        }
        
        // Always update branch settings
        setBranchSettings({});
      }
    } catch (error) {
      console.error("Error fetching branch settings:", error);
    }
  };

  const updateProfile = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const payload = {
        name: profileData.name.trim().slice(0, 100),
        phone: profileData.phone.trim().slice(0, 30),
        position: profileData.position.trim().slice(0, 100),
      };

      await apiClient.updateProfile(payload);

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const updatePermissions = async () => {
    if (profile?.role !== "manager") return;

    setLoading(true);
    try {
      // For now, we'll store this in the user's notification_settings
      // In a real app, you might want a separate permissions table
      const currentSettings = profile?.notification_settings || {};
      const updatedSettings = {
        ...currentSettings,
        assistant_manager_stock_in_access: assistantManagerStockInAccess,
      };

      await apiClient.updateUserSettings({
        notification_settings: updatedSettings,
      });

      toast({
        title: "Success",
        description: "Permissions updated successfully",
      });
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast({
        title: "Error",
        description: "Failed to update permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save individual notification setting immediately
  const saveNotificationSetting = async (settingType: 'email' | 'sms' | 'whatsapp' | 'stockAlerts' | 'eventReminders' | 'softdrinkTrends', value: boolean) => {
    try {
      console.log(`🔧 DEBUG: saveNotificationSetting called with settingType=${settingType}, value=${value}`);
      
      // Save to localStorage for all notification preferences
      const updatedNotifications = { ...notifications, [settingType]: value };
      localStorage.setItem(`notifications_${profile?.id}`, JSON.stringify(updatedNotifications));

      // Save to database for notification delivery methods - update USER settings, not branch settings
      if (['email', 'sms', 'whatsapp', 'stockAlerts', 'eventReminders', 'softdrinkTrends'].includes(settingType)) {
        // Get current notification settings safely and ensure all fields are preserved
        const currentSettings = profile?.notification_settings || {};
        
        // Set default values based on user role
        let defaultEmail = true; // Email is always enabled by default for all roles
        let defaultSms = false;
        let defaultWhatsapp = false;
        let defaultStockAlerts = false;
        let defaultEventReminders = false;
        let defaultSoftdrinkTrends = false;
        
        // For managers and assistant managers, turn off all notifications by default
        if (['manager', 'assistant_manager'].includes(profile?.role || '')) {
          defaultEmail = false;
          defaultSms = false;
          defaultWhatsapp = false;
          defaultStockAlerts = false;
          defaultEventReminders = false;
        }
        
        const updatedSettings = {
          // ALWAYS include email field - never remove it!
          email: settingType === 'email' ? value : (currentSettings.email !== undefined ? currentSettings.email : defaultEmail),
          whatsapp: settingType === 'whatsapp' ? value : (currentSettings.whatsapp !== undefined ? currentSettings.whatsapp : defaultWhatsapp),
          sms: settingType === 'sms' ? value : (currentSettings.sms !== undefined ? currentSettings.sms : defaultSms),
          stockLevelAlerts: settingType === 'stockAlerts' ? value : (currentSettings.stockLevelAlerts !== undefined ? currentSettings.stockLevelAlerts : defaultStockAlerts),
          eventReminders: settingType === 'eventReminders' ? value : (currentSettings.eventReminders !== undefined ? currentSettings.eventReminders : defaultEventReminders),
          softdrinkTrends: settingType === 'softdrinkTrends' ? value : (currentSettings.softdrinkTrends !== undefined ? currentSettings.softdrinkTrends : defaultSoftdrinkTrends),
        };

        // CRITICAL: Ensure email field is ALWAYS present and never removed
        if (!Object.prototype.hasOwnProperty.call(updatedSettings, 'email') || updatedSettings.email === undefined) {
          updatedSettings.email = true;
        }

        console.log(`Updating ${settingType} notification setting to:`, value);
        console.log('Current settings:', currentSettings);
        console.log('Updated notification settings:', updatedSettings);

        await apiClient.updateNotificationSettings(updatedSettings);
        
        console.log(`Successfully updated ${settingType} in database`);
        
        // Update local profile state to reflect the change
        // Note: The profile will be updated when the component re-renders
        console.log('Profile will be updated on next render');
      }

      console.log(`${settingType} notification setting saved:`, value);
    } catch (error) {
      console.error(`Error saving ${settingType} notification setting:`, error);
      toast({
        title: "Error",
        description: `Failed to save ${settingType} notification setting`,
        variant: "destructive",
      });
    }
  };

  // Handle WhatsApp notification toggle with phone validation
  const handleWhatsAppToggle = async (checked: boolean) => {
    if (checked && (!profileData.phone || profileData.phone.trim() === "")) {
      setTempPhone("");
      setShowPhoneDialog(true);
      return;
    }
    
    setHasTouchedNotifications(true);
    hasTouchedNotificationsRef.current = true;
    setNotifications((prev) => ({ ...prev, whatsapp: checked }));
    
    // Immediately save the setting to the database
    await saveNotificationSetting('whatsapp', checked);
  };

  // Save phone number and enable WhatsApp
  const savePhoneAndEnableWhatsApp = async () => {
    if (!tempPhone.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update profile with phone number
      await apiClient.updateProfile({ phone: tempPhone.trim() });

      // Update local state
      setProfileData(prev => ({ ...prev, phone: tempPhone.trim() }));
      
       // Enable WhatsApp notifications
       setHasTouchedNotifications(true);
       hasTouchedNotificationsRef.current = true;
       setNotifications((prev) => ({ ...prev, whatsapp: true }));
       
       // Save WhatsApp notification setting to database
       await saveNotificationSetting('whatsapp', true);
      
      setShowPhoneDialog(false);
      
      toast({
        title: "Success",
        description: "Phone number saved and WhatsApp notifications enabled.",
      });
    } catch (error) {
      console.error("Error saving phone:", error);
      toast({
        title: "Error",
        description: "Failed to save phone number",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Format time for display
  const formatTime = (time: string | undefined) => {
    if (!time) return 'Not set';
    return time.slice(0, 5); // Remove seconds
  };

  // Format day of week for display
  const formatDayOfWeek = (day: number | undefined) => {
    if (!day) return 'Not set';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] || 'Not set';
  };

  // Format day of month for display
  const formatDayOfMonth = (day: number | undefined) => {
    if (!day) return 'Not set';
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = day % 100;
    return day + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  };

  // Handle stock alert toggle
  const handleStockAlertToggle = async (checked: boolean) => {
    setHasTouchedNotifications(true);
    hasTouchedNotificationsRef.current = true;
    
    if (checked) {
      // Show scheduling modal when enabling stock alerts
      setShowAlertSchedulingModal(true);
    } else {
      // Disable stock alerts immediately
      setNotifications((prev) => ({ ...prev, stockAlerts: false }));
      await saveNotificationSetting('stockAlerts', false);
      
      // Reset alert scheduling to immediate
      // Note: These columns don't exist in the database yet, so we'll skip the update
      console.log('Stock alert scheduling columns not available in database, skipping update');

      setProfileData((prev) => ({
        ...prev,
        stock_alert_frequencies: [],
        daily_schedule_time: undefined,
        weekly_schedule_day: undefined,
        weekly_schedule_time: undefined,
        monthly_schedule_date: undefined,
        monthly_schedule_time: undefined,
        stock_alert_frequency: 'immediate',
        stock_alert_schedule_day: null,
        stock_alert_schedule_date: null,
        stock_alert_schedule_time: '09:00'
      }));
    }
  };

  // Handle alert schedule save
  const handleAlertScheduleSave = async (schedule: AlertSchedule) => {
    try {
      // Enable stock alerts
      setNotifications((prev) => ({ ...prev, stockAlerts: true }));
      await saveNotificationSetting('stockAlerts', true);
      
      // Prepare separate schedule parameters for each frequency type
      const updateData: Record<string, any> = {
        stock_alert_frequencies: schedule.frequencies
      };
      
      // Set separate schedule parameters for each frequency type
      if (schedule.frequencies.includes('daily')) {
        updateData.daily_schedule_time = schedule.dailyTime || schedule.scheduleTime;
      }
      
      if (schedule.frequencies.includes('weekly')) {
        updateData.weekly_schedule_day = schedule.scheduleDay || null;
        updateData.weekly_schedule_time = schedule.weeklyTime || schedule.scheduleTime;
      }
      
      if (schedule.frequencies.includes('monthly')) {
        updateData.monthly_schedule_date = schedule.scheduleDate || null;
        updateData.monthly_schedule_time = schedule.monthlyTime || schedule.scheduleTime;
      }
      
      // Save alert scheduling preferences to database
      console.log('Saving stock alert schedule to database:', updateData);
      try {
        await apiClient.updateProfile(updateData);
        console.log('✅ Stock alert schedule saved to database');
      } catch (error) {
        console.error('❌ Failed to save stock alert schedule to database:', error);
        // Continue with local state update even if database save fails
      }

      setProfileData((prev) => {
        const nextFrequencies = schedule.frequencies.length > 0 ? [...schedule.frequencies] : [];

        return {
          ...prev,
          stock_alert_frequencies: nextFrequencies,
          daily_schedule_time: nextFrequencies.includes('daily')
            ? (schedule.dailyTime || schedule.scheduleTime)
            : undefined,
          weekly_schedule_day: nextFrequencies.includes('weekly')
            ? (schedule.scheduleDay ?? null)
            : undefined,
          weekly_schedule_time: nextFrequencies.includes('weekly')
            ? (schedule.weeklyTime || schedule.scheduleTime)
            : undefined,
          monthly_schedule_date: nextFrequencies.includes('monthly')
            ? (schedule.scheduleDate ?? null)
            : undefined,
          monthly_schedule_time: nextFrequencies.includes('monthly')
            ? (schedule.monthlyTime || schedule.scheduleTime)
            : undefined,
          stock_alert_frequency:
            nextFrequencies.length === 0
              ? 'immediate'
              : nextFrequencies.length === 1
              ? nextFrequencies[0]
              : 'custom',
        };
      });
      
      // Create description text
      const frequencyTexts = schedule.frequencies.map(freq => {
        switch (freq) {
          case 'daily':
            return `daily at ${schedule.dailyTime || schedule.scheduleTime}`;
          case 'weekly':
            return `weekly on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][schedule.scheduleDay || 0]} at ${schedule.weeklyTime || schedule.scheduleTime}`;
          case 'monthly':
            return `monthly on the ${schedule.scheduleDate}th at ${schedule.monthlyTime || schedule.scheduleTime}`;
          default:
            return freq;
        }
      });
      
      toast({
        title: "Stock Alert Schedule Saved",
        description: `You will receive stock alerts ${frequencyTexts.join(', ')}.`,
      });
    } catch (error) {
      console.error('Error saving alert schedule:', error);
      toast({
        title: "Error",
        description: "Failed to save alert schedule. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle event reminder schedule save
  const handleEventReminderScheduleSave = async (schedule: EventReminderSchedule) => {
    try {
      // Enable event reminders
      setNotifications((prev) => ({ ...prev, eventReminders: true }));
      await saveNotificationSetting('eventReminders', true);
      
      // Prepare separate schedule parameters for each frequency type
      const updateData: Record<string, any> = {
        event_reminder_frequencies: schedule.frequencies
      };
      
      // Set separate schedule parameters for each frequency type
      if (schedule.frequencies.includes('daily')) {
        updateData.event_daily_schedule_time = schedule.dailyTime;
      }
      
      if (schedule.frequencies.includes('weekly')) {
        updateData.event_weekly_schedule_day = schedule.scheduleDay || null;
        updateData.event_weekly_schedule_time = schedule.weeklyTime;
      }
      
      if (schedule.frequencies.includes('monthly')) {
        updateData.event_monthly_schedule_date = schedule.scheduleDate || null;
        updateData.event_monthly_schedule_time = schedule.monthlyTime;
      }
      
      // Save event reminder scheduling preferences to database
      console.log('Saving event reminder schedule to database:', updateData);
      try {
        await apiClient.updateProfile(updateData);
        console.log('✅ Event reminder schedule saved to database');
      } catch (error) {
        console.error('❌ Failed to save event reminder schedule to database:', error);
        // Continue with local state update even if database save fails
      }

      setProfileData((prev) => {
        const nextFrequencies = schedule.frequencies.length > 0 ? [...schedule.frequencies] : [];

        return {
          ...prev,
          event_reminder_frequencies: nextFrequencies,
          event_daily_schedule_time: nextFrequencies.includes('daily')
            ? schedule.dailyTime
            : undefined,
          event_weekly_schedule_day: nextFrequencies.includes('weekly')
            ? (schedule.scheduleDay ?? null)
            : undefined,
          event_weekly_schedule_time: nextFrequencies.includes('weekly')
            ? schedule.weeklyTime
            : undefined,
          event_monthly_schedule_date: nextFrequencies.includes('monthly')
            ? (schedule.scheduleDate ?? null)
            : undefined,
          event_monthly_schedule_time: nextFrequencies.includes('monthly')
            ? schedule.monthlyTime
            : undefined,
        };
      });
      
      // Create description text
      const frequencyTexts = schedule.frequencies.map(freq => {
        switch (freq) {
          case 'daily':
            return `daily at ${schedule.dailyTime}`;
          case 'weekly':
            return `weekly on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][schedule.scheduleDay || 0]} at ${schedule.weeklyTime}`;
          case 'monthly':
            return `monthly on the ${schedule.scheduleDate}th at ${schedule.monthlyTime}`;
          default:
            return freq;
        }
      });
      
      toast({
        title: "Event Reminder Schedule Saved",
        description: `You will receive event reminders ${frequencyTexts.join(', ')} until the event date passes.`,
      });
    } catch (error) {
      console.error('Error saving event reminder schedule:', error);
      toast({
        title: "Error",
        description: "Failed to save event reminder schedule. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle softdrink trends schedule save
  const handleSoftdrinkTrendsScheduleSave = async (schedule: AlertSchedule) => {
    try {
      // Enable softdrink trends alerts
      setNotifications((prev) => ({ ...prev, softdrinkTrends: true }));
      await saveNotificationSetting('softdrinkTrends', true);
      
      // Prepare separate schedule parameters for each frequency type
      const updateData: Record<string, any> = {
        softdrink_trends_frequencies: schedule.frequencies
      };
      
      // Set separate schedule parameters for each frequency type
      if (schedule.frequencies.includes('daily')) {
        updateData.softdrink_trends_daily_schedule_time = schedule.dailyTime;
      }
      
      if (schedule.frequencies.includes('weekly')) {
        updateData.softdrink_trends_weekly_schedule_day = schedule.scheduleDay || null;
        updateData.softdrink_trends_weekly_schedule_time = schedule.weeklyTime;
      }
      
      if (schedule.frequencies.includes('monthly')) {
        updateData.softdrink_trends_monthly_schedule_date = schedule.scheduleDate || null;
        updateData.softdrink_trends_monthly_schedule_time = schedule.monthlyTime;
      }
      
      // Save softdrink trends scheduling preferences to database
      console.log('Saving softdrink trends schedule to database:', updateData);
      try {
        await apiClient.updateProfile(updateData);
        console.log('✅ Softdrink trends schedule saved to database');
      } catch (error) {
        console.error('❌ Failed to save softdrink trends schedule to database:', error);
        // Continue with local state update even if database save fails
      }

      setProfileData((prev) => {
        const nextFrequencies = schedule.frequencies.length > 0 ? [...schedule.frequencies] : [];

        return {
          ...prev,
          softdrink_trends_frequencies: nextFrequencies,
          softdrink_trends_daily_schedule_time: nextFrequencies.includes('daily')
            ? schedule.dailyTime
            : undefined,
          softdrink_trends_weekly_schedule_day: nextFrequencies.includes('weekly')
            ? (schedule.scheduleDay ?? null)
            : undefined,
          softdrink_trends_weekly_schedule_time: nextFrequencies.includes('weekly')
            ? schedule.weeklyTime
            : undefined,
          softdrink_trends_monthly_schedule_date: nextFrequencies.includes('monthly')
            ? (schedule.scheduleDate ?? null)
            : undefined,
          softdrink_trends_monthly_schedule_time: nextFrequencies.includes('monthly')
            ? schedule.monthlyTime
            : undefined,
        };
      });
      
      // Create description text
      const frequencyTexts = schedule.frequencies.map(freq => {
        switch (freq) {
          case 'daily':
            return `daily at ${schedule.dailyTime}`;
          case 'weekly':
            return `weekly on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][schedule.scheduleDay || 0]} at ${schedule.weeklyTime}`;
          case 'monthly':
            return `monthly on the ${schedule.scheduleDate}th at ${schedule.monthlyTime}`;
          default:
            return freq;
        }
      });
      
      toast({
        title: "Softdrink Trends Schedule Saved",
        description: `You will receive softdrink trend alerts ${frequencyTexts.join(', ')}.`,
      });
    } catch (error) {
      console.error('Error saving softdrink trends schedule:', error);
      toast({
        title: "Error",
        description: "Failed to save softdrink trends schedule. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update profileData when profile changes
  useEffect(() => {
    if (profile) {
      setProfileData({
        id: profile.id,
        user_id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        position: profile.position,
        role: profile.role,
        // Use safe fallbacks for scheduling data that might not exist yet
        stock_alert_frequencies: profile.stock_alert_frequencies || [],
        daily_schedule_time: profile.daily_schedule_time || undefined,
        weekly_schedule_day: profile.weekly_schedule_day || undefined,
        weekly_schedule_time: profile.weekly_schedule_time || undefined,
        monthly_schedule_date: profile.monthly_schedule_date || undefined,
        monthly_schedule_time: profile.monthly_schedule_time || undefined,
        event_reminder_frequencies: profile.event_reminder_frequencies || [],
        event_daily_schedule_time: profile.event_daily_schedule_time || undefined,
        event_weekly_schedule_day: profile.event_weekly_schedule_day || undefined,
        event_weekly_schedule_time: profile.event_weekly_schedule_time || undefined,
        event_monthly_schedule_date: profile.event_monthly_schedule_date || undefined,
        event_monthly_schedule_time: profile.event_monthly_schedule_time || undefined,
        softdrink_trends_frequencies: profile.softdrink_trends_frequencies || [],
        softdrink_trends_daily_schedule_time: profile.softdrink_trends_daily_schedule_time || undefined,
        softdrink_trends_weekly_schedule_day: profile.softdrink_trends_weekly_schedule_day || undefined,
        softdrink_trends_weekly_schedule_time: profile.softdrink_trends_weekly_schedule_time || undefined,
        softdrink_trends_monthly_schedule_date: profile.softdrink_trends_monthly_schedule_date || undefined,
        softdrink_trends_monthly_schedule_time: profile.softdrink_trends_monthly_schedule_time || undefined,
      });
    }
  }, [profile]);


  if (!profile) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={profileData.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="Enter phone number"
                maxLength={30}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={profileData.position}
                onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
                placeholder="Enter your position"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={profile.role?.replace("_", " ")?.toUpperCase()} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Role is assigned by administrators</p>
            </div>

            <Button onClick={updateProfile} disabled={loading} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Profile Changes
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings - hidden for staff */}
        {profile.role !== 'staff' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Stock Level Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified when stock is low</p>
                    {profile.stock_alert_frequency && profile.stock_alert_frequency !== 'immediate' && (
                      <p className="text-xs text-blue-600 mt-1">
                        Scheduled: {profile.stock_alert_frequency === 'daily' ? 'Daily' :
                          profile.stock_alert_frequency === 'weekly' ? `Weekly on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][profile.stock_alert_schedule_day || 0]}` :
                          profile.stock_alert_frequency === 'monthly' ? `Monthly on ${profile.stock_alert_schedule_date}th` : 'Immediate'} at {profile.stock_alert_schedule_time || '09:00'}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={notifications.stockAlerts}
                    onCheckedChange={handleStockAlertToggle}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Event Reminders</Label>
                    <p className="text-sm text-muted-foreground">Get reminders for calendar events</p>
                  </div>
                  <Switch
                    checked={notifications.eventReminders}
                    onCheckedChange={async (checked) => {
                      setHasTouchedNotifications(true);
                      hasTouchedNotificationsRef.current = true;
                      setNotifications((prev) => ({ ...prev, eventReminders: checked }));
                      if (!checked) {
                        setProfileData((prev) => ({
                          ...prev,
                          event_reminder_frequencies: [],
                          event_daily_schedule_time: undefined,
                          event_weekly_schedule_day: undefined,
                          event_weekly_schedule_time: undefined,
                          event_monthly_schedule_date: undefined,
                          event_monthly_schedule_time: undefined,
                        }));
                      }
                      await saveNotificationSetting('eventReminders', checked);
                      
                      // Show scheduling modal when enabling event reminders
                      if (checked) {
                        setShowEventReminderSchedulingModal(true);
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Softdrink Stock Trends</Label>
                    <p className="text-sm text-muted-foreground">Get notified when softdrink trends are declining</p>
                    {profile.softdrink_trends_frequency && profile.softdrink_trends_frequency !== 'immediate' && (
                      <p className="text-xs text-blue-600 mt-1">
                        Scheduled: {profile.softdrink_trends_frequency === 'daily' ? 'Daily' :
                          profile.softdrink_trends_frequency === 'weekly' ? `Weekly on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][profile.softdrink_trends_schedule_day || 0]}` :
                          profile.softdrink_trends_frequency === 'monthly' ? `Monthly on ${profile.softdrink_trends_schedule_date}th` : 'Immediate'} at {profile.softdrink_trends_schedule_time || '09:00'}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={notifications.softdrinkTrends}
                    onCheckedChange={async (checked) => {
                      setHasTouchedNotifications(true);
                      hasTouchedNotificationsRef.current = true;
                      setNotifications((prev) => ({ ...prev, softdrinkTrends: checked }));
                      if (!checked) {
                        setProfileData((prev) => ({
                          ...prev,
                          softdrink_trends_frequencies: [],
                          softdrink_trends_daily_schedule_time: undefined,
                          softdrink_trends_weekly_schedule_day: undefined,
                          softdrink_trends_weekly_schedule_time: undefined,
                          softdrink_trends_monthly_schedule_date: undefined,
                          softdrink_trends_monthly_schedule_time: undefined,
                        }));
                      }
                      await saveNotificationSetting('softdrinkTrends', checked);
                      
                      // Show scheduling modal when enabling softdrink trends alerts
                      if (checked) {
                        setShowSoftdrinkTrendsSchedulingModal(true);
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={async (checked) => {
                      setHasTouchedNotifications(true);
                      hasTouchedNotificationsRef.current = true;
                      setNotifications((prev) => ({ ...prev, email: checked }));
                      await saveNotificationSetting('email', checked);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                  </div>
                  <Switch
                    checked={notifications.sms}
                    onCheckedChange={async (checked) => {
                      setHasTouchedNotifications(true);
                      hasTouchedNotificationsRef.current = true;
                      setNotifications((prev) => ({ ...prev, sms: checked }));
                      await saveNotificationSetting('sms', checked);
                    }}
                  />
                </div>

                 <div className="flex items-center justify-between">
                   <div>
                     <Label>WhatsApp Notifications</Label>
                     <p className="text-sm text-muted-foreground">Receive notifications via WhatsApp</p>
                   </div>
                   <Switch
                     checked={notifications.whatsapp}
                     onCheckedChange={handleWhatsAppToggle}
                   />
               </div>

                 {/* Current Schedule Details */}
               <div className="pt-4 border-t">
                   <h4 className="text-sm font-medium mb-3">Current Alert Schedules</h4>
                   
                   {/* Stock Alert Schedules */}
                   {profileData.stock_alert_frequencies && profileData.stock_alert_frequencies.length > 0 && (
                     <div className="mb-4">
                       <h5 className="text-xs font-medium text-muted-foreground mb-2">Stock Level Alerts</h5>
                       <div className="space-y-2">
                         {profileData.stock_alert_frequencies.includes('daily') && (
                           <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground">Daily:</span>
                             <span className="font-medium">{formatTime(profileData.daily_schedule_time)}</span>
                 </div>
                         )}
                         {profileData.stock_alert_frequencies.includes('weekly') && (
                           <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground">Weekly:</span>
                             <span className="font-medium">{formatDayOfWeek(profileData.weekly_schedule_day)} at {formatTime(profileData.weekly_schedule_time)}</span>
               </div>
                         )}
                         {profileData.stock_alert_frequencies.includes('monthly') && (
                           <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground">Monthly:</span>
                             <span className="font-medium">{formatDayOfMonth(profileData.monthly_schedule_date)} at {formatTime(profileData.monthly_schedule_time)}</span>
                           </div>
                         )}
                       </div>
                     </div>
                   )}

                   {/* Event Reminder Schedules */}
                   {profileData.event_reminder_frequencies && profileData.event_reminder_frequencies.length > 0 && (
                     <div className="mb-4">
                       <h5 className="text-xs font-medium text-muted-foreground mb-2">Event Reminders</h5>
                       <div className="space-y-2">
                         {profileData.event_reminder_frequencies.includes('daily') && (
                           <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground">Daily:</span>
                             <span className="font-medium">{formatTime(profileData.event_daily_schedule_time)}</span>
                           </div>
                         )}
                         {profileData.event_reminder_frequencies.includes('weekly') && (
                           <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground">Weekly:</span>
                             <span className="font-medium">{formatDayOfWeek(profileData.event_weekly_schedule_day)} at {formatTime(profileData.event_weekly_schedule_time)}</span>
                           </div>
                         )}
                         {profileData.event_reminder_frequencies.includes('monthly') && (
                           <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground">Monthly:</span>
                             <span className="font-medium">{formatDayOfMonth(profileData.event_monthly_schedule_date)} at {formatTime(profileData.event_monthly_schedule_time)}</span>
                           </div>
                         )}
                       </div>
                     </div>
                   )}

                   {/* Softdrink Trends Schedules */}
                   {profileData.softdrink_trends_frequencies && profileData.softdrink_trends_frequencies.length > 0 && (
                     <div className="mb-4">
                       <h5 className="text-xs font-medium text-muted-foreground mb-2">Softdrink Trends Alerts</h5>
                       <div className="space-y-2">
                         {profileData.softdrink_trends_frequencies.includes('daily') && (
                           <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground">Daily:</span>
                             <span className="font-medium">{formatTime(profileData.softdrink_trends_daily_schedule_time)}</span>
                           </div>
                         )}
                         {profileData.softdrink_trends_frequencies.includes('weekly') && (
                           <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground">Weekly:</span>
                             <span className="font-medium">{formatDayOfWeek(profileData.softdrink_trends_weekly_schedule_day)} at {formatTime(profileData.softdrink_trends_weekly_schedule_time)}</span>
                           </div>
                         )}
                         {profileData.softdrink_trends_frequencies.includes('monthly') && (
                           <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground">Monthly:</span>
                             <span className="font-medium">{formatDayOfMonth(profileData.softdrink_trends_monthly_schedule_date)} at {formatTime(profileData.softdrink_trends_monthly_schedule_time)}</span>
                           </div>
                         )}
                       </div>
                     </div>
                   )}

                   {(!profileData.stock_alert_frequencies || profileData.stock_alert_frequencies.length === 0) && 
                    (!profileData.event_reminder_frequencies || profileData.event_reminder_frequencies.length === 0) &&
                    (!profileData.softdrink_trends_frequencies || profileData.softdrink_trends_frequencies.length === 0) && (
                     <p className="text-xs text-muted-foreground">
                       No scheduled alerts configured. Enable stock alerts, event reminders, or softdrink trends to set up schedules.
                     </p>
                   )}
                 </div>
               </div>


             </CardContent>
          </Card>
)}

        {/* Branch Settings */}
        {(profile.role === "manager" ||
          profile.role === "assistant_manager") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Branch Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {branch && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Branch Name</Label>
                    <div className="text-sm font-medium">{branch.name}</div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Branch Location</Label>
                    <div className="text-sm font-medium">{branch.address || "Not specified"}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Permissions Management - Only for Managers */}
        {profile.role === "manager" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Permissions Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Assistant Manager Stock In Access</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow Assistant Managers to access the Stock In page
                    </p>
                  </div>
                  <Switch
                    checked={assistantManagerStockInAccess}
                    onCheckedChange={setAssistantManagerStockInAccess}
                  />
                </div>
              </div>
              
              <Button onClick={updatePermissions} disabled={loading} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Permissions
              </Button>
            </CardContent>
          </Card>
        )}

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Account Created</Label>
              <Input
                value={new Date(profile.created_at || "").toLocaleDateString()}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Last Updated</Label>
              <Input
                value={new Date(profile.updated_at || "").toLocaleDateString()}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Access Count</Label>
              <Input value={profile.access_count?.toString() || "0"} disabled className="bg-muted" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phone Number Collection Dialog */}
      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Phone Number</DialogTitle>
            <DialogDescription>
              Please enter your phone number to enable WhatsApp notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="Enter your phone number (e.g., +1234567890)"
                value={tempPhone}
                onChange={(e) => setTempPhone(e.target.value)}
                maxLength={30}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowPhoneDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={savePhoneAndEnableWhatsApp}
                disabled={loading || !tempPhone.trim()}
                className="flex-1"
              >
                {loading ? "Saving..." : "Save & Enable"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Scheduling Modal */}
      <AlertSchedulingModal
        isOpen={showAlertSchedulingModal}
        onClose={() => setShowAlertSchedulingModal(false)}
        onSave={handleAlertScheduleSave}
        currentSchedule={buildAlertScheduleFromProfile(profileData)}
      />

      <EventReminderSchedulingModal
        isOpen={showEventReminderSchedulingModal}
        onClose={() => setShowEventReminderSchedulingModal(false)}
        onSave={handleEventReminderScheduleSave}
        currentSchedule={buildEventScheduleFromProfile(profileData)}
      />

      <AlertSchedulingModal
        isOpen={showSoftdrinkTrendsSchedulingModal}
        onClose={() => setShowSoftdrinkTrendsSchedulingModal(false)}
        onSave={handleSoftdrinkTrendsScheduleSave}
        currentSchedule={buildSoftdrinkTrendsScheduleFromProfile(profileData)}
        title="Softdrink Trends Alert Schedule"
        description="Choose how often you want to receive softdrink trend alerts."
        note="Note: You will receive alerts when softdrink trends are declining (stock-out exceeds stock-in)."
        frequencyDescriptions={{
          daily: "Get a daily summary of declining softdrink trends",
          weekly: "Get a weekly summary of softdrink trends on your chosen day",
          monthly: "Get a monthly summary of softdrink trends on your chosen date"
        }}
      />
    </div>
  );
};

export default Settings;
