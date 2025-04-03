import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Platform } from 'react-native';
import SvgImage from '../utils/SvgImage';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const PlantListScreen = ({ route }) => {
  const { category } = route.params;
  const navigation = useNavigation();
  
  // Mock data for plants in a category
  // In a real app, this would be filtered based on the selected category
  const plants = [
    { 
      id: '1', 
      name: 'Monstera', 
      species: 'Monstera deliciosa', 
      image: require('../../assets/monstera.png'),
      careLevel: 'Easy',
      light: 'Indirect sunlight',
      water: 'Weekly'
    },
    { 
      id: '2', 
      name: 'Snake Plant', 
      species: 'Sansevieria trifasciata', 
      image: require('../../assets/snake_plant.png'),
      careLevel: 'Very Easy',
      light: 'Low to bright indirect',
      water: 'Every 2-3 weeks'
    },
    { 
      id: '3', 
      name: 'Peace Lily', 
      species: 'Spathiphyllum', 
      image: require('../../assets/peace_lily.png'),
      careLevel: 'Moderate',
      light: 'Low to medium indirect',
      water: 'When soil is dry'
    },
    { 
      id: '4', 
      name: 'Fiddle Leaf Fig', 
      species: 'Ficus lyrata', 
      image: require('../../assets/fiddle_leaf.png'),
      careLevel: 'Difficult',
      light: 'Bright indirect',
      water: 'When top inch is dry'
    },
    { 
      id: '5', 
      name: 'Pothos', 
      species: 'Epipremnum aureum', 
      image: require('../../assets/pothos.png'),
      careLevel: 'Very Easy',
      light: 'Low to bright indirect',
      water: 'When soil is dry'
    },
  ];

  const renderPlantItem = ({ item }) => {
    // Check if we're in the Discover tab by looking at the route name
    const isDiscoverScreen = navigation.getState().routes.some(
      route => route.name === 'DiscoverTab' || route.name === 'DiscoverHome'
    );
    
    // Use grid layout for Discover screen, list layout for other screens
    if (isDiscoverScreen) {
      return (
        <TouchableOpacity 
          style={styles.gridItem}
          onPress={() => navigation.navigate('PlantDetail', { plantId: item.id })}
        >
          <SvgImage source={item.image} style={styles.gridImage} />
          <View style={styles.gridInfo}>
            <Text style={styles.gridName}>{item.name}</Text>
            <Text style={styles.gridSpecies}>{item.species}</Text>
            <View style={styles.gridCareLevel}>
              <Text style={styles.careLevel}>{item.careLevel}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }
    
    // Original list item for other screens
    return (
      <TouchableOpacity 
        style={styles.plantItem}
        onPress={() => navigation.navigate('PlantDetail', { plantId: item.id })}
      >
        <SvgImage source={item.image} style={styles.plantImage} />
        <View style={styles.plantInfo}>
          <Text style={styles.plantName}>{item.name}</Text>
          <Text style={styles.plantSpecies}>{item.species}</Text>
          <View style={styles.careInfo}>
            <View style={styles.careLevelContainer}>
              <Text style={styles.careLevel}>{item.careLevel}</Text>
            </View>
            <View style={styles.careDetails}>
              <Text style={styles.careText}>
                <MaterialCommunityIcons name="white-balance-sunny" size={14} color="#666" /> {item.light}
              </Text>
              <Text style={styles.careText}>
                <MaterialCommunityIcons name="water-outline" size={14} color="#666" /> {item.water}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Filter plants based on selected category if not 'All Plants'
  const filteredPlants = category === 'All Plants' 
    ? plants 
    : plants.filter(plant => {
        // Map category names to plant properties for filtering
        const categoryMap = {
          'Indoor Plants': plant => true, // All plants are indoor in this demo
          'Succulents': plant => plant.water.includes('2-3 weeks') || plant.careLevel === 'Very Easy',
          'Flowering Plants': plant => plant.name === 'Peace Lily',
          'Herbs': plant => false // No herbs in the demo data
        };
        
        return categoryMap[category] ? categoryMap[category](plant) : true;
      });

  // Check if we're in the Discover tab
  const isDiscoverScreen = navigation.getState().routes.some(
    route => route.name === 'DiscoverTab' || route.name === 'DiscoverHome'
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.title}>{category}</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={filteredPlants}
        renderItem={renderPlantItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        numColumns={isDiscoverScreen ? 2 : 1}
        key={isDiscoverScreen ? 'grid' : 'list'} // Force re-render when layout changes
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 1.41,
      },
      android: {
        elevation: 2,
      }
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F8E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    padding: 16,
  },
  plantItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
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
  plantImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
    resizeMode: 'contain',
  },
  plantInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  plantName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  plantSpecies: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 8,
  },
  careInfo: {
    marginTop: 4,
  },
  careLevelContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  careLevel: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  careDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  careText: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  // Grid layout styles for Discovery screen
  gridItem: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    margin: 8,
    alignItems: 'center',
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
  gridImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  gridInfo: {
    width: '100%',
    alignItems: 'center',
  },
  gridName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    color: '#333',
  },
  gridSpecies: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#666',
    marginBottom: 8,
  },
  gridCareLevel: {
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
});

export default PlantListScreen;