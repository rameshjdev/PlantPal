import axios from 'axios';
import * as Location from 'expo-location';
import { WEATHER_API_KEY } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
// WeatherAPI.com API key
// In a production app, you would store this in a secure environment variable
const API_KEY = WEATHER_API_KEY; // Replace with your actual API key
const BASE_URL = 'https://api.weatherapi.com/v1';

// Cache configuration
const CACHE_KEY = 'weather_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds
const LOCATION_THRESHOLD = 0.1; // 0.1 degrees (approximately 11km)

// Helper function to check if cache is valid
const isCacheValid = (cachedData) => {
  if (!cachedData || !cachedData.timestamp) return false;
  return Date.now() - cachedData.timestamp < CACHE_TTL;
};

// Helper function to check if location has changed significantly
const hasLocationChanged = (oldLocation, newLocation) => {
  if (!oldLocation || !newLocation) return true;
  const latDiff = Math.abs(oldLocation.latitude - newLocation.latitude);
  const lonDiff = Math.abs(oldLocation.longitude - newLocation.longitude);
  return latDiff > LOCATION_THRESHOLD || lonDiff > LOCATION_THRESHOLD;
};

// This service handles weather API integration
// In a production app, you would use a real weather API with your API key

// Get user's current location
export const getCurrentLocation = async () => {
  try {
    // Request permission to access location
    let { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Permission to access location was denied');
    }
    
    // Get current position with high accuracy
    let location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      maximumAge: 10000, // Only accept locations less than 10 seconds old
      timeout: 5000 // Timeout after 5 seconds
    });

    // Get the address details
    const address = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      address: address[0] // Include address details
    };
  } catch (error) {
    console.error('Error getting location:', error);
    throw error;
  }
};

// Fetch weather data from WeatherAPI.com
export const fetchWeatherData = async (coordinates) => {
  try {
    if (!API_KEY) {
      throw new Error('Weather API key is not configured');
    }

    // Try to get cached data
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);
    let parsedCache = null;
    
    if (cachedData) {
      parsedCache = JSON.parse(cachedData);
      
      // Check if cache is valid and location hasn't changed significantly
      if (isCacheValid(parsedCache) && !hasLocationChanged(parsedCache.location, coordinates)) {
        console.log('Using cached weather data');
        return parsedCache.weatherData;
      }
    }

    // Build query parameter
    const query = `${coordinates.latitude},${coordinates.longitude}`;
    
    // Make API request to get forecast for 5 days
    const response = await axios.get(`${BASE_URL}/forecast.json`, {
      params: {
        key: API_KEY,
        q: query,
        days: 5,
        aqi: 'yes', // Include air quality data
        alerts: 'yes' // Include weather alerts
      }
    });
    
    // Format response data to match our app's structure
    const weatherData = formatWeatherData(response.data);
    
    // Cache the new data
    const newCache = {
      timestamp: Date.now(),
      location: coordinates,
      weatherData: weatherData
    };
    
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
    
    return weatherData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    if (error.response) {
      // Handle specific API errors
      switch (error.response.status) {
        case 401:
          throw new Error('Invalid weather API key. Please check your configuration.');
        case 403:
          throw new Error('Weather API access denied. Please check your subscription.');
        case 429:
          throw new Error('Weather API rate limit exceeded. Please try again later.');
        default:
          throw new Error(`Weather API error: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`);
      }
    } else if (error.request) {
      // If there's no network but we have cached data, return that
      if (parsedCache && parsedCache.weatherData) {
        console.log('Network error, using cached weather data');
        return parsedCache.weatherData;
      }
      throw new Error('No response from weather service. Please check your internet connection.');
    } else {
      throw error;
    }
  }
};

