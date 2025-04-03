import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, ActivityIndicator, Platform } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


// Import screens
import HomeScreen from '../screens/HomeScreen';
import PlantListScreen from '../screens/PlantListScreen';
import PlantDetailScreen from '../screens/PlantDetailScreen';
import AddPlantScreen from '../screens/AddPlantScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SetReminderScreen from '../screens/SetReminderScreen';
import RemindersScreen from '../screens/RemindersScreen';
import WeatherScreen from '../screens/WeatherScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import SplashScreen from '../screens/SplashScreen';

// Create navigators
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab icon component
const TabIcon = ({ iconName, label, focused }) => {
  return (
    <View style={{ 
      alignItems: 'center', 
      justifyContent: 'center', 
      paddingTop: Platform.OS === 'ios' ? 10 : 8,
      paddingBottom: Platform.OS === 'ios' ? 5 : 2,
      height: Platform.OS === 'ios' ? 60 : 56,
      width: 80 // Fixed width for all tabs
    }}>
      <MaterialCommunityIcons 
        name={iconName} 
        size={24} 
        color={focused ? '#2E7D32' : '#666'} 
      />
      <Text style={{ 
        fontSize: 12,
        color: focused ? '#2E7D32' : '#666',
        marginTop: 4,
        textAlign: 'center'
      }}>
        {label}
      </Text>
    </View>
  );
};

// Home stack navigator
const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="PlantList" component={PlantListScreen} />
      <Stack.Screen name="PlantDetail" component={PlantDetailScreen} />
      <Stack.Screen name="SetReminder" component={SetReminderScreen} />
    </Stack.Navigator>
  );
};

// Discover stack navigator
const DiscoverStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DiscoverHome" component={PlantListScreen} initialParams={{ category: 'All Plants' }} />
      <Stack.Screen name="PlantDetail" component={PlantDetailScreen} />
    </Stack.Navigator>
  );
};

// Add plant stack navigator
const AddPlantStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AddPlant" component={AddPlantScreen} />
      <Stack.Screen name="PlantDetail" component={PlantDetailScreen} />
    </Stack.Navigator>
  );
};

// Reminders stack navigator
const RemindersStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RemindersHome" component={RemindersScreen} />
      <Stack.Screen name="SetReminder" component={SetReminderScreen} />
    </Stack.Navigator>
  );
};

// Profile stack navigator
const ProfileStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
    </Stack.Navigator>
  );
};

// Weather stack navigator
const WeatherStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WeatherHome" component={WeatherScreen} />
    </Stack.Navigator>
  );
};

// Main tab navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let iconName;
          let label;
          
          if (route.name === 'HomeTab') {
            iconName = 'home';
            label = 'Home';
          } else if (route.name === 'DiscoverTab') {
            iconName = 'magnify';
            label = 'Discover';
          } else if (route.name === 'AddPlantTab') {
            iconName = 'plus-circle';
            label = 'Add';
          } else if (route.name === 'RemindersTab') {
            iconName = 'bell';
            label = 'Reminders';
          } else if (route.name === 'WeatherTab') {
            iconName = 'weather-sunny';
            label = 'Weather';
          } else if (route.name === 'ProfileTab') {
            iconName = 'account';
            label = 'Profile';
          }
          
          return <TabIcon iconName={iconName} label={label} focused={focused} />;
        },
        tabBarShowLabel: false,
        headerShown: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 85 : 70,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#EEEEEE',
          paddingHorizontal: 10, // Add horizontal padding
          justifyContent: 'space-between', // Distribute items evenly
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
            },
            android: {
              elevation: 8, // Increase elevation for better shadow on Android
            }
          })
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} />
      <Tab.Screen name="DiscoverTab" component={DiscoverStack} />
      <Tab.Screen name="AddPlantTab" component={AddPlantStack} />
      <Tab.Screen name="RemindersTab" component={RemindersStack} />
      <Tab.Screen name="WeatherTab" component={WeatherStack} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} />
    </Tab.Navigator>
  );
};

// Auth screens are now directly in MainNavigator

// Main app with tab navigator
const MainApp = () => {
  return <TabNavigator />;
};

// Main navigation component that uses the auth context
const MainNavigator = () => {
  const { isAuthenticated, loading } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    // Show splash for minimum 1 second instead of 2 for faster development
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Show splash screen while loading or during the minimum splash time
  if (showSplash || loading) {
    return (
      <SplashScreen 
        onAnimationComplete={() => {
          // We can end the splash show early if user is already authenticated
          if (!loading && isAuthenticated) {
            setShowSplash(false);
          }
        }} 
      />
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // Auth Stack - Login and SignUp screens
        <Stack.Group>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </Stack.Group>
      ) : (
        // Main App Stack - All authenticated screens
        <Stack.Group>
          <Stack.Screen name="MainApp" component={MainApp} />
          <Stack.Screen name="PlantDetail" component={PlantDetailScreen} />
          <Stack.Screen name="SetReminder" component={SetReminderScreen} />
          <Stack.Screen name="PlantList" component={PlantListScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
};

// App navigator with AuthProvider wrapper
const AppNavigator = () => {
  return (
    <AuthProvider>
      <NavigationContainer>
        <MainNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
};

export default AppNavigator;