import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Switch, 
  ScrollView, 
  Image, 
  Alert, 
  ActivityIndicator, 
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../context/AuthContext';
import { 
  signOut, 
  updateUserProfileInfo, 
  getUserProfileInfo,
  uploadProfileImage
} from '../services/supabaseService';

// Add EditProfileModal component
const EditProfileModal = ({ visible, onClose, onSave, userData }) => {
  const [editedName, setEditedName] = useState(userData.name);
  const [editedEmail, setEditedEmail] = useState(userData.email);

  const handleSave = () => {
    onSave({
      name: editedName,
      email: editedEmail,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Enter your name"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={editedEmail}
                    onChangeText={setEditedEmail}
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSave}
                >
                  <Text style={[styles.modalButtonText, styles.saveButtonText]}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, loading } = useAuth();
  
  // Get plants data from Redux store
  const userPlants = useSelector(state => state.plants.userPlants);
  const favoritesCount = userPlants.filter(plant => plant.isFavorite).length;
  const collectionCount = userPlants.length;
  
  // User settings states with appropriate default values
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [wateringReminders, setWateringReminders] = useState(false);
  const [fertilizingReminders, setFertilizingReminders] = useState(false);
  const [weatherAlerts, setWeatherAlerts] = useState(false);
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  // Edit profile states
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  
  // Format user data from auth context
  const [userData, setUserData] = useState({
    name: user?.user_metadata?.full_name || 'Plant Lover',
    email: user?.email || 'user@example.com',
    joinDate: user ? formatJoinDate(user.created_at) : 'New User',
    plantsCount: collectionCount,
    favoritesCount: favoritesCount,
    avatar: require('../../assets/profile.png'),
  });
  
  // State for image upload loading
  const [isUploading, setIsUploading] = useState(false);
  
  // Load profile data on component mount
  useEffect(() => {
    loadProfileData();
  }, []);

  // Load profile data from Supabase
  const loadProfileData = async () => {
    try {
      setIsLoadingProfile(true);
      const { data, error } = await getUserProfileInfo();
      if (error) throw error;
      
      console.log('Profile data from Supabase:', data);
      
      if (data) {
        // Validate the avatar URL
        let avatarUrl = null;
        if (data.avatar_url) {
          try {
            // Add a timestamp to prevent caching
            avatarUrl = `${data.avatar_url}?t=${Date.now()}`;
            console.log('Setting avatar URL with cache buster:', avatarUrl);
            
            // Test if the URL is valid and accessible
            const response = await fetch(avatarUrl);
            if (!response.ok) {
              throw new Error(`Failed to load avatar: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.startsWith('image/')) {
              throw new Error('Invalid content type for avatar');
            }
            
            console.log('Avatar URL is valid and accessible:', avatarUrl);
          } catch (urlError) {
            console.error('Error validating avatar URL:', urlError);
            // Don't set avatarUrl if validation fails
          }
        }
        
        setUserData(prev => ({
          ...prev,
          name: data.full_name || prev.name,
          email: data.email || prev.email,
          avatar: avatarUrl ? { uri: avatarUrl } : require('../../assets/profile.png'),
        }));
        
        console.log('Updated userData with avatar:', avatarUrl ? 'URL set' : 'Using default image');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data. Please try again.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Load saved settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Load settings from storage
  const loadSettings = async () => {
    try {
      // Load settings from AsyncStorage or your preferred storage
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setNotificationsEnabled(settings.notificationsEnabled || false);
        setLocationEnabled(settings.locationEnabled || false);
        setWateringReminders(settings.wateringReminders || false);
        setFertilizingReminders(settings.fertilizingReminders || false);
        setWeatherAlerts(settings.weatherAlerts || false);
        setWeatherEnabled(settings.weatherEnabled || false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Save settings to storage
  const saveSettings = async (settings) => {
    try {
      await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Handle settings changes
  const handleSettingChange = async (setting, value) => {
    switch (setting) {
      case 'notifications':
        setNotificationsEnabled(value);
        await saveSettings({ ...await AsyncStorage.getItem('userSettings').then(JSON.parse), notificationsEnabled: value });
        if (value) {
          // Request notification permissions
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(
              'Permission Required',
              'Please enable notifications in your device settings to receive alerts.'
            );
            setNotificationsEnabled(false);
          }
        }
        break;
      case 'location':
        setLocationEnabled(value);
        const settings = await AsyncStorage.getItem('userSettings').then(JSON.parse) || {};
        await saveSettings({ ...settings, locationEnabled: value });
        if (value) {
          // Request location permissions
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(
              'Permission Required',
              'Please enable location services in your device settings to use weather features.'
            );
            setLocationEnabled(false);
          }
        } else {
          // If location is being disabled, also disable weather display
          setWeatherEnabled(false);
          await saveSettings({ ...settings, locationEnabled: value, weatherEnabled: false });
        }
        break;
      case 'watering':
        setWateringReminders(value);
        await saveSettings({ ...await AsyncStorage.getItem('userSettings').then(JSON.parse), wateringReminders: value });
        if (value && !notificationsEnabled) {
          Alert.alert(
            'Notifications Required',
            'Please enable notifications to receive watering reminders.'
          );
          setWateringReminders(false);
        }
        break;
      case 'fertilizing':
        setFertilizingReminders(value);
        await saveSettings({ ...await AsyncStorage.getItem('userSettings').then(JSON.parse), fertilizingReminders: value });
        if (value && !notificationsEnabled) {
          Alert.alert(
            'Notifications Required',
            'Please enable notifications to receive fertilizing reminders.'
          );
          setFertilizingReminders(false);
        }
        break;
      case 'weather':
        setWeatherAlerts(value);
        await saveSettings({ ...await AsyncStorage.getItem('userSettings').then(JSON.parse), weatherAlerts: value });
        if (value && !locationEnabled) {
          Alert.alert(
            'Location Required',
            'Please enable location services to receive weather alerts.'
          );
          setWeatherAlerts(false);
        }
        break;
      case 'weather_display':
        const currentSettings = await AsyncStorage.getItem('userSettings').then(JSON.parse) || {};
        if (value && !currentSettings.locationEnabled) {
          Alert.alert(
            'Location Required',
            'Please enable location services first to display weather information.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Enable Location', 
                onPress: async () => {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status === 'granted') {
                    setLocationEnabled(true);
                    setWeatherEnabled(true);
                    await saveSettings({ 
                      ...currentSettings, 
                      locationEnabled: true, 
                      weatherEnabled: true 
                    });
                  } else {
                    Alert.alert(
                      'Permission Denied',
                      'Weather display requires location permission to function.'
                    );
                  }
                }
              }
            ]
          );
          return;
        }
        setWeatherEnabled(value);
        await saveSettings({ ...currentSettings, weatherEnabled: value });
        break;
    }
  };

  // Format join date from ISO string to readable format
  function formatJoinDate(dateString) {
    if (!dateString) return 'New User';
    
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    
    return `${month} ${year}`;
  }

  // Handle profile photo selection
  const handleSelectProfileImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to update your profile picture.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        allowsMultipleSelection: false,
      });
      
      if (result.canceled) {
        console.log('User cancelled image picker');
        return;
      }
      
      if (!result.assets || result.assets.length === 0) {
        throw new Error('No image selected');
      }
      
      const selectedImage = result.assets[0];
      console.log('Selected image:', selectedImage);
      
      await uploadProfilePhoto(selectedImage.uri);
    } catch (error) {
      console.error('Error in handleSelectProfileImage:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to select image. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };
  
  // Handle taking a photo with the camera
  const handleTakePhoto = async () => {
    try {
      Alert.alert(
        'Camera Feature Unavailable',
        'The camera feature is currently unavailable. Would you like to select an image from your gallery instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Gallery', onPress: handleSelectProfileImage }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };
  
  // Upload profile photo to Supabase storage
  const uploadProfilePhoto = async (uri) => {
    try {
      setIsUploading(true);
      console.log('Starting profile photo upload with URI:', uri);
      
      // Upload the image to Supabase
      const { data, error } = await uploadProfileImage(uri);
      if (error) throw error;
      
      console.log('Upload response:', data);
      
      if (data?.publicUrl) {
        // Add cache buster to the URL
        const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
        console.log('Setting new avatar URL:', avatarUrl);
        
        // Update the user's profile with the new avatar URL
        const { error: updateError } = await updateUserProfileInfo({
          avatar_url: data.publicUrl,
        });
          
        if (updateError) throw updateError;
        
        // Update local state with the new avatar URL
        setUserData(prev => ({
          ...prev,
          avatar: { uri: avatarUrl }
        }));
        
        console.log('Profile photo updated successfully');
      } else {
        throw new Error('No public URL returned from upload');
      }
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      Alert.alert('Error', 'Failed to upload profile photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Show profile photo options
  const showProfilePhotoOptions = () => {
    Alert.alert(
      'Update Profile Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handleSelectProfileImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Handle edit profile
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const handleEditProfile = () => {
    setEditedName(userData.name);
    setEditedEmail(userData.email);
    setIsEditModalVisible(true);
  };

  // Handle save profile
  const handleSaveProfile = async (updatedData) => {
    try {
      const { error } = await updateUserProfileInfo({
        full_name: updatedData.name,
        email: updatedData.email,
      });

      if (error) throw error;

      // Update the user data immediately
      setUserData(prev => ({
        ...prev,
        name: updatedData.name,
        email: updatedData.email,
      }));

      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              const { error } = await signOut();
              if (error) throw error;
            } catch (error) {
              Alert.alert('Error', 'Failed to log out. Please try again.');
              setIsLoggingOut(false);
            }
          } 
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.backgroundGradient, { backgroundColor: '#1A1A1A' }]}> 
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {typeof userData.avatar === 'string' ? (
                <Image 
                  source={{ 
                    uri: userData.avatar,
                    cache: 'reload',
                    headers: {
                      'Cache-Control': 'no-cache',
                      'Pragma': 'no-cache'
                    }
                  }}
                  style={styles.avatar}
                  defaultSource={require('../../assets/profile.png')}
                  onError={(error) => {
                    console.error('Image loading error:', error.nativeEvent);
                    // Fallback to default image on error
                    setUserData(prev => ({
                      ...prev,
                      avatar: require('../../assets/profile.png')
                    }));
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', userData.avatar);
                  }}
                />
              ) : (
                <Image 
                  source={userData.avatar}
                  style={styles.avatar}
                />
              )}
              <View style={[styles.avatarGradient, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
              <TouchableOpacity 
                style={styles.editAvatarButton}
                onPress={showProfilePhotoOptions}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.userInfo}>
              {isEditing ? (
                <>
                  <TextInput
                    style={styles.editInput}
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Enter your name"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  />
                  <TextInput
                    style={styles.editInput}
                    value={editedEmail}
                    onChangeText={setEditedEmail}
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.userName}>{userData.name}</Text>
                  <Text style={styles.userEmail}>{userData.email}</Text>
                </>
              )}
              <Text style={styles.joinDate}>Member since {userData.joinDate}</Text>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name="leaf" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.statValue}>{userData.plantsCount}</Text>
              <Text style={styles.statLabel}>Plants</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name="heart" size={24} color="#FF4081" />
              </View>
              <Text style={styles.statValue}>{userData.favoritesCount}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name="star" size={24} color="#FFC107" />
              </View>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Achievements</Text>
            </View>
          </View>

          {/* Settings Sections */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingIconContainer}>
                <MaterialCommunityIcons name="bell" size={24} color="#4CAF50" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingDescription}>Get updates about your plants</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={(value) => handleSettingChange('notifications', value)}
                trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                thumbColor={notificationsEnabled ? '#FFFFFF' : '#BDBDBD'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingIconContainer}>
                <MaterialCommunityIcons name="map-marker" size={24} color="#2196F3" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Location</Text>
                <Text style={styles.settingDescription}>Enable for weather updates</Text>
              </View>
              <Switch
                value={locationEnabled}
                onValueChange={(value) => handleSettingChange('location', value)}
                trackColor={{ false: '#E0E0E0', true: '#2196F3' }}
                thumbColor={locationEnabled ? '#FFFFFF' : '#BDBDBD'}
              />
            </View>
          </View>

          {/* Reminders Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Reminders</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingIconContainer}>
                <MaterialCommunityIcons name="water" size={24} color="#00BCD4" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Watering</Text>
                <Text style={styles.settingDescription}>Get watering reminders</Text>
              </View>
              <Switch
                value={wateringReminders}
                onValueChange={(value) => handleSettingChange('watering', value)}
                trackColor={{ false: '#E0E0E0', true: '#00BCD4' }}
                thumbColor={wateringReminders ? '#FFFFFF' : '#BDBDBD'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingIconContainer}>
                <MaterialCommunityIcons name="leaf" size={24} color="#8BC34A" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Fertilizing</Text>
                <Text style={styles.settingDescription}>Get fertilizing reminders</Text>
              </View>
              <Switch
                value={fertilizingReminders}
                onValueChange={(value) => handleSettingChange('fertilizing', value)}
                trackColor={{ false: '#E0E0E0', true: '#8BC34A' }}
                thumbColor={fertilizingReminders ? '#FFFFFF' : '#BDBDBD'}
              />
            </View>
          </View>

          {/* Weather Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Weather</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingIconContainer}>
                <MaterialCommunityIcons name="weather-partly-cloudy" size={24} color="#FF9500" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Weather Display</Text>
                <Text style={styles.settingDescription}>Show weather information on home screen</Text>
              </View>
              <Switch
                value={weatherEnabled}
                onValueChange={(value) => handleSettingChange('weather_display', value)}
                trackColor={{ false: '#E0E0E0', true: '#FF9500' }}
                thumbColor={weatherEnabled ? '#FFFFFF' : '#BDBDBD'}
              />
            </View>
          </View>

          {/* Account Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleEditProfile}
            >
              <MaterialCommunityIcons name="account-edit" size={24} color="#00FF7F" />
              <Text style={styles.actionButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.logoutButton]}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="logout" size={24} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Logout</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appVersion}>PlantPal v1.0.0</Text>
            <View style={styles.appLinks}>
              <TouchableOpacity>
                <Text style={styles.appLink}>Terms of Service</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.appLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Add EditProfileModal */}
      <EditProfileModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        onSave={handleSaveProfile}
        userData={userData}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundGradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#00FF7F',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#00FF7F',
  },
  avatarGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
    borderRadius: 60,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00FF7F',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000000',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  joinDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  settingsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  settingDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  actionsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 255, 127, 0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00FF7F',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  appInfo: {
    alignItems: 'center',
    padding: 24,
  },
  appVersion: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  appLinks: {
    flexDirection: 'row',
  },
  appLink: {
    fontSize: 14,
    color: '#00FF7F',
    marginHorizontal: 12,
    textDecorationLine: 'underline',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  editInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#00FF7F',
    paddingVertical: 4,
    width: '100%',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  saveButton: {
    backgroundColor: 'rgba(0, 255, 127, 0.2)',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00FF7F',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  saveButtonText: {
    color: '#00FF7F',
  },
});

export default ProfileScreen;