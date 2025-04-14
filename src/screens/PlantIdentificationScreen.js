import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
  Image,
  ScrollView,
  SafeAreaView,
  ToastAndroid,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import plantIdentificationService from '../services/plantIdentificationService';
import plantService from '../services/plantService';

const PlantIdentificationScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [identificationResults, setIdentificationResults] = useState([]);
  const [selectedOrgan, setSelectedOrgan] = useState('auto');
  const [identificationError, setIdentificationError] = useState(null);

  const organOptions = [
    { value: 'auto', label: 'Auto Detect', icon: 'auto-fix' },
    { value: 'leaf', label: 'Leaf', icon: 'leaf' },
    { value: 'flower', label: 'Flower', icon: 'flower' },
    { value: 'fruit', label: 'Fruit', icon: 'food-apple' },
    { value: 'bark', label: 'Bark', icon: 'tree' },
    { value: 'habit', label: 'Whole Plant', icon: 'sprout' },
  ];

  const requestCameraPermission = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in your device settings to use this feature.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      showToast('Error requesting camera permission');
      return false;
    }
  };

  // Helper function to show toast on Android or console log on iOS
  const showToast = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      console.log(message);
    }
  };

  const takePicture = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;

      setLoading(true);
      setIdentificationResults([]);
      setIdentificationError(null);
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8, // Reduced quality for faster upload
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setImage(selectedImage.uri);
        await identifyPlant(selectedImage.uri);
      } else {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      console.error('Error taking picture:', error);
      setIdentificationError('Failed to take picture. Please try again.');
    }
  };

  const selectFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Gallery Permission Required',
          'Please enable gallery access in your device settings to use this feature.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      setLoading(true);
      setIdentificationResults([]);
      setIdentificationError(null);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8, // Reduced quality for faster upload
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setImage(selectedImage.uri);
        await identifyPlant(selectedImage.uri);
      } else {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      console.error('Error selecting image:', error);
      setIdentificationError('Failed to select image. Please try again.');
    }
  };

  const identifyPlant = async (imageUri) => {
    try {
      setLoading(true);
      
      if (!imageUri) {
        setIdentificationError('No image selected. Please try again.');
        setLoading(false);
        return;
      }
      
      showToast('Identifying plant...');
      
      // Call the PlantNet API through our service
      const results = await plantIdentificationService.identifyPlant(imageUri, {
        organ: selectedOrgan !== 'auto' ? selectedOrgan : undefined
      });
      
      if (!results || results.length === 0) {
        setIdentificationError('No plants identified. Try a clearer image or different plant part.');
      } else {
        setIdentificationResults(results);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error identifying plant:', error);
      const errorMessage = error.message || 'Plant identification failed. Please try again.';
      setIdentificationError(errorMessage);
      setLoading(false);
    }
  };

  const resetIdentification = () => {
    setImage(null);
    setIdentificationResults([]);
    setIdentificationError(null);
  };

  const addToMyPlants = async (plant) => {
    try {
      setLoading(true);
      
      if (!plant) {
        Alert.alert("Error", "Invalid plant data");
        setLoading(false);
        return;
      }
      
      // Format plant data for storage - only include fields that exist in the database schema
      const plantData = {
        name: plant.name || 'Unknown Plant',
        species: plant.scientificName || 'Unknown Species',
        image_url: plant.image || null,
        description: `Identified using PlantNet with ${Math.round((plant.confidence || 0) * 100)}% confidence.`,
        family: plant.family || 'Unknown',
        genus: plant.genus || 'Unknown',
        // Remove fields that aren't in the database schema
        // sunlight: "partial", 
        watering: "Average",
      };
      
      console.log('Adding plant to database:', plantData);
      
      // Add to database
      await plantService.addPlant(plantData);
      
      setLoading(false);
      
      Alert.alert(
        "Plant Added",
        `${plantData.name} has been added to your plants collection!`,
        [
          { 
            text: "View My Plants", 
            onPress: () => navigation.navigate('PlantList', { category: 'My Plants' }) 
          },
          { 
            text: "OK", 
            onPress: () => resetIdentification() 
          }
        ]
      );
    } catch (error) {
      console.error('Error adding plant:', error);
      setLoading(false);
      Alert.alert("Error", "Failed to add plant to your collection. Please try again.");
    }
  };

  const viewPlantDetails = async (plant) => {
    try {
      if (!plant) {
        Alert.alert("Error", "Invalid plant data");
        return;
      }
      
      setLoading(true);
      
      try {
        // Get more detailed information about the plant
        const plantInfo = await plantIdentificationService.getPlantInformation(plant.scientificName);
        
        setLoading(false);
        
        // Construct a plant object for display only, not for database storage
        // Only include fields that are safe for display
        const displayPlant = {
          name: plant.name || 'Unknown Plant',
          species: plant.scientificName || 'Unknown Species',
          image_url: plant.image || null,
          family: plant.family || 'Unknown',
          genus: plant.genus || 'Unknown',
          watering: "Average",
          confidence: plant.confidence || 0,
          description: plantInfo.description || '',
          careInstructions: plantInfo.careInstructions || {},
          toxicity: plantInfo.toxicity || 'Unknown',
          propagation: plantInfo.propagation || ''
        };
        
        // Navigate to plant detail screen with a special flag to indicate this is not from database
        navigation.navigate('PlantDetail', { 
          identifiedPlant: displayPlant,
          isTemporary: true,
          fromIdentification: true  // Flag to skip any database lookups
        });
      } catch (error) {
        console.error('Error getting plant information:', error);
        setLoading(false);
        
        // Even if getting additional info fails, still show the plant with basic info
        const basicPlantInfo = {
          name: plant.name || 'Unknown Plant',
          species: plant.scientificName || 'Unknown Species',
          image_url: plant.image || null,
          family: plant.family || 'Unknown',
          genus: plant.genus || 'Unknown',
          watering: "Average",
          confidence: plant.confidence || 0,
          description: `${plant.scientificName || 'This plant'} was identified using PlantNet with ${Math.round((plant.confidence || 0) * 100)}% confidence.`
        };
        
        navigation.navigate('PlantDetail', { 
          identifiedPlant: basicPlantInfo,
          isTemporary: true,
          fromIdentification: true  // Flag to skip any database lookups
        });
      }
    } catch (error) {
      console.error('Error navigating to plant details:', error);
      setLoading(false);
      Alert.alert("Error", "Failed to view plant details. Please try again.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>
            {image ? 'Identifying plant...' : 'Processing...'}
          </Text>
          {image && (
            <Text style={styles.loadingSubText}>
              Analyzing image using PlantNet's AI
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (identificationResults.length > 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={resetIdentification}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Identification Results</Text>
          <View style={{width: 40}} />
        </View>
        
        <View style={styles.identifiedImageContainer}>
          {image ? (
            <Image source={{ uri: image }} style={styles.identifiedImage} />
          ) : (
            <View style={styles.noImageContainer}>
              <MaterialCommunityIcons name="image-off" size={40} color="#999" />
            </View>
          )}
        </View>
        
        <View style={styles.resultHeaderContainer}>
          <MaterialCommunityIcons name="leaf-maple" size={24} color="#4CAF50" />
          <Text style={styles.resultHeaderText}>
            {identificationResults.length} {identificationResults.length === 1 ? 'match' : 'matches'} found
          </Text>
        </View>
        
        <ScrollView style={styles.resultsContainer}>
          {identificationResults.map((result, index) => (
            <View key={index} style={styles.resultCard}>
              <View style={styles.resultImageContainer}>
                {result.image ? (
                  <Image 
                    source={{ uri: result.image }} 
                    style={styles.resultImage}
                    onError={() => console.log(`Failed to load image for ${result.name}`)}
                  />
                ) : (
                  <View style={styles.noImageContainer}>
                    <MaterialCommunityIcons name="image-off" size={30} color="#999" />
                  </View>
                )}
              </View>
              
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{result.name || 'Unknown Plant'}</Text>
                <Text style={styles.resultScientificName}>{result.scientificName || 'Unknown Species'}</Text>
                <Text style={styles.resultFamily}>Family: {result.family || 'Unknown'}</Text>
                <View style={styles.confidenceContainer}>
                  <Text style={styles.confidenceText}>
                    Confidence: {Math.round((result.confidence || 0) * 100)}%
                  </Text>
                  <View style={styles.confidenceBar}>
                    <View 
                      style={[
                        styles.confidenceFill, 
                        {width: `${Math.round((result.confidence || 0) * 100)}%`},
                        result.confidence > 0.7 ? styles.highConfidence :
                        result.confidence > 0.5 ? styles.mediumConfidence :
                        styles.lowConfidence
                      ]} 
                    />
                  </View>
                </View>
              </View>
              
              <View style={styles.resultActions}>
                <TouchableOpacity 
                  style={styles.viewButton}
                  onPress={() => viewPlantDetails(result)}
                >
                  <MaterialCommunityIcons name="information-outline" size={20} color="white" />
                  <Text style={styles.buttonText}>Details</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => addToMyPlants(result)}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="white" />
                  <Text style={styles.buttonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (identificationError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={60} color="#F44336" />
          <Text style={styles.errorTitle}>Identification Failed</Text>
          <Text style={styles.errorMessage}>{identificationError}</Text>
          
          {image && (
            <View style={styles.errorImageContainer}>
              <Image 
                source={{ uri: image }} 
                style={styles.errorImage}
                onError={() => console.log('Failed to load error image')}
              />
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.tryAgainButton}
            onPress={resetIdentification}
          >
            <Text style={styles.tryAgainButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plant Identification</Text>
        <View style={{width: 40}} />
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="leaf-maple" size={40} color="#4CAF50" />
            <Text style={styles.logoText}>PlantPal</Text>
          </View>
          <Text style={styles.heroTitle}>Identify Any Plant</Text>
          <Text style={styles.heroSubtitle}>
            Take a photo or select from gallery to identify plants using Pl@ntNet technology
          </Text>
        </View>
        
        <View style={styles.organSelector}>
          <Text style={styles.organSelectorTitle}>Select Plant Part:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.organOptions}
          >
            {organOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.organOption,
                  selectedOrgan === option.value && styles.selectedOrganOption
                ]}
                onPress={() => setSelectedOrgan(option.value)}
              >
                <MaterialCommunityIcons 
                  name={option.icon} 
                  size={24} 
                  color={selectedOrgan === option.value ? 'white' : '#4CAF50'} 
                />
                <Text 
                  style={[
                    styles.organOptionText,
                    selectedOrgan === option.value && styles.selectedOrganOptionText
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={selectFromGallery}
          >
            <MaterialCommunityIcons name="image" size={30} color="white" />
            <Text style={styles.buttonText}>Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={takePicture}
          >
            <MaterialCommunityIcons name="camera" size={30} color="white" />
            <Text style={styles.buttonText}>Camera</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.tipContainer}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color="#FFC107" />
          <Text style={styles.tipText}>
            For best results, take a clear, well-lit photo of the plant
          </Text>
        </View>
        
        <Text style={styles.poweredByText}>
          Powered by Pl@ntNet
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: 'white',
    marginTop: 20,
    fontWeight: 'bold',
  },
  loadingSubText: {
    fontSize: 14,
    color: '#AAA',
    marginTop: 10,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#CCC',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  organSelector: {
    marginBottom: 30,
  },
  organSelectorTitle: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
  },
  organOptions: {
    paddingVertical: 10,
  },
  organOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedOrganOption: {
    backgroundColor: '#4CAF50',
  },
  organOptionText: {
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '600',
  },
  selectedOrganOptionText: {
    color: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  cameraButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: '45%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  galleryButton: {
    backgroundColor: '#555',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: '45%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tipContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tipText: {
    color: '#EEE',
    marginLeft: 10,
    flex: 1,
  },
  poweredByText: {
    color: '#AAA',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
  },
  identifiedImageContainer: {
    width: '90%',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
    marginHorizontal: 20,
    alignSelf: 'center',
    backgroundColor: '#333',
  },
  identifiedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  resultHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  resultHeaderText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultCard: {
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  resultImageContainer: {
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
    backgroundColor: '#444',
  },
  resultImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  resultInfo: {
    marginBottom: 15,
  },
  resultName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  resultScientificName: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#BBB',
    marginBottom: 5,
  },
  resultFamily: {
    fontSize: 14,
    color: '#AAA',
    marginBottom: 10,
  },
  confidenceContainer: {
    marginTop: 5,
  },
  confidenceText: {
    fontSize: 14,
    color: 'white',
    marginBottom: 5,
  },
  confidenceBar: {
    height: 6,
    backgroundColor: '#444',
    borderRadius: 3,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  highConfidence: {
    backgroundColor: '#4CAF50',
  },
  mediumConfidence: {
    backgroundColor: '#FFC107',
  },
  lowConfidence: {
    backgroundColor: '#F44336',
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#CCC',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorImageContainer: {
    width: '80%',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#333',
  },
  errorImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tryAgainButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 25,
  },
  tryAgainButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default PlantIdentificationScreen; 