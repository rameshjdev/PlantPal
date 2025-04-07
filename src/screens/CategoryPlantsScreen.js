import React, { useEffect, useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';

// Improved selector that gets plants by category from both user plants and all plants
const selectPlantsByCategory = createSelector(
  [
    state => state.plants.userPlants,
    state => state.plants.plants,
    (state, category) => category
  ],
  (userPlants, allPlants, category) => {
    let result = [];
    
    // First check if this is a location-based category (like Living Room, Kitchen, etc.)
    const locationBasedPlants = userPlants.filter(plant => plant.location === category);
    if (locationBasedPlants.length > 0) {
      result = locationBasedPlants;
    } else {
      // Check if it's a property-based category using the same logic as in HomeScreen
      switch(category) {
        case 'Indoor Plants':
          result = allPlants.filter(plant => {
            if (plant.sunlight && Array.isArray(plant.sunlight)) {
              const sunlightLevels = plant.sunlight.join(' ').toLowerCase();
              return sunlightLevels.includes('part shade') || sunlightLevels.includes('filtered') || 
                     sunlightLevels.includes('low light') || sunlightLevels.includes('medium');
            } else if (plant.light) {
              const lightLevel = plant.light.toLowerCase();
              return lightLevel.includes('low') || lightLevel.includes('indirect') || 
                     !lightLevel.includes('full sun only');
            }
            return false;
          });
          break;
        case 'Outdoor Plants':
          result = allPlants.filter(plant => {
            if (plant.sunlight && Array.isArray(plant.sunlight)) {
              return plant.sunlight.some(light => light.toLowerCase().includes('full sun'));
            } else if (plant.light) {
              return plant.light.toLowerCase().includes('full sun');
            }
            return false;
          });
          break;
        case 'Succulents':
          result = allPlants.filter(plant => 
            (plant.water && plant.water.toLowerCase().includes('2-3 weeks')) ||
            (plant.watering && plant.watering.toLowerCase().includes('minimum')) ||
            (plant.data && plant.data.some(item => 
              item.key && item.key.toLowerCase().includes('succulent') || 
              (item.key === 'Plant type' && item.value && item.value.toLowerCase().includes('succulent'))
            ))
          );
          break;
        case 'Flowering Plants':
          result = allPlants.filter(plant => 
            plant.name && (
              plant.name.toLowerCase().includes('lily') || 
              plant.name.toLowerCase().includes('rose') || 
              plant.name.toLowerCase().includes('orchid') ||
              plant.name.toLowerCase().includes('flower') ||
              plant.name.toLowerCase().includes('hibiscus') ||
              plant.name.toLowerCase().includes('jasmine')
            ) ||
            (plant.data && Array.isArray(plant.data) && plant.data.some(item => 
              (item.key === 'Flower color' && item.value) || 
              (item.key === 'Flowering season' && item.value)
            ))
          );
          break;
        case 'Easy Care':
          result = allPlants.filter(plant => 
            (plant.drought_tolerant && plant.drought_tolerant) ||
            (plant.careLevel && (
              plant.careLevel.toLowerCase().includes('easy') || 
              plant.careLevel.toLowerCase().includes('very easy')
            ))
          );
          break;
        case 'Low Light Plants':
          result = allPlants.filter(plant => {
            // Plants that can thrive in low light
            const lowLightPlants = ['ZZ Plant', 'Snake Plant', 'Pothos', 'Peace Lily', 
                                   'Spider Plant', 'Philodendron', 'Cast Iron Plant', 
                                   'Chinese Evergreen', 'Dracaena', 'Aglaonema'];
            return (plant.light && plant.light.toLowerCase().includes('low')) || 
                   lowLightPlants.some(name => 
                     plant.name && plant.name.toLowerCase().includes(name.toLowerCase())
                   );
          });
          break;
        case 'Tropical Plants':
          result = allPlants.filter(plant => {
            // Common tropical plants
            const tropicalPlants = [
              'Monstera', 'Palm', 'Philodendron', 'Calathea', 'Anthurium', 'Bird of Paradise',
              'Banana', 'Ficus', 'Tropical', 'Orchid', 'Bromeliad', 'Alocasia', 'Croton',
              'Hibiscus', 'Plumeria', 'Hawaiian'
            ];
            return tropicalPlants.some(name => 
              plant.name && plant.name.toLowerCase().includes(name.toLowerCase())
            ) || (plant.data && plant.data.some(item => 
              item.value && typeof item.value === 'string' && 
              item.value.toLowerCase().includes('tropical')
            ));
          });
          break;
        case 'Pet Friendly':
          result = allPlants.filter(plant => {
            // Plants known to be safe for pets
            const petFriendly = [
              'Spider Plant', 'Boston Fern', 'Areca Palm', 'Calathea', 'Christmas Cactus',
              'African Violet', 'Orchid', 'Bamboo', 'Money Plant', 'Staghorn Fern',
              'Ponytail Palm', 'Haworthia', 'Peperomia', 'Lipstick Plant'
            ];
            return plant.poisonous_to_pets === false || 
                   petFriendly.some(name => 
                     plant.name && plant.name.toLowerCase().includes(name.toLowerCase())
                   ) || 
                   (plant.data && plant.data.some(item => 
                     (item.key === 'Toxicity' && item.value && item.value.toLowerCase().includes('non-toxic'))
                   ));
          });
          break;
        case 'Air Purifying':
          result = allPlants.filter(plant => {
            // Popular air purifying plants
            const airPurifiers = [
              'Snake Plant', 'Pothos', 'Peace Lily', 'Spider Plant', 'Dracaena', 'Fern', 
              'ZZ Plant', 'Rubber Plant', 'Boston Fern', 'Aloe Vera', 'Bamboo Palm', 
              'English Ivy', 'Chinese Evergreen', 'Chrysanthemum', 'Ficus'
            ];
            return airPurifiers.some(name => 
              plant.name && plant.name.toLowerCase().includes(name.toLowerCase())
            );
          });
          break;
        case 'Herbs':
          result = allPlants.filter(plant => {
            // Common herbs
            const herbNames = [
              'Mint', 'Basil', 'Thyme', 'Oregano', 'Rosemary', 'Sage', 'Cilantro', 
              'Parsley', 'Dill', 'Chives', 'Lavender', 'Lemongrass', 'Herb'
            ];
            return herbNames.some(herb => 
              plant.name && plant.name.toLowerCase().includes(herb.toLowerCase())
            ) || (plant.data && plant.data.some(item => 
              (item.key === 'Edible parts' && item.value && item.value.includes('Leaves')) ||
              (item.key === 'Layer' && item.value && item.value.includes('Herbs'))
            ));
          });
          break;
        default:
          // If it doesn't match any special categories, try to find plants with matching names
          result = allPlants.filter(plant => 
            plant.name && plant.name.toLowerCase().includes(category.toLowerCase())
          );
      }
    }
    
    // Remove duplicates
    const uniqueIds = new Set();
    result = result.filter(plant => {
      const id = String(plant.id);
      if (uniqueIds.has(id)) {
        return false;
      }
      uniqueIds.add(id);
      return true;
    });
    
    return result;
  }
);

const CategoryPlantsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const category = route.params?.category || 'Living Room';
  const [loading, setLoading] = useState(true);
  
  // Use the selector to get plants for this category
  const plants = useSelector(state => selectPlantsByCategory(state, category));
  
  useEffect(() => {
    // Simulate loading to ensure data is properly fetched
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Render a plant item
  const renderPlantItem = ({ item }) => {
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
        <Image source={plantImage} style={styles.plantImage} />
        <View style={styles.plantInfo}>
          <Text style={styles.plantName}>{item.name}</Text>
          <Text style={styles.plantSpecies}>{item.species || 'Houseplant'}</Text>
          
          {/* Show care level badge */}
          <View style={styles.careContainer}>
            <View style={[
              styles.careBadge,
              {
                backgroundColor: 
                  item.careLevel === 'Very Easy' ? '#E8F5E9' : 
                  item.careLevel === 'Easy' ? '#DCEDC8' : 
                  item.careLevel === 'Moderate' ? '#FFF9C4' : '#FFCCBC'
              }
            ]}>
              <Text style={[
                styles.careText,
                {
                  color: 
                    item.careLevel === 'Very Easy' ? '#2E7D32' : 
                    item.careLevel === 'Easy' ? '#558B2F' : 
                    item.careLevel === 'Moderate' ? '#F9A825' : '#D84315'
                }
              ]}>
                {item.careLevel || 'Moderate'}
              </Text>
            </View>
            
            {item.water && (
              <View style={styles.waterInfo}>
                <MaterialCommunityIcons name="water-outline" size={14} color="#4CAF50" />
                <Text style={styles.waterText}>{item.water}</Text>
              </View>
            )}
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
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
        <Text style={styles.title}>{category}</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading plants...</Text>
        </View>
      ) : plants.length > 0 ? (
        <FlatList
          data={plants}
          renderItem={renderPlantItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Image 
            source={require('../../assets/empty_plants.png')} 
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyText}>No plants found in this category</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddPlant')}
          >
            <Text style={styles.addButtonText}>Add a plant</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 16,
  },
  plantItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  plantImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 16,
  },
  plantInfo: {
    flex: 1,
  },
  plantName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  plantSpecies: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  careContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  careBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  careText: {
    fontSize: 12,
    fontWeight: '500',
  },
  waterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterText: {
    fontSize: 12,
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
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CategoryPlantsScreen; 