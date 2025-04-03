import axios from 'axios';
import * as Location from 'expo-location';

// This service handles weather API integration
// In a production app, you would use a real weather API with your API key

const MOCK_WEATHER_DATA = {
  location: 'New York, NY',
  current: {
    temp: 22,
    humidity: 65,
    condition: 'Partly Cloudy',
    icon: '04d',
  },
  forecast: [
    { day: 'Today', temp: 22, condition: 'Partly Cloudy', icon: '04d', precipitation: 10 },
    { day: 'Tomorrow', temp: 25, condition: 'Sunny', icon: '01d', precipitation: 0 },
    { day: 'Wednesday', temp: 20, condition: 'Rain', icon: '10d', precipitation: 80 },
    { day: 'Thursday', temp: 18, condition: 'Rain', icon: '10d', precipitation: 60 },
    { day: 'Friday', temp: 21, condition: 'Partly Cloudy', icon: '04d', precipitation: 20 },
  ],
  alerts: [
    {
      type: 'rain',
      message: 'Heavy rain expected on Wednesday. Consider moving outdoor plants inside.',
    },
  ],
};

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

// Fetch weather data from API
export const fetchWeatherData = async (coordinates) => {
  try {
    // In a real app, you would use a real weather API
    // Example:
    // const response = await axios.get(
    //   `https://api.openweathermap.org/data/2.5/weather?lat=${coordinates.latitude}&lon=${coordinates.longitude}&units=metric&appid=YOUR_API_KEY`
    // );
    // return response.data;
    
    // For demo purposes, return mock data
    return MOCK_WEATHER_DATA;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
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