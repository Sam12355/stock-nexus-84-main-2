import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Thermometer, CloudSun } from 'lucide-react';
import { apiClient } from '@/lib/api';

export function DynamicHeader() {
  console.log('🌤️ DynamicHeader: Component rendered');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        console.log('🌤️ DynamicHeader: Starting weather fetch for Vaxjo');
        console.log('🌤️ DynamicHeader: Current weather state:', weather);
        
        const weatherData = await apiClient.getWeather('Vaxjo');
        console.log('🌤️ DynamicHeader: Received weather data:', weatherData);
        console.log('🌤️ DynamicHeader: Setting temperature to:', weatherData.temperature);
        
        const newWeatherState = {
          temp: weatherData.temperature,
          condition: weatherData.condition
        };
        
        console.log('🌤️ DynamicHeader: New weather state:', newWeatherState);
        setWeather(newWeatherState);
        
        console.log('🌤️ DynamicHeader: Weather state updated');
      } catch (error) {
        console.error('🌤️ DynamicHeader: Error fetching weather:', error);
        // Fallback weather
        const fallbackWeather = {
          temp: 15,
          condition: 'Clear sky'
        };
        console.log('🌤️ DynamicHeader: Using fallback weather:', fallbackWeather);
        setWeather(fallbackWeather);
      }
    };

    console.log('🌤️ DynamicHeader: useEffect triggered, fetching weather');
    fetchWeather();
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="flex items-center gap-4 text-sm">
      {/* Date */}
      <div className="hidden sm:flex items-center gap-1 text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>{formatDate(currentTime)}</span>
      </div>
      
      {/* Time */}
      <div className="flex items-center gap-1 text-foreground font-medium">
        <Clock className="h-4 w-4" />
        <span>{formatTime(currentTime)}</span>
      </div>
      
      {/* Weather */}
      <div className="hidden md:flex items-center gap-1 text-muted-foreground">
        <CloudSun className="h-4 w-4" />
        <span>{weather ? `${weather.temp}°C` : '--°C'}</span>
        {console.log('🌤️ DynamicHeader: Rendering temperature:', weather ? weather.temp : 'null')}
      </div>
    </div>
  );
}