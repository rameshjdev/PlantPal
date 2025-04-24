import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Platform, 
  FlatList,
  Image,
  StatusBar,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSelector, useDispatch } from 'react-redux';
import { createSelector } from 'reselect';
import { fetchPlants, removePlant } from '../store/plantsSlice';
import { fetchReminders } from '../store/remindersSlice';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { fetchWeather } from '../store/weatherSlice';
import { getCurrentLocation } from '../services/weatherService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Add getGreeting function
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

// Memoized selectors
const selectUserPlants = createSelector(
  state => state.plants.userPlants,
  userPlants => userPlants
);

const selectPopularPlants = createSelector(
  state => state.plants.plants,
  state => state.plants.userPlants,
  (plants, userPlants) => {
    if (!plants || plants.length === 0) return [];
    
    const userFavorites = userPlants.filter(p => p.isFavorite).map(p => p.id);
    const plantsWithScores = plants.map(plant => {
      let popularityScore = plant.cycle ? 
        (plant.cycle.includes('Perennial') ? 3 : 1) : 
        Math.floor(Math.random() * 5) + 1;
      
      if (userFavorites.includes(plant.id.toString())) {
        popularityScore += 3;
      }
      
      if (plant.careLevel && plant.careLevel.toLowerCase().includes('easy')) {
        popularityScore += 2;
      }
      
      if (plant.name && 
          (plant.name.toLowerCase().includes('monstera') ||
           plant.name.toLowerCase().includes('snake') ||
           plant.name.toLowerCase().includes('peace lily') ||
           plant.name.toLowerCase().includes('aloe'))) {
        popularityScore += 1;
      }
      
      return {
        ...plant,
        popularity: popularityScore
      };
    });
    
    return plantsWithScores
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 6);
  }
);

const selectTodayReminders = createSelector(
  state => state.reminders.reminders,
  state => state.plants.userPlants,
  (reminders, userPlants) => {
    const today = new Date().toISOString().split('T')[0];
    const userPlantIds = userPlants.map(plant => plant.id.toString());
    
    return reminders.filter(reminder => 
      reminder.nextDue === today && 
      reminder.enabled &&
      userPlantIds.includes(reminder.plantId.toString())
    );
  }
);

const selectPlantCategories = createSelector(
  state => state.plants.plants,
  allPlants => {
    // Extract unique categories from all plants
    const categories = allPlants.reduce((cats, plant) => {
      // Skip plants without a category or with null/undefined category
      if (!plant?.category) return cats;
      
      // Handle both array and string categories
      const plantCategories = Array.isArray(plant.category) ? plant.category : [plant.category];
      
      // Process each category for this plant
      plantCategories.forEach(category => {
        if (!category) return; // Skip null/undefined categories within array
        
        // Normalize category name (remove extra spaces, convert to lowercase)
        const normalizedCategory = category.toString().trim().toLowerCase();
        
        // Check if this category is already in our array
        const existingCat = cats.find(c => c.normalized === normalizedCategory);
        
        if (!existingCat) {
          cats.push({
            id: normalizedCategory.replace(/\s+/g, '-'),
            name: category, // Keep original case for display
            normalized: normalizedCategory,
            count: 1,
            image: plant.image || plant.default_image?.medium_url
          });
        } else {
          existingCat.count += 1;
          // Update image only if the current one is missing
          if (!existingCat.image && (plant.image || plant.default_image?.medium_url)) {
            existingCat.image = plant.image || plant.default_image?.medium_url;
          }
        }
      });
      
      return cats;
    }, []);
    
    // Sort categories by count (most plants first)
    return categories.sort((a, b) => b.count - a.count).slice(0, 10); // Limit to 10 categories
  }
);

