import React, { useState, useEffect } from 'react';
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
  Alert
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

const { width } = Dimensions.get('window');

// Memoized selectors
const selectUserPlants = createSelector(
  state => state.plants.userPlants,
  userPlants => userPlants
);

const selectPopularPlants = createSelector(
  state => state.plants.plants,
  state => state.plants.userPlants,
  (plants, userPlants) => {
    // If we don't have any plants, return empty array
    if (!plants || plants.length === 0) {
      return [];
    }
    
    // If we have user plants, use their favorite status to influence popularity
    const userFavorites = userPlants.filter(p => p.isFavorite).map(p => p.id);

    // Map to add popularity scores
    const plantsWithScores = plants.map(plant => {
      // Base popularity score - use cycle if present or random if not
      let popularityScore = plant.cycle ? 
        (plant.cycle.includes('Perennial') ? 3 : 1) : 
        Math.floor(Math.random() * 5) + 1;
      
      // Boost score for plants that user has favorited
      if (userFavorites.includes(plant.id.toString())) {
        popularityScore += 3;
      }
      
      // Boost score for plants with specific characteristics
      if (plant.careLevel && plant.careLevel.toLowerCase().includes('easy')) {
        popularityScore += 2; // Easy care plants are popular
      }
      
      if (plant.name && 
          (plant.name.toLowerCase().includes('monstera') ||
           plant.name.toLowerCase().includes('snake') ||
           plant.name.toLowerCase().includes('peace lily') ||
           plant.name.toLowerCase().includes('aloe'))) {
        popularityScore += 1; // Commonly popular houseplants
      }
      
      return {
        ...plant,
        popularity: popularityScore
      };
    });
    
    // Sort by popularity score and take top 6
    return plantsWithScores
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 6);
  }
);