// Format the API response to match our app's data structure
const formatWeatherData = (apiData) => {
  // Get day names for the forecast
  const getDayName = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };
  
  // Format forecast data
  const formattedForecast = apiData.forecast.forecastday.map(day => ({
    day: day.date === apiData.forecast.forecastday[0].date ? 'Today' : getDayName(day.date),
    temp: Math.round(day.day.avgtemp_c),
    condition: day.day.condition.text,
    icon: day.day.condition.icon,
    precipitation: day.day.daily_chance_of_rain,
    humidity: day.day.avghumidity,
    wind_kph: Math.round(day.day.maxwind_kph),
    uv: day.day.uv,
    date: day.date,
    hourly: day.hour.map(hour => ({
      time: new Date(hour.time).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
      temp: Math.round(hour.temp_c),
      condition: hour.condition.text,
      icon: hour.condition.icon,
      humidity: hour.humidity,
      wind_kph: Math.round(hour.wind_kph),
      precipitation: hour.chance_of_rain
    }))
  }));
  
  // Format alerts if any
  const formattedAlerts = [];
  if (apiData.alerts && apiData.alerts.alert && apiData.alerts.alert.length > 0) {
    apiData.alerts.alert.forEach(alert => {
      // Parse the alert text to extract key information
      const alertInfo = parseAlertText(alert.desc);
      formattedAlerts.push({
        type: alert.category.toLowerCase(),
        title: alertInfo.title || alert.event || 'Weather Alert',
        message: alertInfo.message || alert.desc,
        severity: alertInfo.severity || 'warning',
        expires: alert.expires || null,
        areas: alertInfo.areas || []
      });
    });
  }
  
  // Return formatted data
  return {
    location: formatLocation(apiData.location),
    current: {
      temp: Math.round(apiData.current.temp_c),
      humidity: apiData.current.humidity,
      condition: apiData.current.condition.text,
      icon: apiData.current.condition.icon,
      wind_kph: Math.round(apiData.current.wind_kph),
      wind_dir: apiData.current.wind_dir,
      pressure_mb: apiData.current.pressure_mb,
      feelslike_c: Math.round(apiData.current.feelslike_c),
      uv: apiData.current.uv,
      air_quality: apiData.current.air_quality ? {
        co: apiData.current.air_quality.co,
        pm2_5: apiData.current.air_quality.pm2_5,
        pm10: apiData.current.air_quality.pm10,
        us_epa_index: apiData.current.air_quality.us_epa_index,
      } : null
    },
    forecast: formattedForecast,
    alerts: formattedAlerts,
    lastUpdated: new Date().toISOString()
  };
};

// Helper function to format location
const formatLocation = (location) => {
  if (!location) return 'Unknown Location';
  
  const parts = [];
  
  // Add city name if available
  if (location.name) {
    parts.push(location.name);
  }
  
  // Add region/state if available and different from city
  if (location.region && location.region !== location.name) {
    parts.push(location.region);
  }
  
  // Add country if available and different from region
  if (location.country && location.country !== location.region) {
    parts.push(location.country);
  }
  
  // If we have no parts, try to use lat/long
  if (parts.length === 0 && location.lat && location.lon) {
    return `${location.lat.toFixed(2)}°N, ${location.lon.toFixed(2)}°E`;
  }
  
  return parts.join(', ');
};

// Helper function to parse alert text
const parseAlertText = (alertText) => {
  const result = {
    title: '',
    message: '',
    severity: 'warning',
    areas: []
  };

  // Try to extract the title (usually the first line or until the first period)
  const titleMatch = alertText.match(/^([^.]+)/);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
  }

  // Extract severity keywords
  if (alertText.toLowerCase().includes('severe') || 
      alertText.toLowerCase().includes('warning')) {
    result.severity = 'severe';
  } else if (alertText.toLowerCase().includes('watch')) {
    result.severity = 'watch';
  }

  // Extract message (everything after the title)
  result.message = alertText.replace(result.title, '').trim();

  // Extract affected areas
  const locationMatch = alertText.match(/Locations impacted include\.\.\.(.*?)(?=\*|$)/s);
  if (locationMatch) {
    result.areas = locationMatch[1]
      .split(',')
      .map(area => area.trim())
      .filter(area => area.length > 0);
  }

  return result;
};

// Get plant care recommendations based on weather
export const getPlantCareRecommendations = (weatherData, plant) => {
  const recommendations = [];
  
  // Check for rain in forecast
  const rainForecast = weatherData.forecast.find(day => 
    day.condition.toLowerCase().includes('rain') && day.precipitation > 50
  );
  
  if (rainForecast) {
    recommendations.push({
      type: 'watering',
      message: `Heavy rain expected on ${rainForecast.day}. You might not need to water your ${plant.name}.`,
    });
  }
  
  // Check for extreme temperatures
  const highTemp = weatherData.forecast.find(day => day.temp > 30);
  const lowTemp = weatherData.forecast.find(day => day.temp < 5);
  
  if (highTemp) {
    recommendations.push({
      type: 'temperature',
      message: `High temperatures expected on ${highTemp.day}. Consider moving your ${plant.name} away from direct sunlight and increase watering.`,
    });
  }
  
  if (lowTemp) {
    recommendations.push({
      type: 'temperature',
      message: `Low temperatures expected on ${lowTemp.day}. Consider moving your ${plant.name} away from cold windows.`,
    });
  }
  
  // Check humidity
  if (weatherData.current.humidity < 30) {
    recommendations.push({
      type: 'humidity',
      message: `Current humidity is low. Consider misting your ${plant.name} or using a humidifier.`,
    });
  }
  
  return recommendations;
};

export default {
  getCurrentLocation,
  fetchWeatherData,
  getPlantCareRecommendations,
};