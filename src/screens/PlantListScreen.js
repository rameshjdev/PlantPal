import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Platform, ActivityIndicator, TextInput, Modal, ScrollView, Image, Animated, Easing, Dimensions, ImageBackground, StatusBar, TouchableWithoutFeedback } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSelector, useDispatch } from 'react-redux';
import plantService from '../services/plantService';
import { toggleFavorite } from '../store/plantsSlice';
import { SharedElement } from 'react-navigation-shared-element';

const { width, height } = Dimensions.get('window');

const PlantListScreen = ({ route }) => {
  const { category, usePopularPlants } = route.params;
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
    cycle: [],
    watering: [],
    indoor: null,
    edible: null,
    petFriendly: null
  });

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic)
    }).start();
  }, []);

  // Fetch plants on component mount
  useEffect(() => {
    // First check if we already have plants in Redux store
    if (allPlants && allPlants.length > 10) {
      setPlants(allPlants);
      setLoading(false);
    } else {
      fetchPlants(true); // Force refresh on initial load
    }
  }, []);  // Remove allPlants dependency to prevent unnecessary fetches

  // Filter plants when category, plants data or search/filter criteria changes
  useEffect(() => {
    filterPlantsByCategory();
  }, [category, plants, searchQuery, filterCriteria]);

  // Fetch plants from API
  const fetchPlants = async (forceRefresh = false) => {
    try {
      if (loading && !forceRefresh) return;
      
      setLoading(true);
      setError(null);
      
      // Reset lastId and plants if we're forcing a refresh
      if (forceRefresh) {
        setLastId(null);
        setHasMore(true);
        if (!category || category === 'All Plants') {
          console.log('Fetching all plants from the beginning');
        } else {
          console.log(`Fetching plants for category: ${category}`);
        }
      } else {
        console.log(`Loading more plants with lastId: ${lastId}`);
      }
      
      const currentLastId = forceRefresh ? null : lastId;
      
      // Check if we should use the popular plants API
      if (usePopularPlants && forceRefresh) {
        const popularPlants = await plantService.getPopularPlants();
        console.log(`Fetched ${popularPlants.length} popular plants`);
        setPlants(popularPlants);
        
        if (popularPlants.length > 0) {
          const maxId = Math.max(...popularPlants.map(item => parseInt(item.id) || 0));
          setLastId(maxId.toString());
        } else {
          setHasMore(false);
        }
        
        setLoading(false);
        return;
      }
      
      // Check if category exists before using startsWith
      if (category && typeof category === 'string' && category.startsWith('Search:')) {
        // It's a search query, use searchPlants
        const searchTerm = category.replace('Search:', '').trim();
        const data = await plantService.searchPlants(searchTerm);
        console.log(`Search for "${searchTerm}" returned ${data.length} results`);
        
        if (data.length === 0) {
          setHasMore(false);
        } else {
          const newData = data.filter(newItem => 
            !plants.some(existingItem => existingItem.id === newItem.id)
          );
          
          if (newData.length === 0) {
            setHasMore(false);
          } else {
            console.log(`Adding ${newData.length} new plants from search results`);
            setPlants(prevPlants => forceRefresh ? data : [...prevPlants, ...newData]);
            if (data.length > 0) {
              const maxId = Math.max(...data.map(item => parseInt(item.id) || 0));
              setLastId(maxId.toString());
            }
          }
        }
      } else {
        // Regular fetch plants
        const data = await plantService.fetchPlants(currentLastId);
        console.log(`Fetched ${data.length} plants from API`);
        
        if (data.length === 0) {
          setHasMore(false);
        } else {
          // Filter out duplicates
          const newData = data.filter(newItem => 
            !plants.some(existingItem => existingItem.id === newItem.id)
          );
          
          if (newData.length === 0) {
            setHasMore(false);
          } else {
            console.log(`Adding ${newData.length} new plants to the list`);
            setPlants(prevPlants => forceRefresh ? data : [...prevPlants, ...newData]);
            if (data.length > 0) {
              const maxId = Math.max(...data.map(item => parseInt(item.id) || 0));
              setLastId(maxId.toString());
            }
          }
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching plants:', err);
      setError('Failed to load plants. Please try again later.');
      setLoading(false);
    }
  };

  // Load more plants when user reaches the end of the list
  const handleLoadMore = () => {
    if (!loading && hasMore && filteredPlants.length > 0) {
      console.log('Reached end of list, loading more plants...');
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
          if (!plant) return false;
          
          // Check sunlight array first (Perenual API format)
          if (plant.sunlight && Array.isArray(plant.sunlight)) {
            const sunlightStr = plant.sunlight.join(' ').toLowerCase();
            return !sunlightStr.includes('full sun only') || sunlightStr.includes('partial');
          }
          
          // Fallback to light property with proper type checking
          if (plant.light && typeof plant.light === 'string') {
            const lightStr = plant.light.toLowerCase();
            return !lightStr.includes('full sun only') || lightStr.includes('partial');
          }
          
          // Check plant name for common indoor plants
          const commonIndoorPlants = [
            'pothos', 'snake plant', 'zz plant', 'peace lily', 'philodendron',
            'spider plant', 'dracaena', 'monstera', 'fern', 'bamboo'
          ];
          
          if (plant.name) {
            const nameLower = plant.name.toLowerCase();
            if (commonIndoorPlants.some(indoorPlant => nameLower.includes(indoorPlant))) {
              return true;
            }
          }
          
          // Default to indoor if light requirement is unknown and no other indicators
          return true;
        },
        'Succulents': plant => {
          if (!plant) return false;
          
          // Check watering needs
          const hasLongWateringInterval = plant.water && 
            plant.water.toLowerCase().includes('2-3 weeks');
          
          // Check plant data if available
          let isSucculentType = false;
          if (plant.data && Array.isArray(plant.data)) {
            isSucculentType = plant.data.some(item => 
              item && (
                (item.key && item.key.toLowerCase().includes('succulent')) || 
                (item.key === 'Plant type' && item.value && 
                 item.value.toLowerCase().includes('succulent'))
              )
            );
          }
          
          // Check plant name for succulent indicators
          const hasSucculentName = plant.name && 
            plant.name.toLowerCase().includes('succulent');
          
          // Check watering frequency from Perenual API
          const hasMinimumWatering = plant.watering && 
            plant.watering.toLowerCase().includes('minimum');
          
          return hasLongWateringInterval || isSucculentType || 
                 hasSucculentName || hasMinimumWatering;
        },
        'Flowering Plants': plant => {
          // Check if plant data indicates it's flowering
          if (plant.data && Array.isArray(plant.data)) {
            return plant.data.some(item => 
              (item.key === 'Flower color' && item.value) || 
              (item.key === 'Flowering season' && item.value)
            );
          }
          // Fallback to name-based check - be more inclusive
          return plant.name.includes('Lily') || 
                 plant.name.includes('Rose') || 
                 plant.name.includes('Orchid') ||
                 plant.name.includes('Flower') ||
                 plant.name.includes('Hibiscus') ||
                 plant.name.includes('Jasmine');
        },
        'Herbs': plant => {
          // Check if plant data indicates it's an herb
          if (plant.data && Array.isArray(plant.data)) {
            return plant.data.some(item => 
              (item.key === 'Edible parts' && item.value && item.value.includes('Leaves')) ||
              (item.key === 'Layer' && item.value && item.value.includes('Herbs'))
            );
          }
          // Fallback to name-based check - be more inclusive
          const herbNames = ['Mint', 'Basil', 'Thyme', 'Oregano', 'Rosemary', 'Sage', 'Cilantro', 
                            'Parsley', 'Dill', 'Chives', 'Lavender', 'Lemongrass', 'Herb'];
          return herbNames.some(herb => plant.name.toLowerCase().includes(herb.toLowerCase()));
        },
        'Air Purifying': plant => {
          // Popular air purifying plants - expanded list
          const airPurifiers = [
            'Snake Plant', 'Pothos', 'Peace Lily', 'Spider Plant', 'Dracaena', 'Fern', 
            'ZZ Plant', 'Rubber Plant', 'Boston Fern', 'Aloe Vera', 'Bamboo Palm', 
            'English Ivy', 'Chinese Evergreen', 'Chrysanthemum', 'Ficus'
          ];
          return airPurifiers.some(name => 
            plant.name.toLowerCase().includes(name.toLowerCase())
          );
        },
        'Low Light Plants': plant => {
          // Plants that can thrive in low light - be more inclusive
          const lowLightPlants = ['ZZ Plant', 'Snake Plant', 'Pothos', 'Peace Lily', 
                                 'Spider Plant', 'Philodendron', 'Cast Iron Plant', 
                                 'Chinese Evergreen', 'Dracaena', 'Aglaonema'];
          return (plant.light && typeof plant.light === 'string' && plant.light.toLowerCase().includes('low')) || 
                 lowLightPlants.some(name => plant.name.toLowerCase().includes(name.toLowerCase()));
        },
        'Tropical Plants': plant => {
          // Common tropical plants or plants with tropical in their data - expanded list
          const tropicalPlants = [
            'Monstera', 'Palm', 'Philodendron', 'Calathea', 'Anthurium', 'Bird of Paradise',
            'Banana', 'Ficus', 'Tropical', 'Orchid', 'Bromeliad', 'Alocasia', 'Croton',
            'Hibiscus', 'Plumeria', 'Hawaiian'
          ];
          return tropicalPlants.some(name => 
            plant.name.toLowerCase().includes(name.toLowerCase())
          ) || (plant.data && plant.data.some(item => 
            item.value && typeof item.value === 'string' && 
            item.value.toLowerCase().includes('tropical')
          ));
        },
        'Pet Friendly': plant => {
          // Plants known to be safe for pets - expanded list
          const petFriendly = [
            'Spider Plant', 'Boston Fern', 'Areca Palm', 'Calathea', 'Christmas Cactus',
            'African Violet', 'Orchid', 'Bamboo', 'Money Plant', 'Staghorn Fern',
            'Ponytail Palm', 'Haworthia', 'Peperomia', 'Lipstick Plant'
          ];
          return petFriendly.some(name => 
            plant.name.toLowerCase().includes(name.toLowerCase())
          ) || (plant.data && plant.data.some(item => 
            (item.key === 'Toxicity' && item.value && item.value.toLowerCase().includes('non-toxic'))
          ));
        }
      };
      
      if (categoryMap[category]) {
        filtered = plants.filter(plant => categoryMap[category](plant));
        
        // If we have very few plants after filtering, add some more from the base collection
        // that might loosely match the category
        if (filtered.length < 5) {
          const additionalPlants = plants.filter(plant => 
            !filtered.some(f => f.id === plant.id) && 
            (
              plant.name.toLowerCase().includes(category.toLowerCase()) ||
              (plant.species && plant.species.toLowerCase().includes(category.toLowerCase()))
            )
          ).slice(0, 10);
          
          filtered = [...filtered, ...additionalPlants];
        }
      }
    }
    
    // Then apply search query if it exists
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(plant => {
        const name = plant.name || plant.common_name || '';
        const scientificName = Array.isArray(plant.scientific_name) ? 
          plant.scientific_name.join(' ').toLowerCase() : 
          (plant.species || '').toLowerCase();
        
        return name.toLowerCase().includes(query) || scientificName.includes(query);
      });
    }
    
    // Apply additional filter criteria - updated for Perenual API
    if (Object.values(filterCriteria).some(value => 
        (Array.isArray(value) && value.length > 0) || 
        (value !== null && typeof value === 'boolean')
    )) {
      filtered = filtered.filter(plant => {
        // Filter by care level / watering needs
        if (filterCriteria.careLevel.length > 0) {
          // Map care level to watering in Perenual API
          const careLevel = plant.careLevel || (
            plant.watering === 'Minimum' ? 'Easy' :
            plant.watering === 'Average' ? 'Moderate' :
            plant.watering === 'Frequent' ? 'Difficult' : null
          );
          
          if (!careLevel || !filterCriteria.careLevel.includes(careLevel)) {
            return false;
          }
        }
        
        // Filter by specific watering frequency
        if (filterCriteria.watering.length > 0) {
          if (!plant.watering || !filterCriteria.watering.includes(plant.watering)) {
            return false;
          }
        }
        
        // Filter by light requirements
        if (filterCriteria.light.length > 0) {
          // Check if plant has sunlight data in Perenual format
          if (plant.sunlight && Array.isArray(plant.sunlight)) {
            const lightMatch = filterCriteria.light.some(lightPref => 
              plant.sunlight.some(sunlight => 
                sunlight.toLowerCase().includes(lightPref.toLowerCase())
              )
            );
            if (!lightMatch) return false;
          } 
          // Fallback to old light property
          else if (plant.light && typeof plant.light === 'string') {
            const plantLight = plant.light.toLowerCase();
            const lightMatch = filterCriteria.light.some(light => {
              switch(light) {
                case 'full_sun':
                  return plantLight.includes('full') || plantLight.includes('direct');
                case 'part_shade':
                  return plantLight.includes('partial') || plantLight.includes('medium');
                case 'shade':
                  return plantLight.includes('low') || plantLight.includes('shade');
                default:
                  return false;
              }
            });
            if (!lightMatch) return false;
          } 
          // No light data at all
          else {
            return false;
          }
        }
        
        // Filter by cycle type (Annual, Perennial, etc.)
        if (filterCriteria.cycle.length > 0) {
          if (!plant.cycle || !filterCriteria.cycle.includes(plant.cycle)) {
            return false;
          }
        }
        
        // Filter by indoor suitability
        if (filterCriteria.indoor !== null) {
          // Check if plant is explicitly marked for indoor use
          const isIndoor = plant.indoor === filterCriteria.indoor;
          
          // If we don't have explicit indoor data, make an educated guess
          if (plant.indoor === undefined && plant.sunlight && Array.isArray(plant.sunlight)) {
            const sunlightStr = plant.sunlight.join(' ').toLowerCase();
            const requiresFullSun = sunlightStr.includes('full sun') && !sunlightStr.includes('part');
            // If it requires full sun and filter is for indoor, exclude it
            if (requiresFullSun && filterCriteria.indoor === true) return false;
          }
          
          if (plant.indoor !== undefined && plant.indoor !== filterCriteria.indoor) return false;
        }
        
        // Filter by edible property
        if (filterCriteria.edible !== null) {
          if (plant.edible === undefined) {
            // If not defined, check if any data mentions edible
            if (plant.data && Array.isArray(plant.data)) {
              const edibleData = plant.data.some(item => 
                (item.key === 'Edible parts' && item.value && item.value.length > 0)
              );
              if (filterCriteria.edible !== edibleData) return false;
            } else if (filterCriteria.edible) {
              // If we want edible plants but have no data, exclude
              return false;
            }
          } else if (plant.edible !== filterCriteria.edible) {
            return false;
          }
        }
        
        // Filter by pet friendly
        if (filterCriteria.petFriendly !== null) {
          // Check for poisonous property in Perenual API
          if (plant.poisonous_to_pets !== undefined) {
            // If poisonous is true, then plant is NOT pet friendly
            const isPetFriendly = !plant.poisonous_to_pets;
            if (filterCriteria.petFriendly !== isPetFriendly) return false;
          } 
          // Legacy data check 
          else {
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
                plant.name?.includes(name) || plant.common_name?.includes(name)
              );
            }
            
            if (filterCriteria.petFriendly !== isPetFriendly) return false;
          }
        }
        
        return true;
      });
    }
    
    // Remove duplicates by id
    const uniqueIds = new Set();
    filtered = filtered.filter(plant => {
      const id = String(plant.id);
      if (uniqueIds.has(id)) {
        return false;
      }
      uniqueIds.add(id);
      return true;
    });
    
    setFilteredPlants(filtered);
  };

  // Function to count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (filterCriteria.careLevel.length > 0) count++;
    if (filterCriteria.light.length > 0) count++;
    if (filterCriteria.watering.length > 0) count++;
    if (filterCriteria.cycle.length > 0) count++;
    if (filterCriteria.petFriendly !== null) count++;
    return count;
  };

  // Apply the current filters
  const applyFilters = () => {
    setLoading(true);
    // Reset pagination
    setLastId(null);
    setHasMore(true);
    // Apply filters to the existing plants data
    filterPlantsByCategory();
    // Hide the filter modal
    setIsFilterModalVisible(false);
  };

  // Render filter button with badge showing number of active filters
  const renderFilterButton = () => {
    const activeFilterCount = getActiveFilterCount();
    
    return (
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => setIsFilterModalVisible(true)}
      >
        <MaterialCommunityIcons name="filter-outline" size={22} color="#555" />
        {activeFilterCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Toggle filter selection
  const toggleFilter = (type, value) => {
    setFilterCriteria(prev => {
      const newCriteria = { ...prev };
      
      if (type === 'petFriendly') {
        // Toggle boolean value (or set to null)
        newCriteria.petFriendly = newCriteria.petFriendly === value ? null : value;
      } else {
        // For array-based filters (careLevel, light, etc.)
        if (newCriteria[type].includes(value)) {
          // Remove the value if already selected
          newCriteria[type] = newCriteria[type].filter(item => item !== value);
        } else {
          // Add the value if not already selected
          newCriteria[type] = [...newCriteria[type], value];
        }
      }
      
      return newCriteria;
    });
  };

  // Reset all filters
  const resetFilters = () => {
    setFilterCriteria({
      careLevel: [],
      light: [],
      watering: [],
      cycle: [],
      petFriendly: null
    });
    setSearchQuery('');
    setIsFilterModalVisible(false);
  };

  // Filter plants based on current criteria
  const filterPlants = useCallback(() => {
    if (!plants || plants.length === 0) {
      setFilteredPlants([]);
      setLoading(false);
      return;
    }

    let results = [...plants];

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        plant => 
          plant.name?.toLowerCase().includes(query) || 
          plant.species?.toLowerCase().includes(query)
      );
    }

    // Apply care level filter
    if (filterCriteria.careLevel.length > 0) {
      results = results.filter(plant => {
        // Map plant care difficulty to our filter options
        const careLevelMap = {
          'low': 'Very Easy',
          'moderate': 'Easy',
          'high': 'Moderate',
          'unknown': 'Moderate'
        };
        const plantCareLevel = careLevelMap[plant.care_level?.toLowerCase()] || 'Moderate';
        return filterCriteria.careLevel.includes(plantCareLevel);
      });
    }

    // Apply light filter
    if (filterCriteria.light.length > 0) {
      results = results.filter(plant => {
        if (!plant.sunlight || !Array.isArray(plant.sunlight)) return false;
        // Check if any of the plant's sunlight needs match any of our selected light levels
        return plant.sunlight.some(light => 
          filterCriteria.light.includes(light.toLowerCase().replace(' ', '_'))
        );
      });
    }

    // Apply watering filter
    if (filterCriteria.watering.length > 0) {
      results = results.filter(plant => {
        // Map plant watering to our filter options
        const wateringMap = {
          'frequent': 'Frequent',
          'average': 'Average',
          'minimum': 'Minimum',
          'none': 'Minimum'
        };
        const plantWatering = wateringMap[plant.watering?.toLowerCase()] || 'Average';
        return filterCriteria.watering.includes(plantWatering);
      });
    }

    // Apply cycle filter
    if (filterCriteria.cycle.length > 0) {
      results = results.filter(plant => {
        if (!plant.cycle) return false;
        return filterCriteria.cycle.includes(plant.cycle);
      });
    }

    // Apply pet friendly filter
    if (filterCriteria.petFriendly !== null) {
      results = results.filter(plant => {
        if (filterCriteria.petFriendly === true) {
          return plant.poisonous_to_pets === 0 || plant.poisonous_to_pets === false;
        } else {
          return plant.poisonous_to_pets === 1 || plant.poisonous_to_pets === true;
        }
      });
    }

    setFilteredPlants(results);
    setLoading(false);
  }, [plants, searchQuery, filterCriteria, userPlants]);

  // Handle toggle favorite
  const handleToggleFavorite = (plantId) => {
    // Convert plantId to string for consistency
    const plantIdStr = String(plantId);
    
    dispatch(toggleFavorite(plantIdStr))
      .then(() => {
        // Check if the plant is actually in userPlants after the action
        const isFavorited = userPlants.some(p => String(p.id) === plantIdStr && p.isFavorite);
        if (isFavorited) {
          // Show a message or toast indicating added to favorites
          console.log('Plant added to favorites!');
        } else {
          console.log('Plant removed from favorites!');
        }
      })
      .catch(error => {
        console.error('Error toggling favorite:', error);
      });
  };

  // Updated and more attractive filter modal
  const renderFilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isFilterModalVisible}
      onRequestClose={() => setIsFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Plants</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setIsFilterModalVisible(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color="#555" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScrollContent}>
            {/* Care Level Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Care Level</Text>
              <View style={styles.filterOptions}>
                {[
                  { id: 'Very Easy', icon: 'leaf-circle-outline' },
                  { id: 'Easy', icon: 'leaf-circle' },
                  { id: 'Moderate', icon: 'flower-outline' },
                  { id: 'Difficult', icon: 'flower-tulip' }
                ].map(level => (
                  <TouchableOpacity
                    key={level.id}
                    style={[
                      styles.filterOption,
                      filterCriteria.careLevel.includes(level.id) && styles.filterOptionSelected
                    ]}
                    onPress={() => toggleFilter('careLevel', level.id)}
                  >
                    <Text 
                      style={[
                        styles.filterOptionText,
                        filterCriteria.careLevel.includes(level.id) && styles.filterOptionTextSelected
                      ]}
                    >
                      {level.id}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Light Requirements Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Light Requirements</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: 'full_sun', label: 'Full Sun' },
                  { key: 'part_shade', label: 'Part Shade' },
                  { key: 'shade', label: 'Shade' }
                ].map(item => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.filterOption,
                      filterCriteria.light.includes(item.key) && styles.filterOptionSelected
                    ]}
                    onPress={() => toggleFilter('light', item.key)}
                  >
                    <Text 
                      style={[
                        styles.filterOptionText,
                        filterCriteria.light.includes(item.key) && styles.filterOptionTextSelected
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Cycle Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Cycle Type</Text>
              <View style={styles.filterOptions}>
                {[
                  { id: 'Perennial' },
                  { id: 'Annual' },
                  { id: 'Biennial' },
                  { id: 'Biannual' }
                ].map(cycle => (
                  <TouchableOpacity
                    key={cycle.id}
                    style={[
                      styles.filterOption,
                      filterCriteria.cycle.includes(cycle.id) && styles.filterOptionSelected
                    ]}
                    onPress={() => toggleFilter('cycle', cycle.id)}
                  >
                    <Text 
                      style={[
                        styles.filterOptionText,
                        filterCriteria.cycle.includes(cycle.id) && styles.filterOptionTextSelected
                      ]}
                    >
                      {cycle.id}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Watering Frequency Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Watering Frequency</Text>
              <View style={styles.filterOptions}>
                {[
                  { id: 'Frequent', label: 'Frequent' },
                  { id: 'Average', label: 'Average' },
                  { id: 'Minimum', label: 'Minimum' }
                ].map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.filterOption,
                      filterCriteria.watering.includes(item.id) && styles.filterOptionSelected
                    ]}
                    onPress={() => toggleFilter('watering', item.id)}
                  >
                    <Text 
                      style={[
                        styles.filterOptionText,
                        filterCriteria.watering.includes(item.id) && styles.filterOptionTextSelected
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Pet Friendly Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Pet Friendly</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filterCriteria.petFriendly === true && styles.filterOptionSelected
                  ]}
                  onPress={() => toggleFilter('petFriendly', true)}
                >
                  <Text 
                    style={[
                      styles.filterOptionText,
                      filterCriteria.petFriendly === true && styles.filterOptionTextSelected
                    ]}
                  >
                    Yes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filterCriteria.petFriendly === false && styles.filterOptionSelected
                  ]}
                  onPress={() => toggleFilter('petFriendly', false)}
                >
                  <Text 
                    style={[
                      styles.filterOptionText,
                      filterCriteria.petFriendly === false && styles.filterOptionTextSelected
                    ]}
                  >
                    No
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filterCriteria.petFriendly === null && styles.filterOptionSelected
                  ]}
                  onPress={() => toggleFilter('petFriendly', null)}
                >
                  <Text 
                    style={[
                      styles.filterOptionText,
                      filterCriteria.petFriendly === null && styles.filterOptionTextSelected
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.filterActions}>
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={resetFilters}
            >
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => {
                applyFilters();
                setIsFilterModalVisible(false);
              }}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Create memo for rendering plant item to improve performance
  const MemoPlantItem = React.memo(({ item, index }) => {
    // Create animated values for staggered entrance
    const translateY = useRef(new Animated.Value(50)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const [imageError, setImageError] = useState(false);

    // Run animation on mount
    useEffect(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    // Check if the plant is a favorite
    const isFavorite = userPlants.some(p => p.id === item.id);

    // Get plant image source with proper fallbacks
    const getPlantImage = () => {
      if (imageError) return null;

      // First check for database image_url
      if (item.image_url) {
        return { uri: item.image_url };
      }
      
      // Then try the Perenual API default_image format
      if (item.default_image) {
        // Try to get the best quality image available
        if (item.default_image.medium_url) {
          return { uri: item.default_image.medium_url };
        } else if (item.default_image.regular_url) {
          return { uri: item.default_image.regular_url };
        } else if (item.default_image.small_url) {
          return { uri: item.default_image.small_url };
        } else if (item.default_image.thumbnail) {
          return { uri: item.default_image.thumbnail };
        }
      }

      // Next, try legacy formats
      if (item.image) {
        if (typeof item.image === 'number') {
          return item.image;
        }
        if (typeof item.image === 'object' && item.image.uri) {
          return { uri: item.image.uri };
        }
        if (typeof item.image === 'string') {
          return { uri: item.image };
        }
      }

      // Fallback to default image
      return require('../../assets/monstera.png');
    };

    // Handle image loading errors
    const handleImageError = () => {
      console.log(`Image failed to load for plant: ${item.name || item.id}`);
      setImageError(true);
    };

    // Generate a placeholder color based on plant name
    const getPlaceholderColor = () => {
      // Generate a color based on the plant name or ID
      const seed = (item.name || item.id || 'plant').toLowerCase();
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      // Generate pastel-ish colors that are plant-like
      // Use a mix of greens, soft blues, and some earthy tones
      const hue = Math.abs(hash) % 90 + 70; // Restrict to 70-160 range (greens, blue-greens)
      const saturation = 60 + Math.abs(hash % 20); // 60-80%
      const lightness = 75 + Math.abs(hash % 15); // 75-90%
      
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    // Format plant name
    const getDisplayName = (name) => {
      if (!name) return 'Unknown Plant';
      return name.length > 20 ? name.substring(0, 20) + '...' : name;
    };

    // Format species name
    const getSpeciesName = (species) => {
      if (!species) return '';
      return species.length > 25 ? species.substring(0, 25) + '...' : species;
    };

    // Get watering info text
    const getWaterInfo = (watering) => {
      if (!watering) return 'Average';
      return watering;
    };

    // Get light info text
    const getLightInfo = (sunlight) => {
      if (!sunlight || !Array.isArray(sunlight) || sunlight.length === 0) {
        return 'Medium';
      }
      
      // Return first light requirement
      const light = sunlight[0].replace(/_/g, ' ');
      return light.charAt(0).toUpperCase() + light.slice(1);
    };

    // Get plant category/badge text
    const getCategoryBadge = () => {
      // Check for specific plant types
      if (item.cycle === 'Perennial') return 'Perennial';
      if (item.cycle === 'Annual') return 'Annual';
      
      if (item.watering === 'Minimum' || 
          (item.water && item.water.toLowerCase().includes('minimum'))) {
        return 'Succulent';
      }
      
      const name = (item.name || '').toLowerCase();
      if (name.includes('herb') || 
          ['basil', 'mint', 'rosemary', 'thyme', 'sage'].some(herb => name.includes(herb))) {
        return 'Herb';
      }
      
      if (name.includes('palm') || name.includes('monstera') || 
          name.includes('philodendron') || name.includes('tropical')) {
        return 'Tropical';
      }
      
      if (item.sunlight && Array.isArray(item.sunlight) && 
          item.sunlight.some(light => light.includes('full_sun'))) {
        return 'Outdoor';
      }
      
      // Default to Houseplant
      return 'Houseplant';
    };

    // Get plant image source
    const imageSource = getPlantImage();
    const placeholderColor = getPlaceholderColor();
    const categoryLabel = getCategoryBadge();

    // Generate brief plant description based on plant type
    const getPlantDescription = (plant) => {
      if (!plant) return "A beautiful houseplant for your space.";
      
      let description = "";
      
      // Try to determine plant type
      const isSucculent = plant.watering === 'Minimum' || 
        (plant.water && plant.water.toLowerCase().includes('2-3 weeks'));
      
      const isFlowering = plant.name && 
        (plant.name.toLowerCase().includes('lily') || 
         plant.name.toLowerCase().includes('rose') || 
         plant.name.toLowerCase().includes('orchid') ||
         plant.name.toLowerCase().includes('flower'));
         
      const isIndoor = plant.light && typeof plant.light === 'string' && !plant.light.toLowerCase().includes('full sun only');
      
      const isTropical = ['monstera', 'palm', 'philodendron', 'calathea', 'anthurium'].some(
        name => plant.name && plant.name.toLowerCase().includes(name)
      );
      
      const isHerb = ['mint', 'basil', 'thyme', 'oregano', 'rosemary', 'sage'].some(
        name => plant.name && plant.name.toLowerCase().includes(name)
      );
      
      // Build description based on plant characteristics
      if (isSucculent) {
        description = "Water-storing succulent that thrives with minimal care.";
      } else if (isFlowering) {
        description = "Beautiful flowering plant that adds color to your space.";
      } else if (isHerb) {
        description = "Aromatic herb that can be used for cooking and tea.";
      } else if (isTropical) {
        description = "Lush tropical plant with striking foliage.";
      } else if (isIndoor) {
        description = "Perfect indoor plant to purify air and add greenery.";
      } else {
        description = "Versatile plant to enhance your living space.";
      }
      
      // Add care level if available
      if (plant.careLevel) {
        const care = plant.careLevel.toLowerCase();
        if (care.includes('easy') || care.includes('very easy')) {
          description += " Easy to care for.";
        } else if (care.includes('moderate')) {
          description += " Requires moderate attention.";
        } else if (care.includes('difficult')) {
          description += " Needs special care.";
        }
      }
      
      return description;
    };

    return (
      <Animated.View
        style={[
          styles.plantItem,
          { transform: [{ translateY }], opacity },
        ]}
      >
        <TouchableOpacity 
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('PlantDetail', { plantId: item.id })}
          activeOpacity={0.9}
        >
          <View style={styles.plantCard}>
            <View style={styles.imageContainer}>
              {imageSource ? (
                <Image
                  source={imageSource}
                  style={styles.plantImage}
                  resizeMode="cover"
                  onError={handleImageError}
                />
              ) : (
                <View style={[
                  styles.placeholderImage, 
                  { backgroundColor: placeholderColor }
                ]}>
                  <Text style={styles.placeholderText}>
                    {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              
              {/* Category Badge */}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{categoryLabel}</Text>
              </View>
              
              {/* Favorite Button */}
              <TouchableOpacity 
                style={styles.favoriteButton}
                onPress={() => handleToggleFavorite(item.id)}
              >
                <MaterialCommunityIcons 
                  name={isFavorite ? 'heart' : 'heart-outline'} 
                  size={18} 
                  color={isFavorite ? '#E53935' : '#555'} 
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.plantInfo}>
              <Text style={styles.plantName} numberOfLines={1}>{getDisplayName(item.name)}</Text>
              {item.species && (
                <Text style={styles.plantSpecies} numberOfLines={1}>{getSpeciesName(item.species)}</Text>
              )}
              
              <Text style={styles.plantDescription} numberOfLines={2}>
                {getPlantDescription(item)}
              </Text>
              
              <View style={styles.plantDetailsContainer}>
                <View style={styles.plantDetailRow}>
                  <View style={styles.plantDetailItem}>
                    <MaterialCommunityIcons name="water-outline" size={16} color="#2196F3" />
                    <Text style={styles.plantDetailText}>{getWaterInfo(item.watering)}</Text>
                  </View>
                  
                  <View style={styles.plantDetailItem}>
                    <MaterialCommunityIcons name="white-balance-sunny" size={16} color="#FF9800" />
                    <Text style={styles.plantDetailText}>{getLightInfo(item.sunlight)}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, (prevProps, nextProps) => {
    // Only re-render if the id changes
    return prevProps.item.id === nextProps.item.id;
  });

  const renderPlantItem = ({ item, index }) => {
    return <MemoPlantItem item={item} index={index} />;
  };

  // Render footer with loading indicator when loading more plants
  const renderFooter = () => {
    if (loading && hasMore) {
      return (
        <View style={styles.footerContainer}>
          <ActivityIndicator size="small" color="#2E7D32" />
          <Text style={styles.footerText}>Loading more plants...</Text>
        </View>
      );
    } else if (!hasMore && filteredPlants.length > 0) {
      // Show a message when we've reached the end
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>No more plants to load</Text>
        </View>
      );
    } else if (filteredPlants.length === 0 && !loading) {
      return (
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
      );
    }
    
    return null;
  };

  // Fetch plants with error handling
  const safeFetchPlants = async (forceRefresh = false) => {
    try {
      await fetchPlants(forceRefresh);
    } catch (err) {
      console.error('Error in safeFetchPlants:', err);
      setError('Failed to load plants. Please try again later.');
      // Set an empty array to prevent the app from crashing
      if (forceRefresh) {
        setPlants([]);
      }
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.title}>{category}</Text>
        <View style={styles.placeholder} />
      </View>

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
        </View>
        {renderFilterButton()}
      </View>

      {error && (
        <TouchableOpacity 
          style={styles.warningBanner}
          onPress={() => {
            setError(null);
            safeFetchPlants(true);
          }}
        >
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#F57C00" />
          <Text style={styles.warningText}>
            {error} Tap to retry.
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={filteredPlants}
        renderItem={renderPlantItem}
        keyExtractor={(item, index) => `plant-${item.id || ''}-${index}`}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        key={'grid'}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={10}
        maxToRenderPerBatch={15}
        windowSize={21}
        removeClippedSubviews={Platform.OS === 'android'}
        onRefresh={() => safeFetchPlants(true)}
        refreshing={loading && plants.length > 0}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="sprout" size={70} color="#BDBDBD" />
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
          ) : null
        }
      />

      {renderFilterModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  searchFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 20,
    padding: 12,
    paddingHorizontal: 16,
    marginRight: 10,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
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
    backgroundColor: '#f0f0f0',
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '60%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  filterOption: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionSelected: {
    backgroundColor: '#2E7D32',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#333',
  },
  filterOptionTextSelected: {
    color: 'white',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  resetButtonText: {
    fontSize: 16,
    color: '#666',
  },
  applyButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  listContent: {
    padding: 12,
  },
  plantItem: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    height: 280,
  },
  plantCard: {
    borderRadius: 12,
    backgroundColor: 'white',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
    backgroundColor: '#f9f9f9',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  plantImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  placeholderText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#9e9e9e',
  },
  categoryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  categoryText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  plantInfo: {
    padding: 12,
  },
  plantName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#333',
  },
  plantSpecies: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 8,
  },
  plantDetailsContainer: {
    marginTop: 8,
  },
  plantDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  plantDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 6,
  },
  plantDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  warningBanner: {
    backgroundColor: 'rgba(255, 243, 224, 0.8)',
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
  },
  warningText: {
    color: '#F57C00',
    marginLeft: 8,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  clearSearchButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 25,
  },
  clearSearchButtonText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  footerContainer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    marginTop: 8,
  },
  plantDescription: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 8,
    lineHeight: 16,
  },
});

export default PlantListScreen;