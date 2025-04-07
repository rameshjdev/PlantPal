import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { signOut, uploadProfileImage } from '../services/supabaseService';
import * as ImagePicker from 'expo-image-picker';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, loading } = useAuth();
  
  // User settings states
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [wateringReminders, setWateringReminders] = useState(true);
  const [fertilizingReminders, setFertilizingReminders] = useState(true);
  const [weatherAlerts, setWeatherAlerts] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Format user data from auth context
  const userData = {
    name: user?.user_metadata?.full_name || 'Plant Lover',
    email: user?.email || 'user@example.com',
    joinDate: user ? formatJoinDate(user.created_at) : 'New User',
    plantsCount: 12, // This would ideally come from a plants database
    avatar: user?.user_metadata?.avatar_url ? { uri: user.user_metadata.avatar_url } : require('../../assets/profile.png'),
  };
  
  // State for image upload loading
  const [isUploading, setIsUploading] = useState(false);
  
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
      // Request permission to access the photo library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to update your profile picture.');
        return;
      }
      
      // Launch the image picker
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
      // Instead of using camera directly which causes errors, we'll use the gallery
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
        // If there's an error but we have a publicUrl, it means we're using the local fallback
        if (publicUrl) {
          Alert.alert('Partial Success', 'The profile photo has been saved locally but not uploaded to the server. It may not appear on other devices.');
        } else {
          throw error;
        }
      } else {
        // Only show success message if there was no error
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
              // The AuthContext will handle the navigation after signOut
              // No need to manually navigate
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

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
              <Text style={styles.editAvatarButtonText}>📷</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.userName}>{userData.name}</Text>
        <Text style={styles.userEmail}>{userData.email}</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData.plantsCount}</Text>
            <Text style={styles.statLabel}>Plants</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData.joinDate}</Text>
            <Text style={styles.statLabel}>Joined</Text>
          </View>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Notifications</Text>
            <Text style={styles.settingDescription}>Enable push notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#E0E0E0', true: '#AED581' }}
            thumbColor={notificationsEnabled ? '#2E7D32' : '#BDBDBD'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Location Services</Text>
            <Text style={styles.settingDescription}>Enable for weather integration</Text>
          </View>
          <Switch
            value={locationEnabled}
            onValueChange={setLocationEnabled}
            trackColor={{ false: '#E0E0E0', true: '#AED581' }}
            thumbColor={locationEnabled ? '#2E7D32' : '#BDBDBD'}
          />
        </View>


      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Reminder Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Watering Reminders</Text>
            <Text style={styles.settingDescription}>Get notified when plants need water</Text>
          </View>
          <Switch
            value={wateringReminders}
            onValueChange={setWateringReminders}
            trackColor={{ false: '#E0E0E0', true: '#AED581' }}
            thumbColor={wateringReminders ? '#2E7D32' : '#BDBDBD'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Fertilizing Reminders</Text>
            <Text style={styles.settingDescription}>Get notified when plants need fertilizer</Text>
          </View>
          <Switch
            value={fertilizingReminders}
            onValueChange={setFertilizingReminders}
            trackColor={{ false: '#E0E0E0', true: '#AED581' }}
            thumbColor={fertilizingReminders ? '#2E7D32' : '#BDBDBD'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Weather Alerts</Text>
            <Text style={styles.settingDescription}>Get notified about weather affecting plants</Text>
          </View>
          <Switch
            value={weatherAlerts}
            onValueChange={setWeatherAlerts}
            trackColor={{ false: '#E0E0E0', true: '#AED581' }}
            thumbColor={weatherAlerts ? '#2E7D32' : '#BDBDBD'}
          />
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity style={styles.accountOption}>
          <Text style={styles.accountOptionText}>Edit Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.accountOption}>
          <Text style={styles.accountOptionText}>Change Password</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.accountOption}>
          <Text style={styles.accountOptionText}>Privacy Settings</Text>
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
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#2E7D32',
  },
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F8E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  placeholder: {
    width: 40,
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 55,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2E7D32',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2E7D32',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  editAvatarButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '80%',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  settingsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
  },
  accountOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  accountOptionText: {
    fontSize: 16,
    color: '#333',
  },
  logoutText: {
    color: '#E53935',
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
    padding: 20,
    marginBottom: 20,
  },
  appVersion: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  appLink: {
    fontSize: 14,
    color: '#2E7D32',
    marginVertical: 4,
    textDecorationLine: 'underline',
  },
});

export default ProfileScreen;