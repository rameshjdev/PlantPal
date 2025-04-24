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
        // Ensure cached data has forecast
        if (!parsedCache.weatherData.forecast) {
          console.log('Cached data missing forecast, fetching new data');
        } else {
          parsedCache.weatherData.location = formatLocation({ address: coordinates.address });
          return parsedCache.weatherData;
        }
      }
    }

    // Build query parameter
    const query = `${coordinates.latitude},${coordinates.longitude}`;
    
    // Make API request to get current weather and forecast
    const response = await axios.get(`${BASE_URL}/forecast.json`, {
      params: {
        key: API_KEY,
        q: query,
        days: 3, // Get 3 days of forecast
        aqi: 'no'
      }
    });
    
    console.log('Weather API Response:', response.data);
    
    // Format response data to match our app's structure
    const weatherData = formatWeatherData(response.data);
    
    console.log('Formatted Weather Data:', weatherData);
    
    // Update the location with our location service data
    weatherData.location = formatLocation({ address: coordinates.address });
    
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
      throw new Error(`Weather API error: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`);
    } else if (error.request) {
      throw new Error('No response from weather service. Please check your internet connection.');
    } else {
      throw error;
    }
  }
};

// Update the formatWeatherData function to include forecast data
const formatWeatherData = (apiData) => {
  console.log('API Data:', apiData);
  
  if (!apiData || !apiData.forecast || !apiData.forecast.forecastday) {
    console.error('Invalid API data structure:', apiData);
    return {
      location: formatLocation(apiData?.location),
      current: {
        temp: Math.round(apiData?.current?.temp_c || 0),
        humidity: apiData?.current?.humidity || 0,
        condition: apiData?.current?.condition?.text || 'Unknown',
        icon: apiData?.current?.condition?.icon || '',
        wind_kph: Math.round(apiData?.current?.wind_kph || 0),
        wind_dir: apiData?.current?.wind_dir || '',
        pressure_mb: apiData?.current?.pressure_mb || 0,
        feelslike_c: Math.round(apiData?.current?.feelslike_c || 0),
        uv: apiData?.current?.uv || 0,
        visibility_km: apiData?.current?.vis_km || 0,
        cloud: apiData?.current?.cloud || 0,
        precipitation: apiData?.current?.precip_mm || 0
      },
      nextDay: null,
      lastUpdated: new Date().toISOString()
    };
  }

  // Get tomorrow's forecast (index 1 in the array)
  const tomorrowForecast = apiData.forecast.forecastday[1];
  const nextDay = tomorrowForecast ? {
    date: tomorrowForecast.date,
    day: 'Tomorrow',
    temp: Math.round(tomorrowForecast.day.avgtemp_c),
    max_temp: Math.round(tomorrowForecast.day.maxtemp_c),
    min_temp: Math.round(tomorrowForecast.day.mintemp_c),
    condition: tomorrowForecast.day.condition.text,
    icon: tomorrowForecast.day.condition.icon,
    humidity: tomorrowForecast.day.avghumidity,
    wind_kph: Math.round(tomorrowForecast.day.maxwind_kph),
    precipitation: tomorrowForecast.day.totalprecip_mm,
    chance_of_rain: tomorrowForecast.day.daily_chance_of_rain,
    chance_of_snow: tomorrowForecast.day.daily_chance_of_snow,
    uv: tomorrowForecast.day.uv,
    sunrise: tomorrowForecast.astro.sunrise,
    sunset: tomorrowForecast.astro.sunset,
    moon_phase: tomorrowForecast.astro.moon_phase
  } : null;

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
      visibility_km: apiData.current.vis_km,
      cloud: apiData.current.cloud,
      precipitation: apiData.current.precip_mm
    },
    nextDay,
    lastUpdated: new Date().toISOString()
  };
};

// Helper function to format location
const formatLocation = (location) => {
  if (!location) return 'Unknown Location';
  
  const parts = [];
  
  // Use the address data from our location service if available
  if (location.address) {
    if (location.address.city && location.address.city.trim()) {
      parts.push(location.address.city.trim());
    }
    if (location.address.region && location.address.region.trim() && 
        location.address.region.trim() !== location.address.city?.trim()) {
      parts.push(location.address.region.trim());
    }
    if (location.address.country && location.address.country.trim() && 
        location.address.country.trim() !== location.address.region?.trim()) {
      parts.push(location.address.country.trim());
    }
  } else {
    // Fallback to weather API location data
    if (location.name && location.name.trim()) {
      const cityName = location.name.trim();
      if (cityName.length > 20) {
        parts.push(cityName.substring(0, 20) + '...');
      } else {
        parts.push(cityName);
      }
    }
    
    if (location.region && location.region.trim() && 
        location.region.trim() !== location.name?.trim()) {
      const region = location.region.trim();
      if (region.length >= 2) {
        parts.push(region);
      }
    }
    
    if (location.country && location.country.trim() && 
        location.country.trim() !== location.region?.trim()) {
      const country = location.country.trim();
      if (country.length > 2) {
        parts.push(country);
      }
    }
  }
  
  // If we have no parts, try to use lat/long
  if (parts.length === 0) {
    if (location.lat && location.lon) {
      const lat = parseFloat(location.lat);
      const lon = parseFloat(location.lon);
      const latDir = lat >= 0 ? 'N' : 'S';
      const lonDir = lon >= 0 ? 'E' : 'W';
      return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`;
    }
    return 'Unknown Location';
  }
  
  // Join parts with comma and space, ensuring no double commas
  const formattedLocation = parts.filter(part => part).join(', ');
  
  // Handle special case where location might be too long
  if (formattedLocation.length > 50) {
    return formattedLocation.substring(0, 47) + '...';
  }
  
  return formattedLocation;
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