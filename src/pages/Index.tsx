import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef, useCallback } from "react";
// Supabase integration disabled - using API client instead
import { apiClient } from "@/lib/api";
import { notificationEvents } from "@/lib/notificationEvents";
import { ICADeliveryModal } from "@/components/ICADeliveryModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  LogOut,
  Plus,
  Trash2,
  FileText,
  Sun,
  Zap,
  BarChart3,
  History,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Extended types for new roles and branch_context
type ExtendedUserRole = 'admin' | 'manager' | 'assistant_manager' | 'staff';

interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
  humidity: number;
  windSpeed: number;
}

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
  branch_name?: string | null;
  district_name?: string | null;
  region_name?: string | null;
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
  thresholdStockItems: number;
  totalStaff: number;
  recentActivities: ActivityLog[];
  lowStockDetails?: any[];
  criticalStockDetails?: any[];
  thresholdStockDetails?: any[];
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


const Index = () => {
  const { profile, signOut } = useAuth();
  
  // Function to get weather condition photo based on temperature and conditions
  const getWeatherPhoto = (condition: string, temperature: number) => {
    const conditionLower = condition.toLowerCase();
    
    // Cold weather photos (below 5°C) - Winter scenes
    if (temperature < 5) {
      if (conditionLower.includes('snow') || conditionLower.includes('blizzard')) {
        return 'https://images.unsplash.com/photo-1551524164-6cf2ac531d54?w=400&h=300&fit=crop&crop=center'; // Snowy street
      } else if (conditionLower.includes('fog') || conditionLower.includes('mist')) {
        return 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400&h=300&fit=crop&crop=center'; // Foggy winter street
      } else {
        return 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'; // Cold winter street
      }
    }
    
    // Cool weather photos (5-15°C) - Autumn/Spring scenes
    if (temperature >= 5 && temperature < 15) {
      if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
        return 'https://images.unsplash.com/photo-1433863448220-78aaa064ff47?w=400&h=300&fit=crop&crop=center'; // Rainy street
      } else if (conditionLower.includes('cloud') || conditionLower.includes('overcast')) {
        return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center'; // Cloudy street
      } else {
        return 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop&crop=center'; // Cool street scene
      }
    }
    
    // Mild weather photos (15-25°C) - Pleasant scenes
    if (temperature >= 15 && temperature < 25) {
      if (conditionLower.includes('clear') || conditionLower.includes('sunny')) {
        return 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop&crop=center'; // Sunny street
      } else if (conditionLower.includes('cloud') || conditionLower.includes('overcast')) {
        return 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=300&fit=crop&crop=center'; // Partly cloudy street
      } else {
        return 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop&crop=center'; // Pleasant street scene
      }
    }
    
    // Warm weather photos (25°C+) - Summer scenes
    if (temperature >= 25) {
      if (conditionLower.includes('clear') || conditionLower.includes('sunny')) {
        return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center'; // Hot sunny street
      } else if (conditionLower.includes('storm') || conditionLower.includes('thunder')) {
        return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center'; // Stormy street
      } else {
        return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center'; // Warm street scene
      }
    }
    
    // Default fallback
    return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center';
  };
  const { toast } = useToast();
  
  // Cast profile to extended type
  const extendedProfile = profile as ExtendedProfile | null;
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    lowStockItems: 0,
    criticalStockItems: 0,
    thresholdStockItems: 0,
    totalStaff: 0,
    recentActivities: [],
    lowStockDetails: [],
    criticalStockDetails: [],
    thresholdStockDetails: []
  });
  const [loading, setLoading] = useState(true);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [showStockModal, setShowStockModal] = useState(false);
  const [modalStockType, setModalStockType] = useState<'threshold' | 'low' | 'critical'>('threshold');
  const [showEventModal, setShowEventModal] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: '' as string,
    event_type: 'reorder'
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(new Date());
  const [branches, setBranches] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<any[]>([]);
  const [selectedBranchOption, setSelectedBranchOption] = useState<{value: string, label: string} | null>(null);
  const [selectedDistrictOption, setSelectedDistrictOption] = useState<{value: string, label: string} | null>(null);
  const [showBranchSelection, setShowBranchSelection] = useState(false);
  const [showDistrictSelection, setShowDistrictSelection] = useState(false);
  
  // Moveout list state
  const [showMoveoutModal, setShowMoveoutModal] = useState(false);
  const [showICADeliveryModal, setShowICADeliveryModal] = useState(false);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [moveoutList, setMoveoutList] = useState<any[]>([]);
  const [moveoutListItems, setMoveoutListItems] = useState<{
    itemId: string;
    itemName: string;
    currentQuantity: number;
    requestingQuantity: number;
  }[]>([]);
  const [moveoutListsLoading, setMoveoutListsLoading] = useState(false);
  const [processingItem, setProcessingItem] = useState<string | null>(null); // Track which item is being processed
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmItem, setConfirmItem] = useState<{listId: string, item: any} | null>(null);
  const [showGenerateConfirmModal, setShowGenerateConfirmModal] = useState(false);
  
  // History functionality state
  const [showHistory, setShowHistory] = useState(false);
  const [completedLists, setCompletedLists] = useState<any[]>([]);
  const [historyLoadedCount, setHistoryLoadedCount] = useState(0);
  
  // Completion summary expansion state
  const [expandedSummaries, setExpandedSummaries] = useState<{[key: string]: boolean}>({});

  // Debug state changes
  useEffect(() => {
    console.log('showDistrictSelection state changed:', showDistrictSelection);
  }, [showDistrictSelection]);

  const fetchAvailableItems = useCallback(async () => {
    try {
      const stockData = await apiClient.getStockData();
      console.log('Stock data received:', stockData); // Debug log
      if (stockData && Array.isArray(stockData)) {
        // Map the data to the expected format
        const mappedData = stockData.map(item => ({
          id: item.item_id, // Use item_id (actual item ID) instead of stock ID
          name: item.items?.name || item.name, // Handle both nested and flat structure
          current_quantity: item.current_quantity,
          category: item.items?.category || item.category,
          threshold_level: item.items?.threshold_level || item.threshold_level,
          low_level: item.items?.low_level || item.low_level,
          critical_level: item.items?.critical_level || item.critical_level,
          image_url: item.items?.image_url || item.image_url
        }));
        console.log('Mapped data:', mappedData); // Debug log
        setAvailableItems(mappedData);
      }
    } catch (error) {
      console.error('Error fetching available items:', error);
      toast({
        title: "Error",
        description: "Failed to load available items",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchMoveoutLists = useCallback(async () => {
    try {
      setMoveoutListsLoading(true);
      console.log('Fetching moveout lists for user:', extendedProfile?.id);
      console.log('Profile details:', extendedProfile);
      console.log('Auth token:', localStorage.getItem('auth_token'));
      
      const lists = await apiClient.getMoveoutLists();
      console.log('Moveout lists received:', lists); // Debug log
      console.log('Lists type:', typeof lists, 'Array?', Array.isArray(lists));
      console.log('Lists count:', Array.isArray(lists) ? lists.length : 'Not an array');
      
      setMoveoutList(lists || []);
    } catch (error) {
      console.error('Error fetching moveout lists:', error);
      console.error('Error details:', error);
      
      toast({
        title: "Error",
        description: "Failed to load moveout lists",
        variant: "destructive",
      });
      
      // Try to load from localStorage as fallback
      try {
        const savedLists = localStorage.getItem('moveoutLists');
        if (savedLists) {
          const parsedLists = JSON.parse(savedLists);
          setMoveoutList(parsedLists);
        }
      } catch (localError) {
        console.error('Error loading from localStorage:', localError);
      }
    } finally {
      setMoveoutListsLoading(false);
    }
  }, [toast, extendedProfile]);

  // Load moveout lists on component mount
  useEffect(() => {
    fetchMoveoutLists();
  }, [fetchMoveoutLists]);

  // Load available items when modal opens
  useEffect(() => {
    if (showMoveoutModal) {
      fetchAvailableItems();
    }
  }, [showMoveoutModal, fetchAvailableItems]);

  const handleAddToList = () => {
    console.log('Selected items:', selectedItems); // Debug log
    const newItems = selectedItems.map(item => {
      console.log('Mapping item:', item); // Debug log
      return {
        itemId: item.id, // Now using the correct item ID from mapped data
        itemName: item.name,
        currentQuantity: item.current_quantity,
        requestingQuantity: 1
      };
    });
    
    console.log('New items to add:', newItems); // Debug log
    setMoveoutListItems(prev => [...prev, ...newItems]);
    setSelectedItems([]);
    
    toast({
      title: "Items Added",
      description: `${newItems.length} items added to moveout list`,
    });
  };

  const handleGenerateMoveoutList = async () => {
    if (moveoutListItems.length === 0) return;
    
    // Validate requesting quantities
    console.log('Validating moveout list items:', moveoutListItems);
    const invalidItems = moveoutListItems.filter(item => {
      const isInvalid = item.requestingQuantity > item.currentQuantity;
      console.log(`Item ${item.itemName}: requesting=${item.requestingQuantity}, current=${item.currentQuantity}, invalid=${isInvalid}`);
      return isInvalid;
    });
    
    console.log('Invalid items found:', invalidItems);
    
    if (invalidItems.length > 0) {
      toast({
        title: "Invalid Quantities",
        description: `Requesting quantity cannot exceed current quantity for: ${invalidItems.map(item => item.itemName).join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    // Show confirmation modal
    setShowGenerateConfirmModal(true);
  };

  const handleConfirmGenerateMoveoutList = async () => {
    try {
      // Transform items to match backend validation
      const transformedItems = moveoutListItems.map(item => ({
        item_id: item.itemId,
        item_name: item.itemName,
        available_amount: item.currentQuantity,
        request_amount: item.requestingQuantity,
        category: 'General' // Default category since it's required
      }));

      // Save to database
      const newMoveoutList = await apiClient.createMoveoutList({
        title: `Moveout List - ${new Date().toLocaleDateString()}`,
        description: `Generated by ${extendedProfile?.name || 'Unknown'}`,
        items: transformedItems
      });
      
      console.log('Created moveout list:', newMoveoutList);
      
      // Refresh the moveout lists from database
      await fetchMoveoutLists();
      
      setMoveoutListItems([]);
      setShowMoveoutModal(false);
      setShowGenerateConfirmModal(false);
      
      // Hide history view and show only active lists
      setShowHistory(false);
      
      toast({
        title: "Moveout List Generated",
        description: `Successfully generated moveout list with ${moveoutListItems.length} items`,
      });
      
    } catch (error) {
      console.error('Error creating moveout list:', error);
      toast({
        title: "Error",
        description: "Failed to create moveout list",
        variant: "destructive",
      });
    }
  };

  const handleMoveoutItemDone = async (listId: string, item: any) => {
    const itemKey = `${listId}-${item.item_id}`;
    setProcessingItem(itemKey);
    
    try {
      // Call API to process the moveout item with user name
      const result = await apiClient.processMoveoutItem(listId, item.item_id, item.request_amount, extendedProfile?.name || 'Unknown');
      
      // Refresh the moveout lists from database to get updated completion status
      const updatedLists = await apiClient.getMoveoutLists();
      await fetchMoveoutLists();
      
      // Check if the current list is now completed and show history if it is
      const completedList = updatedLists?.find((list: any) => list.id === listId && list.status === 'completed');
      if (completedList) {
        // If the list is now completed, show history view to display it
        setShowHistory(true);
      }
      
      // Trigger notification refresh since stock alerts might have been generated
      notificationEvents.triggerNotificationUpdate();
      
      toast({
        title: "Item Processed",
        description: `${item.item_name || item.itemName || 'Item'} has been deducted from stock`,
      });
      
    } catch (error) {
      console.error('Error processing moveout item:', error);
      toast({
        title: "Error",
        description: "Failed to process moveout item",
        variant: "destructive",
      });
    } finally {
      setProcessingItem(null);
    }
  };

  const handleMoveoutItemDoneWithConfirmation = (listId: string, item: any) => {
    // Set the item to confirm and show modal
    setConfirmItem({ listId, item });
    setShowConfirmModal(true);
  };

  const handleConfirmMoveout = () => {
    if (confirmItem) {
      handleMoveoutItemDone(confirmItem.listId, confirmItem.item);
      setShowConfirmModal(false);
      setConfirmItem(null);
    }
  };

  const handleCancelMoveout = () => {
    setShowConfirmModal(false);
    setConfirmItem(null);
  };

  const handleLoadHistory = async () => {
    try {
      setMoveoutListsLoading(true);
      const allLists = await apiClient.getMoveoutLists();
      const completed = allLists?.filter(list => list.status === 'completed') || [];
      
      // Load 5 more completed lists
      const startIndex = historyLoadedCount;
      const endIndex = startIndex + 5;
      const newCompletedLists = completed.slice(startIndex, endIndex);
      
      setCompletedLists(prev => [...prev, ...newCompletedLists]);
      setHistoryLoadedCount(endIndex);
      setShowHistory(true);
      
      toast({
        title: "History Loaded",
        description: `Loaded ${newCompletedLists.length} completed lists`,
      });
    } catch (error) {
      console.error('Error loading history:', error);
      toast({
        title: "Error",
        description: "Failed to load history",
        variant: "destructive",
      });
    } finally {
      setMoveoutListsLoading(false);
    }
  };

  const handleToggleHistory = () => {
    if (!showHistory) {
      handleLoadHistory();
    } else {
      setShowHistory(false);
      setCompletedLists([]);
      setHistoryLoadedCount(0);
    }
  };

  useEffect(() => {
    console.log('selectedDistrictOption state changed:', selectedDistrictOption);
  }, [selectedDistrictOption]);


  const fetchBranchesData = async () => {
    try {
      console.log('Fetching branches for role:', extendedProfile?.role);
      
      const branchesData = await apiClient.getBranches();
      console.log('Branches loaded:', branchesData);
      setBranches(branchesData || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast({
        title: "Failed to load branches",
        description: error?.message || "Unable to fetch branch list",
        variant: "destructive",
      });
    }
  };


  const fetchDashboardData = async () => {
    try {
      // Fetch stock data using API client
      const stockData = await apiClient.getStockData();

      // Filter by branch for non-admin users
      let filteredStock = stockData || [];
      const userBranchId = extendedProfile?.branch_id;
      
      if (userBranchId) {
        filteredStock = stockData?.filter(item => item.items.branch_id === userBranchId) || [];
      }

      // Calculate stock statistics - match Stock.tsx logic
      const totalItems = filteredStock.length;
      const criticalStock = filteredStock.filter(item => 
        item.current_quantity <= item.items.threshold_level * 0.5
      );
      const lowStock = filteredStock.filter(item => 
        item.current_quantity > item.items.threshold_level * 0.5 && 
        item.current_quantity <= item.items.threshold_level
      );
      const thresholdStock = filteredStock.filter(item => 
        item.current_quantity <= item.items.threshold_level && 
        item.current_quantity > item.items.threshold_level * 0.5
      );

      // Fetch staff count using API client
      const staffData = await apiClient.getStaff();
      const staffCount = staffData?.length || 0;

      // Fetch recent activities using API client
      const activitiesResponse = await apiClient.getActivityLogs();
      const activities = activitiesResponse.data || [];

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
        thresholdStockItems: thresholdStock.length,
        totalStaff: staffCount || 0,
        recentActivities: activities || [],
        lowStockDetails: lowStock,
        criticalStockDetails: criticalStock,
        thresholdStockDetails: thresholdStock
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
      
      // Determine city from the user's branch location
      let city = '';
      const branchId = extendedProfile?.branch_id || extendedProfile?.branch_context;
      
      console.log('🌤️ Fetching weather for branch:', branchId);
      
      if (branchId) {
        // Get branch location using custom API
        const branches = await apiClient.getBranches();
        const branch = branches.find(b => b.id === branchId);
        console.log('🏢 Found branch:', branch);
        
        if (branch?.address) {
          // Extract city from address - prioritize Swedish city names
          const addressParts = branch.address.split(',');
          console.log('📍 Address parts:', addressParts);
          
          // Look for Swedish city names (Växjö, Stockholm, Gothenburg, etc.)
          let city = '';
          for (const part of addressParts) {
            const trimmed = part.trim();
            console.log('📍 Checking part:', trimmed);
            if (trimmed.includes('Växjö') || trimmed.includes('Stockholm') || trimmed.includes('Gothenburg') || trimmed.includes('Malmö')) {
              city = trimmed.replace(/[.,]/g, '').trim(); // Remove punctuation
              console.log('📍 Found Swedish city:', city);
              break;
            }
          }
          
          // If no Swedish city found, use the second-to-last part (usually the city)
          if (!city && addressParts.length > 1) {
            city = addressParts[addressParts.length - 2].trim().replace(/[.,]/g, '');
            console.log('📍 Using second-to-last part:', city);
          }
          // Fallback to first part if still no city
          if (!city) {
            city = addressParts[0].trim().replace(/[.,]/g, '');
            console.log('📍 Using first part as fallback:', city);
          }
          
          console.log('📍 Using branch address:', branch.address, '-> extracted city:', city);
        } else {
          console.log('⚠️ Branch address is empty, using branch name as fallback');
          city = branch?.name || '';
        }
      }

      if (!city) {
        console.log('⚠️ No branch location available, defaulting to Vaxjo');
        city = 'Vaxjo';
      }
      
      console.log('🌤️ Dashboard: Starting weather fetch for city:', city);
      console.log('🌤️ Dashboard: Current weather state:', weather);
      
      // Use backend weather API
      const weatherData = await apiClient.getWeather(city);
      console.log('🌤️ Dashboard: Received weather data:', weatherData);
      console.log('🌤️ Dashboard: Setting temperature to:', weatherData.temperature);
      
      const newWeatherState = {
        temperature: weatherData.temperature,
        condition: weatherData.condition,
        location: weatherData.location,
        humidity: weatherData.humidity,
        windSpeed: weatherData.windSpeed
      };
      
      console.log('🌤️ Dashboard: New weather state:', newWeatherState);
      setWeather(newWeatherState);
      
      console.log('✅ Dashboard: Weather data set for:', city);
    } catch (error) {
      console.error('Error fetching weather:', error);
      // Set default weather data on error
      setWeather({
        temperature: 15,
        condition: 'Clear sky',
        location: 'Vaxjo',
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
    if (extendedProfile?.role === 'admin') {
      branchId = selectedBranchOption?.value || null;
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

    setIsAddingEvent(true);
    try {
      const eventData = {
        title: newEvent.title.trim(),
        description: newEvent.description?.trim() || null,
        event_date: typeof newEvent.event_date === 'string' ? newEvent.event_date : format(newEvent.event_date, 'yyyy-MM-dd'),
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
          event_date: '',
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
    } finally {
      setIsAddingEvent(false);
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
      
      // For regional managers, show branch selection popup after district selection
      if (districtBranches.length > 0) {
        // Close district selection and show branch selection
        setShowDistrictSelection(false);
        setShowBranchSelection(true);
      } else {
        // No branches available, show branch selection anyway
        setShowDistrictSelection(false);
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

  // Handle profile loading
  useEffect(() => {
    if (extendedProfile) {
      console.log('=== Profile loaded ===');
      console.log('Role:', extendedProfile.role);
      console.log('Branch ID:', extendedProfile.branch_id);
      
      // Load dashboard data for all users
      fetchDashboardData();
    }
  }, [extendedProfile]);


  useEffect(() => {
    if (profile) {
      fetchDashboardData();
      fetchWeatherData();
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

  // Admin Dashboard - Enhanced view with calendar and moveout lists
  if (extendedProfile?.role === 'admin') {
    return (
      <div className="space-y-6 p-4 md:p-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome, {extendedProfile?.name || 'Administrator'}! You have administrative access to manage staff.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
            Today: {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* Calendar & Events Row */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
          {/* Calendar & Events - col-7 */}
          <Card className="lg:col-span-7">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Calendar & Events</CardTitle>
                <CardDescription>Upcoming events and reminders</CardDescription>
              </div>
              <Button onClick={() => setShowEventModal(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Calendar */}
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedCalendarDate}
                    onSelect={setSelectedCalendarDate}
                    className="rounded-md border"
                  />
                </div>
                
                {/* Upcoming Events */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Upcoming Events</h4>
                  {events.length > 0 ? (
                    <div className="space-y-2">
                      {events.map((event, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                          <CalendarIcon className="h-4 w-4 text-blue-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{event.title}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {format(new Date(event.event_date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {event.event_type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No upcoming events</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Generated Moveout Lists Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <FileText className="h-5 w-5" />
              Generated Moveout Lists
            </CardTitle>
            <CardDescription>Recent moveout lists from all branches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No moveout lists available</p>
              <p className="text-sm">Moveout lists will appear here when generated by staff members</p>
            </div>
          </CardContent>
        </Card>
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
      
      <div className="space-y-6 p-4 md:p-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {extendedProfile?.role === 'manager' || extendedProfile?.role === 'assistant_manager' ? (
              `Welcome back, ${extendedProfile?.name || 'User'}! Here's what's happening with your inventory in ${extendedProfile?.branch_name || 'branch'}.`
            ) : (
              `Welcome back, ${extendedProfile?.name || 'User'}! Here's what's happening with your inventory.`
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
            Today: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Generate Moveout List Button - Only for staff */}
      {extendedProfile?.role === 'staff' && (
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-6">
          <Button 
            onClick={() => setShowMoveoutModal(true)}
            className="px-6 sm:px-8 py-3 text-base sm:text-lg w-full sm:w-auto"
            size="lg"
          >
            <FileText className="h-5 w-5 mr-2" />
            Generate Moveout List
          </Button>
          <Button 
            onClick={() => setShowICADeliveryModal(true)}
            className="px-6 sm:px-8 py-3 text-base sm:text-lg w-full sm:w-auto bg-green-600 hover:bg-green-700"
            size="lg"
          >
            <Package className="h-5 w-5 mr-2" />
            ICA Delivery
          </Button>
        </div>
      )}

      {/* Quick Stats - Only show for non-staff roles */}
      {extendedProfile?.role !== 'staff' && (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Items</CardTitle>
            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Items in inventory</p>
          </CardContent>
        </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              setModalStockType('threshold');
              setShowStockModal(true);
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Below Threshold</CardTitle>
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.thresholdStockItems}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Below threshold level</p>
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
            <CardTitle className="text-xs sm:text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.lowStockItems}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Requires attention</p>
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
            <CardTitle className="text-xs sm:text-sm font-medium">Critical Stock</CardTitle>
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.criticalStockItems}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Urgent attention</p>
          </CardContent>
        </Card>

      </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Calendar & Events - Only show for non-staff roles */}
        {extendedProfile?.role !== 'staff' && (
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Calendar & Events</CardTitle>
              <CardDescription>Upcoming events and reminders</CardDescription>
            </div>
            {(extendedProfile?.role === 'manager' || extendedProfile?.role === 'assistant_manager') && (
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Calendar */}
              <div className="flex flex-col items-center w-full">
                <Calendar
                  mode="single"
                  selected={selectedCalendarDate}
                  onSelect={setSelectedCalendarDate}
                  className="rounded-md border pointer-events-auto"
                />
              </div>
              
              {/* Events List - Show for management roles only */}
              {['manager', 'assistant_manager'].includes(extendedProfile?.role!) && (
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="text-sm sm:text-base font-semibold">Upcoming Events</h4>
                  {events.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {events.map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <div>
                              <p className="font-medium">{event.title}</p>
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                            </div>
                          </div>
                          <div className="flex sm:flex-col gap-2 sm:gap-0 sm:text-right w-full sm:w-auto">
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
        )}

        {/* Weather Widget - Third column - Only show for non-staff roles */}
        {extendedProfile?.role !== 'staff' && (
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
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
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">{weather.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <Wind className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{weather.windSpeed} km/h</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Good conditions for deliveries
                </p>
                
                {/* Weather Condition Photo */}
                <div className="mt-4">
                  <img 
                    src={getWeatherPhoto(weather.condition, weather.temperature)} 
                    alt={`${weather.condition} weather at ${weather.temperature}°C`}
                    className="w-full h-32 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center';
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-sm text-muted-foreground">Weather unavailable</div>
              </div>
            )}
          </CardContent>
        </Card>
        )}

      </div>

      {/* Generated Moveout Lists Section - Layout depends on role */}
      {extendedProfile?.role === 'staff' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weather Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
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
                    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">{weather.humidity}%</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                      <Wind className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{weather.windSpeed} km/h</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Good conditions for deliveries
                  </p>
                  
                  {/* Weather Condition Photo */}
                  <div className="mt-4">
                    <img 
                      src={getWeatherPhoto(weather.condition, weather.temperature)} 
                      alt={`${weather.condition} weather at ${weather.temperature}°C`}
                      className="w-full h-32 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center';
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">Weather unavailable</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Moveout Lists */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <FileText className="h-5 w-5" />
                    Generated Moveout Lists
                  </CardTitle>
                  <CardDescription>
                    {showHistory ? 'Generated and completed moveout lists' : 'Generated moveout lists'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* View History Button - Icon only */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleHistory}
                    disabled={moveoutListsLoading}
                    title={showHistory ? 'Hide History' : 'View History'}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {moveoutListsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Loading moveout lists...</p>
                </div>
              ) : (() => {
                // Always show draft lists at the top (these are the active/generated lists)
                const activeLists = moveoutList.filter(list => list.status === 'draft');
                const displayLists = showHistory ? [...activeLists, ...completedLists] : activeLists;
                
                return displayLists.length > 0 ? (
                  <div className="space-y-4">
                    {/* Generated Lists Section */}
                    {activeLists.length > 0 && (
                      <>
                        {activeLists.map((list, index) => {
                          console.log('Rendering active moveout list:', list); // Debug log
                          return (
                            <Accordion key={list.id || index} type="single" collapsible className="w-full">
                          <AccordionItem value={`item-${index}`}>
                            <AccordionTrigger className="text-left">
                              <div className="flex items-center justify-between w-full mr-4">
                                <span className="font-semibold">{list.title || `Moveout List #${index + 1}`}</span>
                                <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(list.created_at).toLocaleDateString()}
                                  </span>
                                     <Badge variant={list.status === 'draft' ? 'default' : list.status === 'completed' ? 'secondary' : 'destructive'}>
                                       {list.status === 'draft' ? 'Pending' : list.status === 'completed' ? 'Completed' : list.status}
                                     </Badge>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              {list.description && (
                                <p className="text-sm text-muted-foreground mb-4">{list.description}</p>
                              )}
                              
                              {/* Completion Summary - Show only when all items are completed */}
                              {list.status === 'completed' && list.items && list.items.every((item: any) => item.status === 'completed') && (
                                <div className="mb-4">
                                  <button
                                    onClick={() => {
                                      const currentState = expandedSummaries[list.id] || false;
                                      setExpandedSummaries(prev => ({
                                        ...prev,
                                        [list.id]: !currentState
                                      }));
                                    }}
                                    className="flex items-center gap-2 text-sm font-medium text-green-800 hover:text-green-900 transition-colors"
                                  >
                                    <span>{expandedSummaries[list.id] ? 'Hide completion info' : 'Show completion info'}</span>
                                    <svg 
                                      className={`w-4 h-4 transition-transform ${expandedSummaries[list.id] ? 'rotate-180' : ''}`}
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  
                                  {expandedSummaries[list.id] && (
                                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                      <h4 className="text-sm font-medium text-green-800 mb-2">✅ Completion Summary</h4>
                                      <div className="space-y-1">
                                        {list.items.map((item: any, index: number) => (
                                          <div key={index} className="text-xs text-green-700">
                                            <span className="font-medium">{item.item_name}</span> - Completed by <span className="font-semibold">{item.processed_by}</span> on {new Date(item.processed_at).toLocaleDateString()} at {new Date(item.processed_at).toLocaleTimeString()}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                     <thead>
                                       <tr className="border-b">
                                         <th className="text-left p-2">Item Name</th>
                                         <th className="text-left p-2">Requesting Quantity</th>
                                         <th className="text-left p-2">Action</th>
                                       </tr>
                                     </thead>
                                  <tbody>
                                    {list.items && Array.isArray(list.items) ? list.items.map((item: any, itemIndex: number) => (
                                      <tr key={itemIndex} className="border-b">
                                        <td className="p-2">{item.item_name || item.itemName || 'Unknown Item'}</td>
                                        <td className="p-2">{item.request_amount || item.requestingQuantity || 0}</td>
                                        <td className="p-2">
                                          {item.status === 'completed' ? (
                                            <span className="text-sm text-green-600 font-medium">
                                              Completed
                                            </span>
                                          ) : (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleMoveoutItemDoneWithConfirmation(list.id, item)}
                                              disabled={processingItem === `${list.id}-${item.item_id}`}
                                            >
                                              {processingItem === `${list.id}-${item.item_id}` ? (
                                                <>
                                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                                                  Processing...
                                                </>
                                              ) : (
                                                'Done'
                                              )}
                                            </Button>
                                          )}
                                        </td>
                                      </tr>
                                    )) : (
                                      <tr>
                                        <td colSpan={3} className="p-4 text-center text-muted-foreground">
                                          No items in this list
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                              
                              {/* Completion Information */}
                              {list.items && Array.isArray(list.items) && list.items.some((item: any) => item.completed) && (
                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-sm font-medium text-green-800">
                                      Completed by {(() => {
                                        const completedItems = list.items.filter((item: any) => item.completed);
                                        const uniqueCompleters = [...new Set(completedItems.map((item: any) => item.completedByName).filter(Boolean))];
                                        return uniqueCompleters.length > 0 ? uniqueCompleters.join(', ') : 'Unknown';
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                            </Accordion>
                          );
                        })}
                      </>
                    )}
                    
                    {/* Completed Lists Section */}
                    {showHistory && completedLists.length > 0 && (
                      <>
                        {/* Separator */}
                        <div className="border-t border-gray-200 my-4"></div>
                        
                        {completedLists.map((list, index) => {
                          console.log('Rendering completed moveout list:', list); // Debug log
                          return (
                            <Accordion key={list.id || `completed-${index}`} type="single" collapsible className="w-full">
                              <AccordionItem value={`completed-item-${index}`}>
                                <AccordionTrigger className="text-left">
                                  <div className="flex items-center justify-between w-full mr-4">
                                    <span className="font-semibold">{list.title || `Moveout List #${index + 1}`}</span>
                                    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                      <span className="text-sm text-muted-foreground">
                                        {new Date(list.created_at).toLocaleDateString()}
                                      </span>
                                         <Badge variant={list.status === 'active' ? 'default' : list.status === 'completed' ? 'secondary' : 'destructive'}>
                                           {list.status === 'active' ? 'Active' : list.status === 'completed' ? 'Completed' : list.status}
                                         </Badge>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  {list.description && (
                                    <p className="text-sm text-muted-foreground mb-4">{list.description}</p>
                                  )}
                                  
                                  {/* Completion Summary - Show only when all items are completed */}
                                  {list.status === 'completed' && list.items && list.items.every((item: any) => item.status === 'completed') && (
                                    <div className="mb-4">
                                      <button
                                        onClick={() => {
                                          const currentState = expandedSummaries[list.id] || false;
                                          setExpandedSummaries(prev => ({
                                            ...prev,
                                            [list.id]: !currentState
                                          }));
                                        }}
                                        className="flex items-center gap-2 text-sm font-medium text-green-800 hover:text-green-900 transition-colors"
                                      >
                                        <span>Show completion info</span>
                                        <svg 
                                          className={`w-4 h-4 transition-transform ${expandedSummaries[list.id] ? 'rotate-180' : ''}`}
                                          fill="none" 
                                          stroke="currentColor" 
                                          viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </button>
                                      
                                      {expandedSummaries[list.id] && (
                                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                          <h4 className="text-sm font-medium text-green-800 mb-2">✅ Completion Summary</h4>
                                          <div className="space-y-1">
                                            {list.items.map((item: any, index: number) => (
                                              <div key={index} className="text-xs text-green-700">
                                                <span className="font-medium">{item.item_name}</span> - Completed by <span className="font-semibold">{item.processed_by}</span> on {new Date(item.processed_at).toLocaleDateString()} at {new Date(item.processed_at).toLocaleTimeString()}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                         <thead>
                                           <tr className="border-b">
                                             <th className="text-left p-2">Item Name</th>
                                             <th className="text-left p-2">Requesting Quantity</th>
                                             <th className="text-left p-2">Action</th>
                                           </tr>
                                         </thead>
                                      <tbody>
                                        {list.items && Array.isArray(list.items) ? list.items.map((item: any, itemIndex: number) => (
                                          <tr key={itemIndex} className="border-b">
                                            <td className="p-2">{item.item_name || item.itemName || 'Unknown Item'}</td>
                                            <td className="p-2">{item.request_amount || item.requestingQuantity || 0}</td>
                                            <td className="p-2">
                                              {item.status === 'completed' ? (
                                                <span className="text-sm text-green-600 font-medium">
                                                  Completed
                                                </span>
                                              ) : (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => handleMoveoutItemDoneWithConfirmation(list.id, item)}
                                                  disabled={processingItem === `${list.id}-${item.item_id}`}
                                                >
                                                  {processingItem === `${list.id}-${item.item_id}` ? (
                                                    <>
                                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                                                      Processing...
                                                    </>
                                                  ) : (
                                                    'Done'
                                                  )}
                                                </Button>
                                              )}
                                            </td>
                                          </tr>
                                        )) : (
                                          <tr>
                                            <td colSpan={3} className="p-4 text-center text-muted-foreground">
                                              No items in this list
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                  
                                  {/* Completion Information */}
                                  {list.items && Array.isArray(list.items) && list.items.some((item: any) => item.completed) && (
                                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-sm font-medium text-green-800">
                                          Completed by {(() => {
                                            const completedItems = list.items.filter((item: any) => item.completed);
                                            const uniqueCompleters = [...new Set(completedItems.map((item: any) => item.completedByName).filter(Boolean))];
                                            return uniqueCompleters.length > 0 ? uniqueCompleters.join(', ') : 'Unknown';
                                          })()}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          );
                        })}
                      </>
                    )}
                    
                    {/* Load More button for history */}
                    {showHistory && (() => {
                      const allLists = moveoutList.filter(list => list.status === 'completed');
                      const hasMore = historyLoadedCount < allLists.length;
                      
                      return hasMore ? (
                        <div className="text-center pt-4">
                          <Button className="w-full sm:w-auto text-sm sm:text-base"
                            variant="outline"
                            onClick={handleLoadHistory}
                            disabled={moveoutListsLoading}
                          >
                            <History className="h-4 w-4 mr-2" />
                            Load More (5)
                          </Button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>
                      {showHistory && activeLists.length === 0
                        ? 'No moveout lists found' 
                        : 'No active moveout lists generated yet'
                      }
                    </p>
                    {!showHistory && (
                      <p className="text-sm">Click "Generate Moveout List" to create your first list</p>
                    )}
                    {showHistory && activeLists.length === 0 && (
                      <p className="text-sm">No active or completed moveout lists found</p>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <FileText className="h-5 w-5" />
                  Generated Moveout Lists
                </CardTitle>
                <CardDescription>
                  {showHistory ? 'Generated and completed moveout lists' : 'Generated moveout lists'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* Generate Moveout List Button for Managers and Assistant Managers */}
                {(extendedProfile?.role === 'manager' || extendedProfile?.role === 'assistant_manager') && (
                  <Button
                    onClick={() => setShowMoveoutModal(true)}
                    size="sm"
                    variant="outline"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Generate Moveout List
                  </Button>
                )}
                {/* View History Button - Icon only */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleHistory}
                  disabled={moveoutListsLoading}
                  title={showHistory ? 'Hide History' : 'View History'}
                >
                  <History className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {moveoutListsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading moveout lists...</p>
              </div>
            ) : (() => {
              // Always show draft lists at the top (these are the active/generated lists)
              const activeLists = moveoutList.filter(list => list.status === 'draft');
              const displayLists = showHistory ? [...activeLists, ...completedLists] : activeLists;
              
              return displayLists.length > 0 ? (
                <div className="space-y-4">
                  {/* Generated Lists Section */}
                  {activeLists.length > 0 && (
                    <>
                      {activeLists.map((list, index) => {
                        console.log('Rendering active moveout list:', list); // Debug log
                        return (
                          <Accordion key={list.id || index} type="single" collapsible className="w-full">
                        <AccordionItem value={`item-${index}`}>
                          <AccordionTrigger className="text-left">
                            <div className="flex items-center justify-between w-full mr-4">
                              <span className="font-semibold">{list.title || `Moveout List #${index + 1}`}</span>
                              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                <span className="text-sm text-muted-foreground">
                                  {new Date(list.created_at).toLocaleDateString()}
                                </span>
                                   <Badge variant={list.status === 'draft' ? 'default' : list.status === 'completed' ? 'secondary' : 'destructive'}>
                                     {list.status === 'draft' ? 'Pending' : list.status === 'completed' ? 'Completed' : list.status}
                                   </Badge>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            {list.description && (
                              <p className="text-sm text-muted-foreground mb-4">{list.description}</p>
                            )}
                            
                            {/* Completion Summary - Show only when all items are completed */}
                            {list.status === 'completed' && list.items && list.items.every((item: any) => item.status === 'completed') && (
                              <div className="mb-4">
                                <button
                                  onClick={() => {
                                    const currentState = expandedSummaries[list.id] || false;
                                    setExpandedSummaries(prev => ({
                                      ...prev,
                                      [list.id]: !currentState
                                    }));
                                  }}
                                  className="flex items-center gap-2 text-sm font-medium text-green-800 hover:text-green-900 transition-colors"
                                >
                                  {expandedSummaries[list.id] ? (
                                    <>
                                      <span>▼</span>
                                      <span>Hide Completion Summary</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>▶</span>
                                      <span>View Completion Summary</span>
                                    </>
                                  )}
                                </button>
                                {expandedSummaries[list.id] && (
                                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <h4 className="text-sm font-medium text-green-800 mb-2">✅ Completion Summary</h4>
                                    <div className="space-y-1">
                                      {list.items.map((item: any, index: number) => (
                                        <div key={index} className="text-xs text-green-700">
                                          <span className="font-medium">{item.item_name}</span> - Completed by <span className="font-semibold">{item.processed_by}</span> on {new Date(item.processed_at).toLocaleDateString()} at {new Date(item.processed_at).toLocaleTimeString()}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                   <thead>
                                     <tr className="border-b">
                                       <th className="text-left p-2">Item Name</th>
                                       <th className="text-left p-2">Requesting Quantity</th>
                                       <th className="text-left p-2">Action</th>
                                     </tr>
                                   </thead>
                                <tbody>
                                  {list.items && Array.isArray(list.items) ? list.items.map((item: any, itemIndex: number) => (
                                    <tr key={itemIndex} className="border-b">
                                      <td className="p-2">{item.item_name || item.itemName || 'Unknown Item'}</td>
                                      <td className="p-2">{item.request_amount || item.requestingQuantity || 0}</td>
                                      <td className="p-2">
                                        {item.status === 'completed' ? (
                                          <span className="text-sm text-green-600 font-medium">
                                            Completed
                                          </span>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleMoveoutItemDoneWithConfirmation(list.id, item)}
                                            disabled={processingItem === `${list.id}-${item.item_id}`}
                                          >
                                            {processingItem === `${list.id}-${item.item_id}` ? (
                                              <>
                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                                                Processing...
                                              </>
                                            ) : (
                                              'Done'
                                            )}
                                          </Button>
                                        )}
                                      </td>
                                    </tr>
                                  )) : (
                                    <tr>
                                      <td colSpan={3} className="p-4 text-center text-muted-foreground">
                                        No items in this list
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                            
                            {/* Completion Information */}
                            {list.items && Array.isArray(list.items) && list.items.some((item: any) => item.completed) && (
                              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-green-800">
                                    Completed by {(() => {
                                      const completedItems = list.items.filter((item: any) => item.completed);
                                      const uniqueCompleters = [...new Set(completedItems.map((item: any) => item.completedByName).filter(Boolean))];
                                      return uniqueCompleters.length > 0 ? uniqueCompleters.join(', ') : 'Unknown';
                                    })()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                        );
                      })}
                    </>
                  )}
                  
                  {/* Load More button for history */}
                  {showHistory && (() => {
                    const allLists = moveoutList.filter(list => list.status === 'completed');
                    const hasMore = historyLoadedCount < allLists.length;
                    
                    return hasMore ? (
                      <div className="text-center pt-4">
                        <Button className="w-full sm:w-auto text-sm sm:text-base"
                          variant="outline"
                          onClick={handleLoadHistory}
                          disabled={moveoutListsLoading}
                        >
                          <History className="h-4 w-4 mr-2" />
                          Load More (5)
                        </Button>
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>
                    {showHistory && activeLists.length === 0
                      ? 'No moveout lists found' 
                      : 'No active moveout lists generated yet'
                    }
                  </p>
                  {!showHistory && (
                    <p className="text-sm">Click "Generate Moveout List" to create your first list</p>
                  )}
                  {showHistory && activeLists.length === 0 && (
                    <p className="text-sm">No active or completed moveout lists found</p>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Stock Details Modal */}
      <Dialog open={showStockModal} onOpenChange={setShowStockModal}>
        <DialogContent className="max-w-2xl mx-4 mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modalStockType === 'threshold' ? 'Below Threshold Items' : 
               modalStockType === 'low' ? 'Low Stock Items' : 'Critical Stock Items'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {(modalStockType === 'threshold' ? stats.thresholdStockDetails : 
              modalStockType === 'low' ? stats.lowStockDetails : stats.criticalStockDetails)?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{item.category}</p>
                  </div>
                </div>
                <div className="flex sm:flex-col gap-2 sm:gap-0 sm:text-right w-full sm:w-auto">
                  <p className="font-medium">Current: {item.current_quantity}</p>
                  <p className="text-sm text-muted-foreground">Threshold: {item.threshold_level}</p>
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
            {!extendedProfile?.branch_id && (
              <div>
                <Label className="text-sm" htmlFor="event-branch">Branch *</Label>
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
              <Label className="text-sm" htmlFor="event-title">Title *</Label>
              <Input className="text-sm sm:text-base"
                id="event-title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Event title"
              />
            </div>
            <div>
              <Label className="text-sm" htmlFor="event-description">Description</Label>
              <Input className="text-sm sm:text-base"
                id="event-description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Event description"
              />
            </div>
            <div>
              <Label className="text-sm" htmlFor="event-date">Date *</Label>
              <DateTimePicker
                value={newEvent.event_date ? new Date(newEvent.event_date) : undefined}
                onChange={(date) => setNewEvent({ ...newEvent, event_date: date ? date.toISOString() : '' })}
                placeholder="Pick a date"
                showTime={false}
              />
            </div>
            <div>
              <Label className="text-sm" htmlFor="event-type">Type</Label>
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
              <Button className="w-full sm:w-auto text-sm sm:text-base" variant="outline" onClick={() => setShowEventModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEvent} disabled={isAddingEvent}>
                {isAddingEvent ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Event"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Moveout List Modal */}
      <Dialog open={showMoveoutModal} onOpenChange={setShowMoveoutModal}>
        <DialogContent className="max-w-6xl w-[80vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Moveout List</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Item Selection */}
            <div>
              <Label className="text-sm" htmlFor="item-select">Select Items</Label>
              <Select2
                isMulti
                options={availableItems.map(item => ({
                  value: item.id,
                  label: `${item.name} (Current: ${item.current_quantity})`,
                  item: item
                }))}
                value={selectedItems.map(item => ({
                  value: item.id,
                  label: `${item.name} (Current: ${item.current_quantity})`,
                  item: item
                }))}
                onChange={(selectedOptions) => {
                  const items = selectedOptions ? selectedOptions.map(option => option.item) : [];
                  setSelectedItems(items);
                }}
                placeholder="Search and select items..."
                className="mt-2"
                styles={{
                  control: (provided) => ({
                    ...provided,
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                    minHeight: '40px'
                  }),
                  menu: (provided) => ({
                    ...provided,
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
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
                  multiValue: (provided) => ({
                    ...provided,
                    backgroundColor: 'hsl(var(--accent))',
                    color: 'hsl(var(--accent-foreground))'
                  }),
                  multiValueLabel: (provided) => ({
                    ...provided,
                    color: 'hsl(var(--accent-foreground))'
                  }),
                  multiValueRemove: (provided) => ({
                    ...provided,
                    color: 'hsl(var(--accent-foreground))',
                    ':hover': {
                      backgroundColor: 'hsl(var(--accent-foreground) / 0.2)',
                      color: 'hsl(var(--accent-foreground))'
                    }
                  })
                }}
              />
              <Button 
                onClick={handleAddToList}
                className="mt-2"
                disabled={selectedItems.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to List
              </Button>
            </div>

            {/* Moveout List Items Table */}
            {moveoutListItems.length > 0 && (
              <div>
                <Label className="text-base font-semibold">Moveout List Items</Label>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium">Item Name</th>
                        <th className="text-left p-3 font-medium">Current Quantity</th>
                        <th className="text-left p-3 font-medium">Requesting Quantity</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moveoutListItems.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-3">{item.itemName}</td>
                          <td className="p-3">{item.currentQuantity}</td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min="1"
                              max={item.currentQuantity}
                              value={item.requestingQuantity}
                              onChange={(e) => {
                                const newItems = [...moveoutListItems];
                                newItems[index].requestingQuantity = parseInt(e.target.value) || 0;
                                setMoveoutListItems(newItems);
                              }}
                              className="w-20"
                            />
                          </td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newItems = moveoutListItems.filter((_, i) => i !== index);
                                setMoveoutListItems(newItems);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button className="w-full sm:w-auto text-sm sm:text-base" variant="outline" onClick={() => setShowMoveoutModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleGenerateMoveoutList}
                disabled={moveoutListItems.length === 0}
              >
                Generate Moveout List
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Moveout Item */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md mx-4 mx-4">
          <DialogHeader>
            <DialogTitle>Confirm Moveout</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to mark <strong>"{confirmItem?.item?.itemName}"</strong> as moved out?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This will deduct <strong>{confirmItem?.item?.requestingQuantity}</strong> units from stock and cannot be undone.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full sm:w-auto text-sm sm:text-base" variant="outline" onClick={handleCancelMoveout}>
              Cancel
            </Button>
            <Button onClick={handleConfirmMoveout} className="bg-red-600 hover:bg-red-700">
              Confirm Moveout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Generate Moveout List */}
      <Dialog open={showGenerateConfirmModal} onOpenChange={setShowGenerateConfirmModal}>
        <DialogContent className="max-w-md mx-4 mx-4">
          <DialogHeader>
            <DialogTitle>Confirm Generate Moveout List</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to generate a moveout list with <strong>{moveoutListItems.length}</strong> items?
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Items to be included:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                {moveoutListItems.map((item, index) => (
                  <li key={index}>
                    • {item.itemName} - Requesting: {item.requestingQuantity} units
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full sm:w-auto text-sm sm:text-base" variant="outline" onClick={() => setShowGenerateConfirmModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmGenerateMoveoutList} className="bg-blue-600 hover:bg-blue-700">
              Generate Moveout List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ICA Delivery Modal */}
      <ICADeliveryModal 
        open={showICADeliveryModal}
        onOpenChange={setShowICADeliveryModal}
      />
      </div>
    </>
  );
};

export default Index;