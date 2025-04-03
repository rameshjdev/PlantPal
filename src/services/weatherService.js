import axios from 'axios';
import * as Location from 'expo-location';

// WeatherAPI.com API key
// In a production app, you would store this in a secure environment variable
const API_KEY = 'ff54480d130646b6bd6183701250304'; // Replace with your actual API key
const BASE_URL = 'http://api.weatherapi.com/v1';

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
    
    // Get current position
    let location = await Location.getCurrentPositionAsync({});
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    throw error;
  }
};

// Fetch weather data from WeatherAPI.com
export const fetchWeatherData = async (coordinates) => {
  try {
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
    return formatWeatherData(response.data);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
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
    date: day.date
  }));
  
  // Format alerts if any
  const formattedAlerts = [];
  if (apiData.alerts && apiData.alerts.alert && apiData.alerts.alert.length > 0) {
    apiData.alerts.alert.forEach(alert => {
      formattedAlerts.push({
        type: alert.category.toLowerCase(),
        message: alert.desc,
      });
    });
  }
  
  // Return formatted data
  return {
    location: `${apiData.location.name}, ${apiData.location.region}`,
    current: {
      temp: Math.round(apiData.current.temp_c),
      humidity: apiData.current.humidity,
      condition: apiData.current.condition.text,
      icon: apiData.current.condition.icon,
      wind_kph: apiData.current.wind_kph,
      wind_dir: apiData.current.wind_dir,
      pressure_mb: apiData.current.pressure_mb,
      feelslike_c: apiData.current.feelslike_c,
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