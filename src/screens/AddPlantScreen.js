import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ScrollView, Platform } from 'react-native';
import SvgImage from '../utils/SvgImage';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const AddPlantScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mock plant data for search results
  const plantDatabase = [
    { id: '1', name: 'Monstera', species: 'Monstera deliciosa', image: require('../../assets/monstera.png') },
    { id: '2', name: 'Snake Plant', species: 'Sansevieria trifasciata', image: require('../../assets/snake_plant.png') },
    { id: '3', name: 'Peace Lily', species: 'Spathiphyllum', image: require('../../assets/peace_lily.png') },
    { id: '4', name: 'Fiddle Leaf Fig', species: 'Ficus lyrata', image: require('../../assets/fiddle_leaf.png') },
    { id: '5', name: 'Pothos', species: 'Epipremnum aureum', image: require('../../assets/pothos.png') },
    { id: '6', name: 'Aloe Vera', species: 'Aloe barbadensis miller', image: require('../../assets/aloe_vera.png') },
    { id: '7', name: 'Spider Plant', species: 'Chlorophytum comosum', image: require('../../assets/spider_plant.png') },
    { id: '8', name: 'ZZ Plant', species: 'Zamioculcas zamiifolia', image: require('../../assets/zz_plant.png') },
  ];

  const handleSearch = (query) => {
    setSearchQuery(query);
    setIsSearching(true);
    
    // Filter plants based on search query
    if (query.trim() === '') {
      setSearchResults([]);
    } else {
      const filteredResults = plantDatabase.filter(
        plant => plant.name.toLowerCase().includes(query.toLowerCase()) || 
                plant.species.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filteredResults);
    }
  };

  const handleSelectPlant = (plant) => {
    // Navigate to plant detail screen with selected plant data
    // Using plantId parameter to match the existing PlantDetailScreen implementation
    navigation.navigate('PlantDetail', { plantId: plant.id });
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity 
      style={styles.searchResultItem}
      onPress={() => handleSelectPlant(item)}
    >
      <SvgImage source={item.image} style={styles.resultImage} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultSpecies}>{item.species}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.title}>Add a Plant</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a plant..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
        />
      </View>

      {isSearching && searchQuery.trim() !== '' ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.searchResults}
          ListEmptyComponent={
            <Text style={styles.noResultsText}>No plants found. Try a different search term.</Text>
          }
        />
      ) : (
        <ScrollView style={styles.addOptionsContainer}>
          <Text style={styles.sectionTitle}>Add a plant by:</Text>
          
          <TouchableOpacity style={styles.addOption}>
            <View style={styles.addOptionIcon}>
              <MaterialCommunityIcons name="camera" size={24} color="#2E7D32" />
            </View>
            <View style={styles.addOptionInfo}>
              <Text style={styles.addOptionTitle}>Take a Photo</Text>
              <Text style={styles.addOptionDescription}>Use your camera to identify a plant</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.addOption}>
            <View style={styles.addOptionIcon}>
              <MaterialCommunityIcons name="magnify" size={24} color="#2E7D32" />
            </View>
            <View style={styles.addOptionInfo}>
              <Text style={styles.addOptionTitle}>Browse Categories</Text>
              <Text style={styles.addOptionDescription}>Find plants by category</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.addOption}>
            <View style={styles.addOptionIcon}>
              <MaterialCommunityIcons name="barcode-scan" size={24} color="#2E7D32" />
            </View>
            <View style={styles.addOptionInfo}>
              <Text style={styles.addOptionTitle}>Scan Barcode</Text>
              <Text style={styles.addOptionDescription}>Scan a plant tag or QR code</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.addOption}>
            <View style={styles.addOptionIcon}>
              <MaterialCommunityIcons name="pencil" size={24} color="#2E7D32" />
            </View>
            <View style={styles.addOptionInfo}>
              <Text style={styles.addOptionTitle}>Manual Entry</Text>
              <Text style={styles.addOptionDescription}>Add plant details manually</Text>
            </View>
          </TouchableOpacity>
          
          <Text style={styles.sectionTitle}>Popular Plants:</Text>
          
          <View style={styles.popularPlantsContainer}>
            {plantDatabase.slice(0, 7).map(plant => (
              <TouchableOpacity 
                key={plant.id} 
                style={styles.popularPlantItem}
                onPress={() => handleSelectPlant(plant)}
              >
                <SvgImage source={plant.image} style={styles.popularPlantImage} />
                <Text style={styles.popularPlantName}>{plant.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  searchResults: {
    padding: 16,
  },
  searchResultItem: {
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
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    resizeMode: 'contain',
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultSpecies: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  addOptionsContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
    color: '#333',
  },
  addOption: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  addOptionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addOptionInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  addOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  addOptionDescription: {
    fontSize: 14,
    color: '#666',
  },
  popularPlantsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  popularPlantItem: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
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
  popularPlantImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  popularPlantName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AddPlantScreen;