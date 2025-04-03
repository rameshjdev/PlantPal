import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import SvgImage from '../utils/SvgImage';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import plantService from '../services/plantService';

const PlantDetailScreen = ({ route }) => {
  const { plantId } = route.params;
  const navigation = useNavigation();
  
  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Fetch plant details on component mount
  useEffect(() => {
    fetchPlantDetails();
  }, [plantId]);

  // Fetch plant details from API
  const fetchPlantDetails = async () => {
    try {
      setLoading(true);
      const data = await plantService.getPlantById(plantId);
      setPlant(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching plant details:', err);
      setError('Failed to load plant details. Please try again.');
      setLoading(false);
      
      // If API call fails, use backup data
      setPlant(generateBackupPlantData(plantId));
    }
  };

  // Generate care object from plant data
  const getCareInfo = (plant) => {
    if (!plant) return {};
    
    // Try to get values from plant.data if available
    const getValueOrDefault = (key, defaultValue) => {
      if (!plant.data || !Array.isArray(plant.data)) return defaultValue;
      
      const item = plant.data.find(item => item.key === key);
      return item ? item.value : defaultValue;
    };
    
    return {
      water: plant.water || getValueOrDefault('Water requirement', 'Medium - Check plant needs'),
      light: plant.light || getValueOrDefault('Light requirement', 'Medium light'),
      temperature: getValueOrDefault('USDA Hardiness zone', '65-85°F (18-29°C)'),
      humidity: getValueOrDefault('Humidity', 'Medium'),
      soil: getValueOrDefault('Soil type', 'Well-draining potting mix'),
      fertilizer: getValueOrDefault('Fertilizer', 'As needed during growing season'),
      repotting: getValueOrDefault('Repotting', 'Every 1-2 years or as needed'),
    };
  };

  // Format the watering information
  const getWateringInfo = (plant) => {
    if (!plant) return { lastWatered: 'Not recorded', nextWatering: 'Not scheduled' };
    
    // In a real app, this would come from user data
    return {
      lastWatered: '2 days ago',
      nextWatering: 'In 3 days',
    };
  };

  // Generate backup data in case API fails
  const generateBackupPlantData = (id) => {
    return {
      id: id,
      name: 'Plant',
      species: 'Unknown species',
      image: require('../../assets/monstera.png'),
      description: 'Plant information unavailable. Please check your connection and try again.',
      water: 'Check plant needs',
      light: 'Medium light',
      data: [],
    };
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading plant details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && !plant) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={50} color="#E53935" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPlantDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Get care information and watering info
  const careInfo = getCareInfo(plant);
  const wateringInfo = getWateringInfo(plant);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#2E7D32" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)} style={styles.favoriteButton}>
            <MaterialCommunityIcons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color="#E91E63" 
            />
          </TouchableOpacity>
        </View>

      <SvgImage source={plant.image} style={styles.plantImage} />

      <View style={styles.infoContainer}>
        <Text style={styles.plantName}>{plant.name}</Text>
        <Text style={styles.plantSpecies}>{plant.species}</Text>
        
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{plant.description || 'No description available.'}</Text>

        {/* Display any additional plant data from the API */}
        {plant.data && plant.data.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            <View style={styles.additionalInfoContainer}>
              {plant.data.map((item, index) => (
                <View key={index} style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{item.key}</Text>
                  <Text style={styles.infoText}>{item.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Care Information</Text>
        <View style={styles.careContainer}>
          <View style={styles.careItem}>
            <MaterialCommunityIcons name="water-outline" size={24} color="#2E7D32" style={styles.careIcon} />
            <Text style={styles.careLabel}>Water</Text>
            <Text style={styles.careText}>{careInfo.water}</Text>
          </View>
          
          <View style={styles.careItem}>
            <MaterialCommunityIcons name="white-balance-sunny" size={24} color="#2E7D32" style={styles.careIcon} />
            <Text style={styles.careLabel}>Light</Text>
            <Text style={styles.careText}>{careInfo.light}</Text>
          </View>
          
          <View style={styles.careItem}>
            <MaterialCommunityIcons name="thermometer" size={24} color="#2E7D32" style={styles.careIcon} />
            <Text style={styles.careLabel}>Temperature</Text>
            <Text style={styles.careText}>{careInfo.temperature}</Text>
          </View>
          
          <View style={styles.careItem}>
            <MaterialCommunityIcons name="water-percent" size={24} color="#2E7D32" style={styles.careIcon} />
            <Text style={styles.careLabel}>Humidity</Text>
            <Text style={styles.careText}>{careInfo.humidity}</Text>
          </View>
        </View>

        <View style={styles.wateringContainer}>
          <View style={styles.wateringInfo}>
            <Text style={styles.wateringLabel}>Last Watered</Text>
            <Text style={styles.wateringText}>{wateringInfo.lastWatered}</Text>
          </View>
          <View style={styles.wateringInfo}>
            <Text style={styles.wateringLabel}>Next Watering</Text>
            <Text style={styles.wateringText}>{wateringInfo.nextWatering}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.reminderButton}
          onPress={() => navigation.navigate('SetReminder', { plantId: plant.id })}
        >
          <Text style={styles.reminderButtonText}>Set Care Reminder</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    position: 'absolute',
    zIndex: 1,
    width: '100%',
    ...Platform.select({
      ios: {
        paddingTop: 8
      }
    })
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
      }
    })
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
      }
    })
  },
  plantImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
  },
  infoContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  plantName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#2E7D32',
  },
  plantSpecies: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
  },
  additionalInfoContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  infoItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#444',
  },
  careContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  careItem: {
    width: '48%',
    backgroundColor: '#F1F8E9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  careIcon: {
    marginBottom: 8,
  },
  careLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  careText: {
    fontSize: 12,
    color: '#666',
  },
  wateringContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  wateringInfo: {
    alignItems: 'center',
  },
  wateringLabel: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 4,
  },
  wateringText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  reminderButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  reminderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PlantDetailScreen;