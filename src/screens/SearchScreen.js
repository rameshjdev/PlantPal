import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  TextInput,
  ActivityIndicator,
  StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSelector, useDispatch } from 'react-redux';
import { searchPlants } from '../store/plantsSlice';

const SearchScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const searchResults = useSelector(state => state.plants.searchResults);
  const searchStatus = useSelector(state => state.plants.searchStatus);
  
  // Recent search terms (would persist in a real app)
  const [recentSearches, setRecentSearches] = useState([
    'Monstera', 'Snake Plant', 'Succulent', 'Aloe Vera'
  ]);

  // Popular search categories
  const popularCategories = [
    { name: 'Low Light', icon: 'partly-sunny-outline' },
    { name: 'Pet Friendly', icon: 'paw-outline' },
    { name: 'Easy Care', icon: 'water-outline' },
    { name: 'Air Purifying', icon: 'leaf-outline' },
  ];

  useEffect(() => {
    // Reset search when component mounts
    setSearchQuery('');
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim() === '') return;
    
    setIsSearching(true);
    
    // Add to recent searches if not already there
    if (!recentSearches.includes(searchQuery)) {
      setRecentSearches(prev => [searchQuery, ...prev.slice(0, 4)]);
    }
    
    // Dispatch search action
    dispatch(searchPlants(searchQuery));
  };

  const handleRecentSearch = (term) => {
    setSearchQuery(term);
    setTimeout(() => {
      dispatch(searchPlants(term));
    }, 100);
  };

  const renderPlantItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.plantItem}
      onPress={() => navigation.navigate('PlantDetail', { plantId: item.id })}
    >
      <Image source={{ uri: item.image }} style={styles.plantImage} />
      <View style={styles.plantInfo}>
        <Text style={styles.plantName}>{item.name}</Text>
        <Text style={styles.plantSpecies}>{item.species || 'Houseplant'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#999" />
    </TouchableOpacity>
  );

  const renderSearchContent = () => {
    if (searchQuery === '') {
      return (
        <View style={styles.initialSearchContainer}>
          {recentSearches.length > 0 && (
            <View style={styles.recentSearchesContainer}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <View style={styles.recentSearchesList}>
                {recentSearches.map((term, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.recentSearchItem}
                    onPress={() => handleRecentSearch(term)}
                  >
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.recentSearchText}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.popularCategoriesContainer}>
            <Text style={styles.sectionTitle}>Popular Categories</Text>
            <View style={styles.categoriesGrid}>
              {popularCategories.map((category, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.categoryItem}
                  onPress={() => handleRecentSearch(category.name)}
                >
                  <View style={styles.categoryIcon}>
                    <Ionicons name={category.icon} size={24} color="#4CAF50" />
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      );
    }

    if (searchStatus === 'loading') {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Searching for plants...</Text>
        </View>
      );
    }

    if (searchResults.length === 0) {
      return (
        <View style={styles.noResultsContainer}>
          <Ionicons name="search-outline" size={60} color="#CCCCCC" />
          <Text style={styles.noResultsText}>No plants found</Text>
          <Text style={styles.noResultsSubtext}>
            Try a different search term or browse our popular categories
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={searchResults}
        renderItem={renderPlantItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.resultsContainer}
      />
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
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for plants"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderSearchContent()}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  initialSearchContainer: {
    flex: 1,
    padding: 16,
  },
  recentSearchesContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  recentSearchesList: {
    marginLeft: 8,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  recentSearchText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  popularCategoriesContainer: {
    flex: 1,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  categoryItem: {
    width: '50%',
    padding: 8,
  },
  categoryIcon: {
    width: '100%',
    height: 100,
    backgroundColor: '#F1F8E9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  resultsContainer: {
    padding: 16,
  },
  plantItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  plantImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
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
  },
});

export default SearchScreen; 