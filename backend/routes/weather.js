const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Test endpoint to verify weather routes are working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Weather routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Weather API endpoint (temporarily without auth for testing)
router.get('/current', async (req, res) => {
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
      return res.status(500).json({
        success: false,
        error: 'Weather service not configured'
      });
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      return res.status(500).json({
        success: false,
        error: 'Weather API error'
      });
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
    
    console.log('🌤️ Processed weather data:', JSON.stringify(weatherData, null, 2));
    
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

// Test weather endpoint for debugging
router.get('/weather/test', authenticateToken, async (req, res) => {
  try {
    const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
    
    res.json({
      success: true,
      debug: {
        apiKeyConfigured: !!OPENWEATHER_API_KEY,
        apiKeyLength: OPENWEATHER_API_KEY ? OPENWEATHER_API_KEY.length : 0,
        apiKeyPrefix: OPENWEATHER_API_KEY ? OPENWEATHER_API_KEY.substring(0, 8) + '...' : 'Not set',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
