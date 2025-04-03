import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import SvgImage from '../utils/SvgImage';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const PlantDetailScreen = ({ route }) => {
  const { plantId } = route.params;
  const navigation = useNavigation();
  
  // Mock data for a specific plant
  // In a real app, this would come from an API or database
  const plant = {
    id: plantId,
    name: 'Monstera',
    species: 'Monstera deliciosa',
    image: require('../../assets/monstera.png'),
    description: 'The Monstera deliciosa is a species of flowering plant native to tropical forests of southern Mexico, south to Panama. It has been introduced to many tropical areas, and has become a mildly invasive species in Hawaii, Seychelles, Ascension Island and the Society Islands.',
    care: {
      water: 'Medium - Allow soil to dry out between waterings',
      light: 'Bright indirect light',
      temperature: '65-85°F (18-29°C)',
      humidity: 'High',
      soil: 'Well-draining potting mix',
      fertilizer: 'Monthly during growing season',
      repotting: 'Every 2-3 years',
    },
    lastWatered: '2 days ago',
    nextWatering: 'In 3 days',
  };

  const [isFavorite, setIsFavorite] = useState(false);

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
        <Text style={styles.description}>{plant.description}</Text>

        <Text style={styles.sectionTitle}>Care Information</Text>
        <View style={styles.careContainer}>
          <View style={styles.careItem}>
            <SvgImage source={require('../../assets/water.png')} style={styles.careIcon} />
            <Text style={styles.careLabel}>Water</Text>
            <Text style={styles.careText}>{plant.care.water}</Text>
          </View>
          
          <View style={styles.careItem}>
            <SvgImage source={require('../../assets/light.png')} style={styles.careIcon} />
            <Text style={styles.careLabel}>Light</Text>
            <Text style={styles.careText}>{plant.care.light}</Text>
          </View>
          
          <View style={styles.careItem}>
            <SvgImage source={require('../../assets/temperature.png')} style={styles.careIcon} />
            <Text style={styles.careLabel}>Temperature</Text>
            <Text style={styles.careText}>{plant.care.temperature}</Text>
          </View>
          
          <View style={styles.careItem}>
            <SvgImage source={require('../../assets/humidity.png')} style={styles.careIcon} />
            <Text style={styles.careLabel}>Humidity</Text>
            <Text style={styles.careText}>{plant.care.humidity}</Text>
          </View>
        </View>

        <View style={styles.wateringContainer}>
          <View style={styles.wateringInfo}>
            <Text style={styles.wateringLabel}>Last Watered</Text>
            <Text style={styles.wateringText}>{plant.lastWatered}</Text>
          </View>
          <View style={styles.wateringInfo}>
            <Text style={styles.wateringLabel}>Next Watering</Text>
            <Text style={styles.wateringText}>{plant.nextWatering}</Text>
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
    width: 24,
    height: 24,
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