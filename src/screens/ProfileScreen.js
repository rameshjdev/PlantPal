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
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { signOut, uploadProfileImage, updateUserProfile } from '../services/supabaseService';
import * as ImagePicker from 'expo-image-picker';
import { useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Edit profile states
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  
  // Format user data from auth context
  const userData = {
    name: user?.user_metadata?.full_name || 'Plant Lover',
    email: user?.email || 'user@example.com',
    joinDate: user ? formatJoinDate(user.created_at) : 'New User',
    plantsCount: collectionCount,
    favoritesCount: favoritesCount,
    avatar: user?.user_metadata?.avatar_url ? { uri: user.user_metadata.avatar_url } : require('../../assets/profile.png'),
  };
  
  // State for image upload loading
  const [isUploading, setIsUploading] = useState(false);
  
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
        await saveSettings({ notificationsEnabled: value });
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
        await saveSettings({ locationEnabled: value });
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
        }
        break;
      case 'watering':
        setWateringReminders(value);
        await saveSettings({ wateringReminders: value });
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
        await saveSettings({ fertilizingReminders: value });
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
        await saveSettings({ weatherAlerts: value });
        if (value && !locationEnabled) {
          Alert.alert(
            'Location Required',
            'Please enable location services to receive weather alerts.'
          );
          setWeatherAlerts(false);
        }
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

  // Handle profile image selection
  const handleSelectProfileImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to update your profile picture.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image. Please try again.');
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
    setIsUploading(true);
    try {
      const { publicUrl, error } = await uploadProfileImage(uri);
      
      if (error) {
        if (publicUrl) {
          Alert.alert('Partial Success', 'The profile photo has been saved locally but not uploaded to the server. It may not appear on other devices.');
        } else {
          throw error;
        }
      } else {
        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
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
  const handleEditProfile = async () => {
    if (!isEditing) {
      setEditedName(userData.name);
      setEditedEmail(userData.email);
      setIsEditing(true);
      return;
    }

    try {
      const { error } = await updateUserProfile({
        full_name: editedName,
        email: editedEmail,
      });

      if (error) throw error;

      // Update the user data immediately
      userData.name = editedName;
      userData.email = editedEmail;

      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
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
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image source={userData.avatar} style={styles.avatar} />
            <View style={styles.avatarOverlay}>
              <Text style={styles.avatarInitial}>{userData.name.charAt(0)}</Text>
            </View>
            {isUploading ? (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : (
              <TouchableOpacity style={styles.editAvatarButton} onPress={showProfilePhotoOptions}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          
          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={editedEmail}
                  onChangeText={setEditedEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={[styles.editButton, styles.cancelButton]} 
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editButton, styles.saveButton]} 
                  onPress={handleEditProfile}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.userName}>{userData.name}</Text>
              <Text style={styles.userEmail}>{userData.email}</Text>
            </>
          )}
          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="leaf-outline" size={24} color="#4CAF50" />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statValue}>{userData.plantsCount}</Text>
                <Text style={styles.statLabel}>Collection</Text>
              </View>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="heart-outline" size={24} color="#4CAF50" />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statValue}>{userData.favoritesCount}</Text>
                <Text style={styles.statLabel}>Favorites</Text>
              </View>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="calendar-outline" size={24} color="#4CAF50" />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statValue}>{userData.joinDate}</Text>
                <Text style={styles.statLabel}>Joined</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Notifications</Text>
              <Text style={styles.settingDescription}>Enable push notifications for all alerts</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(value) => handleSettingChange('notifications', value)}
              trackColor={{ false: '#E0E0E0', true: '#AED581' }}
              thumbColor={notificationsEnabled ? '#4CAF50' : '#BDBDBD'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Location Services</Text>
              <Text style={styles.settingDescription}>Enable for weather and plant care recommendations</Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={(value) => handleSettingChange('location', value)}
              trackColor={{ false: '#E0E0E0', true: '#AED581' }}
              thumbColor={locationEnabled ? '#4CAF50' : '#BDBDBD'}
            />
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Reminder Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Watering Reminders</Text>
              <Text style={styles.settingDescription}>Get notified when your plants need water</Text>
            </View>
            <Switch
              value={wateringReminders}
              onValueChange={(value) => handleSettingChange('watering', value)}
              trackColor={{ false: '#E0E0E0', true: '#AED581' }}
              thumbColor={wateringReminders ? '#4CAF50' : '#BDBDBD'}
              disabled={!notificationsEnabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Fertilizing Reminders</Text>
              <Text style={styles.settingDescription}>Get notified when your plants need fertilizer</Text>
            </View>
            <Switch
              value={fertilizingReminders}
              onValueChange={(value) => handleSettingChange('fertilizing', value)}
              trackColor={{ false: '#E0E0E0', true: '#AED581' }}
              thumbColor={fertilizingReminders ? '#4CAF50' : '#BDBDBD'}
              disabled={!notificationsEnabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Weather Alerts</Text>
              <Text style={styles.settingDescription}>Get notified about weather affecting your plants</Text>
            </View>
            <Switch
              value={weatherAlerts}
              onValueChange={(value) => handleSettingChange('weather', value)}
              trackColor={{ false: '#E0E0E0', true: '#AED581' }}
              thumbColor={weatherAlerts ? '#4CAF50' : '#BDBDBD'}
              disabled={!locationEnabled}
            />
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.accountOption} onPress={handleEditProfile}>
            <Text style={styles.accountOptionText}>
              {isEditing ? 'Save Profile' : 'Edit Profile'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.accountOption} onPress={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? (
              <View style={styles.logoutButtonContent}>
                <ActivityIndicator size="small" color="#E53935" />
                <Text style={[styles.accountOptionText, styles.logoutText, styles.logoutLoading]}>Logging out...</Text>
              </View>
            ) : (
              <Text style={[styles.accountOptionText, styles.logoutText]}>Logout</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>PlantPal v1.0.0</Text>
          <TouchableOpacity>
            <Text style={styles.appLink}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.appLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4CAF50',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
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
    fontWeight: '600',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 40,
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    marginBottom: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1A1A1A',
  },
  userEmail: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTextContainer: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  settingsSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    color: '#1A1A1A',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  accountOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  accountOptionText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  logoutText: {
    color: '#E53935',
    fontWeight: '500',
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutLoading: {
    marginLeft: 8,
    opacity: 0.7,
  },
  appInfo: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 20,
  },
  appVersion: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 12,
  },
  appLink: {
    fontSize: 14,
    color: '#4CAF50',
    marginVertical: 6,
    textDecorationLine: 'underline',
  },
  editForm: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    color: '#1A1A1A',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ProfileScreen;