const selectPlantCategories = createSelector(
  state => state.plants.plants,
  state => state.plants.userPlants,
  (plants, userPlants) => {
    // Initialize category objects with empty arrays that will hold the actual plants
    const categories = {
      'Indoor Plants': [],
      'Outdoor Plants': [],
      'Low Light Plants': [],
      'Succulents': [],
      'Flowering Plants': [],
      'Easy Care': [],
      'Pet Friendly': [],
      'Tropical Plants': [],
      'Herbs': [],
      'Air Purifying': []
    };
    
    // Only proceed if we have plants data
    if (plants && plants.length > 0) {
      // Keep track of which plants have been added to which categories to avoid duplicates
      const categoryPlantIds = {};
      Object.keys(categories).forEach(category => {
        categoryPlantIds[category] = new Set();
      });
      
      plants.forEach(plant => {
        const plantId = String(plant.id);
        
        // Indoor vs Outdoor based on light requirements or sunlight
        if (plant.sunlight && Array.isArray(plant.sunlight)) {
          const sunlightLevels = plant.sunlight.join(' ').toLowerCase();
          if (sunlightLevels.includes('part shade') || sunlightLevels.includes('filtered') || 
              sunlightLevels.includes('low light') || sunlightLevels.includes('medium')) {
            if (!categoryPlantIds['Indoor Plants'].has(plantId)) {
              categories['Indoor Plants'].push(plant);
              categoryPlantIds['Indoor Plants'].add(plantId);
            }
          } 
          if (sunlightLevels.includes('full sun')) {
            if (!categoryPlantIds['Outdoor Plants'].has(plantId)) {
              categories['Outdoor Plants'].push(plant);
              categoryPlantIds['Outdoor Plants'].add(plantId);
            }
          }
          
          if (sunlightLevels.includes('low') || sunlightLevels.includes('shade')) {
            if (!categoryPlantIds['Low Light Plants'].has(plantId)) {
              categories['Low Light Plants'].push(plant);
              categoryPlantIds['Low Light Plants'].add(plantId);
            }
          }
        } else if (plant.light) {
          const lightLevel = plant.light.toLowerCase();
          if (lightLevel.includes('low') || lightLevel.includes('indirect')) {
            if (!categoryPlantIds['Indoor Plants'].has(plantId)) {
              categories['Indoor Plants'].push(plant);
              categoryPlantIds['Indoor Plants'].add(plantId);
            }
            if (!categoryPlantIds['Low Light Plants'].has(plantId)) {
              categories['Low Light Plants'].push(plant);
              categoryPlantIds['Low Light Plants'].add(plantId);
            }
          } 
          if (lightLevel.includes('full sun')) {
            if (!categoryPlantIds['Outdoor Plants'].has(plantId)) {
              categories['Outdoor Plants'].push(plant);
              categoryPlantIds['Outdoor Plants'].add(plantId);
            }
          }
        }
        
        // Succulents based on watering frequency or type
        if ((plant.water && plant.water.toLowerCase().includes('2-3 weeks')) || 
            (plant.watering && plant.watering.toLowerCase().includes('minimum'))) {
          if (!categoryPlantIds['Succulents'].has(plantId)) {
            categories['Succulents'].push(plant);
            categoryPlantIds['Succulents'].add(plantId);
          }
        }
        
        // Flowering plants based on name or type
        if (plant.name && 
            (plant.name.toLowerCase().includes('lily') || 
             plant.name.toLowerCase().includes('rose') || 
             plant.name.toLowerCase().includes('orchid') ||
             plant.name.toLowerCase().includes('flower'))) {
          if (!categoryPlantIds['Flowering Plants'].has(plantId)) {
            categories['Flowering Plants'].push(plant);
            categoryPlantIds['Flowering Plants'].add(plantId);
          }
        }
        
        // Easy care plants based on drought_tolerant or care_level
        if ((plant.drought_tolerant && plant.drought_tolerant) ||
            (plant.careLevel && 
            (plant.careLevel.toLowerCase().includes('easy') || 
             plant.careLevel.toLowerCase().includes('very easy')))) {
          if (!categoryPlantIds['Easy Care'].has(plantId)) {
            categories['Easy Care'].push(plant);
            categoryPlantIds['Easy Care'].add(plantId);
          }
        }
        
        // Pet friendly plants
        if (plant.poisonous_to_pets === false || 
            (plant.toxicity && plant.toxicity.toLowerCase().includes('non-toxic'))) {
          if (!categoryPlantIds['Pet Friendly'].has(plantId)) {
            categories['Pet Friendly'].push(plant);
            categoryPlantIds['Pet Friendly'].add(plantId);
          }
        }
        
        // Tropical plants
        const tropicalPlants = [
          'Monstera', 'Palm', 'Philodendron', 'Calathea', 'Anthurium', 'Bird of Paradise',
          'Banana', 'Ficus', 'Tropical', 'Orchid', 'Bromeliad', 'Alocasia', 'Croton'
        ];
        if (tropicalPlants.some(name => 
          plant.name && plant.name.toLowerCase().includes(name.toLowerCase())
        )) {
          if (!categoryPlantIds['Tropical Plants'].has(plantId)) {
            categories['Tropical Plants'].push(plant);
            categoryPlantIds['Tropical Plants'].add(plantId);
          }
        }
        
        // Herbs
        const herbNames = [
          'Mint', 'Basil', 'Thyme', 'Oregano', 'Rosemary', 'Sage', 'Cilantro', 
          'Parsley', 'Dill', 'Chives', 'Lavender', 'Lemongrass', 'Herb'
        ];
        if (herbNames.some(herb => 
          plant.name && plant.name.toLowerCase().includes(herb.toLowerCase())
        )) {
          if (!categoryPlantIds['Herbs'].has(plantId)) {
            categories['Herbs'].push(plant);
            categoryPlantIds['Herbs'].add(plantId);
          }
        }
        
        // Air purifying plants
        const airPurifiers = [
          'Snake Plant', 'Pothos', 'Peace Lily', 'Spider Plant', 'Dracaena', 'Fern', 
          'ZZ Plant', 'Rubber Plant', 'Boston Fern', 'Chinese Evergreen'
        ];
        if (airPurifiers.some(name => 
          plant.name && plant.name.toLowerCase().includes(name.toLowerCase())
        )) {
          if (!categoryPlantIds['Air Purifying'].has(plantId)) {
            categories['Air Purifying'].push(plant);
            categoryPlantIds['Air Purifying'].add(plantId);
          }
        }
      });
    }
    
    // Add user-defined categories/locations
    if (userPlants && userPlants.length > 0) {
      // Group plants by location
      const locationGroups = {};
      userPlants.forEach(plant => {
        if (plant.location) {
          if (!locationGroups[plant.location]) {
            locationGroups[plant.location] = [];
          }
          locationGroups[plant.location].push(plant);
        }
      });
      
      // Add location groups to categories
      Object.entries(locationGroups).forEach(([location, plants]) => {
        if (plants.length > 0 && !categories[location]) {
          categories[location] = plants;
        }
      });
    }
    
    // Filter out empty categories
    const filteredCategories = {};
    Object.entries(categories).forEach(([category, plants]) => {
      if (plants.length > 0) {
        filteredCategories[category] = plants;
      }
    });
    
    return filteredCategories;
  }
);

