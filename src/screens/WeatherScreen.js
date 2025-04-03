import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWeather } from '../store/weatherSlice';
import { getCurrentLocation } from '../services/weatherService';

const WeatherScreen = () => {
  const dispatch = useDispatch();
  const { data: weatherData, status, lastUpdated } = useSelector((state) => state.weather);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  // Fetch weather data on component mount
  useEffect(() => {
    fetchWeatherData();
  }, []);

  // Generate plant care recommendations based on weather
  useEffect(() => {
    if (weatherData) {
      generateRecommendations();
    }
  }, [weatherData]);

  // Fetch weather data
  const fetchWeatherData = async () => {
    try {
      const location = await getCurrentLocation();
      dispatch(fetchWeather(location));
    } catch (error) {
      console.error('Error fetching weather data:', error);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWeatherData();
    setRefreshing(false);
  };

  // Generate plant care recommendations based on weather conditions
  const generateRecommendations = () => {
    const recommendations = [];
    
    // Check for rain in forecast
    const rainForecast = weatherData.forecast.find(day => 
      day.condition.toLowerCase().includes('rain') && day.precipitation > 50
    );
    
    if (rainForecast) {
      recommendations.push({
        type: 'watering',
        icon: '💧',
        title: 'Adjust Watering Schedule',
        message: `Heavy rain expected on ${rainForecast.day}. Consider skipping watering for outdoor plants.`,
      });
    }
    
    // Check for extreme temperatures
    const highTemp = weatherData.forecast.find(day => day.temp > 30);
    const lowTemp = weatherData.forecast.find(day => day.temp < 5);
    
    if (highTemp) {
      recommendations.push({
        type: 'temperature',
        icon: '🔥',
        title: 'Heat Protection',
        message: `High temperatures expected on ${highTemp.day}. Move sensitive plants away from direct sunlight and increase watering frequency.`,
      });
    }
    
    if (lowTemp) {
      recommendations.push({
        type: 'temperature',
        icon: '❄️',
        title: 'Cold Protection',
        message: `Low temperatures expected on ${lowTemp.day}. Consider moving outdoor plants inside or providing frost protection.`,
      });
    }
    
    // Check humidity
    if (weatherData.current.humidity < 30) {
      recommendations.push({
        type: 'humidity',
        icon: '💨',
        title: 'Low Humidity Alert',
        message: 'Current humidity is low. Consider misting your tropical plants or using a humidifier.',
      });
    } else if (weatherData.current.humidity > 80) {
      recommendations.push({
        type: 'humidity',
        icon: '💦',
        title: 'High Humidity Alert',
        message: 'Current humidity is high. Be careful not to overwater plants as soil will dry more slowly.',
      });
    }
    
    // Add any alerts from the weather API
    if (weatherData.alerts && weatherData.alerts.length > 0) {
      weatherData.alerts.forEach(alert => {
        recommendations.push({
          type: alert.type,
          icon: '⚠️',
          title: 'Weather Alert',
          message: alert.message,
        });
      });
    }
    
    setRecommendations(recommendations);
  };

  // Render weather icon based on condition
  const renderWeatherIcon = (condition, size = 24) => {
    const conditionLower = condition.toLowerCase();
    let iconName = 'weather-partly-cloudy';
    
    if (conditionLower.includes('sun') || conditionLower.includes('clear')) {
      iconName = 'weather-sunny';
    } else if (conditionLower.includes('cloud')) {
      iconName = 'weather-cloudy';
    } else if (conditionLower.includes('rain')) {
      iconName = 'weather-rainy';
    } else if (conditionLower.includes('snow')) {
      iconName = 'weather-snowy';
    } else if (conditionLower.includes('thunder') || conditionLower.includes('storm')) {
      iconName = 'weather-lightning-rainy';
    } else if (conditionLower.includes('fog') || conditionLower.includes('mist')) {
      iconName = 'weather-fog';
    }
    
    return <MaterialCommunityIcons name={iconName} size={size} color="#fff" />;
  };

  // Format date for last updated
  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    const date = new Date(lastUpdated);
    return `Last updated: ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Render loading state
  if (status === 'loading' && !weatherData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading weather data...</Text>
      </View>
    );
  }

  // Render error state
  if (status === 'failed') {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load weather data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchWeatherData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      {/* Weather Header */}
      <View style={styles.weatherHeader}>
        <View style={styles.currentWeather}>
          <View style={styles.weatherIcon}>
            {weatherData ? renderWeatherIcon(weatherData.current.condition, 72) : 
              <MaterialCommunityIcons name="weather-partly-cloudy" size={72} color="#fff" />}
          </View>
          <Text style={styles.temperature}>
            {weatherData ? `${weatherData.current.temp}°C` : '--°C'}
          </Text>
          <Text style={styles.condition}>
            {weatherData ? weatherData.current.condition : 'Unknown'}
          </Text>
          <Text style={styles.location}>
            {weatherData ? weatherData.location : 'Loading location...'}
          </Text>
          <Text style={styles.lastUpdated}>{formatLastUpdated()}</Text>
        </View>
      </View>

      {/* Forecast */}
      <View style={styles.forecastContainer}>
        <Text style={styles.sectionTitle}>5-Day Forecast</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.forecastScroll}
        >
          {weatherData && weatherData.forecast.map((day, index) => (
            <View key={index} style={styles.forecastDay}>
              <Text style={styles.forecastDayName}>{day.day}</Text>
              <View style={styles.forecastIcon}>{renderWeatherIcon(day.condition)}</View>
              <Text style={styles.forecastTemp}>{day.temp}°C</Text>
              <Text style={styles.forecastCondition}>{day.condition}</Text>
              <View style={styles.precipitationContainer}>
                <Text style={styles.precipitationIcon}>💧</Text>
                <Text style={styles.precipitationText}>{day.precipitation}%</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Plant Care Recommendations */}
      <View style={styles.recommendationsContainer}>
        <Text style={styles.sectionTitle}>Plant Care Recommendations</Text>
        {recommendations.length > 0 ? (
          recommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationCard}>
              <View style={styles.recommendationIconContainer}>
                <Text style={styles.recommendationIcon}>{recommendation.icon}</Text>
              </View>
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
                <Text style={styles.recommendationMessage}>{recommendation.message}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noRecommendationsContainer}>
            <Text style={styles.noRecommendationsText}>No special care recommendations for today!</Text>
            <Text style={styles.noRecommendationsSubtext}>Your plants should be fine with their regular care routine.</Text>
          </View>
        )}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#E53935',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  weatherHeader: {
    backgroundColor: '#2E7D32',
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      }
    }),
  },
  currentWeather: {
    alignItems: 'center',
  },
  weatherIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  temperature: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  condition: {
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 5,
  },
  location: {
    fontSize: 16,
    color: '#E8F5E9',
    marginBottom: 5,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#E8F5E9',
    opacity: 0.8,
  },
  forecastContainer: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333333',
  },
  forecastScroll: {
    marginBottom: 10,
  },
  forecastDay: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginRight: 15,
    alignItems: 'center',
    width: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  forecastDayName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333333',
  },
  forecastIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  forecastTemp: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  forecastCondition: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  precipitationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  precipitationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  precipitationText: {
    fontSize: 12,
    color: '#666666',
  },
  recommendationsContainer: {
    marginTop: 20,
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  recommendationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      }
    }),
  },
  recommendationIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F8E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  recommendationIcon: {
    fontSize: 24,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  recommendationMessage: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  noRecommendationsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noRecommendationsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  noRecommendationsSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
});

export default WeatherScreen;