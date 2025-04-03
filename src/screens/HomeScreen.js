import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Platform, Alert } from 'react-native';
import SvgImage from '../utils/SvgImage';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPlants, removePlant } from '../store/plantsSlice';
import { createSelector } from 'reselect';

// Memoized selector to prevent recreation of objects
const selectUserPlants = createSelector(
  state => state.plants.userPlants,
  userPlants => userPlants
);

const selectAllPlants = createSelector(
  state => state.plants.plants,
  plants => plants
);

const HomeScreen = () => {
  const navigation = useNavigation();
  
  // Category definitions with icons and criteria functions
  const categoryDefinitions = useMemo(() => [
    { 
      id: '1', 
      name: 'Indoor Plants', 
      image: require('../../assets/indoor.png'), 
      icon: 'home',
      filter: plant => {
        const lightReq = plant.light.toLowerCase();
        return !lightReq.includes('full sun only') || lightReq.includes('partial');
      }
    },
    { 
      id: '2', 
      name: 'Succulents', 
      image: require('../../assets/succulent.png'), 
      icon: 'water-off',
      filter: plant => {
        return plant.water.includes('2-3 weeks') || 
               (plant.data && plant.data.some(item => 
                 item.key && item.key.toLowerCase().includes('succulent') || 
                 (item.key === 'Plant type' && item.value && item.value.toLowerCase().includes('succulent'))
               ));
      }
    },
    { 
      id: '3', 
      name: 'Flowering Plants', 
      image: require('../../assets/flowering.png'), 
      icon: 'flower',
      filter: plant => {
        if (plant.data && Array.isArray(plant.data)) {
          return plant.data.some(item => 
            (item.key === 'Flower color' && item.value) || 
            (item.key === 'Flowering season' && item.value)
          );
        }
        return plant.name.includes('Lily') || 
               plant.name.includes('Rose') || 
               plant.name.includes('Orchid');
      }
    },
    { 
      id: '4', 
      name: 'Herbs', 
      image: require('../../assets/herbs.png'), 
      icon: 'food-variant',
      filter: plant => {
        if (plant.data && Array.isArray(plant.data)) {
          return plant.data.some(item => 
            (item.key === 'Edible parts' && item.value && item.value.includes('Leaves')) ||
            (item.key === 'Layer' && item.value && item.value.includes('Herbs'))
          );
        }
        return plant.name.includes('Mint') || 
               plant.name.includes('Basil') || 
               plant.name.includes('Thyme') ||
               plant.name.includes('Oregano') ||
               plant.name.includes('Rosemary');
      }
    },
    { 
      id: '5', 
      name: 'Air Purifying', 
      image: require('../../assets/indoor.png'), 
      icon: 'air-filter',
      filter: plant => {
        const airPurifiers = ['Snake Plant', 'Pothos', 'Peace Lily', 'Spider Plant', 'Dracaena', 'Fern', 'ZZ Plant', 'Rubber Plant'];
        return airPurifiers.some(name => plant.name.includes(name));
      }
    },
    { 
      id: '6', 
      name: 'Low Light Plants', 
      image: require('../../assets/snake_plant.png'), 
      icon: 'weather-sunset',
      filter: plant => {
        return plant.light.toLowerCase().includes('low') || 
               plant.name.includes('ZZ Plant') || 
               plant.name.includes('Snake Plant') || 
               plant.name.includes('Pothos');
      }
    },
    { 
      id: '7', 
      name: 'Tropical Plants', 
      image: require('../../assets/monstera.png'), 
      icon: 'palm-tree',
      filter: plant => {
        const tropicalPlants = ['Monstera', 'Palm', 'Philodendron', 'Calathea', 'Anthurium', 'Bird of Paradise'];
        return tropicalPlants.some(name => plant.name.includes(name)) ||
               (plant.data && plant.data.some(item => 
                 item.value && item.value.toLowerCase().includes('tropical')
               ));
      }
    },
    { 
      id: '8', 
      name: 'Pet Friendly', 
      image: require('../../assets/peace_lily.png'), 
      icon: 'paw',
      filter: plant => {
        const petFriendly = ['Spider Plant', 'Boston Fern', 'Areca Palm', 'Calathea', 'Christmas Cactus'];
        return petFriendly.some(name => plant.name.includes(name)) ||
               (plant.data && plant.data.some(item => 
                 (item.key === 'Toxicity' && item.value && item.value.toLowerCase().includes('non-toxic'))
               ));
      }
    },
  ], []);

  const dispatch = useDispatch();
  
  // Use memoized selectors to prevent unnecessary rerenders
  const myPlants = useSelector(selectUserPlants);
  const allPlants = useSelector(selectAllPlants);
  
  // Active categories with at least one matching plant
  const [activeCategories, setActiveCategories] = useState([]);
  const [plantCounts, setPlantCounts] = useState({});
  
  // State to track plant selected for potential deletion
  const [selectedPlantId, setSelectedPlantId] = useState(null);

  useEffect(() => {
    dispatch(fetchPlants());
  }, [dispatch]);

  // Calculate active categories and plant counts when allPlants changes
  useEffect(() => {
    if (allPlants && allPlants.length > 0) {
      // Determine which categories have at least one matching plant
      const active = categoryDefinitions.filter(category => 
        allPlants.some(plant => category.filter(plant))
      );
      setActiveCategories(active);
      
      // Calculate counts for each category
      const counts = {};
      categoryDefinitions.forEach(category => {
        counts[category.name] = allPlants.filter(category.filter).length;
      });
      setPlantCounts(counts);
    }
  }, [allPlants, categoryDefinitions]);

  // Handle long press on a plant item to show delete option
  const handlePlantLongPress = (plantId) => {
    setSelectedPlantId(plantId);
    Alert.alert(
      'Plant Options',
      'What would you like to do with this plant?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setSelectedPlantId(null)
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeletePlant(plantId)
        }
      ]
    );
  };

  // Handle confirming plant deletion
  const handleDeletePlant = (plantId) => {
    Alert.alert(
      'Delete Plant',
      'Are you sure you want to remove this plant from your collection?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setSelectedPlantId(null)
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch(removePlant(plantId));
            setSelectedPlantId(null);
          }
        }
      ]
    );
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.categoryItem}
      onPress={() => navigation.navigate('PlantList', { category: item.name })}
    >
      <SvgImage source={item.image} style={styles.categoryImage} />
      <View style={styles.categoryTextContainer}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryCount}>
          {plantCounts[item.name] || 0} plants
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderPlantItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.plantItem,
        selectedPlantId === item.id && styles.selectedPlantItem
      ]}
      onPress={() => navigation.navigate('PlantDetail', { plantId: item.id })}
      onLongPress={() => handlePlantLongPress(item.id)}
      delayLongPress={500}
    >
      <SvgImage source={item.image} style={styles.plantImage} />
      <View style={styles.plantInfo}>
        <Text style={styles.plantName}>{item.name}</Text>
        <Text style={styles.plantSpecies}>{item.species}</Text>
        <Text style={styles.plantWatered}>Last watered: {item.lastWatered}</Text>
      </View>
      <TouchableOpacity 
        style={styles.moreButton}
        onPress={() => handlePlantLongPress(item.id)}
      >
        <MaterialCommunityIcons name="dots-vertical" size={20} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render empty state with option to add plants
  const renderEmptyPlants = () => (
    <View style={styles.emptyPlantsContainer}>
      <Text style={styles.emptyPlantsText}>You haven't added any plants yet.</Text>
      <TouchableOpacity 
        style={styles.addFirstPlantButton}
        onPress={() => navigation.navigate('AddPlantTab')}
      >
        <Text style={styles.addFirstPlantButtonText}>Add your first plant</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>PlantPal</Text>
        </View>

        <Text style={styles.sectionTitle}>Browse Categories</Text>
        <FlatList
          horizontal
          data={activeCategories}
          renderItem={renderCategoryItem}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          style={styles.categoryList}
        />

        <View style={styles.myPlantsHeader}>
          <Text style={styles.sectionTitle}>My Plants</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddPlantTab')}>
            <View style={styles.addButtonContainer}>
              <MaterialCommunityIcons name="plus" size={16} color="#2E7D32" />
              <Text style={styles.addButton}>Add</Text>
            </View>
          </TouchableOpacity>
        </View>

        {myPlants.length === 0 ? (
          renderEmptyPlants()
        ) : (
          <FlatList
            data={myPlants}
            renderItem={renderPlantItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.plantList}
            ListFooterComponent={<View style={{ height: 20 }} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 0 : 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  categoryList: {
    marginBottom: 20,
  },
  categoryItem: {
    marginRight: 15,
    alignItems: 'center',
    width: 100,
  },
  categoryImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  categoryTextContainer: {
    alignItems: 'center',
  },
  categoryName: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoryCount: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  myPlantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addButton: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: 'bold',
  },
  plantList: {
    flex: 1,
  },
  addButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plantItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
      },
      android: {
        elevation: 2,
      }
    }),
  },
  selectedPlantItem: {
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  moreButton: {
    justifyContent: 'center',
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  plantImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
    resizeMode: 'contain',
  },
  plantInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  plantName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  plantSpecies: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  plantWatered: {
    fontSize: 12,
    color: '#2E7D32',
  },
  emptyPlantsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  emptyPlantsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  addFirstPlantButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstPlantButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default HomeScreen;