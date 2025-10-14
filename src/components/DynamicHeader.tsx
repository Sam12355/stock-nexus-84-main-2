import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Thermometer, CloudSun } from 'lucide-react';
import { apiClient } from '@/lib/api';

export function DynamicHeader() {
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
        const weatherData = await apiClient.getWeather('Vaxjo');
        setWeather({
          temp: weatherData.temperature,
          condition: weatherData.condition
        });
      } catch (error) {
        console.error('Error fetching weather:', error);
        // Fallback weather
        setWeather({
          temp: 15,
          condition: 'Clear sky'
        });
      }
    };

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
      </div>
    </div>
  );
}