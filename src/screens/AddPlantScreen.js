import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ScrollView, Platform, Alert, ActivityIndicator, Modal, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { addPlant, searchPlants, fetchPlants, toggleFavorite } from '../store/plantsSlice';
import * as ImagePicker from 'expo-image-picker';

const AddPlantScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [apiRecordCount, setApiRecordCount] = useState({ search: 0, all: 0 });
  
  // Keep these state variables for interface compatibility, but disable the functionality
  const [capturedImage, setCapturedImage] = useState(null);
  
  // Manual entry state
  const [manualEntryVisible, setManualEntryVisible] = useState(false);
  const [manualPlantData, setManualPlantData] = useState({
    name: '',
    species: '',
    careLevel: 'Easy',
    light: 'Medium indirect light',
    water: 'Weekly',
  });

  // Get search results and all plants from Redux store
  const { searchResults, searchStatus, error, allPlants, loadingPlants } = useSelector(state => ({
    searchResults: state.plants.searchResults,
    searchStatus: state.plants.searchStatus,
    error: state.plants.error,
    allPlants: state.plants.plants,
    loadingPlants: state.plants.status === 'loading'
  }));

  // Simplified permission check - only for image picker
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Media library permission status:', status);
    })();
  }, []);

  // Fetch plants on component mount if not already loaded
  useEffect(() => {
    if (allPlants.length === 0) {
      dispatch(fetchPlants());
    } else {
      setApiRecordCount(prev => ({ ...prev, all: allPlants.length }));
    }
  }, [dispatch, allPlants.length]);

  // Update search results count when results change
  useEffect(() => {
    if (searchResults.length > 0) {
      setApiRecordCount(prev => ({ ...prev, search: searchResults.length }));
    }
  }, [searchResults]);

  // Dynamically generate plant categories from API data
  const generatePlantCategories = () => {
    // Default categories if no plants are available
    if (allPlants.length === 0) {
      return [
        { id: '1', name: 'Indoor Plants', image: require('../../assets/indoor.png') },
        { id: '2', name: 'Succulents', image: require('../../assets/succulent.png') },
      ];
    }

    // Extract unique care levels, water frequencies, and light requirements
    const careLevels = [...new Set(allPlants.map(plant => plant.careLevel).filter(Boolean))];
    const waterTypes = [...new Set(allPlants.map(plant => plant.water).filter(Boolean))];
    const lightTypes = [...new Set(allPlants.map(plant => plant.light).filter(Boolean))];

    // Build categories from plant data
    const categories = [];

    // Add care level categories
    careLevels.forEach((level, index) => {
      categories.push({
        id: `care-${index}`,
        name: `${level} Care`,
        image: getImageForCategory('care', level),
        filterType: 'careLevel',
        filterValue: level
      });
    });

    // Add light requirement categories
    lightTypes.forEach((light, index) => {
      categories.push({
        id: `light-${index}`,
        name: light,
        image: getImageForCategory('light', light),
        filterType: 'light',
        filterValue: light
      });
    });

    // Add water requirement categories
    waterTypes.forEach((water, index) => {
      categories.push({
        id: `water-${index}`,
        name: water,
        image: getImageForCategory('water', water),
        filterType: 'water',
        filterValue: water
      });
    });

    return categories;
  };

  // Helper function to get an image for a category
  const getImageForCategory = (type, value) => {
    // Map category types to appropriate images
    if (type === 'care') {
      if (value.includes('Easy')) {
        return require('../../assets/peace_lily.png');
      } else if (value.includes('Difficult')) {
        return require('../../assets/fiddle_leaf.png');
      } else {
        return require('../../assets/monstera.png');
      }
    } else if (type === 'light') {
      if (value.includes('sun') || value.includes('bright')) {
        return require('../../assets/succulent.png');
      } else if (value.includes('shade') || value.includes('low')) {
        return require('../../assets/snake_plant.png');
      } else {
        return require('../../assets/indoor.png');
      }
    } else if (type === 'water') {
      if (value.includes('Weekly') || value.includes('moist')) {
        return require('../../assets/monstera.png');
      } else if (value.includes('2-3') || value.includes('dry')) {
        return require('../../assets/succulent.png');
      } else {
        return require('../../assets/herbs.png');
      }
    }
    
    // Default image
    return require('../../assets/indoor.png');
  };

  // Create the categories from the API data
  const plantCategories = generatePlantCategories();

  // Show the browse categories modal
  const [categoriesModalVisible, setCategoriesModalVisible] = useState(false);

  // Handle browse categories button press
  const handleBrowseCategories = () => {
    setCategoriesModalVisible(true);
  };

  // Handle category selection
  const handleCategorySelect = (category) => {
    setCategoriesModalVisible(false);
    setSelectedCategory(category);
    
    // Don't show the loading state when filtering by category
    // We already have all plants loaded, just need to filter them
    if (allPlants.length > 0) {
      setIsSearching(true);
    } else {
      // If plants aren't loaded yet, fetch them
      dispatch(fetchPlants());
      setIsSearching(true);
    }
  };

  // Filter plants by selected category
  const getFilteredPlants = () => {
    // If no plants are loaded yet, return empty array
    if (allPlants.length === 0 && !searchResults.length) {
      return [];
    }
    
    // If no category is selected, return all plants or search results
    if (!selectedCategory) {
      return isSearching && searchQuery.trim() !== '' ? searchResults : allPlants;
    }
    
    // Choose which set of plants to filter based on whether a search was performed
    const plantsToFilter = isSearching && searchQuery.trim() !== '' ? searchResults : allPlants;
    
    // Filter plants by the selected category's filter type and value
    return plantsToFilter.filter(plant => {
      const plantValue = plant[selectedCategory.filterType];
      // Handle case where the plant might not have the property we're filtering by
      if (!plantValue) return false;
      
      return plantValue === selectedCategory.filterValue;
    });
  };

  // Reset category filter
  const resetCategoryFilter = () => {
    setSelectedCategory(null);
  };

  // Render the categories modal
  const renderCategoriesModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={categoriesModalVisible}
      onRequestClose={() => setCategoriesModalVisible(false)}
    >
      <View style={styles.categoriesModalContainer}>
        <View style={styles.categoriesModalContent}>
          <View style={styles.categoriesModalHeader}>
            <Text style={styles.categoriesModalTitle}>Browse Categories</Text>
            <TouchableOpacity onPress={() => setCategoriesModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={plantCategories}
            numColumns={2}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.categoryItem}
                onPress={() => handleCategorySelect(item)}
              >
                <Image source={item.image} style={styles.categoryImage} resizeMode="contain" />
                <Text style={styles.categoryName}>{item.name}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.categoriesList}
          />
          
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => {
              setCategoriesModalVisible(false);
              resetCategoryFilter();
            }}
          >
            <Text style={styles.viewAllButtonText}>View All Plants</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() !== '') {
        dispatch(searchPlants(searchQuery));
        setIsSearching(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, dispatch]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setIsSearching(false);
      resetCategoryFilter();
    }
  };

  const handleSelectPlant = (plant) => {
    // Add the selected plant to the user's collection
    dispatch(addPlant({
      ...plant,
      lastWatered: new Date().toISOString().split('T')[0], // Today's date
      nextWatering: getNextWateringDate(plant),
      care: {
        water: plant.water || 'Weekly', // Add default value
        light: plant.light || 'Medium indirect light', // Add default value
        temperature: '65-85°F (18-29°C)',
        humidity: 'Medium',
        soil: 'Well-draining potting mix',
        fertilizer: 'As needed',
        repotting: 'Every 1-2 years',
      },
      isFavorite: true // Set to true when adding to collection
    }));

    // Toggle plant as favorite in the general plant list
    dispatch(toggleFavorite(plant.id));

    // Show success message
    Alert.alert(
      'Plant Added',
      `${plant.name} has been added to your collection!`,
      [
        { 
          text: 'View My Plants', 
          onPress: () => navigation.goBack() 
        },
        { 
          text: 'View Details', 
          onPress: () => navigation.navigate('PlantDetail', { plantId: plant.id })
        }
      ]
    );
  };

  // Helper function to calculate next watering date based on water requirement
  const getNextWateringDate = (plant) => {
    const today = new Date();
    let daysToAdd = 7; // Default weekly

    if (plant.water) {
      if (plant.water.includes('2-3 weeks')) {
        daysToAdd = 14; // 2 weeks
      } else if (plant.water.includes('dry')) {
        daysToAdd = 10; // When soil is dry
      } else if (plant.water.includes('moist')) {
        daysToAdd = 3; // Keep soil moist
      }
    }

    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysToAdd);
    return nextDate.toISOString().split('T')[0];
  };

  // Render a search result item
  const renderSearchResult = ({ item }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => handleSelectPlant(item)}
    >
      <Image 
        source={typeof item.image === 'number' ? item.image : { uri: item.image }} 
        style={styles.resultImage} 
        resizeMode="cover"
      />
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultSpecies}>{item.species}</Text>
        <View style={styles.resultCareLevel}>
          <Text style={styles.careLevelText}>{item.careLevel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render loading indicator when searching
  const renderSearchContent = () => {
    const filteredPlants = getFilteredPlants();
    
    // Only show loading when we're actually loading from the API,
    // not when we're just filtering locally
    if ((searchStatus === 'loading' && searchQuery.trim() !== '') || 
        (loadingPlants && allPlants.length === 0 && !selectedCategory)) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>
            {searchQuery.trim() !== '' ? 'Searching plants...' : 'Loading plants...'}
          </Text>
        </View>
      );
    }

    // Show error only for search API failures, not for filtering
    if (searchStatus === 'failed' && searchQuery.trim() !== '') {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#E53935" />
          <Text style={styles.errorText}>
            {error || "Couldn't find plants. Try again or browse options below."}
          </Text>
        </View>
      );
    }

    // Show the filtered results
    return (
      <View style={styles.resultsContainer}>
        {selectedCategory && (
          <View style={styles.categoryFilterContainer}>
            <Text style={styles.categoryFilterLabel}>
              Filtered by: {selectedCategory.name}
            </Text>
            <TouchableOpacity 
              style={styles.categoryFilterClear}
              onPress={resetCategoryFilter}
            >
              <MaterialCommunityIcons name="close" size={18} color="#2E7D32" />
            </TouchableOpacity>
          </View>
        )}
        
        <Text style={styles.resultCountText}>
          {filteredPlants.length} plant{filteredPlants.length !== 1 ? 's' : ''} found
        </Text>
        
        {filteredPlants.length > 0 ? (
          <FlatList
            data={filteredPlants}
            renderItem={renderSearchResult}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.searchResults}
          />
        ) : (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>
              {selectedCategory 
                ? `No plants found in the "${selectedCategory.name}" category.` 
                : "No plants found. Try a different search term or category."
              }
            </Text>
            {selectedCategory && (
              <TouchableOpacity 
                style={styles.clearFilterButton}
                onPress={resetCategoryFilter}
              >
                <Text style={styles.clearFilterButtonText}>Clear Filter</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // Manual entry related functions
  const handleManualEntry = () => {
    setManualEntryVisible(true);
  };
  
  const handleManualInputChange = (field, value) => {
    setManualPlantData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSubmitManualEntry = () => {
    if (!manualPlantData.name.trim()) {
      Alert.alert('Missing Information', 'Please provide at least a plant name');
      return;
    }
    
    // Create a new plant with the manual data
    const newPlant = {
      id: `manual-${Date.now()}`,
      name: manualPlantData.name,
      species: manualPlantData.species || 'Unknown species',
      image: require('../../assets/monstera.png'), // Default image
      careLevel: manualPlantData.careLevel,
      light: manualPlantData.light,
      water: manualPlantData.water,
      data: []
    };
    
    handleSelectPlant(newPlant);
    setManualEntryVisible(false);
    
    // Reset the form
    setManualPlantData({
      name: '',
      species: '',
      careLevel: 'Easy',
      light: 'Medium indirect light',
      water: 'Weekly',
    });
  };

  // Render the manual entry form
  const renderManualEntryView = () => (
    <Modal
      visible={manualEntryVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setManualEntryVisible(false)}
    >
      <View style={styles.manualEntryModalContainer}>
        <View style={styles.manualEntryContent}>
          <Text style={styles.manualEntryTitle}>Add Plant Manually</Text>
          
          <Text style={styles.manualEntryLabel}>Plant Name*</Text>
          <TextInput
            style={styles.manualEntryInput}
            value={manualPlantData.name}
            onChangeText={(text) => handleManualInputChange('name', text)}
            placeholder="e.g. Monstera, Snake Plant"
          />
          
          <Text style={styles.manualEntryLabel}>Scientific Name</Text>
          <TextInput
            style={styles.manualEntryInput}
            value={manualPlantData.species}
            onChangeText={(text) => handleManualInputChange('species', text)}
            placeholder="e.g. Monstera deliciosa"
          />
          
          <Text style={styles.manualEntryLabel}>Care Level</Text>
          <View style={styles.careLevelOptions}>
            {['Very Easy', 'Easy', 'Moderate', 'Difficult'].map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.careLevelOption,
                  manualPlantData.careLevel === level && styles.careLevelOptionSelected
                ]}
                onPress={() => handleManualInputChange('careLevel', level)}
              >
                <Text style={[
                  styles.careLevelOptionText,
                  manualPlantData.careLevel === level && styles.careLevelOptionTextSelected
                ]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.manualEntryLabel}>Light Requirements</Text>
          <View style={styles.optionPicker}>
            {[
              'Low light',
              'Medium indirect light',
              'Bright indirect light',
              'Full sun'
            ].map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.option,
                  manualPlantData.light === option && styles.optionSelected
                ]}
                onPress={() => handleManualInputChange('light', option)}
              >
                <Text style={[
                  styles.optionText,
                  manualPlantData.light === option && styles.optionTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.manualEntryLabel}>Watering Frequency</Text>
          <View style={styles.optionPicker}>
            {[
              'Daily',
              'Weekly',
              'Every 2-3 weeks',
              'Monthly'
            ].map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.option,
                  manualPlantData.water === option && styles.optionSelected
                ]}
                onPress={() => handleManualInputChange('water', option)}
              >
                <Text style={[
                  styles.optionText,
                  manualPlantData.water === option && styles.optionTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.manualEntryActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setManualEntryVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSubmitManualEntry}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Handle camera button press - navigate to the scan screen
  const handleCameraPress = () => {
    navigation.navigate('ScanPlant');
  };
  
  // Use image picker
  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'You need to grant camera roll permissions to upload images.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      
      if (!result.canceled) {
        setCapturedImage(result.assets[0].uri);
        // Here you could handle the image, for example by identifying plants
        Alert.alert(
          'Image Selected',
          'You can use this image to identify a plant or add it to your collection.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Identify Plant', 
              onPress: () => navigation.navigate('ScanPlant') 
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.title}>Add a Plant</Text>
        <View style={styles.apiCountContainer}>
          <Text style={styles.apiCountText}>
            API: {apiRecordCount.all}/{apiRecordCount.search}
          </Text>
        </View>
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

      {isSearching || selectedCategory ? (
        renderSearchContent()
      ) : (
        <ScrollView style={styles.addOptionsContainer}>
          <Text style={styles.sectionTitle}>Add a plant by:</Text>
          
          <TouchableOpacity style={styles.addOption} onPress={handleCameraPress}>
            <View style={styles.addOptionIcon}>
              <Ionicons name="scan-outline" size={24} color="#4CAF50" />
            </View>
            <View style={styles.addOptionInfo}>
              <Text style={styles.addOptionTitle}>Scan & Identify</Text>
              <Text style={styles.addOptionDescription}>Use your camera to identify a plant</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.addOption} onPress={handleTakePhoto}>
            <View style={styles.addOptionIcon}>
              <Ionicons name="images-outline" size={24} color="#4CAF50" />
            </View>
            <View style={styles.addOptionInfo}>
              <Text style={styles.addOptionTitle}>Photo Library</Text>
              <Text style={styles.addOptionDescription}>Choose a plant image from your gallery</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.addOption} onPress={handleManualEntry}>
            <View style={styles.addOptionIcon}>
              <Ionicons name="create-outline" size={24} color="#4CAF50" />
            </View>
            <View style={styles.addOptionInfo}>
              <Text style={styles.addOptionTitle}>Manual Entry</Text>
              <Text style={styles.addOptionDescription}>Add plant details manually</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.addOption} onPress={handleBrowseCategories}>
            <View style={styles.addOptionIcon}>
              <Ionicons name="leaf-outline" size={24} color="#4CAF50" />
            </View>
            <View style={styles.addOptionInfo}>
              <Text style={styles.addOptionTitle}>Browse Categories</Text>
              <Text style={styles.addOptionDescription}>Find plants by categories</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}
      
      {renderCategoriesModal()}
      {renderManualEntryView()}
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
  apiCountContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F8E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  apiCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2E7D32',
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
  resultItem: {
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
    resizeMode: 'cover',
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
  resultCareLevel: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(46, 125, 50, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  careLevelText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    margin: 16,
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    height: 200,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  resultsContainer: {
    flex: 1,
  },
  categoryFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  categoryFilterLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryFilterClear: {
    padding: 5,
  },
  resultCountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    margin: 10,
  },
  manualEntryModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualEntryContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  manualEntryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 20,
    textAlign: 'center',
  },
  manualEntryLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  manualEntryInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  careLevelOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  careLevelOption: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  careLevelOptionSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  careLevelOptionText: {
    fontSize: 14,
    color: '#666',
  },
  careLevelOptionTextSelected: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  optionPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  option: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  optionSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextSelected: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  manualEntryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  categoriesModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  categoriesModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoriesModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  categoriesList: {
    alignItems: 'center',
  },
  categoryItem: {
    width: '45%',
    margin: 10,
    alignItems: 'center',
  },
  categoryImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  categoryName: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  viewAllButton: {
    marginTop: 20,
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewAllButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  clearFilterButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearFilterButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default AddPlantScreen;