const selectTodayReminders = createSelector(
  state => state.reminders.reminders,
  reminders => {
    const today = new Date().toISOString().split('T')[0];
    return reminders.filter(reminder => 
      reminder.nextDue === today && reminder.enabled
    );
  }
);

// User Plant Item Component
const UserPlantItem = ({ plant, onRemove, onPress }) => {
  // Handle different image formats from Perenual API
  const getPlantImage = () => {
    if (!plant) return null;
    
    // For Perenual API format
    if (plant.default_image && plant.default_image.medium_url) {
      return { uri: plant.default_image.medium_url };
    }
    
    // Legacy image formats support
    if (typeof plant.image === 'number') {
      return plant.image; 
    }
    
    if (plant.image && plant.image.uri) {
      return { uri: plant.image.uri };
    }
    
    if (typeof plant.image === 'string') {
      return { uri: plant.image };
    }
    
    // Placeholder for plants without images
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
          />
        ) : (
          <View style={[styles.userPlantImage, styles.plantPlaceholder]}>
            <Text style={styles.plantPlaceholderText}>{plant.name ? plant.name.charAt(0) : "P"}</Text>
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

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch plants and reminders on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await dispatch(fetchPlants());
        await dispatch(fetchReminders());
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load plants data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [dispatch]);
  
  // Use memoized selectors
  const userPlants = useSelector(selectUserPlants);
  const popularPlants = useSelector(selectPopularPlants);
  const categories = useSelector(selectPlantCategories);
  const todayReminders = useSelector(selectTodayReminders);
  
  // Helper functions for categories
  const getCategoryGradient = (category) => {
    switch(category) {
      case 'Indoor Plants':
        return ['#00796B', '#00695C'];
      case 'Outdoor Plants':
        return ['#FF9800', '#F57C00'];
      case 'Succulents':
        return ['#7B1FA2', '#6A1B9A'];
      case 'Flowering Plants':
        return ['#D81B60', '#C2185B'];
      case 'Easy Care':
        return ['#4CAF50', '#388E3C'];
      case 'Living Room':
        return ['#5E35B1', '#512DA8'];
      case 'Kitchen':
        return ['#1565C0', '#0D47A1'];
      case 'Drawing Room':
        return ['#E65100', '#D84315'];
      case 'Backyard':
        return ['#6A1B9A', '#4A148C'];
      default:
        return ['#4CAF50', '#388E3C'];
    }
  };
  
  const getCategoryIcon = (category) => {
    switch(category) {
      case 'Indoor Plants': return 'home-outline';
      case 'Outdoor Plants': return 'sunny-outline';
      case 'Succulents': return 'water-outline'; 
      case 'Flowering Plants': return 'flower-outline';
      case 'Easy Care': return 'checkmark-circle-outline';
      case 'Living Room': return 'home-outline';
      case 'Kitchen': return 'cafe-outline';
      case 'Drawing Room': return 'easel-outline';
      case 'Backyard': return 'leaf-outline';
      default: return 'leaf-outline';
    }
  };
  
  // Handle plant removal
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
  
  // Navigate to plant detail
  const navigateToPlantDetail = (plantId) => {
    navigation.navigate('PlantDetail', { plantId });
  };
  
  // Render a popular plant item
  const renderPopularPlant = ({ item }) => {
    // Handle different image formats from Perenual API
    const getPlantImage = () => {
      if (!item) return null;
      
      // For Perenual API format
      if (item.default_image && item.default_image.medium_url) {
        return { uri: item.default_image.medium_url };
      }
      
      // Legacy image formats support
      if (typeof item.image === 'number') {
        return item.image; 
      }
      
      if (item.image && item.image.uri) {
        return { uri: item.image.uri };
      }
      
      if (typeof item.image === 'string') {
        return { uri: item.image };
      }
      
      // Placeholder for plants without images
      return null;
    };
    
    const plantImage = getPlantImage();
    const hasValidImage = !!plantImage;
    
    // Determine care level from watering or care_level
    const determineCareLevel = () => {
      if (item.careLevel) return item.careLevel;
      
      if (item.watering) {
        if (item.watering === 'Minimum') return 'Easy';
        if (item.watering === 'Average') return 'Medium';
        if (item.watering === 'Frequent') return 'High';
      }
      
      if (item.drought_tolerant) return 'Easy';
      
      return 'Medium';
    };
    
    // Get species name from scientific_name or species
    const getSpecies = () => {
      if (item.scientific_name && item.scientific_name.length > 0) {
        return item.scientific_name[0];
      }
      return item.species || 'Houseplant';
    };
    
    // Get watering info from item
    const getWateringInfo = () => {
      if (item.water) return item.water;
      if (item.watering === 'Minimum') return 'Every 2-3 weeks';
      if (item.watering === 'Average') return 'Weekly';
      if (item.watering === 'Frequent') return 'Every 3-4 days';
      return 'As needed';
    };
    
    // Get light info from item
    const getLightInfo = () => {
      if (item.light) return item.light;
      
      if (item.sunlight && Array.isArray(item.sunlight)) {
        return item.sunlight[0];
      }
      
      return 'Indirect Light';
    };
    
    // Get icon for light
    const getLightIcon = (lightInfo) => {
      const light = lightInfo.toLowerCase();
      if (light.includes('full') || light.includes('direct')) return 'sunny';
      if (light.includes('part') || light.includes('filtered')) return 'partly-sunny';
      return 'cloud';
    };
    
    return (
      <TouchableOpacity 
        style={styles.popularPlantItem}
        onPress={() => navigation.navigate('PlantDetail', { plantId: item.id })}
        activeOpacity={0.9}
      >
        <View style={styles.popularPlantCard}>
          {hasValidImage ? (
            <Image 
              source={plantImage} 
              style={styles.popularPlantImage} 
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.popularPlantImage, styles.plantPlaceholder]}>
              <Text style={styles.plantPlaceholderText}>{item.name ? item.name.charAt(0) : "P"}</Text>
            </View>
          )}
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.popularPlantGradient}
          />
          
          <View style={styles.careLevelBadge}>
            <Text style={styles.careLevelText}>{determineCareLevel()}</Text>
          </View>
          
          <View style={styles.popularPlantInfo}>
            <Text style={styles.popularPlantName} numberOfLines={1}>{item.name || item.common_name}</Text>
            <Text style={styles.popularPlantSpecies} numberOfLines={1}>{getSpecies()}</Text>
            
            <View style={styles.plantDetailsRow}>
              <View style={styles.plantDetailItem}>
                <MaterialCommunityIcons name="water-outline" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.plantDetailText}>{getWateringInfo()}</Text>
              </View>
              
              <View style={styles.plantDetailItem}>
                <Ionicons 
                  name={getLightIcon(getLightInfo())} 
                  size={14} 
                  color="rgba(255,255,255,0.9)" 
                />
                <Text style={styles.plantDetailText}>{getLightInfo().split(' ')[0]}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render a reminder/alert item
  const renderReminderItem = ({ item }) => {
    // Find the associated plant for this reminder
    const plant = item.plantId ? 
      userPlants.find(p => p.id.toString() === item.plantId.toString()) : null;
    
    // Get plant image with fallbacks
    const getPlantImage = () => {
      if (!plant) return null;
      
      // Check for Perenual API image format
      if (plant.default_image && plant.default_image.medium_url) {
        return { uri: plant.default_image.medium_url };
      }
      
      // Legacy formats
      if (typeof plant.image === 'number') return plant.image;
      if (plant.image && plant.image.uri) return { uri: plant.image.uri };
      if (typeof plant.image === 'string') return { uri: plant.image };
      
      return null;
    };
    
    const plantImage = getPlantImage();
    const hasImage = !!plantImage;
    
    // Get reminder title based on type if not provided
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

  // Render loading or error state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading plants data...</Text>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
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
      <StatusBar barStyle="dark-content" />
      
      {/* Modern Header with Blur Background */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.title}>PlantPal</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => navigation.navigate('Search')}
            >
              <Ionicons name="search" size={22} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => navigation.navigate('AddPlant')}
            >
              <Ionicons name="add" size={22} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.contentContainer}>
          {/* Quick Actions Section with Gradient Cards */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={[styles.quickActionCard, {backgroundColor: '#4CAF50'}]}
              onPress={() => navigation.navigate('ScanPlant')}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0)']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.quickActionGradient}
              >
                <View style={styles.quickActionContent}>
                  <View style={styles.quickActionIconContainer}>
                    <Ionicons name="scan-outline" size={24} color="white" />
                  </View>
                  <Text style={styles.quickActionTitle}>Scan Plant</Text>
                  <Text style={styles.quickActionSubtitle}>Identify plants with your camera</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickActionCard, {backgroundColor: '#2196F3'}]}
              onPress={() => navigation.navigate('AllAlerts')}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0)']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.quickActionGradient}
              >
                <View style={styles.quickActionContent}>
                  <View style={styles.quickActionIconContainer}>
                    <Ionicons name="notifications-outline" size={24} color="white" />
                  </View>
                  <Text style={styles.quickActionTitle}>Care Reminders</Text>
                  <Text style={styles.quickActionSubtitle}>{todayReminders.length} tasks for today</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* My Plants Collection Card */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Collection</Text>
          </View>
          
          <View style={styles.myPlantsSection}>
            <LinearGradient
              colors={['#E8F5E9', '#F1F8E9']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.myPlantsGradient}
            >
              <View style={styles.plantStatsContainer}>
                <View style={styles.plantStatCard}>
                  <View style={styles.plantStatIconContainer}>
                    <Ionicons name="leaf-outline" size={22} color="#4CAF50" />
                  </View>
                  <View style={styles.plantStatTextContainer}>
                    <Text style={styles.plantStatNumber}>{userPlants.length}</Text>
                    <Text style={styles.plantStatLabel}>Total Plants</Text>
                  </View>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.plantStatCard}>
                  <View style={styles.plantStatIconContainer}>
                    <Ionicons name="home-outline" size={20} color="#4CAF50" />
                  </View>
                  <View style={styles.plantStatTextContainer}>
                    <Text style={styles.plantStatNumber}>
                      {userPlants.filter(p => p.location === 'Indoor' || 
                        (!p.light || !p.light.includes('Full sun'))).length}
                    </Text>
                    <Text style={styles.plantStatLabel}>Indoor</Text>
                  </View>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.plantStatCard}>
                  <View style={styles.plantStatIconContainer}>
                    <Ionicons name="sunny-outline" size={22} color="#4CAF50" />
                  </View>
                  <View style={styles.plantStatTextContainer}>
                    <Text style={styles.plantStatNumber}>
                      {userPlants.filter(p => p.location === 'Outdoor' || 
                        (p.light && p.light.includes('Full sun'))).length}
                    </Text>
                    <Text style={styles.plantStatLabel}>Outdoor</Text>
                  </View>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.plantStatCard}>
                  <View style={styles.plantStatIconContainer}>
                    <Ionicons name="heart-outline" size={22} color="#4CAF50" />
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
                <>
                  <View style={styles.userPlantsListContainer}>
                    <Text style={styles.userPlantsListTitle}>Your Plants:</Text>
                    {userPlants.map(plant => (
                      <UserPlantItem 
                        key={plant.id} 
                        plant={plant} 
                        onRemove={handleRemovePlant}
                        onPress={() => navigateToPlantDetail(plant.id)}
                      />
                    ))}
                  </View>
                  <TouchableOpacity 
                    style={styles.addMoreButton}
                    onPress={() => navigation.navigate('AddPlant')}
                  >
                    <Text style={styles.addMoreButtonText}>Add more plants</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={styles.startButton}
                  onPress={() => navigation.navigate('AddPlant')}
                >
                  <Text style={styles.startButtonText}>Start your collection</Text>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>

          {/* Popular Plants Section - Only show if we have plants with images */}
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
                ListEmptyComponent={
                  <View style={styles.emptyListContainer}>
                    <Text style={styles.emptyListText}>No plants found</Text>
                  </View>
                }
              />
            </>
          )}

          {/* Plant Categories - Only show if we have any categories with plants */}
          {Object.keys(categories).length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Categories</Text>
              </View>
              
              <View style={styles.categoriesContainer}>
                {/* Show most common categories first with accurate counts */}
                {Object.entries(categories)
                  .sort(([, plantsA], [, plantsB]) => plantsB.length - plantsA.length) // Sort by count
                  .slice(0, 6) // Show only top 6 categories
                  .map(([category, plants]) => {
                    // Remove duplicates by ID
                    const uniquePlantIds = new Set();
                    const uniquePlants = plants.filter(plant => {
                      if (!plant) return false;
                      const id = String(plant.id);
                      if (uniquePlantIds.has(id)) {
                        return false;
                      }
                      uniquePlantIds.add(id);
                      return true;
                    });

                    return (
                      <TouchableOpacity
                        key={category}
                        style={styles.categoryCard}
                        onPress={() => navigation.navigate('CategoryPlants', { category })}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={getCategoryGradient(category)}
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 1}}
                          style={styles.categoryGradient}
                        >
                          <View style={styles.categoryContent}>
                            <View style={styles.categoryIconContainer}>
                              <Ionicons name={getCategoryIcon(category)} size={22} color="white" />
                            </View>
                            <View style={styles.categoryInfo}>
                              <Text style={styles.categoryName}>{category}</Text>
                              <Text style={styles.categoryCount}>
                                {uniquePlants.length} {uniquePlants.length === 1 ? 'Plant' : 'Plants'}
                              </Text>
                            </View>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </>
          )}
          
          {/* Alerts Section - Only show if we have reminders for today */}
          {todayReminders.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Care</Text>
              </View>
              
              <View style={styles.remindersContainer}>
                {todayReminders.map(reminder => renderReminderItem({ item: reminder }))}
              </View>
            </>
          )}
          
          {/* Display a message if no data is available */}
          {popularPlants.length === 0 && Object.keys(categories).length === 0 && (
            <View style={styles.noDataContainer}>
              <Ionicons name="leaf-outline" size={64} color="#CCCCCC" />
              <Text style={styles.noDataTitle}>No Plants Found</Text>
              <Text style={styles.noDataMessage}>
                Start adding plants to your collection or search for new plants to explore.
              </Text>
              <TouchableOpacity 
                style={styles.exploreButton}
                onPress={() => navigation.navigate('Search')}
              >
                <Text style={styles.exploreButtonText}>Explore Plants</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Bottom Space for Tab Bar */}
          <View style={styles.bottomSpace} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4CAF50',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyListContainer: {
    width: width - 32,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    marginLeft: 16,
  },
  emptyListText: {
    fontSize: 16,
    color: '#757575',
  },
  noDataContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  noDataTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  noDataMessage: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  welcomeText: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 8,
  },
  quickActionCard: {
    width: width * 0.44,
    borderRadius: 16,
    overflow: 'hidden',
    height: 130,
  },
  quickActionGradient: {
    width: '100%',
    height: '100%',
  },
  quickActionContent: {
    padding: 16,
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  myPlantsSection: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
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
  myPlantsGradient: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
  },
  plantStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  plantStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plantStatIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  plantStatTextContainer: {
    flexDirection: 'column',
  },
  plantStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  plantStatLabel: {
    fontSize: 12,
    color: '#757575',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginHorizontal: 8,
  },
  addMoreButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addMoreButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 14,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  popularPlantsContainer: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  popularPlantItem: {
    width: width * 0.65,
    height: 220,
    marginRight: 16,
  },
  popularPlantCard: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
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
  popularPlantImage: {
    width: '100%',
    height: '100%',
  },
  popularPlantGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  careLevelBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  careLevelText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4CAF50',
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
    color: 'white',
    marginBottom: 2,
  },
  popularPlantSpecies: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  plantDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plantDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  plantDetailText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 4,
  },
  remindersContainer: {
    paddingHorizontal: 16,
  },
  reminderItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
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
    color: '#333',
    marginBottom: 2,
  },
  reminderSubtitle: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryCard: {
    width: width * 0.44,
    height: 90,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  categoryGradient: {
    width: '100%',
    height: '100%',
  },
  categoryContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  bottomSpace: {
    height: 100,
  },
  plantPlaceholder: {
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantPlaceholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  reminderPlaceholder: {
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderPlaceholderText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  userPlantsListContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  userPlantsListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
  },
  userPlantItem: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userPlantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  userPlantImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userPlantInfo: {
    flex: 1,
  },
  userPlantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  userPlantSpecies: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  locationText: {
    fontSize: 10,
    color: '#4CAF50',
    marginLeft: 2,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;
