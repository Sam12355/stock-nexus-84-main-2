import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { DateTimePicker } from "@/components/DateTimePicker";
import { Textarea } from "@/components/ui/textarea";
import Select2 from "react-select";
import { 
  Package, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Activity,
  Calendar as CalendarIcon,
  Cloud,
  Thermometer,
  Droplets,
  Wind,
  Settings,
  LogOut
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Extended types for new roles and branch_context
type ExtendedUserRole = 'regional_manager' | 'district_manager' | 'admin' | 'manager' | 'assistant_manager' | 'staff';

interface ExtendedProfile {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
  position: string | null;
  role: ExtendedUserRole;
  branch_id: string | null;
  branch_context?: string | null;
  region_id?: string | null;
  district_id?: string | null;
  last_access: string | null;
  access_count: number | null;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  criticalStockItems: number;
  totalStaff: number;
  recentActivities: ActivityLog[];
  lowStockDetails?: any[];
  criticalStockDetails?: any[];
}

interface ActivityLog {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user_id?: string;
  profiles?: {
    name: string;
  };
}

interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
  humidity: number;
  windSpeed: number;
}

const Index = () => {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  
  // Cast profile to extended type
  const extendedProfile = profile as ExtendedProfile | null;
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    lowStockItems: 0,
    criticalStockItems: 0,
    totalStaff: 0,
    recentActivities: [],
    lowStockDetails: [],
    criticalStockDetails: []
  });
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [showStockModal, setShowStockModal] = useState(false);
  const [modalStockType, setModalStockType] = useState<'low' | 'critical'>('low');
  const [showEventModal, setShowEventModal] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: '' as string,
    event_type: 'reorder'
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(new Date());
  const hasFetchedWeatherRef = useRef(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<any[]>([]);
  const [selectedBranchOption, setSelectedBranchOption] = useState<{value: string, label: string} | null>(null);
  const [selectedDistrictOption, setSelectedDistrictOption] = useState<{value: string, label: string} | null>(null);
  const [showBranchSelection, setShowBranchSelection] = useState(false);
  const [showDistrictSelection, setShowDistrictSelection] = useState(false);

  // Debug state changes
  useEffect(() => {
    console.log('showDistrictSelection state changed:', showDistrictSelection);
  }, [showDistrictSelection]);

  useEffect(() => {
    console.log('selectedDistrictOption state changed:', selectedDistrictOption);
  }, [selectedDistrictOption]);


  const fetchBranchesData = async () => {
    try {
      console.log('Fetching branches for role:', extendedProfile?.role, 'region_id:', extendedProfile?.region_id);
      
      if ((extendedProfile?.role as string) === 'regional_manager' || (extendedProfile?.role as string) === 'district_manager') {
        // Both regional and district managers can see all branches
        const branchesData = await apiClient.getBranches();
        
        console.log('Branches loaded:', branchesData);
        setBranches(branchesData || []);
      } else {
        console.log('No region_id found for user');
        setBranches([]);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast({
        title: "Failed to load branches",
        description: error?.message || "Unable to fetch branch list",
        variant: "destructive",
      });
    }
  };

  const fetchDistrictsData = async () => {
    try {
      console.log('Fetching districts for regional manager. Region ID:', extendedProfile?.region_id);
      
      if ((extendedProfile?.role as string) === 'regional_manager') {
        // For regional managers, fetch all districts (since they don't have region_id yet)
        const districtsData = await apiClient.getDistricts();
        
        console.log('Districts loaded:', districtsData);
        setDistricts(districtsData || []);
        
        // Also fetch branches for the regional manager
        await fetchBranchesData();
      }
    } catch (error) {
      console.error('Error fetching districts:', error);
      toast({
        title: "Failed to load districts",
        description: error?.message || "Unable to fetch district list",
        variant: "destructive",
      });
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Check if Regional Manager needs to select district first
      if ((extendedProfile?.role as string) === 'regional_manager' && !extendedProfile?.branch_context) {
        await fetchDistrictsData();
        setShowDistrictSelection(true);
        setLoading(false);
        return;
      }

      // Check if District Manager needs to select branch
      if ((extendedProfile?.role as string) === 'district_manager' && !extendedProfile?.branch_context) {
        await fetchBranchesData();
        setShowBranchSelection(true);
        setLoading(false);
        return;
      }

      // ... keep existing code (items and stock data)
      const { data: stockData, error: stockError } = await supabase
        .from('stock')
        .select(`
          *,
          items (
            name,
            category,
            threshold_level,
            branch_id,
            image_url
          )
        `);

      if (stockError) throw stockError;

      // Filter by branch context for regional/district managers, by branch_id for others
      let filteredStock = stockData || [];
      const userBranchContext = extendedProfile?.branch_context || extendedProfile?.branch_id;
      
      if ((extendedProfile?.role as string) !== 'regional_manager' && (extendedProfile?.role as string) !== 'district_manager' && userBranchContext) {
        filteredStock = stockData?.filter(item => item.items.branch_id === userBranchContext) || [];
      } else if (((extendedProfile?.role as string) === 'regional_manager' || (extendedProfile?.role as string) === 'district_manager') && extendedProfile?.branch_context) {
        filteredStock = stockData?.filter(item => item.items.branch_id === extendedProfile.branch_context) || [];
      }

      // Calculate stock statistics - critical items are NOT included in low stock
      const totalItems = filteredStock.length;
      const criticalStock = filteredStock.filter(item => 
        item.current_quantity <= item.items.threshold_level * 0.5
      );
      const lowStock = filteredStock.filter(item => 
        item.current_quantity <= item.items.threshold_level && 
        item.current_quantity > item.items.threshold_level * 0.5
      );

      // Fetch staff count
      let staffQuery = supabase.from('profiles').select('*', { count: 'exact' });
      if (((extendedProfile?.role as string) !== 'regional_manager' && (extendedProfile?.role as string) !== 'district_manager') && userBranchContext) {
        staffQuery = staffQuery.eq('branch_id', userBranchContext);
      } else if (((extendedProfile?.role as string) === 'regional_manager' || (extendedProfile?.role as string) === 'district_manager') && extendedProfile?.branch_context) {
        staffQuery = staffQuery.eq('branch_id', extendedProfile.branch_context);
      }
      
      const { count: staffCount, error: staffError } = await staffQuery;
      if (staffError) throw staffError;

      // Fetch recent activities
      let activityQuery = supabase
        .from('activity_logs')
        .select(`
          *,
          profiles (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (((extendedProfile?.role as string) !== 'regional_manager' && (extendedProfile?.role as string) !== 'district_manager') && userBranchContext) {
        activityQuery = activityQuery.eq('branch_id', userBranchContext);
      } else if (((extendedProfile?.role as string) === 'regional_manager' || (extendedProfile?.role as string) === 'district_manager') && extendedProfile?.branch_context) {
        activityQuery = activityQuery.eq('branch_id', extendedProfile.branch_context);
      }

      const { data: activities, error: activityError } = await activityQuery;
      if (activityError) throw activityError;

      // ... keep existing code (events fetch)
      // Fetch calendar events using custom API
      const eventsData = await apiClient.getCalendarEvents();
      if (eventsData && eventsData.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const upcomingEvents = eventsData
          .filter(event => event.event_date >= today)
          .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
          .slice(0, 5);
        
        setEvents(upcomingEvents);
      } else {
        setEvents([]);
      }

      setStats({
        totalItems,
        lowStockItems: lowStock.length,
        criticalStockItems: criticalStock.length,
        totalStaff: staffCount || 0,
        recentActivities: activities || [],
        lowStockDetails: lowStock,
        criticalStockDetails: criticalStock
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherData = async () => {
    try {
      setWeatherLoading(true);
      
      // Determine city from the selected/assigned branch location
      let city = '';
      const branchId = extendedProfile?.branch_context || extendedProfile?.branch_id || null;

      if (branchId) {
        // Get branch location using custom API
        const branches = await apiClient.getBranches();
        const branch = branches.find(b => b.id === branchId);
        city = branch?.location || '';
      }

      if (!city) {
        // Default to a common city if no branch location available
        city = 'Colombo';
      }
      
      // Use OpenWeather API directly
      const OPENWEATHER_API_KEY = 'cce3be258bc74ac704ddac710486be0c';
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );
      
      if (!response.ok) throw new Error('Weather API error');
      
      const data = await response.json();
      
      setWeather({
        temperature: Math.round(data.main.temp),
        condition: data.weather[0].description,
        location: city,
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6) // Convert m/s to km/h
      });
    } catch (error) {
      console.error('Error fetching weather:', error);
      // Set default weather data on error
      setWeather({
        temperature: 25,
        condition: 'Clear sky',
        location: 'Colombo',
        humidity: 70,
        windSpeed: 10
      });
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title) {
      toast({
        title: "Title is required",
        description: "Please enter a title for the event.",
        variant: "destructive",
      });
      return;
    }
    if (!newEvent.event_date) {
      toast({
        title: "Date is required",
        description: "Please pick a date and time.",
        variant: "destructive",
      });
      return;
    }

    // Determine branch ID based on user role
    let branchId: string | null = null;
    if ((extendedProfile?.role as string) === 'regional_manager' || (extendedProfile?.role as string) === 'district_manager') {
      if (!selectedBranchOption?.value && !extendedProfile?.branch_context) {
        toast({
          title: "Branch is required",
          description: "Please select a branch for this event.",
          variant: "destructive",
        });
        return;
      }
      branchId = selectedBranchOption?.value || extendedProfile?.branch_context || null;
    } else {
      // For managers, use their assigned branch
      if (!extendedProfile?.branch_id) {
        toast({
          title: "Profile missing branch",
          description: "Your profile needs to be assigned to a branch.",
          variant: "destructive",
        });
        return;
      }
      branchId = extendedProfile.branch_id;
    }

    try {
      const eventData = {
        title: newEvent.title.trim(),
        description: newEvent.description?.trim() || null,
        event_date: format(newEvent.event_date, 'yyyy-MM-dd'),
        event_type: newEvent.event_type,
        branch_id: branchId
      };

      const response = await apiClient.createCalendarEvent(eventData);

      if (response.success) {
        toast({ title: "Event added", description: "Your event has been created." });
        
        // Reset form
        setNewEvent({
          title: '',
          description: '',
          event_date: new Date(),
          event_type: 'general'
        });
        setShowEventModal(false);
        
        // Trigger slideshow refresh
        window.dispatchEvent(new CustomEvent('refreshSlideshow'));
        
        // Refresh events specifically
        const refreshEvents = async () => {
          try {
            const eventsData = await apiClient.getCalendarEvents();
            setEvents(eventsData || []);
          } catch (error) {
            console.error('Error refreshing events:', error);
          }
        };
        refreshEvents();
        
        // Refresh dashboard data
        fetchDashboardData();
      } else {
        throw new Error('Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDistrictSelection = async (selectedOption: {value: string, label: string} | null) => {
    console.log('handleDistrictSelection called with:', selectedOption);
    if (!selectedOption) return;
    try {
      let districtBranches: any[] = [];
      // Prefer client-side filter from already loaded region branches for snappy UX
      if (branches && branches.length > 0) {
        districtBranches = branches.filter(b => b.district_id === selectedOption.value);
        setFilteredBranches(districtBranches);
      } else {
        // Fallback: fetch from backend if branches not loaded yet
        const branchesData = await apiClient.getBranches(selectedOption.value);
        districtBranches = branchesData || [];
        setFilteredBranches(districtBranches);
        setBranches(prev => prev && prev.length ? prev : districtBranches);
      }


      setSelectedDistrictOption(selectedOption);
      console.log('District option set to:', selectedOption);
      
      // For regional managers, automatically select the first branch in the district
      if (districtBranches.length > 0) {
        const firstBranch = districtBranches[0];
        await handleBranchSelection({ value: firstBranch.id, label: firstBranch.name });
      } else {
        // Keep district selection visible to avoid modal flicker and enable branch selection below
        setShowBranchSelection(true);
      }
    } catch (error) {
      console.error('Error fetching branches for district:', error);
      toast({
        title: "Error",
        description: "Failed to load branches for selected district",
        variant: "destructive",
      });
    }
  };

  const handleBranchSelection = async (selectedOption: {value: string, label: string} | null) => {
    if (!selectedOption) return;
    
    try {
      await apiClient.updateBranchContext(selectedOption.value);

      // Selection completion is now handled by the backend

      toast({ 
        title: "Branch selected", 
        description: "Your branch context has been set. Loading dashboard..." 
      });

      // Refresh the profile data and dashboard
      window.location.reload();
    } catch (error: any) {
      console.error('Error setting branch context:', error);
      toast({
        title: "Failed to set branch",
        description: error?.message || 'An unexpected error occurred',
        variant: "destructive",
      });
    }
  };

  // Handle role-based dialogs when profile is loaded
  useEffect(() => {
    if (extendedProfile) {
      console.log('Profile loaded:', extendedProfile);
      
      if ((extendedProfile.role as string) === 'regional_manager') {
        // Regional managers: Show district selection on login only if not completed yet
        console.log('Regional manager detected, has_completed_selection:', extendedProfile.has_completed_selection);
        if (!extendedProfile.has_completed_selection) {
          console.log('Showing district selection popup');
          setShowDistrictSelection(true);
          fetchDistrictsData();
        } else {
          console.log('Skipping district selection popup - already completed');
        }
      } else if ((extendedProfile.role as string) === 'district_manager') {
        // District managers: show branch selection popup  
        if (!extendedProfile.branch_context) {
          setShowBranchSelection(true);
          fetchBranchesData();
        }
      }
    }
  }, [extendedProfile]);

  // Add function to manually show district selection
  const showDistrictSelectionModal = async () => {
    console.log('Manually showing district selection modal');
    try {
      // Reset completion state in database
      await apiClient.resetSelection();
      // Refresh profile to get updated state
      const updatedProfile = await apiClient.getProfile();
      setExtendedProfile(updatedProfile);
      setShowDistrictSelection(true);
      fetchDistrictsData();
    } catch (error) {
      console.error('Error resetting selection:', error);
      // Fallback: just show the modal
      setShowDistrictSelection(true);
      fetchDistrictsData();
    }
  };

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
      if (!hasFetchedWeatherRef.current) {
        hasFetchedWeatherRef.current = true;
        fetchWeatherData();
      }
    }
  }, [profile]);

  useEffect(() => {
    if (showEventModal && branches.length === 0) {
      fetchBranchesData();
    }
  }, [showEventModal]);

  console.log('Index component render - showEventModal:', showEventModal, 'profile role:', profile?.role);

  if (!profile) {
    return <div className="flex justify-center items-center h-64">Please log in to access the dashboard.</div>;
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading dashboard...</div>;
  }

  // Admin Dashboard - Limited view with only greeting and weather
  if (extendedProfile?.role === 'admin') {
    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome, {extendedProfile?.name || 'Administrator'}! You have administrative access to manage staff.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            Today: {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* Weather Widget */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Weather</CardTitle>
              <Cloud className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {weatherLoading ? (
                <div className="space-y-2">
                  <div className="h-8 bg-muted animate-pulse rounded" />
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                </div>
              ) : weather ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-5 w-5 text-orange-500" />
                    <span className="text-2xl font-bold">{Math.round(weather.temperature)}°C</span>
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">{weather.condition}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Droplets className="h-3 w-3" />
                      <span>{weather.humidity}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Wind className="h-3 w-3" />
                      <span>{weather.windSpeed}km/h</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{weather.location}</p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Weather data unavailable</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Full-screen glassmorphism overlay for branch/district selection */}
      {(showBranchSelection || showDistrictSelection) && (
        <div 
          className="fixed inset-0 z-40" 
          style={{ 
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }} 
        />
      )}
      
      <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {extendedProfile?.name || 'User'}! Here's what's happening with your inventory.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {(extendedProfile?.role as string) === 'regional_manager' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={showDistrictSelectionModal}
              className="text-xs"
            >
              Select District & Branch
            </Button>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            Today: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">Items in inventory</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setModalStockType('low');
            setShowStockModal(true);
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setModalStockType('critical');
            setShowStockModal(true);
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalStockItems}</div>
            <p className="text-xs text-muted-foreground">Urgent attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStaff}</div>
            <p className="text-xs text-muted-foreground">Active users</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Calendar & Events */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Calendar & Events</CardTitle>
              <CardDescription>Upcoming events and reminders</CardDescription>
            </div>
            {((extendedProfile?.role as string) === 'regional_manager' || (extendedProfile?.role as string) === 'district_manager' || (extendedProfile?.role as string) === 'manager' || (extendedProfile?.role as string) === 'assistant_manager') && (
              <Button onClick={() => {
                console.log('Add Event button clicked, current showEventModal:', showEventModal);
                setShowEventModal(true);
                console.log('setShowEventModal(true) called');
              }}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Calendar */}
              <div className="flex flex-col items-center">
                <Calendar
                  mode="single"
                  selected={selectedCalendarDate}
                  onSelect={setSelectedCalendarDate}
                  className="rounded-md border pointer-events-auto"
                />
              </div>
              
              {/* Events List - Show for management roles only */}
              {['regional_manager', 'district_manager', 'manager', 'assistant_manager'].includes(extendedProfile?.role!) && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Upcoming Events</h4>
                  {events.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {events.map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <div>
                              <p className="font-medium">{event.title}</p>
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {new Date(event.event_date).toLocaleDateString()}
                            </p>
                            <Badge variant="outline">{event.event_type}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No upcoming events
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Weather */}
        <div className="space-y-6">
          {/* Weather Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                {weather?.location ? `Weather in ${weather.location}` : 'Weather'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weatherLoading ? (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">Loading weather...</div>
                </div>
              ) : weather ? (
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{weather.temperature}°C</div>
                    <p className="text-sm text-muted-foreground capitalize">{weather.condition}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">{weather.humidity}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{weather.windSpeed} km/h</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Good conditions for deliveries
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">Weather unavailable</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {extendedProfile?.role === 'staff' ? (
                <div className="space-y-2">
                  <Link to="/stock">
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Manage Stock
                    </Button>
                  </Link>
                  <Link to="/settings">
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start" onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link to="/items">
                    <Button variant="outline" className="w-full justify-start">
                      <Package className="h-4 w-4 mr-2" />
                      Manage Items
                    </Button>
                  </Link>
                  <Link to="/stock">
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Stock Movement
                    </Button>
                  </Link>
                  <Link to="/staff">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Staff
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stock Details Modal */}
      <Dialog open={showStockModal} onOpenChange={setShowStockModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modalStockType === 'low' ? 'Low Stock Items' : 'Critical Stock Items'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {(modalStockType === 'low' ? stats.lowStockDetails : stats.criticalStockDetails)?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {item.items.image_url ? (
                    <img 
                      src={item.items.image_url} 
                      alt={item.items.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{item.items.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{item.items.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">Current: {item.current_quantity}</p>
                  <p className="text-sm text-muted-foreground">Threshold: {item.items.threshold_level}</p>
                </div>
              </div>
            )) || []}
          </div>
        </DialogContent>
      </Dialog>

      {/* Combined District and Branch Selection Modal for Regional Managers */}
      <Dialog open={showDistrictSelection || showBranchSelection} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <DialogHeader>
            <DialogTitle>
              {showDistrictSelection ? 'Select District & Branch' : 'Select Your Branch'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {showDistrictSelection 
                ? 'Please select which district and branch you\'d like to manage.' 
                : 'Please select which branch you\'d like to manage. This will be your working context.'
              }
            </p>
          </DialogHeader>
          <div className="max-h-[calc(90vh-180px)] space-y-6">
            {/* District Selection for Regional Managers */}
            {showDistrictSelection && (
              <div>
                <Label>Available Districts</Label>
                {districts.length === 0 ? (
                  <div className="flex justify-center items-center h-20 text-muted-foreground">
                    Loading districts...
                  </div>
                ) : (
                  <div className="mt-2 relative z-10">
                    <Select2
                      options={districts.map(district => ({
                        value: district.id,
                        label: district.name
                      }))}
                      value={selectedDistrictOption}
                      onChange={(selectedDistrict) => {
                        console.log('District selected:', selectedDistrict);
                        // Use centralized handler to fetch branches from backend and toggle views
                        handleDistrictSelection(selectedDistrict as any);
                      }}
                      onInputChange={(inputValue) => {
                        console.log('Input changed:', inputValue);
                      }}
                      onKeyDown={(e) => {
                        console.log('Key down:', e.key);
                      }}
                      onMenuOpen={() => console.log('Menu opened')}
                      onMenuClose={() => console.log('Menu closed')}
                      onMouseDown={(e) => console.log('Mouse down on select:', e)}
                      onMouseUp={(e) => console.log('Mouse up on select:', e)}
                      placeholder="Select a district..."
                      isClearable={false}
                      isSearchable={true}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      isDisabled={false}
                      closeMenuOnSelect={true}
                      backspaceRemovesValue={false}
                      tabSelectsValue={false}
                      styles={{
                        control: (provided) => ({
                          ...provided,
                          backgroundColor: 'hsl(var(--background))',
                          borderColor: 'hsl(var(--border))',
                          color: 'hsl(var(--foreground))',
                          minHeight: '44px',
                          fontSize: '14px'
                        }),
                        menu: (provided) => ({
                          ...provided,
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                          zIndex: 9999
                        }),
                        option: (provided, state) => ({
                          ...provided,
                          backgroundColor: state.isSelected 
                            ? 'hsl(var(--accent))' 
                            : state.isFocused 
                            ? 'hsl(var(--accent) / 0.5)' 
                            : 'transparent',
                          color: 'hsl(var(--popover-foreground))',
                          padding: '12px 16px',
                          cursor: 'pointer',
                          pointerEvents: 'auto',
                          userSelect: 'none'
                        }),
                        singleValue: (provided) => ({
                          ...provided,
                          color: 'hsl(var(--foreground))'
                        }),
                        placeholder: (provided) => ({
                          ...provided,
                          color: 'hsl(var(--muted-foreground))'
                        }),
                        input: (provided) => ({
                          ...provided,
                          color: 'hsl(var(--foreground))'
                        })
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Branch Selection */}
            <div>
              <Label>Available Branches</Label>
              {(filteredBranches.length === 0 && branches.length === 0) ? (
                <div className="flex justify-center items-center h-20 text-muted-foreground">
                  Loading branches...
                </div>
              ) : (
                <div className="mt-2">
                  { (showDistrictSelection && !selectedDistrictOption) ? (
                    <div className="text-sm text-muted-foreground">Select a district to see branches</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(filteredBranches.length > 0 ? filteredBranches : branches).map((branch: any) => (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => handleBranchSelection({
                            value: branch.id,
                            label: `${branch.name}${branch.location ? ` - ${branch.location}` : ''}`
                          })}
                          className="w-full rounded-lg border bg-card text-card-foreground hover:bg-accent transition-colors p-3 text-left"
                        >
                          <div className="font-medium">{branch.name}</div>
                          {branch.location && (
                            <div className="text-xs text-muted-foreground mt-0.5">{branch.location}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Event Modal */}
      <Dialog open={showEventModal} onOpenChange={(open) => {
        console.log('Dialog onOpenChange called with:', open);
        setShowEventModal(open);
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {((extendedProfile?.role as string) === 'regional_manager' || (extendedProfile?.role as string) === 'district_manager') && !extendedProfile?.branch_context && (
              <div>
                <Label htmlFor="event-branch">Branch *</Label>
                <Select2
                  options={branches.map(branch => ({
                    value: branch.id,
                    label: `${branch.name}${branch.location ? ` - ${branch.location}` : ''}`
                  }))}
                  onChange={setSelectedBranchOption}
                  value={selectedBranchOption}
                  placeholder="Select a branch..."
                  isClearable={false}
                  isSearchable={true}
                  className="react-select-container mt-1"
                  classNamePrefix="react-select"
                  styles={{
                    control: (provided) => ({
                      ...provided,
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                      minHeight: '40px',
                      fontSize: '14px'
                    }),
                    menu: (provided) => ({
                      ...provided,
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      zIndex: 9999
                    }),
                    option: (provided, state) => ({
                      ...provided,
                      backgroundColor: state.isSelected 
                        ? 'hsl(var(--accent))' 
                        : state.isFocused 
                        ? 'hsl(var(--accent) / 0.5)' 
                        : 'transparent',
                      color: 'hsl(var(--popover-foreground))',
                      padding: '8px 12px'
                    }),
                    singleValue: (provided) => ({
                      ...provided,
                      color: 'hsl(var(--foreground))'
                    }),
                    placeholder: (provided) => ({
                      ...provided,
                      color: 'hsl(var(--muted-foreground))'
                    }),
                    input: (provided) => ({
                      ...provided,
                      color: 'hsl(var(--foreground))'
                    })
                  }}
                />
              </div>
            )}
            <div>
              <Label htmlFor="event-title">Title *</Label>
              <Input
                id="event-title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Event title"
              />
            </div>
            <div>
              <Label htmlFor="event-description">Description</Label>
              <Input
                id="event-description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Event description"
              />
            </div>
            <div>
              <Label htmlFor="event-date">Date *</Label>
              <DateTimePicker
                value={newEvent.event_date ? new Date(newEvent.event_date) : undefined}
                onChange={(date) => setNewEvent({ ...newEvent, event_date: date ? date.toISOString() : '' })}
                placeholder="Pick a date"
                showTime={false}
              />
            </div>
            <div>
              <Label htmlFor="event-type">Type</Label>
              <Select onValueChange={(value) => setNewEvent({ ...newEvent, event_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reorder">Reorder</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                  <SelectItem value="expiry">Expiry</SelectItem>
                  <SelectItem value="usage_spike">Usage Spike</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEventModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEvent}>
                Add Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
};

export default Index;