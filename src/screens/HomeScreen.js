import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Platform, Alert } from 'react-native';
import SvgImage from '../utils/SvgImage';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPlants, removePlant, toggleFavorite } from '../store/plantsSlice';
import { createSelector } from 'reselect';

// Memoized selector to prevent recreation of objects
const selectUserPlants = createSelector(
  state => state.plants.userPlants,
  userPlants => userPlants
);

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  // Use memoized selectors to prevent unnecessary rerenders
  const myPlants = useSelector(selectUserPlants);
  
  // State to track plant selected for potential deletion
  const [selectedPlantId, setSelectedPlantId] = useState(null);

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
            // Get the plant before removing it
            const plantToRemove = myPlants.find(plant => plant.id === plantId);
            
            if (plantToRemove) {
              // If the plant is a favorite, toggle its favorite status to false before removing
              if (plantToRemove.isFavorite) {
                dispatch(toggleFavorite(plantId));
              }
              
              // Then remove the plant from user plants
              dispatch(removePlant(plantId));
            }
            
            setSelectedPlantId(null);
          }
        }
      ]
    );
  };

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