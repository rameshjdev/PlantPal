import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Platform, ActivityIndicator, TextInput, Modal, ScrollView } from 'react-native';
import SvgImage from '../utils/SvgImage';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import plantService from '../services/plantService';
import { toggleFavorite } from '../store/plantsSlice';

const PlantListScreen = ({ route }) => {
  const { category } = route.params;
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  // Get plants from Redux store
  const allPlants = useSelector(state => state.plants.plants);
  const userPlants = useSelector(state => state.plants.userPlants);
  
  // State for plants data, loading status, and error handling
  const [plants, setPlants] = useState([]);
  const [filteredPlants, setFilteredPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastId, setLastId] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState({
    careLevel: [],
    light: [],
    water: [],
    petFriendly: null
  });

  // Fetch plants on component mount
  useEffect(() => {
    // First check if we already have plants in Redux store
    if (allPlants && allPlants.length > 0) {
      setPlants(allPlants);
      setLoading(false);
    } else {
      fetchPlants();
    }
  }, [allPlants]);

  // Filter plants when category, plants data or search/filter criteria changes
  useEffect(() => {
    filterPlantsByCategory();
  }, [category, plants, searchQuery, filterCriteria]);

  // Fetch plants from API
  const fetchPlants = async () => {
    try {
      setLoading(true);
      
      // Check if category exists before using startsWith
      if (category && typeof category === 'string' && category.startsWith('Search:')) {
        // It's a search query, use searchPlants
        const data = await plantService.searchPlants(category.replace('Search:', '').trim());
        
        if (data.length === 0) {
          setHasMore(false);
        } else {
          setPlants(prevPlants => lastId ? [...prevPlants, ...data] : data);
          setLastId(data.length > 0 ? data[data.length - 1].id : null);
        }
      } else {
        // Regular fetch plants
        const data = await plantService.fetchPlants(lastId);
        
        if (data.length === 0) {
          setHasMore(false);
        } else {
          setPlants(prevPlants => lastId ? [...prevPlants, ...data] : data);
          setLastId(data.length > 0 ? data[data.length - 1].id : null);
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching plants:', err);
      setError('Failed to load plants. Please try again.');
      setLoading(false);
      
      // If API call fails, use backup static data to ensure app functionality
      setPlants(backupPlantData);
    }
  };

  // Load more plants when user reaches the end of the list
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchPlants();
    }
  };

  // Apply filters based on category, search query and filter criteria
  const filterPlantsByCategory = () => {
    if (plants.length === 0) return;
    
    // First filter by category
    let filtered = plants;
    
    if (category && typeof category === 'string' && category !== 'All Plants' && !category.startsWith('Search:')) {
      // Map category names to filtering functions
      const categoryMap = {
        'Indoor Plants': plant => {
          // Consider a plant indoor if it doesn't explicitly require full sun
          const lightReq = plant.light.toLowerCase();
          return !lightReq.includes('full sun only') || lightReq.includes('partial');
        },
        'Succulents': plant => {
          // Succulents typically need less water
          return plant.water.includes('2-3 weeks') || 
                 (plant.data && plant.data.some(item => 
                   item.key && item.key.toLowerCase().includes('succulent') || 
                   (item.key === 'Plant type' && item.value && item.value.toLowerCase().includes('succulent'))
                 ));
        },
        'Flowering Plants': plant => {
          // Check if plant data indicates it's flowering
          if (plant.data && Array.isArray(plant.data)) {
            return plant.data.some(item => 
              (item.key === 'Flower color' && item.value) || 
              (item.key === 'Flowering season' && item.value)
            );
          }
          // Fallback to name-based check
          return plant.name.includes('Lily') || 
                 plant.name.includes('Rose') || 
                 plant.name.includes('Orchid');
        },
        'Herbs': plant => {
          // Check if plant data indicates it's an herb
          if (plant.data && Array.isArray(plant.data)) {
            return plant.data.some(item => 
              (item.key === 'Edible parts' && item.value && item.value.includes('Leaves')) ||
              (item.key === 'Layer' && item.value && item.value.includes('Herbs'))
            );
          }
          // Fallback to name-based check
          return plant.name.includes('Mint') || 
                 plant.name.includes('Basil') || 
                 plant.name.includes('Thyme') ||
                 plant.name.includes('Oregano') ||
                 plant.name.includes('Rosemary');
        },
        'Air Purifying': plant => {
          // Popular air purifying plants
          const airPurifiers = ['Snake Plant', 'Pothos', 'Peace Lily', 'Spider Plant', 'Dracaena', 'Fern', 'ZZ Plant', 'Rubber Plant'];
          return airPurifiers.some(name => plant.name.includes(name));
        },
        'Low Light Plants': plant => {
          // Plants that can thrive in low light
          return plant.light.toLowerCase().includes('low') || 
                 plant.name.includes('ZZ Plant') || 
                 plant.name.includes('Snake Plant') || 
                 plant.name.includes('Pothos');
        },
        'Tropical Plants': plant => {
          // Common tropical plants or plants with tropical in their data
          const tropicalPlants = ['Monstera', 'Palm', 'Philodendron', 'Calathea', 'Anthurium', 'Bird of Paradise'];
          return tropicalPlants.some(name => plant.name.includes(name)) ||
                 (plant.data && plant.data.some(item => 
                   item.value && item.value.toLowerCase().includes('tropical')
                 ));
        },
        'Pet Friendly': plant => {
          // Plants known to be safe for pets
          const petFriendly = ['Spider Plant', 'Boston Fern', 'Areca Palm', 'Calathea', 'Christmas Cactus'];
          return petFriendly.some(name => plant.name.includes(name)) ||
                 (plant.data && plant.data.some(item => 
                   (item.key === 'Toxicity' && item.value && item.value.toLowerCase().includes('non-toxic'))
                 ));
        }
      };
      
      if (categoryMap[category]) {
        filtered = plants.filter(plant => categoryMap[category](plant));
      }
    }
    
    // Then apply search query if it exists
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(plant => 
        plant.name.toLowerCase().includes(query) || 
        (plant.species && plant.species.toLowerCase().includes(query))
      );
    }
    
    // Finally apply additional filter criteria
    if (Object.values(filterCriteria).some(value => 
        (Array.isArray(value) && value.length > 0) || 
        (value !== null && typeof value === 'boolean')
    )) {
      filtered = filtered.filter(plant => {
        // Filter by care level
        if (filterCriteria.careLevel.length > 0) {
          if (!plant.careLevel || !filterCriteria.careLevel.includes(plant.careLevel)) {
            return false;
          }
        }
        
        // Filter by light requirements
        if (filterCriteria.light.length > 0) {
          const lightMatch = filterCriteria.light.some(light => {
            if (!plant.light) return false;
            
            const plantLight = plant.light.toLowerCase();
            switch(light) {
              case 'low':
                return plantLight.includes('low');
              case 'medium':
                return plantLight.includes('medium') || plantLight.includes('indirect');
              case 'high':
                return plantLight.includes('bright') || plantLight.includes('direct');
              default:
                return false;
            }
          });
          if (!lightMatch) return false;
        }
        
        // Filter by watering frequency
        if (filterCriteria.water.length > 0) {
          const waterMatch = filterCriteria.water.some(water => {
            if (!plant.water) return false;
            
            const plantWater = plant.water.toLowerCase();
            switch(water) {
              case 'frequent':
                return plantWater.includes('daily') || plantWater.includes('often') || plantWater.includes('moist');
              case 'moderate':
                return plantWater.includes('weekly');
              case 'infrequent':
                return plantWater.includes('2-3 weeks') || plantWater.includes('monthly');
              default:
                return false;
            }
          });
          if (!waterMatch) return false;
        }
        
        // Filter by pet friendly
        if (filterCriteria.petFriendly !== null) {
          // Default to not pet friendly unless we have specific data
          let isPetFriendly = false;
          
          // Check plant data
          if (plant.data && Array.isArray(plant.data)) {
            isPetFriendly = plant.data.some(item => 
              (item.key === 'Toxicity' && item.value && item.value.toLowerCase().includes('non-toxic'))
            );
          }
          
          // Check for known pet-friendly plants
          const petFriendlyPlants = ['Spider Plant', 'Boston Fern', 'Areca Palm', 'Calathea', 'Christmas Cactus'];
          if (!isPetFriendly) {
            isPetFriendly = petFriendlyPlants.some(name => 
              plant.name.includes(name)
            );
          }
          
          if (filterCriteria.petFriendly !== isPetFriendly) return false;
        }
        
        return true;
      });
    }
    
    setFilteredPlants(filtered);
  };

  // Reset all filters
  const resetFilters = () => {
    setFilterCriteria({
      careLevel: [],
      light: [],
      water: [],
      petFriendly: null
    });
    setSearchQuery('');
    setIsFilterModalVisible(false);
  };

  // Toggle filter selection
  const toggleFilter = (filterType, value) => {
    setFilterCriteria(prevCriteria => {
      const newCriteria = { ...prevCriteria };
      
      if (filterType === 'petFriendly') {
        // Toggle boolean value
        newCriteria.petFriendly = newCriteria.petFriendly === value ? null : value;
      } else {
        // Toggle array selection
        if (newCriteria[filterType].includes(value)) {
          newCriteria[filterType] = newCriteria[filterType].filter(item => item !== value);
        } else {
          newCriteria[filterType] = [...newCriteria[filterType], value];
        }
      }
      
      return newCriteria;
    });
  };

  // Handle toggle favorite
  const handleToggleFavorite = (plantId) => {
    dispatch(toggleFavorite(plantId));
  };

  // Render filter button with badge showing number of active filters
  const renderFilterButton = () => {
    const activeFilterCount = 
      filterCriteria.careLevel.length + 
      filterCriteria.light.length + 
      filterCriteria.water.length + 
      (filterCriteria.petFriendly !== null ? 1 : 0);
    
    return (
      <TouchableOpacity 
        style={styles.filterButton} 
        onPress={() => setIsFilterModalVisible(true)}
      >
        <MaterialCommunityIcons name="filter-variant" size={24} color="#2E7D32" />
        {activeFilterCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render filter modal with filter options
  const renderFilterModal = () => (
    <Modal
      visible={isFilterModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Plants</Text>
            <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.filterOptions}>
            {/* Care Level Filter */}
            <Text style={styles.filterSectionTitle}>Care Level</Text>
            <View style={styles.filterChipContainer}>
              {['Very Easy', 'Easy', 'Moderate', 'Difficult'].map(level => (
                <TouchableOpacity 
                  key={level}
                  style={[
                    styles.filterChip,
                    filterCriteria.careLevel.includes(level) && styles.filterChipSelected
                  ]}
                  onPress={() => toggleFilter('careLevel', level)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterCriteria.careLevel.includes(level) && styles.filterChipTextSelected
                  ]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Light Requirements Filter */}
            <Text style={styles.filterSectionTitle}>Light Requirements</Text>
            <View style={styles.filterChipContainer}>
              {[
                { key: 'low', label: 'Low Light' },
                { key: 'medium', label: 'Medium Light' },
                { key: 'high', label: 'Bright Light' }
              ].map(item => (
                <TouchableOpacity 
                  key={item.key}
                  style={[
                    styles.filterChip,
                    filterCriteria.light.includes(item.key) && styles.filterChipSelected
                  ]}
                  onPress={() => toggleFilter('light', item.key)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterCriteria.light.includes(item.key) && styles.filterChipTextSelected
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Watering Frequency Filter */}
            <Text style={styles.filterSectionTitle}>Watering Frequency</Text>
            <View style={styles.filterChipContainer}>
              {[
                { key: 'frequent', label: 'Frequent' },
                { key: 'moderate', label: 'Moderate' },
                { key: 'infrequent', label: 'Infrequent' }
              ].map(item => (
                <TouchableOpacity 
                  key={item.key}
                  style={[
                    styles.filterChip,
                    filterCriteria.water.includes(item.key) && styles.filterChipSelected
                  ]}
                  onPress={() => toggleFilter('water', item.key)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterCriteria.water.includes(item.key) && styles.filterChipTextSelected
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Pet Friendly Filter */}
            <Text style={styles.filterSectionTitle}>Pet Friendly</Text>
            <View style={styles.filterChipContainer}>
              {[
                { value: true, label: 'Pet Safe' },
                { value: false, label: 'Not Pet Safe' }
              ].map(item => (
                <TouchableOpacity 
                  key={String(item.value)}
                  style={[
                    styles.filterChip,
                    filterCriteria.petFriendly === item.value && styles.filterChipSelected
                  ]}
                  onPress={() => toggleFilter('petFriendly', item.value)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterCriteria.petFriendly === item.value && styles.filterChipTextSelected
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyButton} 
              onPress={() => setIsFilterModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPlantItem = ({ item }) => {
    // Check if we're in the Discover tab by looking at the route name
    const isDiscoverScreen = navigation.getState().routes.some(
      route => route.name === 'DiscoverTab' || route.name === 'DiscoverHome'
    );
    
    // Check if plant is in user's favorites
    const isFavorite = userPlants.some(plant => plant.id === item.id && plant.isFavorite);
    
    // Use grid layout for Discover screen, list layout for other screens
    if (isDiscoverScreen) {
      return (
        <View style={styles.gridItemContainer}>
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
          <TouchableOpacity 
            style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
            onPress={() => handleToggleFavorite(item.id)}
          >
            <MaterialCommunityIcons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={20} 
              color={isFavorite ? "#E53935" : "#666"} 
            />
          </TouchableOpacity>
        </View>
      );
    }
    
    // Original list item for other screens
    return (
      <View style={styles.plantItemContainer}>
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
        <TouchableOpacity 
          style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
          onPress={() => handleToggleFavorite(item.id)}
        >
          <MaterialCommunityIcons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={20} 
            color={isFavorite ? "#E53935" : "#666"} 
          />
        </TouchableOpacity>
      </View>
    );
  };

  // Render footer with loading indicator when loading more plants
  const renderFooter = () => {
    // Don't show loading indicator if:
    // 1. We're not loading
    // 2. There are no more items to load
    // 3. There are no filtered items (meaning search/filter returned no results)
    if (!loading || !hasMore || filteredPlants.length === 0) return null;
    
    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color="#2E7D32" />
        <Text style={styles.footerText}>Loading more plants...</Text>
      </View>
    );
  };

  // Render loading state
  if (loading && plants.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#2E7D32" />
          </TouchableOpacity>
          <Text style={styles.title}>{category}</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading plants...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && plants.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#2E7D32" />
          </TouchableOpacity>
          <Text style={styles.title}>{category}</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={50} color="#E53935" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPlants}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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

      {isDiscoverScreen && (
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search plants..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={16} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          {renderFilterButton()}
        </View>
      )}

      <FlatList
        data={filteredPlants}
        renderItem={renderPlantItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        numColumns={isDiscoverScreen ? 2 : 1}
        key={isDiscoverScreen ? 'grid' : 'list'} // Force re-render when layout changes
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        getItemLayout={(data, index) => ({
          length: isDiscoverScreen ? 230 : 124,
          offset: isDiscoverScreen ? 230 * Math.floor(index / 2) : 124 * index,
          index,
        })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="sprout" size={50} color="#BDBDBD" />
            <Text style={styles.emptyText}>
              {searchQuery.trim() !== '' 
                ? `No plants found for "${searchQuery}"`
                : "No plants found for this category"}
            </Text>
            {searchQuery.trim() !== '' && (
              <TouchableOpacity 
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchButtonText}>Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {renderFilterModal()}
    </SafeAreaView>
  );
};

// Backup static data in case API fails
const backupPlantData = [
  { 
    id: '1', 
    name: 'Monstera', 
    species: 'Monstera deliciosa', 
    image: require('../../assets/monstera.png'),
    careLevel: 'Easy',
    light: 'Indirect sunlight',
    water: 'Weekly',
    data: [
      { key: 'Plant type', value: 'Tropical' },
      { key: 'Growth habit', value: 'Climbing' }
    ]
  },
  { 
    id: '2', 
    name: 'Snake Plant', 
    species: 'Sansevieria trifasciata', 
    image: require('../../assets/snake_plant.png'),
    careLevel: 'Very Easy',
    light: 'Low to bright indirect',
    water: 'Every 2-3 weeks',
    data: [
      { key: 'Air purifying', value: 'Yes' },
      { key: 'Toxicity', value: 'Mildly toxic to pets' }
    ]
  },
  { 
    id: '3', 
    name: 'Peace Lily', 
    species: 'Spathiphyllum', 
    image: require('../../assets/peace_lily.png'),
    careLevel: 'Moderate',
    light: 'Low to medium indirect',
    water: 'When soil is dry',
    data: [
      { key: 'Flower color', value: 'White' },
      { key: 'Air purifying', value: 'Yes' }
    ]
  },
  { 
    id: '4', 
    name: 'Fiddle Leaf Fig', 
    species: 'Ficus lyrata', 
    image: require('../../assets/fiddle_leaf.png'),
    careLevel: 'Difficult',
    light: 'Bright indirect',
    water: 'When top inch is dry',
    data: [
      { key: 'Plant type', value: 'Indoor tree' }
    ]
  },
  { 
    id: '5', 
    name: 'Pothos', 
    species: 'Epipremnum aureum', 
    image: require('../../assets/pothos.png'),
    careLevel: 'Very Easy',
    light: 'Low to bright indirect',
    water: 'When soil is dry',
    data: [
      { key: 'Air purifying', value: 'Yes' },
      { key: 'Growth habit', value: 'Trailing' }
    ]
  },
  { 
    id: '6', 
    name: 'Aloe Vera', 
    species: 'Aloe barbadensis miller', 
    image: require('../../assets/aloe_vera.png'),
    careLevel: 'Easy',
    light: 'Bright direct to indirect',
    water: 'Every 3 weeks',
    data: [
      { key: 'Plant type', value: 'Succulent' },
      { key: 'Medicinal', value: 'Yes' }
    ]
  },
  { 
    id: '7', 
    name: 'Spider Plant', 
    species: 'Chlorophytum comosum', 
    image: require('../../assets/spider_plant.png'),
    careLevel: 'Very Easy',
    light: 'Indirect light',
    water: 'Weekly',
    data: [
      { key: 'Air purifying', value: 'Yes' },
      { key: 'Toxicity', value: 'Non-toxic to pets' }
    ]
  },
  { 
    id: '8', 
    name: 'Boston Fern', 
    species: 'Nephrolepis exaltata', 
    image: require('../../assets/peace_lily.png'),
    careLevel: 'Moderate',
    light: 'Indirect light',
    water: 'Keep soil moist',
    data: [
      { key: 'Air purifying', value: 'Yes' },
      { key: 'Toxicity', value: 'Non-toxic to pets' },
      { key: 'Humidity', value: 'High' }
    ]
  },
  { 
    id: '9', 
    name: 'Basil', 
    species: 'Ocimum basilicum', 
    image: require('../../assets/herbs.png'),
    careLevel: 'Easy',
    light: 'Full sun',
    water: 'Keep soil moist',
    data: [
      { key: 'Edible parts', value: 'Leaves' },
      { key: 'Layer', value: 'Herbs' }
    ]
  },
  { 
    id: '10', 
    name: 'ZZ Plant', 
    species: 'Zamioculcas zamiifolia', 
    image: require('../../assets/zz_plant.png'),
    careLevel: 'Very Easy',
    light: 'Low to bright indirect',
    water: 'Every 2-3 weeks',
    data: [
      { key: 'Air purifying', value: 'Yes' },
      { key: 'Low light tolerant', value: 'Yes' }
    ]
  }
];

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    marginBottom: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  footerContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
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
  searchFilterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F8E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '70%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filterOptions: {
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
  },
  filterChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  filterChip: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  filterChipText: {
    color: '#666',
  },
  filterChipTextSelected: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  resetButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginRight: 10,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  applyButton: {
    flex: 2,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  clearSearchButton: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#F1F8E9',
    borderRadius: 8,
  },
  clearSearchButtonText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  plantItemContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
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
  favoriteButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  gridItemContainer: {
    flex: 1,
    position: 'relative',
    margin: 8,
  },
});

export default PlantListScreen;