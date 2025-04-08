import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image,
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { createSelector } from 'reselect';

const selectUserPlants = createSelector(
  state => state.plants.userPlants,
  userPlants => userPlants
);

const selectAllPlants = createSelector(
  state => state.plants.plants,
  plants => plants
);

const CollectionView = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const allUserPlants = useSelector(selectUserPlants);
  const databasePlants = useSelector(selectAllPlants);
  
  // Get filter parameters from route
  const filter = route.params?.filter;
  const categoryName = route.params?.categoryName;
  const showAllPlants = route.params?.showAllPlants || false;
  
  // Filter plants based on parameters
  const displayPlants = React.useMemo(() => {
    // Determine which plant collection to use as base
    const basePlants = showAllPlants ? databasePlants : allUserPlants;
    
    // Apply category filter if specified
    if (filter === 'category' && categoryName) {
      const normalizedCategoryName = categoryName.toString().trim().toLowerCase();
      return basePlants.filter(plant => {
        if (!plant.category) return false;
        
        // Handle when category is an array or a single string
        if (Array.isArray(plant.category)) {
          return plant.category.some(category => 
            category && category.toString().trim().toLowerCase() === normalizedCategoryName
          );
        }
        
        // Handle when category is a string
        return plant.category.toString().trim().toLowerCase() === normalizedCategoryName;
      });
    }
    
    // Default: return user plants if no special filter
    return showAllPlants ? databasePlants : allUserPlants;
  }, [allUserPlants, databasePlants, filter, categoryName, showAllPlants]);

  const renderPlantItem = ({ item }) => {
    const getPlantImage = () => {
      if (!item) return null;
      
      // First try to get the image from the plant object
      if (item.image) {
        if (typeof item.image === 'string') {
          return { uri: item.image };
        }
        if (item.image.uri) {
          return { uri: item.image.uri };
        }
      }
      
      // Try default_image if available
      if (item.default_image && item.default_image.medium_url) {
        return { uri: item.default_image.medium_url };
      }
      
      // Try image_url if available
      if (item.image_url) {
        return { uri: item.image_url };
      }
      
      // If no image is found, return null
      return null;
    };

    const plantImage = getPlantImage();
    const hasValidImage = !!plantImage;

    const isInUserCollection = allUserPlants.some(p => p.id.toString() === item.id.toString());
    
    // Generate a consistent color based on plant name
    const getPlantColor = (plantName) => {
      const colors = [
        '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', 
        '#03A9F4', '#E91E63', '#009688', '#673AB7'
      ];
      
      // Simple hash function to get consistent index
      const hash = plantName.split('').reduce(
        (acc, char) => acc + char.charCodeAt(0), 0
      );
      
      return colors[hash % colors.length];
    };
    
    const plantColor = getPlantColor(item.name || item.common_name || '');

    return (
      <TouchableOpacity 
        style={styles.plantCard}
        onPress={() => navigation.navigate('PlantDetail', { plantId: item.id })}
      >
        {hasValidImage ? (
          <Image 
            source={plantImage} 
            style={styles.plantImage} 
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.plantImage, styles.plantPlaceholder, { backgroundColor: `${plantColor}15` }]}>
            <Ionicons name="leaf" size={40} color={plantColor} />
          </View>
        )}
        
        {showAllPlants && isInUserCollection && (
          <View style={styles.inCollectionBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
          </View>
        )}
        
        <View style={styles.plantInfo}>
          <Text style={styles.plantName} numberOfLines={1}>{item.name || item.common_name}</Text>
          <Text style={styles.plantSpecies} numberOfLines={1}>{item.species || 'Houseplant'}</Text>
          
          {item.location && (
            <View style={styles.locationTag}>
              <Ionicons name="location-outline" size={12} color="#4CAF50" />
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
          )}
          
          {item.category && (
            <View style={styles.categoryTag}>
              <Ionicons name="pricetag-outline" size={12} color="#8E44AD" />
              <Text style={styles.categoryText}>
                {Array.isArray(item.category) ? item.category[0] : item.category}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Generate the appropriate title based on filter
  const getHeaderTitle = () => {
    if (filter === 'category' && categoryName) {
      return categoryName;
    }
    return showAllPlants ? "All Plants" : "My Collection";
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <View style={styles.headerRight} />
      </View>

      {displayPlants.length > 0 ? (
        <FlatList
          data={displayPlants}
          renderItem={renderPlantItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          numColumns={2}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="leaf-outline" size={48} color="#4CAF50" />
          <Text style={styles.emptyText}>
            {filter === 'category' 
              ? `No plants in the ${categoryName} category` 
              : (showAllPlants ? 'No plants available' : 'Your collection is empty')}
          </Text>
          <Text style={styles.emptySubtext}>
            {filter === 'category'
              ? 'Check back later for more plants'
              : (showAllPlants ? 'Try searching for different plants' : 'Scan a plant to add it to your collection')}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  listContainer: {
    padding: 16,
  },
  plantCard: {
    flex: 1,
    margin: 8,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  plantImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#E8F5E9',
  },
  plantPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  inCollectionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  plantInfo: {
    padding: 12,
  },
  plantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  plantSpecies: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#757575',
    marginBottom: 8,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginRight: 8,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    color: '#8E44AD',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
});

export default CollectionView; 