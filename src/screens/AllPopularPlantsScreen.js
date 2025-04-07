import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  StatusBar,
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSelector, useDispatch } from 'react-redux';
import { createSelector } from 'reselect';
import plantService from '../services/plantService';
import { LinearGradient } from 'expo-linear-gradient';

// Memoized selector for popular plants from the Redux store
const selectPopularPlants = createSelector(
  state => state.plants.plants,
  plants => plants
    .filter(plant => plant.popularity > 0 || Math.random() > 0.5) // Include plants without popularity data
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, 24)
);

const AllPopularPlantsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [plants, setPlants] = useState([]);
  
  // Get popular plants from Redux as fallback
  const reduxPopularPlants = useSelector(selectPopularPlants);
  
  // Fetch popular plants from the API
  useEffect(() => {
    const fetchPopularPlants = async () => {
      try {
        setLoading(true);
        const popularPlants = await plantService.getPopularPlants();
        if (popularPlants && popularPlants.length > 0) {
          setPlants(popularPlants);
        } else {
          // Fallback to Redux plants if API fails
          setPlants(reduxPopularPlants);
        }
      } catch (error) {
        console.error('Error fetching popular plants:', error);
        setPlants(reduxPopularPlants);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPopularPlants();
  }, []);

  const renderPlantItem = ({ item, index }) => {
    // Handle different image formats
    const plantImage = typeof item.image === 'number' ? item.image : 
                      item.image && item.image.uri ? { uri: item.image.uri } :
                      typeof item.image === 'string' ? { uri: item.image } :
                      require('../../assets/monstera.png');
    
    return (
      <TouchableOpacity 
        style={styles.plantItem}
        onPress={() => navigation.navigate('PlantDetail', { plantId: item.id })}
      >
        <View style={styles.plantImageContainer}>
          <Image source={plantImage} style={styles.plantImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.plantGradient}
          />
          <View style={styles.plantLabelContainer}>
            {item.careLevel && (
              <View style={styles.plantCareLevel}>
                <Text style={styles.plantCareLevelText}>{item.careLevel}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.plantInfo}>
          <Text style={styles.plantName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.plantSpecies} numberOfLines={1}>{item.species || 'Houseplant'}</Text>
          
          {item.water && (
            <View style={styles.plantDetail}>
              <Ionicons name="water-outline" size={12} color="#4CAF50" />
              <Text style={styles.plantDetailText}>{item.water}</Text>
            </View>
          )}
          
          {item.light && (
            <View style={styles.plantDetail}>
              <Ionicons 
                name={
                  item.light.toLowerCase().includes('full') ? 'sunny' : 
                  item.light.toLowerCase().includes('partial') ? 'partly-sunny' : 'cloud'
                } 
                size={12} 
                color="#4CAF50" 
              />
              <Text style={styles.plantDetailText}>{item.light}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Popular Plants</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading popular plants...</Text>
        </View>
      ) : plants.length > 0 ? (
        <FlatList
          data={plants}
          renderItem={renderPlantItem}
          keyExtractor={(item, index) => `popular-plant-${item.id}-${index}`}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Image 
            source={require('../../assets/empty_plants.png')} 
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyText}>No popular plants found</Text>
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => navigation.navigate('DiscoverHome')}
          >
            <Text style={styles.exploreButtonText}>Explore plants</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  listContainer: {
    padding: 12,
    paddingBottom: 80, // Extra padding for bottom to avoid tab bar overlap
  },
  plantItem: {
    flex: 1,
    margin: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  plantImageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  plantImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  plantGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  plantLabelContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  plantCareLevel: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  plantCareLevelText: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: 'bold',
  },
  plantInfo: {
    padding: 12,
  },
  plantName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  plantSpecies: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  plantDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  plantDetailText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  exploreButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AllPopularPlantsScreen; 