import React from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { createSelector } from 'reselect';

const selectUserPlants = createSelector(
  state => state.plants.userPlants,
  userPlants => userPlants
);

const CollectionView = () => {
  const navigation = useNavigation();
  const userPlants = useSelector(selectUserPlants);

  const renderPlantItem = ({ item }) => {
    const getPlantImage = () => {
      if (!item) return null;
      
      if (item.default_image && item.default_image.medium_url) {
        return { uri: item.default_image.medium_url };
      }
      
      if (typeof item.image === 'number') return item.image;
      if (item.image && item.image.uri) return { uri: item.image.uri };
      if (typeof item.image === 'string') return { uri: item.image };
      
      return null;
    };

    const plantImage = getPlantImage();
    const hasValidImage = !!plantImage;

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
          <View style={[styles.plantImage, styles.plantPlaceholder]}>
            <Text style={styles.plantPlaceholderText}>{item.name ? item.name.charAt(0) : "P"}</Text>
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
        </View>
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
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Collection</Text>
        <View style={styles.headerRight} />
      </View>

      {userPlants.length > 0 ? (
        <FlatList
          data={userPlants}
          renderItem={renderPlantItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          numColumns={2}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="leaf-outline" size={48} color="#4CAF50" />
          <Text style={styles.emptyText}>Your collection is empty</Text>
          <Text style={styles.emptySubtext}>Scan a plant to add it to your collection</Text>
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
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  plantImage: {
    width: '100%',
    height: 150,
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
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  locationText: {
    fontSize: 10,
    color: '#4CAF50',
    marginLeft: 2,
  },
  plantPlaceholder: {
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantPlaceholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
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
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
});

export default CollectionView; 