// User Plant Item Component
const UserPlantItem = ({ plant, onRemove, onPress }) => {
  const getPlantImage = () => {
    if (!plant) return null;
    
    if (plant.default_image && plant.default_image.medium_url) {
      return { uri: plant.default_image.medium_url };
    }
    
    if (typeof plant.image === 'number') return plant.image;
    if (plant.image && plant.image.uri) return { uri: plant.image.uri };
    if (typeof plant.image === 'string') return { uri: plant.image };
    if (plant.image_url) return { uri: plant.image_url };
    
    return null;
  };
  
  const plantImage = getPlantImage();
  const hasValidImage = !!plantImage;

  
  return (
    <TouchableOpacity 
      style={styles.userPlantItem}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.userPlantCard}>
        {hasValidImage ? (
          <Image 
            source={plantImage} 
            style={styles.userPlantImage} 
            resizeMode="cover"
            onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
          />
        ) : (
          <View style={[styles.userPlantImage, styles.plantPlaceholder]}>
            <Ionicons name="leaf-outline" size={24} color="#4CAF50" />
          </View>
        )}
        
        <View style={styles.userPlantInfo}>
          <Text style={styles.userPlantName} numberOfLines={1}>{plant.name || plant.common_name}</Text>
          <Text style={styles.userPlantSpecies} numberOfLines={1}>{plant.species || 'Houseplant'}</Text>
          
          {plant.location && (
            <View style={styles.locationTag}>
              <Ionicons name="location-outline" size={12} color="#4CAF50" />
              <Text style={styles.locationText}>{plant.location}</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => onRemove(plant.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// Update CategoryCard component
const CategoryCard = ({ category }) => {
  const navigation = useNavigation();
  const theme = useTheme();
  
  const getCategoryColor = (categoryName) => {
    const colors = [
      '#00FF7F', '#FF6B6B', '#4ECDC4', '#FFD166',
      '#06D6A0', '#EF476F', '#118AB2', '#073B4C'
    ];
    
    const hash = categoryName.split('').reduce(
      (acc, char) => acc + char.charCodeAt(0), 0
    );
    
    return colors[hash % colors.length];
  };
  
  const categoryColor = getCategoryColor(category.normalized);
  
  return (
    <TouchableOpacity
      style={[styles.categoryCard, { borderColor: `${categoryColor}20` }]}
      onPress={() => navigation.navigate('CollectionView', { 
        filter: 'category',
        categoryName: category.name,
        showAllPlants: true
      })}
      activeOpacity={0.8}
    >
      <View style={[styles.categoryImageContainer, { backgroundColor: `${categoryColor}10` }]}>
        {category.image ? (
          <Image
            source={{ uri: category.image }}
            style={styles.categoryImage}
          />
        ) : (
          <View style={[styles.categoryIconContainer, { backgroundColor: `${categoryColor}15` }]}>
            <Ionicons name="leaf" size={32} color={categoryColor} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', `${categoryColor}30`]}
          style={styles.categoryGradient}
        />
      </View>
      
      <View style={styles.categoryInfo}>
        <Text style={[styles.categoryName, { color: categoryColor }]} numberOfLines={1}>
          {category.name}
        </Text>
        <View style={[styles.categoryCountContainer, { backgroundColor: `${categoryColor}15` }]}>
          <Text style={[styles.categoryCount, { color: categoryColor }]}>
            {category.count} plants
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const scrollY = new Animated.Value(0);
  const weatherData = useSelector(state => state.weather.data);
  const weatherStatus = useSelector(state => state.weather.status);
  const weatherError = useSelector(state => state.weather.error);
  const [locationError, setLocationError] = useState(null);
  const [localWeatherError, setLocalWeatherError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshRotation = useRef(new Animated.Value(0)).current;
  const [weatherDisplayEnabled, setWeatherDisplayEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [isForecastModalVisible, setIsForecastModalVisible] = useState(false);
  const [showDetailedForecast, setShowDetailedForecast] = useState(false);

  // Check location settings
  const checkLocationSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setLocationEnabled(settings.locationEnabled || false);
        setWeatherDisplayEnabled(settings.weatherEnabled || false);
        if (settings.weatherEnabled && !settings.locationEnabled) {
          setLocationError('Location services must be enabled in settings to display weather information.');
          return false;
        }
        return settings.locationEnabled || false;
      }
      return false;
    } catch (error) {
      console.error('Error checking location settings:', error);
      return false;
    }
  };

  // Effect for initial data loading
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setLocationError(null);
      setLocalWeatherError(null);
      
      try {
        // First fetch plants and reminders
        dispatch(fetchPlants());
        dispatch(fetchReminders());

        // Then check location settings and handle weather data
        const hasLocationEnabled = await checkLocationSettings();
        if (hasLocationEnabled) {
          try {
            const location = await getCurrentLocation();
            if (location) {
              dispatch(fetchWeather(location));
            }
          } catch (weatherErr) {
            console.error('Error fetching weather:', weatherErr);
            setLocalWeatherError(weatherErr.message || 'Failed to fetch weather data');
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load plants data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [dispatch]);

  // Effect for weather display settings changes
  useEffect(() => {
    const loadWeatherSetting = async () => {
      await checkLocationSettings();
    };

    loadWeatherSetting();

    // Add listener for when the screen comes into focus
    const unsubscribe = navigation.addListener('focus', loadWeatherSetting);
    return unsubscribe;
  }, [navigation]);

  const userPlants = useSelector(selectUserPlants);
  const popularPlants = useSelector(selectPopularPlants);
  const todayReminders = useSelector(selectTodayReminders);
  const plantCategories = useSelector(selectPlantCategories);
  
  const handleRemovePlant = (plantId) => {
    Alert.alert(
      "Remove Plant",
      "Are you sure you want to remove this plant from your collection?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Remove", 
          onPress: () => {
            dispatch(removePlant(plantId));
          },
          style: "destructive"
        }
      ]
    );
  };
  
  const navigateToPlantDetail = (plantId) => {
    navigation.navigate('PlantDetail', { plantId });
  };

  const navigateToCategory = (categoryName) => {
    // Navigate to a filtered view of all plants by category, not just user's collection
    navigation.navigate('CollectionView', { 
      filter: 'category',
      categoryName: categoryName,
      showAllPlants: true  // Add this flag to indicate we want to show all plants, not just user's
    });
  };

  const renderPopularPlant = ({ item }) => {
    const plantImage = typeof item.image === 'number' ? item.image : 
                      item.image && item.image.uri ? { uri: item.image.uri } :
                      typeof item.image === 'string' ? { uri: item.image } :
                      item.image_url ? { uri: item.image_url } :
                      require('../../assets/monstera.png');

    return (
      <TouchableOpacity 
        style={styles.popularPlantCard}
        onPress={() => navigateToPlantDetail(item.id)}
      >
        <View style={styles.popularPlantImageContainer}>
          <Image 
            source={plantImage} 
            style={styles.popularPlantImage} 
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.popularPlantGradient}
          />
        </View>
        <View style={styles.popularPlantInfo}>
          <Text style={styles.popularPlantName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.popularPlantSpecies} numberOfLines={1}>{item.species || 'Houseplant'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderReminderItem = ({ item }) => {
    const plant = item.plantId ? 
      userPlants.find(p => p.id.toString() === item.plantId.toString()) : null;
    
    const getPlantImage = () => {
      if (!plant) return null;
      
      if (plant.default_image && plant.default_image.medium_url) {
        return { uri: plant.default_image.medium_url };
      }
      
      if (typeof plant.image === 'number') return plant.image;
      if (plant.image && plant.image.uri) return { uri: plant.image.uri };
      if (typeof plant.image === 'string') return { uri: plant.image };
      
      return null;
    };
    
    const plantImage = getPlantImage();
    const hasImage = !!plantImage;
    
    const getReminderTitle = () => {
      if (item.title) return item.title;
      
      switch(item.type) {
        case 'watering':
          return `Water your ${item.plantName || (plant ? (plant.name || plant.common_name) : 'plant')}`;
        case 'fertilizing':
          return `Fertilize your ${item.plantName || (plant ? (plant.name || plant.common_name) : 'plant')}`;
        case 'pruning':
          return `Prune your ${item.plantName || (plant ? (plant.name || plant.common_name) : 'plant')}`;
        default:
          return `${item.plantName || (plant ? (plant.name || plant.common_name) : 'plant')} care`;
      }
    };
    
    return (
      <TouchableOpacity 
        style={styles.reminderItem}
        onPress={() => navigation.navigate('ReminderDetail', { reminderId: item.id })}
      >
        {hasImage ? (
          <Image 
            source={plantImage} 
            style={styles.reminderImage} 
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.reminderImage, styles.reminderPlaceholder]}>
            <Text style={styles.reminderPlaceholderText}>
              {item.plantName ? item.plantName.charAt(0) : (plant ? plant.name.charAt(0) : "P")}
            </Text>
          </View>
        )}
        <View style={styles.reminderInfo}>
          <Text style={styles.reminderTitle}>
            {getReminderTitle()}
          </Text>
          <Text style={styles.reminderSubtitle} numberOfLines={2}>
            {item.notes || (item.frequency === 'weekly' 
              ? 'Weekly care task' 
              : item.frequency === 'biweekly' 
                ? 'Every two weeks' 
                : item.frequency === 'monthly'
                  ? 'Monthly care task'
                  : 'Regular plant care')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#757575" />
      </TouchableOpacity>
    );
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  // Add refresh animation
  const startRefreshAnimation = () => {
    refreshRotation.setValue(0);
    Animated.loop(
      Animated.timing(refreshRotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();
  };

  const stopRefreshAnimation = () => {
    refreshRotation.stopAnimation();
    refreshRotation.setValue(0);
  };

  // Update refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    startRefreshAnimation();
    try {
      const location = await getCurrentLocation();
      if (location) {
        dispatch(fetchWeather(location));
      }
    } catch (err) {
      console.error('Error refreshing weather:', err);
      setLocalWeatherError(err.message || 'Failed to refresh weather data');
    } finally {
      setIsRefreshing(false);
      stopRefreshAnimation();
    }
  };

  // Create rotate interpolation
  const spin = refreshRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const renderForecastView = () => {
    if (!weatherData?.forecast) return null;

    return (
      <View style={styles.forecastContainer}>
        <View style={styles.forecastHeader}>
          <Text style={styles.forecastTitle}>3-Day Forecast</Text>
          <TouchableOpacity 
            style={styles.forecastToggleButton}
            onPress={() => setShowDetailedForecast(!showDetailedForecast)}
          >
            <Text style={styles.forecastToggleText}>
              {showDetailedForecast ? 'Show Summary' : 'Show Details'}
            </Text>
            <Ionicons 
              name={showDetailedForecast ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#00FF7F" 
            />
          </TouchableOpacity>
        </View>

        {showDetailedForecast ? (
          <View style={styles.detailedForecastContainer}>
            {weatherData.forecast.slice(0, 3).map((day, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.detailedForecastCard}
                onPress={() => {
                  setSelectedForecast(day);
                  setIsForecastModalVisible(true);
                }}
              >
                <LinearGradient
                  colors={['rgba(0, 255, 127, 0.1)', 'rgba(0, 255, 127, 0.05)']}
                  style={styles.detailedForecastGradient}
                >
                  <View style={styles.detailedForecastHeader}>
                    <Text style={styles.detailedForecastDay}>{day.day}</Text>
                    <Text style={styles.detailedForecastDate}>
                      {new Date(day.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </View>

                  <View style={styles.detailedForecastContent}>
                    <View style={styles.detailedForecastMain}>
                      <Text style={styles.detailedForecastTemp}>{day.temp}°</Text>
                      <Text style={styles.detailedForecastCondition}>{day.condition}</Text>
                    </View>

                    <View style={styles.detailedForecastDetails}>
                      <View style={styles.detailedForecastDetailItem}>
                        <Ionicons name="water-outline" size={16} color="#00FF7F" />
                        <Text style={styles.detailedForecastDetailText}>{day.humidity}%</Text>
                      </View>
                      <View style={styles.detailedForecastDetailItem}>
                        <Ionicons name="speedometer-outline" size={16} color="#00FF7F" />
                        <Text style={styles.detailedForecastDetailText}>{day.wind_kph} km/h</Text>
                      </View>
                      <View style={styles.detailedForecastDetailItem}>
                        <Ionicons name="rainy-outline" size={16} color="#00FF7F" />
                        <Text style={styles.detailedForecastDetailText}>{day.precipitation}%</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.forecastScrollContent}
          >
            {weatherData.forecast.slice(0, 3).map((day, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.forecastDayContainer}
                onPress={() => {
                  setSelectedForecast(day);
                  setIsForecastModalVisible(true);
                }}
              >
                <LinearGradient
                  colors={['rgba(0, 255, 127, 0.1)', 'rgba(0, 255, 127, 0.05)']}
                  style={styles.forecastGradient}
                >
                  <Text style={styles.forecastDayText}>{day.day}</Text>
                  <Text style={styles.forecastTempText}>{day.temp}°</Text>
                  <Text style={styles.forecastConditionText}>{day.condition}</Text>
                  {day.precipitation > 0 && (
                    <View style={styles.rainChanceContainer}>
                      <Ionicons name="rainy-outline" size={12} color="#00FF7F" />
                      <Text style={styles.rainChanceText}>{day.precipitation}%</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  // Update weather section render
  const renderWeatherSection = () => {
    if (!weatherDisplayEnabled) {
      return null;
    }

    if (!locationEnabled) {
      return (
        <View style={styles.weatherErrorContainer}>
          <Ionicons name="location-off-outline" size={24} color="#FF453A" />
          <Text style={styles.weatherErrorText}>Location services must be enabled to display weather information.</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.retryButtonText}>Enable Location</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (localWeatherError || weatherError) {
      return (
        <View style={styles.weatherErrorContainer}>
          <Ionicons name="cloud-offline-outline" size={24} color="#FF453A" />
          <Text style={styles.weatherErrorText}>{localWeatherError || weatherError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (weatherStatus === 'loading' || !weatherData) {
      return (
        <View style={styles.weatherLoadingContainer}>
          <ActivityIndicator size="small" color="#00FF7F" />
          <Text style={styles.weatherLoadingText}>Loading weather data...</Text>
        </View>
      );
    }

    return (
      <View style={styles.weatherSection}>
        <LinearGradient
          colors={['#1A1A1A', '#000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.weatherGradient}
        >
          {/* Header with Location and Refresh */}
          <View style={styles.weatherHeader}>
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={20} color="#00FF7F" />
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationText}>{weatherData.location}</Text>
                <Text style={styles.locationTimestamp}>
                  Updated {new Date(weatherData.lastUpdated).toLocaleTimeString()}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={handleRefresh}
              disabled={isRefreshing}
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name="refresh-outline" size={20} color="#00FF7F" />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Current Weather Card */}
          <View style={styles.currentWeatherCard}>
            <View style={styles.temperatureContainer}>
              <Text style={styles.temperatureText}>{weatherData.current.temp}°</Text>
              <Text style={styles.conditionText}>{weatherData.current.condition}</Text>
            </View>
            
            {/* Weather Details Grid */}
            <View style={styles.weatherDetailsGrid}>
              <View style={styles.weatherDetailItem}>
                <Ionicons name="water-outline" size={20} color="#00FF7F" />
                <View style={styles.weatherDetailTextContainer}>
                  <Text style={styles.weatherDetailLabel}>Humidity</Text>
                  <Text style={styles.weatherDetailValue}>{weatherData.current.humidity}%</Text>
                </View>
              </View>
              <View style={styles.weatherDetailItem}>
                <Ionicons name="speedometer-outline" size={20} color="#00FF7F" />
                <View style={styles.weatherDetailTextContainer}>
                  <Text style={styles.weatherDetailLabel}>Wind</Text>
                  <Text style={styles.weatherDetailValue}>{weatherData.current.wind_kph} km/h</Text>
                </View>
              </View>
              <View style={styles.weatherDetailItem}>
                <Ionicons name="thermometer-outline" size={20} color="#00FF7F" />
                <View style={styles.weatherDetailTextContainer}>
                  <Text style={styles.weatherDetailLabel}>Feels Like</Text>
                  <Text style={styles.weatherDetailValue}>{weatherData.current.feelslike_c}°</Text>
                </View>
              </View>
              <View style={styles.weatherDetailItem}>
                <Ionicons name="sunny-outline" size={20} color="#00FF7F" />
                <View style={styles.weatherDetailTextContainer}>
                  <Text style={styles.weatherDetailLabel}>UV Index</Text>
                  <Text style={styles.weatherDetailValue}>{weatherData.current.uv}</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FF7F" />
        <Text style={styles.loadingText}>Loading plants data...</Text>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF453A" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setIsLoading(true);
            dispatch(fetchPlants()).finally(() => setIsLoading(false));
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      {/* Modern Animated Header */}
      <Animated.View style={[
        styles.header,
        {
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslateY }]
        }
      ]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.displayName || 'Plant Lover'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      <Animated.ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.contentContainer}>
          {/* Weather Section */}
          {renderWeatherSection()}

          {/* Quick Actions Section */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.careRemindersCard}
              onPress={() => navigation.navigate('AllAlerts')}
            >
              <LinearGradient
                colors={['#00FF7F', '#00CC66']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.careRemindersGradient}
              >
                <View style={styles.careRemindersContent}>
                  <View style={styles.careRemindersIconContainer}>
                    <Ionicons name="notifications-outline" size={28} color="#FFFFFF" />
                  </View>
                  <View style={styles.careRemindersTextContainer}>
                    <Text style={styles.careRemindersTitle}>Care Reminders</Text>
                    <Text style={styles.careRemindersSubtitle}>{todayReminders.length} tasks for today</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* My Collection Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Collection</Text>
            {userPlants.length > 0 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('CollectionView')}
              >
                <Text style={styles.viewAllButtonText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.myPlantsSection}>
            <LinearGradient
              colors={['#1A1A1A', '#000000']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.myPlantsGradient}
            >
              <View style={styles.plantStatsContainer}>
                <View style={styles.plantStatCard}>
                  <View style={styles.plantStatIconContainer}>
                    <Ionicons name="leaf-outline" size={22} color="#00FF7F" />
                  </View>
                  <View style={styles.plantStatTextContainer}>
                    <Text style={styles.plantStatNumber}>{userPlants.length}</Text>
                    <Text style={styles.plantStatLabel}>Total Plants</Text>
                  </View>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.plantStatCard}>
                  <View style={styles.plantStatIconContainer}>
                    <Ionicons name="heart-outline" size={22} color="#00FF7F" />
                  </View>
                  <View style={styles.plantStatTextContainer}>
                    <Text style={styles.plantStatNumber}>
                      {userPlants.filter(p => p.isFavorite).length}
                    </Text>
                    <Text style={styles.plantStatLabel}>Favorites</Text>
                  </View>
                </View>
              </View>
              
              {userPlants.length > 0 ? (
                <FlatList
                  data={userPlants.slice(0, 3)}
                  renderItem={({ item }) => (
                    <UserPlantItem 
                      plant={item} 
                      onRemove={handleRemovePlant}
                      onPress={() => navigateToPlantDetail(item.id)}
                    />
                  )}
                  keyExtractor={item => item.id.toString()}
                  scrollEnabled={false}
                  contentContainerStyle={styles.userPlantsList}
                />
              ) : (
                <View style={styles.emptyCollectionContainer}>
                  <Ionicons name="leaf-outline" size={48} color="#00FF7F" />
                  <Text style={styles.emptyCollectionText}>Your collection is empty</Text>
                  <Text style={styles.emptyCollectionSubtext}>Scan a plant to add it to your collection</Text>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* Categories Section */}
          {plantCategories.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Categories</Text>
              </View>
              
              <FlatList
                data={plantCategories}
                renderItem={({ item }) => (
                  <CategoryCard 
                    category={item} 
                  />
                )}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
                ItemSeparatorComponent={() => <View style={{width: 16}} />}
              />
            </>
          )}

          {/* Popular Plants Section */}
          {popularPlants.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Popular Plants</Text>
              </View>
              
              <FlatList
                data={popularPlants}
                renderItem={renderPopularPlant}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.popularPlantsContainer}
                decelerationRate="fast"
                snapToInterval={width * 0.65 + 16}
                snapToAlignment="center"
                ItemSeparatorComponent={() => <View style={{width: 16}} />}
              />
            </>
          )}
          
          {/* Today's Care Section */}
          {todayReminders.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Care</Text>
              </View>
              
              <View style={styles.remindersContainer}>
                {todayReminders.map((reminder, index) => (
                  <View key={`reminder-${reminder.id}-${index}`}>
                    {renderReminderItem({ item: reminder })}
                  </View>
                ))}
              </View>
            </>
          )}
          
          {/* Bottom Space */}
          <View style={styles.bottomSpace} />
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#00FF7F',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF453A',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#00FF7F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: '#1A1A1A',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 120 : 110,
    paddingBottom: Platform.OS === 'ios' ? 90 : 80,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  quickActionsContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  careRemindersCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  careRemindersGradient: {
    padding: 16,
  },
  careRemindersContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  careRemindersIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  careRemindersTextContainer: {
    flex: 1,
  },
  careRemindersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  careRemindersSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  viewAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  viewAllButtonText: {
    fontSize: 14,
    color: '#00FF7F',
    fontWeight: '600',
  },
  myPlantsSection: {
    marginBottom: 24,
  },
  myPlantsGradient: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  plantStatsContainer: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  plantStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  plantStatIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  plantStatTextContainer: {
    flex: 1,
  },
  plantStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  plantStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'center',
    marginHorizontal: 16,
  },
  userPlantsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  userPlantItem: {
    marginBottom: 12,
  },
  userPlantCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userPlantImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  plantPlaceholder: {
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userPlantInfo: {
    flex: 1,
  },
  userPlantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userPlantSpecies: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 6,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  locationText: {
    fontSize: 12,
    color: '#00FF7F',
    marginLeft: 4,
  },
  removeButton: {
    padding: 8,
  },
  emptyCollectionContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCollectionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCollectionSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  popularPlantsContainer: {
    paddingLeft: 16,
    paddingRight: 8,
    marginBottom: 24,
  },
  popularPlantCard: {
    width: width * 0.65,
    height: 220,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  popularPlantImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  popularPlantImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  popularPlantGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'flex-end',
    padding: 16,
  },
  popularPlantInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  popularPlantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  popularPlantSpecies: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  remindersContainer: {
    paddingHorizontal: 16,
  },
  reminderItem: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reminderImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  reminderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  reminderSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  bottomSpace: {
    height: 100,
  },
  categoriesContainer: {
    paddingLeft: 16,
    paddingRight: 8,
    marginBottom: 24,
  },
  categoryCard: {
    width: 160,
    height: 220,
    marginRight: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  categoryImageContainer: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  categoryGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  categoryInfo: {
    padding: 16,
    backgroundColor: '#1A1A1A',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryCountContainer: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  weatherSection: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  weatherGradient: {
    padding: 20,
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    padding: 12,
    borderRadius: 16,
    flex: 1,
    marginRight: 12,
  },
  locationTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  locationTimestamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentWeatherCard: {
    backgroundColor: 'rgba(0, 255, 127, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  temperatureContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  temperatureText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  conditionText: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  weatherDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  weatherDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    padding: 12,
    borderRadius: 16,
    flex: 1,
    minWidth: '45%',
  },
  weatherDetailTextContainer: {
    marginLeft: 12,
  },
  weatherDetailLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  weatherDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  forecastCard: {
    backgroundColor: 'rgba(0, 255, 127, 0.05)',
    borderRadius: 20,
    padding: 20,
  },
  forecastTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  forecastGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  forecastItem: {
    flex: 1,
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  forecastDay: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  forecastTemp: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  forecastCondition: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 8,
  },
  forecastDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  forecastDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 127, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  forecastDetailText: {
    marginLeft: 2,
    fontSize: 10,
    color: '#00FF7F',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 127, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalBody: {
    padding: 20,
  },
  modalTemperatureContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTemperatureText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalConditionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  modalTempRange: {
    flexDirection: 'row',
    gap: 12,
  },
  modalTempRangeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  modalDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    padding: 12,
    borderRadius: 16,
    flex: 1,
    minWidth: '45%',
  },
  modalDetailTextContainer: {
    marginLeft: 12,
  },
  modalDetailLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  modalDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  hourlyForecast: {
    marginTop: 20,
  },
  hourlyForecastTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  hourlyItem: {
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    padding: 12,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  hourlyTime: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  hourlyTemp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  hourlyCondition: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 4,
  },
  rainChanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 127, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rainChanceText: {
    marginLeft: 2,
    fontSize: 10,
    color: '#00FF7F',
  },
});

export default HomeScreen;
