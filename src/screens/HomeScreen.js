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
  const [expandedDay, setExpandedDay] = useState(null);
  const [plantCareSuggestions, setPlantCareSuggestions] = useState([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());
  const userPlants = useSelector(selectUserPlants);
  const popularPlants = useSelector(selectPopularPlants);
  const todayReminders = useSelector(selectTodayReminders);
  const plantCategories = useSelector(selectPlantCategories);

  // Plant type thresholds
  const PLANT_THRESHOLDS = {
    tropical: {
      minTemp: 18,
      maxTemp: 30,
      minHumidity: 60,
      maxHumidity: 90,
      light: 'bright indirect',
      watering: 'frequent'
    },
    succulent: {
      minTemp: 10,
      maxTemp: 35,
      minHumidity: 30,
      maxHumidity: 50,
      light: 'direct',
      watering: 'sparse'
    },
    temperate: {
      minTemp: 5,
      maxTemp: 25,
      minHumidity: 40,
      maxHumidity: 70,
      light: 'partial',
      watering: 'moderate'
    },
    desert: {
      minTemp: 15,
      maxTemp: 40,
      minHumidity: 20,
      maxHumidity: 40,
      light: 'direct',
      watering: 'very sparse'
    }
  };

  // Helper function to get plant type
  const getPlantType = (plant) => {
    if (!plant || !plant.category) return 'temperate';
    
    const category = typeof plant.category === 'string' 
      ? plant.category.toLowerCase() 
      : Array.isArray(plant.category) 
        ? plant.category[0]?.toLowerCase() 
        : '';
    
    if (category.includes('tropical')) return 'tropical';
    if (category.includes('succulent')) return 'succulent';
    if (category.includes('cactus')) return 'desert';
    return 'temperate';
  };

  const generatePlantCareSuggestions = (weatherData, plants) => {
    const suggestions = [];
    
    // Check current weather conditions
    if (weatherData.current && Array.isArray(plants)) {
      // Temperature checks for each plant type
      plants.forEach(plant => {
        if (!plant || !plant.id || !plant.name) return;
        
        const plantType = getPlantType(plant);
        const thresholds = PLANT_THRESHOLDS[plantType];
        
        if (!thresholds) return;
        
        if (weatherData.current.temp > thresholds.maxTemp) {
          suggestions.push({
            id: `high-temp-${plant.id}`,
            icon: 'thermometer',
            message: `${plant.name} is sensitive to high temperatures. Move to a cooler spot.`,
            priority: 'high',
            type: 'temperature',
            plantId: plant.id,
            plantName: plant.name
          });
        }
        
        if (weatherData.current.temp < thresholds.minTemp) {
          suggestions.push({
            id: `low-temp-${plant.id}`,
            icon: 'snow',
            message: `${plant.name} needs protection from cold temperatures.`,
            priority: 'high',
            type: 'temperature',
            plantId: plant.id,
            plantName: plant.name
          });
        }
        
        if (weatherData.current.humidity < thresholds.minHumidity) {
          suggestions.push({
            id: `low-humidity-${plant.id}`,
            icon: 'water',
            message: `${plant.name} needs higher humidity. Consider misting or using a humidifier.`,
            priority: 'medium',
            type: 'humidity',
            plantId: plant.id,
            plantName: plant.name
          });
        }
        
        if (weatherData.current.uv > 6 && thresholds.light !== 'direct') {
          suggestions.push({
            id: `high-uv-${plant.id}`,
            icon: 'sunny',
            message: `${plant.name} needs protection from intense sunlight.`,
            priority: 'medium',
            type: 'light',
            plantId: plant.id,
            plantName: plant.name
          });
        }
      });

      // Rain chance and watering schedule
      if (weatherData.current.chance_of_rain > 50) {
        const outdoorPlants = plants.filter(p => p.location?.toLowerCase().includes('outdoor'));
        if (outdoorPlants.length > 0) {
          suggestions.push({
            id: 'rain-warning',
            icon: 'rainy',
            message: `Skip watering for outdoor plants: ${outdoorPlants.map(p => p.name).join(', ')}`,
            priority: 'medium',
            type: 'watering',
            plantIds: outdoorPlants.map(p => p.id)
          });
        }
      }

      // Watering schedule based on plant type and weather
      plants.forEach(plant => {
        const plantType = getPlantType(plant);
        const thresholds = PLANT_THRESHOLDS[plantType];
        
        if (weatherData.current.temp > 25 && thresholds.watering === 'frequent') {
          suggestions.push({
            id: `watering-${plant.id}`,
            icon: 'water',
            message: `${plant.name} needs extra watering due to high temperatures.`,
            priority: 'medium',
            type: 'watering',
            plantId: plant.id,
            plantName: plant.name
          });
        }
      });
    }

    // Check tomorrow's forecast
    if (weatherData.nextDay) {
      // Temperature change warning
      const tempChange = Math.abs(weatherData.nextDay.temp - weatherData.current.temp);
      if (tempChange > 10) {
        const affectedPlants = plants.filter(plant => {
          const plantType = getPlantType(plant);
          const thresholds = PLANT_THRESHOLDS[plantType];
          return Math.abs(weatherData.nextDay.temp - thresholds.minTemp) < 5 || 
                 Math.abs(weatherData.nextDay.temp - thresholds.maxTemp) < 5;
        });

        if (affectedPlants.length > 0) {
          suggestions.push({
            id: 'temp-change',
            icon: 'alert',
            message: `Significant temperature change tomorrow. Protect: ${affectedPlants.map(p => p.name).join(', ')}`,
            priority: 'high',
            type: 'temperature',
            plantIds: affectedPlants.map(p => p.id)
          });
        }
      }

      // Rain forecast
      if (weatherData.nextDay.chance_of_rain > 70) {
        const sensitivePlants = plants.filter(plant => {
          const plantType = getPlantType(plant);
          return plantType === 'succulent' || plantType === 'desert';
        });

        if (sensitivePlants.length > 0) {
          suggestions.push({
            id: 'heavy-rain',
            icon: 'rainy',
            message: `Heavy rain expected. Move indoors: ${sensitivePlants.map(p => p.name).join(', ')}`,
            priority: 'high',
            type: 'watering',
            plantIds: sensitivePlants.map(p => p.id)
          });
        }
      }
    }

    return suggestions;
  };

  const handleDismissSuggestion = (suggestionId) => {
    setDismissedSuggestions(prev => {
      const newSet = new Set(prev);
      newSet.add(suggestionId);
      return newSet;
    });
  };

  const scheduleNotification = (suggestion) => {
    if (suggestion.priority === 'high') {
      // Schedule notification for high priority suggestions
      const notification = {
        title: 'Plant Care Alert',
        body: suggestion.message,
        data: { suggestionId: suggestion.id, plantId: suggestion.plantId },
        trigger: { seconds: 3600 }, // 1 hour from now
      };
      // Implement notification scheduling here
      // You'll need to use a notification library like expo-notifications
    }
  };

  useEffect(() => {
    if (weatherData) {
      const suggestions = generatePlantCareSuggestions(weatherData, userPlants);
      const filteredSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.id));
      setPlantCareSuggestions(filteredSuggestions);
      
      // Schedule notifications for new high priority suggestions
      suggestions.forEach(suggestion => {
        if (suggestion.priority === 'high' && !dismissedSuggestions.has(suggestion.id)) {
          scheduleNotification(suggestion);
        }
      });
    }
  }, [weatherData, dismissedSuggestions, userPlants]);

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
    if (!weatherData?.nextDay) return null;

    return (
      <View style={styles.forecastContainer}>
        <Text style={styles.forecastTitle}>Tomorrow's Forecast</Text>
        <View style={styles.nextDayCard}>
          <Text style={styles.nextDayTemp}>{weatherData.nextDay.temp}°</Text>
          <Text style={styles.nextDayCondition}>{weatherData.nextDay.condition}</Text>
          <View style={styles.nextDayMetrics}>
            <View style={styles.metricItem}>
              <Ionicons name="water-outline" size={16} color="#00FF7F" />
              <Text style={styles.metricValue}>{weatherData.nextDay.humidity}%</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="rainy-outline" size={16} color="#00FF7F" />
              <Text style={styles.metricValue}>{weatherData.nextDay.chance_of_rain}%</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderPlantCareSuggestions = () => {
    if (plantCareSuggestions.length === 0) return null;

    return (
      <View style={styles.plantCareContainer}>
        <Text style={styles.plantCareTitle}>Plant Care Suggestions</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.plantCareScroll}
        >
          {plantCareSuggestions.map((suggestion) => (
            <View 
              key={suggestion.id} 
              style={[
                styles.plantCareCard,
                suggestion.priority === 'high' && styles.highPriorityCard
              ]}
            >
              <View style={styles.plantCareHeader}>
                <View style={styles.plantCareIconContainer}>
                  <Ionicons 
                    name={`${suggestion.icon}-outline`} 
                    size={24} 
                    color={suggestion.priority === 'high' ? '#FF453A' : '#00FF7F'} 
                  />
                </View>
                <TouchableOpacity 
                  style={styles.dismissButton}
                  onPress={() => handleDismissSuggestion(suggestion.id)}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.plantCareMessage}>{suggestion.message}</Text>
              {suggestion.plantId && (
                <TouchableOpacity 
                  style={styles.viewPlantButton}
                  onPress={() => navigation.navigate('PlantDetail', { plantId: suggestion.plantId })}
                >
                  <Text style={styles.viewPlantButtonText}>View Plant</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Update weather section render
  const renderWeatherSection = () => {
    if (!weatherDisplayEnabled) {
      console.log('Weather display is not enabled');
      return null;
    }

    if (!locationEnabled) {
      console.log('Location services are not enabled');
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
      console.log('Weather error:', localWeatherError || weatherError);
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
      console.log('Weather data is loading or not available');
      return (
        <View style={styles.weatherLoadingContainer}>
          <ActivityIndicator size="small" color="#00FF7F" />
          <Text style={styles.weatherLoadingText}>Loading weather data...</Text>
        </View>
      );
    }

    const renderWeatherCard = (isToday, data) => {
      return (
        <View style={styles.weatherCard}>
          <View style={styles.weatherCardHeader}>
            <Text style={styles.weatherCardTitle}>{isToday ? 'Today' : 'Tomorrow'}</Text>
            <View style={styles.weatherCardMain}>
              <Text style={styles.weatherCardTemp}>{data.temp}°</Text>
              <Text style={styles.weatherCardCondition}>{data.condition}</Text>
            </View>
            <View style={styles.weatherCardFooter}>
              <View style={styles.weatherCardMetric}>
                <Ionicons name="water-outline" size={16} color="#00FF7F" />
                <Text style={styles.weatherCardMetricText}>{data.humidity}%</Text>
              </View>
              <View style={styles.weatherCardMetric}>
                <Ionicons name="rainy-outline" size={16} color="#00FF7F" />
                <Text style={styles.weatherCardMetricText}>{data.chance_of_rain}%</Text>
              </View>
            </View>
          </View>
        </View>
      );
    };

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

          {/* Weather Cards */}
          <View style={styles.weatherCardsContainer}>
            {renderWeatherCard(true, weatherData.current)}
            {weatherData.nextDay && renderWeatherCard(false, weatherData.nextDay)}
          </View>

          {/* Plant Care Suggestions */}
          {renderPlantCareSuggestions()}
        </LinearGradient>
      </View>
    );
  };

  // Add forecast modal
  const renderForecastModal = () => {
    if (!selectedForecast) return null;

    return (
      <Modal
        visible={isForecastModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsForecastModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedForecast.day}</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setIsForecastModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
      {renderForecastModal()}
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
  weatherDetailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 255, 127, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  weatherDetailTextContainer: {
    flex: 1,
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
  forecastContainer: {
    marginTop: 24,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
  },
  forecastTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  nextDayCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
  },
  nextDayHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  nextDayTemp: {
    fontSize: 36,
    fontWeight: '600',
    color: '#00FF7F',
    marginBottom: 8,
  },
  nextDayCondition: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  nextDayMetrics: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    fontSize: 16,
    color: '#00FF7F',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    gap: 16,
  },
  modalTemperatureContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTemperatureText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#00FF7F',
  },
  modalConditionText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 4,
  },
  modalTempRange: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  modalTempRangeText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  modalDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '45%',
  },
  modalDetailTextContainer: {
    flex: 1,
  },
  modalDetailLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  modalDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  hourlyForecast: {
    marginTop: 16,
  },
  hourlyForecastTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  hourlyItem: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginRight: 12,
    minWidth: 80,
  },
  hourlyTime: {
    fontSize: 12,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  hourlyTemp: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00FF7F',
    marginBottom: 4,
  },
  hourlyCondition: {
    fontSize: 12,
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  rainChanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rainChanceText: {
    fontSize: 12,
    color: '#00FF7F',
  },
  weatherCardsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  weatherCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  weatherCardHeader: {
    alignItems: 'center',
  },
  weatherCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  weatherCardMain: {
    alignItems: 'center',
    marginBottom: 12,
  },
  weatherCardTemp: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  weatherCardCondition: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  weatherCardFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  weatherCardMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  weatherCardMetricText: {
    fontSize: 14,
    color: '#00FF7F',
    fontWeight: '500',
  },
  weatherCardDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  weatherDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weatherDetailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  weatherDetailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 255, 127, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  weatherDetailText: {
    flex: 1,
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
  plantCareContainer: {
    marginTop: 20,
  },
  plantCareTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  plantCareScroll: {
    paddingRight: 16,
  },
  plantCareCard: {
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 280,
  },
  highPriorityCard: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
  },
  plantCareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  plantCareIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 127, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantCareMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 12,
  },
  viewPlantButton: {
    backgroundColor: 'rgba(0, 255, 127, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  viewPlantButtonText: {
    color: '#00FF7F',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default HomeScreen;
