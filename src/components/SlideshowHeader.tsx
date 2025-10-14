import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { AlertTriangle, Calendar, CalendarDays, Clock, Droplets, MapPin, Thermometer, Wind } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface Event {
  id: string;
  title: string;
  event_date: string;
}

interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
  humidity: number;
  windSpeed: number;
}

interface Slide {
  type: 'event' | 'datetime' | 'weather' | 'stock';
  id: string;
  content: React.ReactNode;
}

export function SlideshowHeader() {
  const { profile } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [branchLocation, setBranchLocation] = useState<string>('');
  const [stockData, setStockData] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Only show slideshow for management roles
  const showSlideshow = profile && ['regional_manager', 'district_manager', 'manager', 'assistant_manager'].includes(profile.role as string);

  // Function to refresh events
  const refreshEvents = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Listen for custom events to refresh
  useEffect(() => {
    const handleRefresh = () => {
      refreshEvents();
    };

    window.addEventListener('refreshSlideshow', handleRefresh);
    return () => {
      window.removeEventListener('refreshSlideshow', handleRefresh);
    };
  }, []);

  // Fetch branch location and events
  useEffect(() => {
    if (!showSlideshow || !profile) return;
    
    const fetchBranchData = async () => {
      try {
        // Use branch_context for regional/district managers, branch_id for others
        const branchId = profile.branch_context || profile.branch_id;
        if (!branchId) return;

        // Fetch branch location
        const branches = await apiClient.getBranches();
        const branch = branches.find(b => b.id === branchId);
        
        if (branch?.address) {
          // Extract city from address - prioritize Swedish city names
          const addressParts = branch.address.split(',');
          console.log('📍 SlideshowHeader: Address parts:', addressParts);
          
          // Look for Swedish city names (Växjö, Stockholm, Gothenburg, etc.)
          let city = '';
          for (const part of addressParts) {
            const trimmed = part.trim();
            console.log('📍 SlideshowHeader: Checking part:', trimmed);
            if (trimmed.includes('Växjö') || trimmed.includes('Stockholm') || trimmed.includes('Gothenburg') || trimmed.includes('Malmö')) {
              city = trimmed.replace(/[.,]/g, '').trim(); // Remove punctuation
              console.log('📍 SlideshowHeader: Found Swedish city:', city);
              break;
            }
          }
          
          // If no Swedish city found, use the second-to-last part (usually the city)
          if (!city && addressParts.length > 1) {
            city = addressParts[addressParts.length - 2].trim().replace(/[.,]/g, '');
            console.log('📍 SlideshowHeader: Using second-to-last part:', city);
          }
          // Fallback to first part if still no city
          if (!city) {
            city = addressParts[0].trim().replace(/[.,]/g, '');
            console.log('📍 SlideshowHeader: Using first part as fallback:', city);
          }
          
          console.log('📍 SlideshowHeader: Using branch address:', branch.address, '-> extracted city:', city);
          setBranchLocation(city);
        }

        // Fetch calendar events
        const eventsResponse = await apiClient.getCalendarEvents();
        if (eventsResponse && eventsResponse.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const upcomingEvents = eventsResponse
            .filter(event => event.event_date >= today)
            .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
            .slice(0, 5);
          
          setEvents(upcomingEvents);
        }

        // Fetch critical stock items
        try {
          const stockResponse = await apiClient.getStockData();
          if (stockResponse && stockResponse.length > 0) {
            const criticalItems = stockResponse.filter((item: any) => 
              item.current_quantity <= item.minimum_quantity
            );
            setStockData(criticalItems);
          }
        } catch (stockError) {
          console.error('Error fetching stock data:', stockError);
          setStockData([]);
        }
      } catch (error) {
        console.error('Error fetching branch data:', error);
      }
    };
    fetchBranchData();
  }, [showSlideshow, profile, refreshTrigger]);

  // Fetch weather based on branch location
  useEffect(() => {
    const fetchWeather = async () => {
      console.log('🌤️ SlideshowHeader: Starting weather fetch');
      console.log('🌤️ SlideshowHeader: Branch location:', branchLocation);
      console.log('🌤️ SlideshowHeader: Current weather state:', weather);
      
      if (!branchLocation) {
        console.log('🌤️ SlideshowHeader: No branch location, using default weather');
        // Set default weather for Vaxjo when no branch location
        const defaultWeather = {
          temperature: 24,
          condition: 'Clear Sky',
          location: 'Vaxjo',
          humidity: 65,
          windSpeed: 12
        };
        console.log('🌤️ SlideshowHeader: Setting default weather:', defaultWeather);
        setWeather(defaultWeather);
        return;
      }
      
      try {
        console.log('🌤️ SlideshowHeader: Fetching weather for location:', branchLocation);
        const weatherData = await apiClient.getWeather(branchLocation);
        console.log('🌤️ SlideshowHeader: Received weather data:', weatherData);
        console.log('🌤️ SlideshowHeader: Setting temperature to:', weatherData.temperature);
        
        const newWeatherState = {
          temperature: weatherData.temperature,
          condition: weatherData.condition,
          location: weatherData.location,
          humidity: weatherData.humidity,
          windSpeed: weatherData.windSpeed
        };
        
        console.log('🌤️ SlideshowHeader: New weather state:', newWeatherState);
        setWeather(newWeatherState);
        console.log('🌤️ SlideshowHeader: Weather state updated');
      } catch (error) {
        console.error('🌤️ SlideshowHeader: Error fetching weather:', error);
        // Fallback weather data
        const fallbackWeather = {
          temperature: 24,
          condition: 'Partly Cloudy',
          location: branchLocation || 'Vaxjo',
          humidity: 65,
          windSpeed: 12
        };
        console.log('🌤️ SlideshowHeader: Using fallback weather:', fallbackWeather);
        setWeather(fallbackWeather);
      }
    };
    
    console.log('🌤️ SlideshowHeader: useEffect triggered, branchLocation:', branchLocation);
    if (branchLocation) {
      fetchWeather();
    }
  }, [branchLocation]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Create slides array
  const slides: Slide[] = [
    ...events.map((event, index) => ({
      type: 'event' as const,
      id: `event-${index}`,
      content: (
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">{event.title}</span>
          <span className="text-muted-foreground">
            {new Date(event.event_date).toLocaleDateString()}
          </span>
        </div>
      )
    })),
    {
      type: 'datetime' as const,
      id: 'datetime',
      content: (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{currentTime.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })}</span>
          </div>
          <div className="flex items-center gap-1 text-foreground font-medium">
            <Clock className="h-4 w-4" />
            <span>{currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })}</span>
          </div>
        </div>
      )
    },
    // Individual Critical Stock Alert slides
    ...stockData.map((item: { name: string; current_quantity: number }, index) => ({
      type: 'stock' as const,
      id: `critical-stock-${index}`,
      content: (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Critical Stock Alert</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-red-500 font-medium">
              {item.name} ({item.current_quantity} left)
            </span>
          </div>
        </div>
      )
    }))
  ];

  if (weather) {
    slides.push({
      type: 'weather' as const,
      id: 'weather',
      content: (
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1">
            <Thermometer className="h-4 w-4 text-orange-500" />
            <span className="font-medium text-foreground">{weather.temperature}°C</span>
          </div>
          <div className="flex items-center gap-1">
            <Droplets className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">{weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">{weather.windSpeed}km/h</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="text-xs">{weather.location}</span>
          </div>
        </div>
      )
    });
  }

  // Auto-advance slides
  useEffect(() => {
    if (slides.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000); // Change slide every 3 seconds

    return () => clearInterval(timer);
  }, [slides.length]);

  // Don't show slideshow for non-management roles
  if (!showSlideshow) {
    return null;
  }

  if (slides.length === 0) {
    return (
      <div className="relative h-8 overflow-hidden bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg px-3 py-1 flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4 animate-pulse" />
        <span className="animate-pulse">Loading slideshow...</span>
      </div>
    );
  }

  return (
    <div className="relative h-8 overflow-hidden bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg px-3 py-1">
      <div 
        className="flex flex-col transition-transform duration-700 ease-in-out"
        style={{
          transform: `translateY(-${currentSlide * 32}px)`
        }}
      >
        {slides.map((slide, index) => (
          <div
            key={`${slide.id}-${index}`}
            className="h-8 flex items-center animate-slide-up"
          >
            {slide.content}
          </div>
        ))}
      </div>
    </div>
  );
}