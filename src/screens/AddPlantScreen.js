import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ScrollView, Platform, Alert, ActivityIndicator, Modal, Image } from 'react-native';
import SvgImage from '../utils/SvgImage';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { addPlant, searchPlants, fetchPlants } from '../store/plantsSlice';
import * as ImagePicker from 'expo-image-picker';
// Temporarily comment out these imports until we have proper development builds
// import { BarCodeScanner } from 'expo-barcode-scanner';
// import { Camera } from 'expo-camera';

const AddPlantScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Camera and scan state
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [hasBarCodeScannerPermission, setHasBarCodeScannerPermission] = useState(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [barcodeScannerVisible, setBarcodeScannerVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [scannedData, setScannedData] = useState(null);
  
  // Manual entry state
  const [manualEntryVisible, setManualEntryVisible] = useState(false);
  const [manualPlantData, setManualPlantData] = useState({
    name: '',
    species: '',
    careLevel: 'Easy',
    light: 'Medium indirect light',
    water: 'Weekly',
  });

  // Camera reference
  const cameraRef = useRef(null);
  
  // Get search results and all plants from Redux store
  const { searchResults, searchStatus, error, allPlants, loadingPlants } = useSelector(state => ({
    searchResults: state.plants.searchResults,
    searchStatus: state.plants.searchStatus,
    error: state.plants.error,
    allPlants: state.plants.plants,
    loadingPlants: state.plants.status === 'loading'
  }));

  // Ask for camera permissions on mount - temporarily disabled
  useEffect(() => {
    // Disabled for now to prevent crashing
    // (async () => {
    //   const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    //   setHasCameraPermission(cameraStatus === 'granted');
    //   
    //   const { status: barcodeStatus } = await BarCodeScanner.requestPermissionsAsync();
    //   setHasBarCodeScannerPermission(barcodeStatus === 'granted');
    // })();
    
    // Set default permissions to false
    setHasCameraPermission(false);
    setHasBarCodeScannerPermission(false);
  }, []);

  // Fetch plants on component mount if not already loaded
  useEffect(() => {
    if (allPlants.length === 0) {
      dispatch(fetchPlants());
    }
  }, [dispatch, allPlants.length]);

  // Get popular plants from all plants
  const getPopularPlants = () => {
    if (allPlants.length === 0) return [];
    
    // Sort plants by popularity or other criteria
    // Here we're using a simple algorithm that considers plants with
    // "Easy" or "Very Easy" care level as popular
    const popularPlants = [...allPlants]
      .filter(plant => 
        plant.careLevel === 'Easy' || 
        plant.careLevel === 'Very Easy'
      )
      .sort((a, b) => {
        // Prioritize plants with more data/details
        const aDataLength = a.data ? a.data.length : 0;
        const bDataLength = b.data ? b.data.length : 0;
        return bDataLength - aDataLength;
      })
      .slice(0, 8); // Limit to 8 popular plants
    
    return popularPlants;
  };

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() !== '') {
        dispatch(searchPlants(searchQuery));
        setIsSearching(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, dispatch]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setIsSearching(false);
    }
  };

  const handleSelectPlant = (plant) => {
    // Add the selected plant to the user's collection
    dispatch(addPlant({
      ...plant,
      lastWatered: new Date().toISOString().split('T')[0], // Today's date
      nextWatering: getNextWateringDate(plant),
      care: {
        water: plant.water || 'Weekly', // Add default value
        light: plant.light || 'Medium indirect light', // Add default value
        temperature: '65-85°F (18-29°C)',
        humidity: 'Medium',
        soil: 'Well-draining potting mix',
        fertilizer: 'As needed',
        repotting: 'Every 1-2 years',
      },
      isFavorite: false
    }));

    // Show success message
    Alert.alert(
      'Plant Added',
      `${plant.name} has been added to your collection!`,
      [
        { 
          text: 'View My Plants', 
          onPress: () => navigation.navigate('HomeTab') 
        },
        { 
          text: 'View Details', 
          onPress: () => navigation.navigate('PlantDetail', { plantId: plant.id })
        }
      ]
    );
  };

  // Helper function to calculate next watering date based on water requirement
  const getNextWateringDate = (plant) => {
    const today = new Date();
    let daysToAdd = 7; // Default weekly

    if (plant.water) {
      if (plant.water.includes('2-3 weeks')) {
        daysToAdd = 14; // 2 weeks
      } else if (plant.water.includes('dry')) {
        daysToAdd = 10; // When soil is dry
      } else if (plant.water.includes('moist')) {
        daysToAdd = 3; // Keep soil moist
      }
    }

    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysToAdd);
    return nextDate.toISOString().split('T')[0];
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity 
      style={styles.searchResultItem}
      onPress={() => handleSelectPlant(item)}
    >
      <SvgImage source={item.image} style={styles.resultImage} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultSpecies}>{item.species}</Text>
      </View>
    </TouchableOpacity>
  );

  // Render loading indicator when searching
  const renderSearchContent = () => {
    if (searchStatus === 'loading') {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Searching plants...</Text>
        </View>
      );
    }

    if (searchStatus === 'failed') {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#E53935" />
          <Text style={styles.errorText}>
            {error || "Couldn't find plants. Try again or browse options below."}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={searchResults}
        renderItem={renderSearchResult}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.searchResults}
        ListEmptyComponent={
          <Text style={styles.noResultsText}>No plants found. Try a different search term.</Text>
        }
      />
    );
  };

  // Render dynamic popular plants section
  const renderPopularPlants = () => {
    const popularPlants = getPopularPlants();
    
    if (loadingPlants) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading popular plants...</Text>
        </View>
      );
    }
    
    if (popularPlants.length === 0) {
      return (
        <View style={styles.emptyPopularContainer}>
          <Text style={styles.emptyPopularText}>No popular plants available.</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.popularPlantsContainer}>
        {popularPlants.map(plant => (
          <TouchableOpacity 
            key={plant.id} 
            style={styles.popularPlantItem}
            onPress={() => handleSelectPlant(plant)}
          >
            <SvgImage source={plant.image} style={styles.popularPlantImage} />
            <Text style={styles.popularPlantName}>{plant.name}</Text>
            {plant.careLevel && (
              <View style={styles.careLevelTag}>
                <Text style={styles.careLevelText}>{plant.careLevel}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Handle camera button press
  const handleCameraPress = () => {
    Alert.alert('Coming Soon', 'Camera functionality will be available in the next update.');
    // Original functionality (commented out)
    // if (hasCameraPermission === null) {
    //   return Alert.alert('Requesting Permission', 'Please grant camera permissions to use this feature.');
    // }
    // if (hasCameraPermission === false) {
    //   return Alert.alert('No Access to Camera', 'Please enable camera permissions in your device settings.');
    // }
    // setCameraVisible(true);
  };

  // Handle barcode scanner button press
  const handleBarcodeScannerPress = () => {
    Alert.alert('Coming Soon', 'Barcode scanner functionality will be available in the next update.');
    // Original functionality (commented out)
    // if (hasBarCodeScannerPermission === null) {
    //   return Alert.alert('Requesting Permission', 'Please grant camera permissions to use this feature.');
    // }
    // if (hasBarCodeScannerPermission === false) {
    //   return Alert.alert('No Access to Camera', 'Please enable camera permissions in your device settings.');
    // }
    // setBarcodeScannerVisible(true);
  };

  // Camera related functions
  const handleTakePhoto = async () => {
    // Check if we have permission
    if (hasCameraPermission !== true) {
      Alert.alert(
        'Camera Permission',
        'We need camera access to take photos of plants',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => { /* ideally open settings */ } }
        ]
      );
      return;
    }
    
    setCameraVisible(true);
  };
  
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        setCapturedImage(photo.uri);
        setCameraVisible(false);
        
        // Simulate plant identification
        setTimeout(() => {
          Alert.alert(
            'Plant Identified',
            'We identified this as a Monstera Deliciosa. Would you like to add it to your collection?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Add Plant', 
                onPress: () => {
                  const identifiedPlant = allPlants.find(p => p.name.includes('Monstera')) || allPlants[0];
                  if (identifiedPlant) {
                    handleSelectPlant(identifiedPlant);
                  }
                }
              }
            ]
          );
        }, 1500);
      } catch (error) {
        console.error('Failed to take picture:', error);
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    }
  };
  
  // Barcode scanner related functions
  const handleScanBarcode = async () => {
    if (hasBarCodeScannerPermission !== true) {
      Alert.alert(
        'Camera Permission',
        'We need camera access to scan barcodes',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => { /* ideally open settings */ } }
        ]
      );
      return;
    }
    
    setBarcodeScannerVisible(true);
  };
  
  const handleBarCodeScanned = ({ type, data }) => {
    setScannedData(data);
    setBarcodeScannerVisible(false);
    
    // Simulate finding a plant by barcode
    setTimeout(() => {
      Alert.alert(
        'Plant Found',
        `We found a Snake Plant (Sansevieria) with barcode: ${data}. Would you like to add it to your collection?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Add Plant', 
            onPress: () => {
              const identifiedPlant = allPlants.find(p => p.name.includes('Snake')) || allPlants[1];
              if (identifiedPlant) {
                handleSelectPlant(identifiedPlant);
              }
            }
          }
        ]
      );
    }, 1000);
  };
  
  // Manual entry related functions
  const handleManualEntry = () => {
    setManualEntryVisible(true);
  };
  
  const handleManualInputChange = (field, value) => {
    setManualPlantData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSubmitManualEntry = () => {
    if (!manualPlantData.name.trim()) {
      Alert.alert('Missing Information', 'Please provide at least a plant name');
      return;
    }
    
    // Create a new plant with the manual data
    const newPlant = {
      id: `manual-${Date.now()}`,
      name: manualPlantData.name,
      species: manualPlantData.species || 'Unknown species',
      image: require('../../assets/monstera.png'), // Default image
      careLevel: manualPlantData.careLevel,
      light: manualPlantData.light,
      water: manualPlantData.water,
      data: []
    };
    
    handleSelectPlant(newPlant);
    setManualEntryVisible(false);
    
    // Reset the form
    setManualPlantData({
      name: '',
      species: '',
      careLevel: 'Easy',
      light: 'Medium indirect light',
      water: 'Weekly',
    });
  };

  // Camera view renderer - temporarily disabled
  // const renderCameraView = () => {
  //   if (!cameraVisible) return null;
  //   
  //   return (
  //     <Modal
  //       animationType="slide"
  //       transparent={false}
  //       visible={cameraVisible}
  //       onRequestClose={() => setCameraVisible(false)}
  //     >
  //       <View style={styles.cameraContainer}>
  //         <Camera
  //           ref={cameraRef}
  //           style={styles.camera}
  //           type={Camera.Constants.Type.back}
  //           ratio="16:9"
  //         >
  //           <View style={styles.cameraControlsContainer}>
  //             <TouchableOpacity 
  //               style={styles.cameraCloseButton}
  //               onPress={() => setCameraVisible(false)}
  //             >
  //               <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
  //             </TouchableOpacity>
  //             
  //             <TouchableOpacity 
  //               style={styles.cameraCaptureButton}
  //               onPress={handleCameraCapture}
  //             >
  //               <View style={styles.cameraCaptureCircle} />
  //             </TouchableOpacity>
  //           </View>
  //         </Camera>
  //       </View>
  //     </Modal>
  //   );
  // };
  
  // Barcode scanner view renderer - temporarily disabled
  // const renderBarcodeScannerView = () => {
  //   if (!barcodeScannerVisible) return null;
  //   
  //   return (
  //     <Modal
  //       animationType="slide"
  //       transparent={false}
  //       visible={barcodeScannerVisible}
  //       onRequestClose={() => setBarcodeScannerVisible(false)}
  //     >
  //       <View style={styles.barcodeContainer}>
  //         <BarCodeScanner
  //           onBarCodeScanned={scannedData ? undefined : handleBarCodeScanned}
  //           style={styles.barcodeScannerView}
  //         />
  //         
  //         <View style={styles.barcodeOverlay}>
  //           <View style={styles.barcodeFrame} />
  //           <Text style={styles.barcodeInstructions}>
  //             Position the barcode within the frame
  //           </Text>
  //         </View>
  //         
  //         <TouchableOpacity 
  //           style={styles.barcodeCloseButton}
  //           onPress={() => setBarcodeScannerVisible(false)}
  //         >
  //           <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
  //         </TouchableOpacity>
  //       </View>
  //     </Modal>
  //   );
  // };
  
  // Render the manual entry form
  const renderManualEntryView = () => (
    <Modal
      visible={manualEntryVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setManualEntryVisible(false)}
    >
      <View style={styles.manualEntryModalContainer}>
        <View style={styles.manualEntryContent}>
          <Text style={styles.manualEntryTitle}>Add Plant Manually</Text>
          
          <Text style={styles.manualEntryLabel}>Plant Name*</Text>
          <TextInput
            style={styles.manualEntryInput}
            value={manualPlantData.name}
            onChangeText={(text) => handleManualInputChange('name', text)}
            placeholder="e.g. Monstera, Snake Plant"
          />
          
          <Text style={styles.manualEntryLabel}>Scientific Name</Text>
          <TextInput
            style={styles.manualEntryInput}
            value={manualPlantData.species}
            onChangeText={(text) => handleManualInputChange('species', text)}
            placeholder="e.g. Monstera deliciosa"
          />
          
          <Text style={styles.manualEntryLabel}>Care Level</Text>
          <View style={styles.careLevelOptions}>
            {['Very Easy', 'Easy', 'Moderate', 'Difficult'].map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.careLevelOption,
                  manualPlantData.careLevel === level && styles.careLevelOptionSelected
                ]}
                onPress={() => handleManualInputChange('careLevel', level)}
              >
                <Text style={[
                  styles.careLevelOptionText,
                  manualPlantData.careLevel === level && styles.careLevelOptionTextSelected
                ]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.manualEntryLabel}>Light Requirements</Text>
          <View style={styles.optionPicker}>
            {[
              'Low light',
              'Medium indirect light',
              'Bright indirect light',
              'Full sun'
            ].map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.option,
                  manualPlantData.light === option && styles.optionSelected
                ]}
                onPress={() => handleManualInputChange('light', option)}
              >
                <Text style={[
                  styles.optionText,
                  manualPlantData.light === option && styles.optionTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.manualEntryLabel}>Watering Frequency</Text>
          <View style={styles.optionPicker}>
            {[
              'Daily',
              'Weekly',
              'Every 2-3 weeks',
              'Monthly'
            ].map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.option,
                  manualPlantData.water === option && styles.optionSelected
                ]}
                onPress={() => handleManualInputChange('water', option)}
              >
                <Text style={[
                  styles.optionText,
                  manualPlantData.water === option && styles.optionTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.manualEntryActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setManualEntryVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSubmitManualEntry}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.title}>Add a Plant</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a plant..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
        />
      </View>

      {isSearching && searchQuery.trim() !== '' ? (
        renderSearchContent()
      ) : (
        <ScrollView style={styles.addOptionsContainer}>
          <Text style={styles.sectionTitle}>Add a plant by:</Text>
          
          <TouchableOpacity style={styles.addOption} onPress={handleCameraPress}>
            <View style={styles.addOptionIcon}>
              <MaterialCommunityIcons name="camera" size={24} color="#2E7D32" />
            </View>
            <View style={styles.addOptionInfo}>
              <Text style={styles.addOptionTitle}>Take a Photo</Text>
              <Text style={styles.addOptionDescription}>Use your camera to identify a plant</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.addOption}
            onPress={() => navigation.navigate('PlantList', { category: 'All Plants' })}
          >
            <View style={styles.addOptionIcon}>
              <MaterialCommunityIcons name="magnify" size={24} color="#2E7D32" />
            </View>
            <View style={styles.addOptionInfo}>
              <Text style={styles.addOptionTitle}>Browse Categories</Text>
              <Text style={styles.addOptionDescription}>Find plants by category</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.addOption} onPress={handleBarcodeScannerPress}>
            <View style={styles.addOptionIcon}>
              <MaterialCommunityIcons name="barcode-scan" size={24} color="#2E7D32" />
            </View>
            <View style={styles.addOptionInfo}>
              <Text style={styles.addOptionTitle}>Scan Barcode</Text>
              <Text style={styles.addOptionDescription}>Scan a plant tag or QR code</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.addOption} onPress={handleManualEntry}>
            <View style={styles.addOptionIcon}>
              <MaterialCommunityIcons name="pencil" size={24} color="#2E7D32" />
            </View>
            <View style={styles.addOptionInfo}>
              <Text style={styles.addOptionTitle}>Manual Entry</Text>
              <Text style={styles.addOptionDescription}>Add plant details manually</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.popularSection}>
            <Text style={styles.sectionTitle}>Popular Plants:</Text>
            {renderPopularPlants()}
          </View>
        </ScrollView>
      )}
      
      {/* Render modals */}
      {/* Camera Modal - temporarily disabled */}
      {/* {cameraVisible && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={cameraVisible}
          onRequestClose={() => setCameraVisible(false)}
        >
          <View style={styles.cameraContainer}>
            <Camera
              ref={cameraRef}
              style={styles.camera}
              type={Camera.Constants.Type.back}
              ratio="16:9"
            >
              <View style={styles.cameraControlsContainer}>
                <TouchableOpacity 
                  style={styles.cameraCloseButton}
                  onPress={() => setCameraVisible(false)}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.cameraCaptureButton}
                  onPress={handleCameraCapture}
                >
                  <View style={styles.cameraCaptureCircle} />
                </TouchableOpacity>
              </View>
            </Camera>
          </View>
        </Modal>
      )} */}

      {/* Barcode Scanner Modal - temporarily disabled */}
      {/* {barcodeScannerVisible && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={barcodeScannerVisible}
          onRequestClose={() => setBarcodeScannerVisible(false)}
        >
          <View style={styles.barcodeContainer}>
            <BarCodeScanner
              onBarCodeScanned={handleBarCodeScanned}
              style={styles.barcodeScannerView}
            />
            
            <View style={styles.barcodeOverlay}>
              <View style={styles.barcodeFrame} />
              <Text style={styles.barcodeInstructions}>
                Position the barcode within the frame
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.barcodeCloseButton}
              onPress={() => setBarcodeScannerVisible(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Modal>
      )} */}
      {renderManualEntryView()}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 1.41,
      },
      android: {
        elevation: 2,
      }
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F8E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  searchResults: {
    padding: 16,
  },
  searchResultItem: {
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
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    resizeMode: 'contain',
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultSpecies: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  addOptionsContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
    color: '#333',
  },
  addOption: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  addOptionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addOptionInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  addOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  addOptionDescription: {
    fontSize: 14,
    color: '#666',
  },
  popularPlantsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  popularPlantItem: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
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
  popularPlantImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  popularPlantName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    height: 200,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  popularSection: {
    marginBottom: 30,
  },
  emptyPopularContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginTop: 10,
  },
  emptyPopularText: {
    color: '#666',
    fontSize: 14,
  },
  careLevelTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(46, 125, 50, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  careLevelText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingBottom: 30,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerTargetContainer: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerTarget: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
  },
  scannerText: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 50,
  },
  manualEntryModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualEntryContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  manualEntryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 20,
    textAlign: 'center',
  },
  manualEntryLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  manualEntryInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  careLevelOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  careLevelOption: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  careLevelOptionSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  careLevelOptionText: {
    fontSize: 14,
    color: '#666',
  },
  careLevelOptionTextSelected: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  optionPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  option: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  optionSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextSelected: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  manualEntryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default AddPlantScreen;