import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Platform, 
  ActivityIndicator, 
  Image, 
  Dimensions,
  Animated,
  StatusBar,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import plantService from '../services/plantService';
import { useSelector, useDispatch } from 'react-redux';
import { toggleFavorite, addToCollection } from '../store/plantsSlice';

const { width, height } = Dimensions.get('window');

const PlantDetailScreen = ({ route }) => {
  const { plantId } = route.params;
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get the favorite status from Redux store
  const userPlants = useSelector(state => state.plants.userPlants);
  const isFavorite = userPlants.some(p => String(p.id) === String(plantId) && p.isFavorite);
  const isInCollection = userPlants.some(p => String(p.id) === String(plantId));

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Fetch plant details on component mount
  useEffect(() => {
    fetchPlantDetails();
    
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true
      })
    ]).start();
  }, [plantId]);

  // Fetch plant details from API
  const fetchPlantDetails = async () => {
    try {
      setLoading(true);
      const data = await plantService.getPlantById(plantId);
      
      if (data) {
        setPlant(data);
        setError(null); // Clear any previous errors
      } else {
        throw new Error('Failed to fetch plant details');
      }
    } catch (err) {
      console.error('Error fetching plant details:', err);
      setError('Failed to load plant details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle the favorite toggle
  const handleToggleFavorite = () => {
    // Convert plantId to string for consistency
    const plantIdStr = String(plantId);
    
    dispatch(toggleFavorite(plantIdStr))
      .then(() => {
        // Favorite status will be updated via Redux state
      })
      .catch(error => {
        console.error('Error toggling favorite:', error);
      });
  };

  // Handle add to collection
  const handleAddToCollection = () => {
    // Convert plantId to string for consistency
    const plantIdStr = String(plantId);
    
    dispatch(addToCollection(plantIdStr))
      .then(() => {
        // Collection status will be updated via Redux state
      })
      .catch(error => {
        console.error('Error adding to collection:', error);
      });
  };

  // Generate care object from plant data
  const getCareInfo = (plant) => {
    if (!plant) return {};
    
    // Try to get values from plant.data if available
    const getValueOrDefault = (key, defaultValue) => {
      if (!plant.data || !Array.isArray(plant.data)) return defaultValue;
      
      const item = plant.data.find(item => item.key === key);
      return item ? item.value : defaultValue;
    };
    
    return {
      water: plant.water || getValueOrDefault('Water requirement', 'Medium - Check plant needs'),
      light: plant.light || getValueOrDefault('Light requirement', 'Medium light'),
      temperature: getValueOrDefault('USDA Hardiness zone', '65-85°F (18-29°C)'),
      humidity: getValueOrDefault('Humidity', 'Medium'),
      soil: getValueOrDefault('Soil type', 'Well-draining potting mix'),
      fertilizer: getValueOrDefault('Fertilizer', 'As needed during growing season'),
      repotting: getValueOrDefault('Repotting', 'Every 1-2 years or as needed'),
    };
  };

  // Format the watering information
  const getWateringInfo = (plant) => {
    if (!plant) return { lastWatered: 'Not recorded', nextWatering: 'Not scheduled' };
    
    // In a real app, this would come from user data
    return {
      lastWatered: '2 days ago',
      nextWatering: 'In 3 days',
    };
  };

  // Helper function to get the plant image with fallbacks
  const getPlantImage = () => {
    if (!plant) return require('../../assets/monstera.png');
    
    // Check for Perenual API format
    if (plant.default_image && plant.default_image.medium_url) {
      return { uri: plant.default_image.medium_url };
    }
    
    // Legacy formats
    if (typeof plant.image === 'number') {
      return plant.image;
    }
    
    if (plant.image && plant.image.uri) {
      return { uri: plant.image.uri };
    }
    
    if (typeof plant.image === 'string') {
      return { uri: plant.image };
    }
    
    // Fallback
    return require('../../assets/monstera.png');
  };

  // Get plant description with fallbacks
  const getDescription = () => {
    if (plant.description) return plant.description;
    
    // Try to build a description from other data
    let description = "";
    
    if (plant.common_name && plant.scientific_name) {
      description += `${plant.common_name} (${plant.scientific_name[0]}) `;
    }
    
    if (plant.cycle) {
      description += `is a ${plant.cycle.toLowerCase()} plant. `;
    }
    
    if (plant.watering) {
      description += `It requires ${plant.watering.toLowerCase()} watering. `;
    }
    
    if (plant.sunlight && Array.isArray(plant.sunlight)) {
      description += `It thrives in ${plant.sunlight.join(' or ')} conditions. `;
    }
    
    if (description) {
      return description;
    }
    
    return "No description available for this plant. Please check care instructions below for growing requirements.";
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={['#2E7D32', '#4CAF50']}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading plant details...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Handle errors but still try to display plant if available
  if (error && !plant) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={['#E53935', '#FFCDD2']}
          style={styles.errorGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={70} color="#FFFFFF" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchPlantDetails}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Animation values for header
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200, 300],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp'
  });
  
  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1.2, 1, 0.8],
    extrapolate: 'clamp'
  });
  
  const imageTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [0, 0, -50],
    extrapolate: 'clamp'
  });
  
  const titleTranslate = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, -20],
    extrapolate: 'clamp'
  });
  
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 100, 200],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp'
  });
  
  // Get care information and watering info
  const careInfo = getCareInfo(plant);
  const wateringInfo = getWateringInfo(plant);
  const plantImage = getPlantImage();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Animated Header */}
      <Animated.View style={[
        styles.animatedHeader,
        { opacity: headerOpacity }
      ]}>
        <BlurView intensity={90} tint="dark" style={styles.blurHeader}>
          <Text style={styles.headerTitle}>{plant.name || plant.common_name}</Text>
        </BlurView>
      </Animated.View>
      
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        bounces={true}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.heroSection}>
          <Animated.View style={[
            styles.imageContainer,
            {
              transform: [
                { scale: imageScale },
                { translateY: imageTranslateY }
              ]
            }
          ]}>
            <Image 
              source={plantImage} 
              style={styles.plantImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.imageGradient}
            />
          </Animated.View>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <BlurView intensity={60} tint="dark" style={styles.blurButton}>
                <Ionicons name="chevron-back" size={24} color="#FFF" />
              </BlurView>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleToggleFavorite} style={styles.favoriteButton}>
              <BlurView intensity={60} tint="dark" style={styles.blurButton}>
                <Ionicons 
                  name={isFavorite ? "heart" : "heart-outline"} 
                  size={24} 
                  color={isFavorite ? "#FF5252" : "#FFF"} 
                />
              </BlurView>
            </TouchableOpacity>
          </View>
          
          <Animated.View style={[
            styles.titleContainer,
            {
              transform: [{ translateY: titleTranslate }],
              opacity: titleOpacity
            }
          ]}>
            <Text style={styles.plantName}>{plant.name || plant.common_name}</Text>
            <Text style={styles.plantSpecies}>
              {plant.species || (plant.scientific_name && plant.scientific_name.length > 0 
                ? plant.scientific_name[0] : 'Houseplant')}
            </Text>
            
            <View style={styles.careLevel}>
              <BlurView intensity={80} tint="dark" style={styles.blurCareLevel}>
                <Text style={styles.careLevelText}>
                  {plant.careLevel || (plant.watering === 'Minimum' ? 'Easy' : 
                    plant.watering === 'Average' ? 'Medium' : 
                    plant.watering === 'Frequent' ? 'High' : 'Medium')} Care
                </Text>
              </BlurView>
            </View>
          </Animated.View>
        </View>

        <Animated.View 
          style={[
            styles.infoContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {error && (
            <View style={styles.warningBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#E65100" />
              <Text style={styles.warningText}>
                {error} Some information might be limited.
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{getDescription()}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Care Requirements</Text>
            <View style={styles.careContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.careCard}>
                  <LinearGradient
                    colors={['#4CAF50', '#2E7D32']}
                    style={styles.careIconContainer}
                  >
                    <MaterialCommunityIcons name="water-outline" size={28} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.careCardTitle}>Water</Text>
                  <Text style={styles.careCardText}>{careInfo.water}</Text>
                </View>
                
                <View style={styles.careCard}>
                  <LinearGradient
                    colors={['#FF9800', '#F57C00']}
                    style={styles.careIconContainer}
                  >
                    <MaterialCommunityIcons 
                      name={
                        careInfo.light && careInfo.light.toLowerCase().includes('full') 
                          ? 'white-balance-sunny' 
                          : careInfo.light && careInfo.light.toLowerCase().includes('partial') 
                            ? 'weather-partly-cloudy' 
                            : 'weather-cloudy'
                      } 
                      size={28} 
                      color="#FFFFFF" 
                    />
                  </LinearGradient>
                  <Text style={styles.careCardTitle}>Light</Text>
                  <Text style={styles.careCardText}>{careInfo.light}</Text>
                </View>
                
                <View style={styles.careCard}>
                  <LinearGradient
                    colors={['#2196F3', '#1976D2']}
                    style={styles.careIconContainer}
                  >
                    <MaterialCommunityIcons name="thermometer" size={28} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.careCardTitle}>Temperature</Text>
                  <Text style={styles.careCardText}>{careInfo.temperature}</Text>
                </View>
                
                <View style={styles.careCard}>
                  <LinearGradient
                    colors={['#9C27B0', '#7B1FA2']}
                    style={styles.careIconContainer}
                  >
                    <MaterialCommunityIcons name="water-percent" size={28} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.careCardTitle}>Humidity</Text>
                  <Text style={styles.careCardText}>{careInfo.humidity}</Text>
                </View>
                
                <View style={styles.careCard}>
                  <LinearGradient
                    colors={['#795548', '#5D4037']}
                    style={styles.careIconContainer}
                  >
                    <MaterialCommunityIcons name="fertilizer" size={28} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.careCardTitle}>Soil</Text>
                  <Text style={styles.careCardText}>{careInfo.soil}</Text>
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Display watering info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Watering Schedule</Text>
            <BlurView intensity={30} tint="light" style={styles.waterScheduleContainer}>
              <View style={styles.waterScheduleItem}>
                <LinearGradient
                  colors={['#4CAF50', '#2E7D32']}
                  style={styles.waterIconContainer}
                >
                  <MaterialCommunityIcons name="calendar-check" size={24} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.waterScheduleTextContainer}>
                  <Text style={styles.waterScheduleLabel}>Last Watered</Text>
                  <Text style={styles.waterScheduleText}>{wateringInfo.lastWatered}</Text>
                </View>
              </View>
              
              <View style={styles.scheduleDivider} />
              
              <View style={styles.waterScheduleItem}>
                <LinearGradient
                  colors={['#4CAF50', '#2E7D32']}
                  style={styles.waterIconContainer}
                >
                  <MaterialCommunityIcons name="calendar-clock" size={24} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.waterScheduleTextContainer}>
                  <Text style={styles.waterScheduleLabel}>Next Watering</Text>
                  <Text style={styles.waterScheduleText}>{wateringInfo.nextWatering}</Text>
                </View>
              </View>
            </BlurView>
          </View>

          {/* Display any additional plant data from the API */}
          {plant.data && plant.data.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Information</Text>
              <BlurView intensity={30} tint="light" style={styles.additionalInfoContainer}>
                {plant.data.map((item, index) => (
                  <View key={index} style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{item.key}</Text>
                    <Text style={styles.infoText}>{item.value}</Text>
                  </View>
                ))}
              </BlurView>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <View style={styles.buttonsRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.collectionButton, { flex: 1, marginRight: 8 }]}
                onPress={handleAddToCollection}
                disabled={isInCollection}
              >
                <LinearGradient
                  colors={isInCollection ? ['#BDBDBD', '#9E9E9E'] : ['#4CAF50', '#2E7D32']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.actionGradient}
                >
                  <MaterialCommunityIcons 
                    name={isInCollection ? "check" : "plus"} 
                    size={20} 
                    color="#FFFFFF" 
                    style={{marginRight: 8}} 
                  />
                  <Text style={styles.actionButtonText}>
                    {isInCollection ? 'In Collection' : 'Add To Collection'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { flex: 1, marginLeft: 8 }]}
                onPress={() => {
                  if (isInCollection) {
                    // If plant is in collection, navigate to set reminder directly
                    navigation.navigate('SetReminder', { plantId: plant.id });
                  } else {
                    // If plant is not in collection, alert user they need to add it first
                    Alert.alert(
                      "Plant Not In Collection",
                      "To set a reminder, please add this plant to your collection first.",
                      [
                        { text: "Cancel", style: "cancel" },
                        { 
                          text: "Add to Collection", 
                          onPress: () => {
                            handleAddToCollection();
                            // After a small delay, navigate to set reminder
                            setTimeout(() => {
                              navigation.navigate('SetReminder', { plantId: plant.id });
                            }, 300);
                          }
                        }
                      ]
                    );
                  }
                }}
              >
                <LinearGradient
                  colors={['#4CAF50', '#2E7D32']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.actionGradient}
                >
                  <MaterialCommunityIcons name="bell-outline" size={20} color="#FFFFFF" style={{marginRight: 8}} />
                  <Text style={styles.actionButtonText}>Set Reminder</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'white',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorGradient: {
    flex: 1,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#E53935',
    fontSize: 16,
    fontWeight: 'bold',
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 100,
  },
  blurHeader: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  warningBanner: {
    backgroundColor: '#FFF9C4',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 8,
    flex: 1,
  },
  heroSection: {
    height: 450,
    position: 'relative',
  },
  imageContainer: {
    height: 450,
    width: width,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  plantImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    position: 'absolute',
    bottom: 30,
    left: 24,
    right: 24,
  },
  plantName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  plantSpecies: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#EEEEEE',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  careLevel: {
    marginBottom: 8,
  },
  blurCareLevel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  careLevelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  infoContainer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
    color: '#424242',
  },
  careContainer: {
    marginHorizontal: -24,
    paddingLeft: 24,
  },
  careCard: {
    width: 150,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      }
    }),
  },
  careIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  careCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 6,
  },
  careCardText: {
    fontSize: 14,
    color: '#616161',
  },
  waterScheduleContainer: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  waterScheduleItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterScheduleTextContainer: {
    marginLeft: 16,
  },
  waterScheduleLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  waterScheduleText: {
    fontSize: 16,
    color: '#616161',
    marginTop: 4,
  },
  scheduleDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginHorizontal: 16,
  },
  additionalInfoContainer: {
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
  },
  infoItem: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    paddingBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 16,
    color: '#616161',
  },
  buttonContainer: {
    marginBottom: 40,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      }
    }),
  },
  actionGradient: {
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  collectionButton: {
    backgroundColor: '#BDBDBD',
    borderWidth: 1,
    borderColor: '#9E9E9E',
  },
});

export default PlantDetailScreen;