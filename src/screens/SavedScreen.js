import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  Image,
  Platform,
  TextInput,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPlants, toggleFavorite } from '../store/plantsSlice';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

const SavedScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { userPlants, plants, status } = useSelector((state) => state.plants);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    dispatch(fetchPlants());
  }, [dispatch]);

  // Get all favorited plants from userPlants
  const favoritedPlants = userPlants.filter(plant => plant.isFavorite);
  
  // Apply search and filter
  const filteredPlants = favoritedPlants
    .filter(plant => 
      searchQuery === '' || 
      plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plant.species && plant.species.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .filter(plant => {
      if (filterType === 'all') return true;
      if (filterType === 'indoor' && plant.light && 
          (plant.light.toLowerCase().includes('indirect') || 
           plant.light.toLowerCase().includes('low'))) return true;
      if (filterType === 'outdoor' && plant.light && 
          plant.light.toLowerCase().includes('full sun')) return true;
      if (filterType === 'easy' && plant.careLevel && 
          (plant.careLevel === 'Very Easy' || plant.careLevel === 'Easy')) return true;
      return false;
    });

  // Render filter buttons
  const renderFilterButtons = () => {
    const filters = [
      { label: 'All', value: 'all' },
      { label: 'Indoor', value: 'indoor' },
      { label: 'Outdoor', value: 'outdoor' },
      { label: 'Easy Care', value: 'easy' },
    ];
    
    return (
      <View style={styles.filterContainer}>
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterButton, 
              filterType === filter.value && styles.filterButtonActive
            ]}
            onPress={() => setFilterType(filter.value)}
          >
            <Text 
              style={[
                styles.filterButtonText, 
                filterType === filter.value && styles.filterButtonTextActive
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render a plant item
  const renderPlantItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.plantCard}
      onPress={() => navigation.navigate('PlantDetail', { plantId: item.id })}
    >
      <View style={styles.plantImageContainer}>
        <Image 
          source={typeof item.image === 'number' ? item.image : { uri: item.image }} 
          style={styles.plantImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)']}
          style={styles.plantImageGradient}
        />
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={() => dispatch(toggleFavorite(item.id))}
        >
          <Ionicons 
            name={item.isFavorite ? "heart" : "heart-outline"} 
            size={20} 
            color="#E91E63" 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.plantInfo}>
        <Text style={styles.plantName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.plantSpecies} numberOfLines={1}>{item.species || 'Houseplant'}</Text>
        
        <View style={styles.plantDetails}>
          <View style={styles.plantDetailItem}>
            <MaterialCommunityIcons name="water-outline" size={14} color="#4CAF50" />
            <Text style={styles.plantDetailText}>{item.water}</Text>
          </View>
          
          <View style={styles.careLevelContainer}>
            <Text style={[
              styles.careLevelText,
              {
                backgroundColor: 
                  item.careLevel === 'Very Easy' ? '#E8F5E9' : 
                  item.careLevel === 'Easy' ? '#DCEDC8' : 
                  item.careLevel === 'Moderate' ? '#FFF9C4' : '#FFCCBC',
                color: 
                  item.careLevel === 'Very Easy' ? '#2E7D32' : 
                  item.careLevel === 'Easy' ? '#558B2F' : 
                  item.careLevel === 'Moderate' ? '#F9A825' : '#D84315'
              }
            ]}>
              {item.careLevel || 'Moderate'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Plants</Text>
        <TouchableOpacity 
          style={styles.exploreButton}
          onPress={() => navigation.navigate('ExploreTab')}
        >
          <Text style={styles.exploreButtonText}>Explore</Text>
          <Ionicons name="arrow-forward" size={16} color="#4CAF50" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#757575" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your saved plants..."
          placeholderTextColor="#9E9E9E"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#757575" />
          </TouchableOpacity>
        )}
      </View>
      
      {renderFilterButtons()}
      
      {status === 'loading' ? (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>Loading plants...</Text>
        </View>
      ) : filteredPlants.length === 0 ? (
        <View style={styles.messageContainer}>
          <Ionicons name="heart" size={60} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No saved plants</Text>
          <Text style={styles.emptyText}>
            Plants you save will appear here. Explore and heart the plants you love!
          </Text>
          <TouchableOpacity 
            style={styles.exploreButtonLarge}
            onPress={() => navigation.navigate('ExploreTab')}
          >
            <Text style={styles.exploreButtonLargeText}>Explore Plants</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredPlants}
          renderItem={renderPlantItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.plantList}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exploreButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#212121',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  filterButtonActive: {
    backgroundColor: '#E8F5E9',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#757575',
  },
  filterButtonTextActive: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  plantList: {
    padding: 12,
    paddingBottom: 100, // Allow space for tab bar
  },
  row: {
    justifyContent: 'space-between',
  },
  plantCard: {
    width: COLUMN_WIDTH,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      }
    }),
  },
  plantImageContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
  },
  plantImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  plantImageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantInfo: {
    padding: 12,
  },
  plantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 2,
  },
  plantSpecies: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#757575',
    marginBottom: 8,
  },
  plantDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plantDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plantDetailText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  careLevelContainer: {
    marginLeft: 'auto',
  },
  careLevelText: {
    fontSize: 10,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  messageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  messageText: {
    fontSize: 16,
    color: '#757575',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButtonLarge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreButtonLargeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SavedScreen;