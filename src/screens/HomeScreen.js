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

// User Plant Item Component
const UserPlantItem = ({ plant, onRemove, onPress }) => {
  const getPlantImage = () => {
    if (!plant) return null;
    
    if (plant.default_image && plant.default_image.medium_url) {
      return { uri: plant.default_image.medium_url };
    }
    
    if (typeof plant.image === 'number') {
      return plant.image; 
    }
    
    if (plant.image && plant.image.uri) {
      return { uri: plant.image.uri };
    }
    
    if (typeof plant.image === 'string') {
      return { uri: plant.image };
    }
    
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
  
  const userPlants = useSelector(selectUserPlants);
  const popularPlants = useSelector(selectPopularPlants);
  const todayReminders = useSelector(selectTodayReminders);
  
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
      
      {/* Modern Header */}
      <LinearGradient
        colors={['#4CAF50', '#2E7D32']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.title}>PlantPal</Text>
          </View>
        </View>
      </LinearGradient>
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.contentContainer}>
          {/* Quick Actions Section */}
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

          {/* My Collection Section - Redesigned */}
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
                  <Ionicons name="leaf-outline" size={48} color="#4CAF50" />
                  <Text style={styles.emptyCollectionText}>Your collection is empty</Text>
                  <Text style={styles.emptyCollectionSubtext}>Scan a plant to add it to your collection</Text>
                </View>
              )}
            </LinearGradient>
          </View>

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
          
          {/* Alerts Section */}
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
          
          {/* Bottom Space */}
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
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  popularPlantCard: {
    width: width * 0.65,
    height: 220,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
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
  popularPlantImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
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
  },
  popularPlantSpecies: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
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
  userPlantsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  userPlantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  userPlantImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  viewAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
  },
  viewAllButtonText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCollectionContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCollectionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCollectionSubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
});

export default HomeScreen;
