const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Weather API endpoint
router.get('/weather', authenticateToken, async (req, res) => {
  try {
    const { location } = req.query;
    
    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Location parameter is required'
      });
    }

    const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
    
    if (!OPENWEATHER_API_KEY) {
      console.error('OpenWeather API key not configured');
      return res.status(500).json({
        success: false,
        error: 'Weather service not configured'
      });
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    const weatherData = {
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].description,
      location: location,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
      feelsLike: Math.round(data.main.feels_like),
      pressure: data.main.pressure,
      visibility: Math.round(data.visibility / 1000), // Convert m to km
      uvIndex: data.uvi || 0,
      sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString(),
      sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString()
    };
    
    res.json({
      success: true,
      data: weatherData
    });
    
  } catch (error) {
    console.error('Error fetching weather data:', error);
    
    // Return fallback weather data
    const fallbackWeather = {
      temperature: 15,
      condition: 'Clear sky',
      location: location || 'Vaxjo',
      humidity: 70,
      windSpeed: 10,
      feelsLike: 15,
      pressure: 1013,
      visibility: 10,
      uvIndex: 3,
      sunrise: '06:30',
      sunset: '18:30'
    };
    
    res.json({
      success: true,
      data: fallbackWeather,
      fallback: true
    });
  }
});

module.exports = router;
