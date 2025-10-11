import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  photo_url?: string;
  position?: string;
  role: 'admin' | 'manager' | 'assistant_manager' | 'staff';
  branch_id?: string;
  branch_context?: string;
  branch_name?: string;
  district_name?: string;
  region_name?: string;
  access_count: number;
  created_at: string;
  notification_settings?: any;
  stock_alert_frequencies?: string[];
  daily_schedule_time?: string;
  weekly_schedule_day?: number;
  weekly_schedule_time?: string;
  monthly_schedule_date?: number;
  monthly_schedule_time?: string;
  event_reminder_frequencies?: string[];
  event_daily_schedule_time?: string;
  event_weekly_schedule_day?: number;
  event_weekly_schedule_time?: string;
  event_monthly_schedule_date?: number;
  event_monthly_schedule_time?: string;
  softdrink_trends_frequencies?: string[];
  softdrink_trends_daily_schedule_time?: string;
  softdrink_trends_weekly_schedule_day?: number;
  softdrink_trends_weekly_schedule_time?: string;
  softdrink_trends_monthly_schedule_date?: number;
  softdrink_trends_monthly_schedule_time?: string;
}

interface AuthContextType {
  user: Profile | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  fetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetchedProfile = useRef(false);
  const { toast } = useToast();

  const fetchProfile = async () => {
    if (hasFetchedProfile.current) {
      return; // Prevent multiple fetches
    }
    
    hasFetchedProfile.current = true;
    try {
      console.log('🔍 Fetching profile...');
      const profileData = await apiClient.getProfile();
      console.log('✅ Profile fetched successfully:', profileData.email);
      setUser(profileData);
      setProfile(profileData);
    } catch (error: any) {
      console.error('❌ Error fetching profile:', error);
      console.error('❌ Error details:', error.message, error.status);
      
      // Only logout if it's a real authentication error, not a temporary server error
      if (error.status === 401 || error.message?.includes('token') || error.message?.includes('unauthorized')) {
        console.log('🔓 Authentication error detected, logging out');
        setUser(null);
        setProfile(null);
        apiClient.setToken(null);
      } else {
        console.log('⚠️ Non-auth error, keeping user logged in');
        // Don't logout for server errors, just show error
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { user: userData } = await apiClient.login(email, password);
      setUser(userData);
      setProfile(userData);
      
      toast({
        title: "Welcome back!",
        description: "Successfully signed in to your account",
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { user: newUser } = await apiClient.register({
        email,
        password,
        name,
        role: 'staff', // Default role
      });
      setUser(newUser);
      setProfile(newUser);
      
      toast({
        title: "Account created!",
        description: "Welcome to the Inventory Management System",
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Call logout API to log the activity
      await apiClient.logout();
      
      setUser(null);
      setProfile(null);
      hasFetchedProfile.current = false; // Reset the flag
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out",
      });
    } catch (error: any) {
      console.error('Error signing out:', error);
      // Even if API call fails, still clear local state
      apiClient.setToken(null);
      setUser(null);
      setProfile(null);
      hasFetchedProfile.current = false;
      
      toast({
        title: "Signed out",
        description: "You have been signed out (offline)",
      });
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      // Make API call to update the profile in the database
      const updatedProfile = await apiClient.updateProfile(updates);
      
      // Update local state with the response from the API
      setProfile(updatedProfile);
      setUser(updatedProfile);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    fetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}