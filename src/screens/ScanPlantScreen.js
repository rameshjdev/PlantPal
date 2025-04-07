import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { addPlant } from '../store/plantsSlice';
// Camera import commented out to fix the error - we'll fallback to image picker only
// import { Camera } from 'expo-camera';

const ScanPlantScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraType, setCameraType] = useState('back');
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [identifiedPlant, setIdentifiedPlant] = useState(null);
  const [isCameraAvailable, setIsCameraAvailable] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        // Since Camera is causing issues, we'll check only for image picker permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        setHasPermission(status === 'granted');
        // Set camera as unavailable to skip camera-related UI
        setIsCameraAvailable(false);
      } catch (err) {
        console.error('Permission check error:', err);
        setIsCameraAvailable(false);
        setHasPermission(false);
      }
    })();
  }, []);

  const handleCameraFlip = () => {
    setCameraType(
      cameraType === 'back' ? 'front' : 'back'
    );
  };

  // Camera functionality removed as it's causing issues
  const takePicture = async () => {
    // Fallback to image picker since camera isn't working
    pickImage();
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        setCapturedImage(result.assets[0].uri);
        identifyPlant(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const identifyPlant = async (imageUri) => {
    setIsProcessing(true);
    
    // In a real app, you would call an API like PlantNet or similar service
    // For this demo, we'll simulate an API call with a timeout
    setTimeout(() => {
      // Mock identification result
      const mockResult = {
        id: `plant_${Date.now()}`,
        name: 'Monstera Deliciosa',
        species: 'Monstera deliciosa',
        image: imageUri,
        popularity: 5,
        careInstructions: {
          water: 'Keep soil consistently moist but not soggy.',
          light: 'Bright, indirect light.',
          temperature: '65-85°F (18-29°C)',
          humidity: 'High humidity preferred',
        },
        location: 'Living Room', // Default location
      };
      
      setIdentifiedPlant(mockResult);
      setIsProcessing(false);
    }, 2000);
  };

  const handleAddToCollection = () => {
    if (identifiedPlant) {
      dispatch(addPlant(identifiedPlant));
      Alert.alert(
        'Success',
        `${identifiedPlant.name} has been added to your collection!`,
        [
          { text: 'OK', onPress: () => navigation.navigate('HomeTab') }
        ]
      );
    }
  };

  const resetCamera = () => {
    setCapturedImage(null);
    setIdentifiedPlant(null);
  };

  // Show loading state while checking permissions
  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error if permission denied or camera not available
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="images-outline" size={60} color="#999" />
          <Text style={styles.permissionText}>Gallery access required</Text>
          <Text style={styles.permissionSubtext}>
            Please enable access to your photo gallery in your device settings to use this feature.
          </Text>
          <View style={styles.permissionButtons}>
            <TouchableOpacity 
              style={styles.permissionButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.permissionButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (capturedImage) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={resetCamera}
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Plant Scan</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.resultContainer}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} />
          
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.processingText}>Identifying your plant...</Text>
            </View>
          ) : (
            identifiedPlant && (
              <View style={styles.identificationContainer}>
                <Text style={styles.identificationTitle}>Plant Identified!</Text>
                <Text style={styles.identificationName}>{identifiedPlant.name}</Text>
                <Text style={styles.identificationSpecies}>{identifiedPlant.species}</Text>
                
                <View style={styles.careContainer}>
                  <Text style={styles.careTitle}>Care Instructions:</Text>
                  <View style={styles.careItem}>
                    <Ionicons name="water-outline" size={20} color="#4CAF50" />
                    <Text style={styles.careText}>{identifiedPlant.careInstructions.water}</Text>
                  </View>
                  <View style={styles.careItem}>
                    <Ionicons name="sunny-outline" size={20} color="#4CAF50" />
                    <Text style={styles.careText}>{identifiedPlant.careInstructions.light}</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleAddToCollection}
                >
                  <Text style={styles.addButtonText}>Add to My Collection</Text>
                </TouchableOpacity>
              </View>
            )
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Replace camera UI with a simple image picker UI
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
        <Text style={styles.title}>Plant Scan</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.placeholderContainer}>
        <Ionicons name="leaf-outline" size={80} color="#4CAF50" />
        <Text style={styles.placeholderTitle}>Identify Plants</Text>
        <Text style={styles.placeholderText}>
          Upload a photo of a plant to identify it and get care instructions.
        </Text>
        
        <TouchableOpacity 
          style={styles.uploadButton}
          onPress={pickImage}
        >
          <Ionicons name="images-outline" size={24} color="#FFF" />
          <Text style={styles.uploadButtonText}>Choose from Gallery</Text>
        </TouchableOpacity>
      </View>
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
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  permissionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    flex: 1,
    padding: 16,
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  identificationContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  identificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  identificationName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  identificationSpecies: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#757575',
    marginBottom: 16,
  },
  careContainer: {
    marginBottom: 16,
  },
  careTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  careItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  careText: {
    fontSize: 14,
    color: '#424242',
    marginLeft: 8,
    flex: 1,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 300,
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default ScanPlantScreen; 