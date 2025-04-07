import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, ActivityIndicator, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import PlantListScreen from '../screens/PlantListScreen';
import PlantDetailScreen from '../screens/PlantDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SetReminderScreen from '../screens/SetReminderScreen';
import SavedScreen from '../screens/SavedScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import SplashScreen from '../screens/SplashScreen';
import CollectionView from '../screens/CollectionView';

// Import new screens
import AllPopularPlantsScreen from '../screens/AllPopularPlantsScreen';
import ScanPlantScreen from '../screens/ScanPlantScreen';
import SearchScreen from '../screens/SearchScreen';
import AllAlertsScreen from '../screens/AllAlertsScreen';
import ReminderDetailScreen from '../screens/ReminderDetailScreen';

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
      <Stack.Screen name="CollectionView" component={CollectionView} />
      <Stack.Screen name="PlantDetail" component={PlantDetailScreen} />
      <Stack.Screen name="SetReminder" component={SetReminderScreen} />
      <Stack.Screen name="AllPopularPlants" component={AllPopularPlantsScreen} />
      <Stack.Screen name="ScanPlant" component={ScanPlantScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="AllAlerts" component={AllAlertsScreen} />
      <Stack.Screen name="ReminderDetail" component={ReminderDetailScreen} />
    </Stack.Navigator>
  );
};

// Discover stack navigator
const DiscoverStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="DiscoverHome" 
        component={PlantListScreen} 
        initialParams={{ 
          category: 'All Plants',
          usePopularPlants: true // This flag will tell the screen to use the popular plants API
        }} 
      />
      <Stack.Screen name="PlantDetail" component={PlantDetailScreen} />
      <Stack.Screen name="AllPopularPlants" component={AllPopularPlantsScreen} />
      <Stack.Screen name="ScanPlant" component={ScanPlantScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
    </Stack.Navigator>
  );
};

// Reminders stack navigator renamed to Saved Plants stack
const SavedStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SavedHome" component={SavedScreen} />
      <Stack.Screen name="SetReminder" component={SetReminderScreen} />
      <Stack.Screen name="AllAlerts" component={AllAlertsScreen} />
      <Stack.Screen name="ReminderDetail" component={ReminderDetailScreen} />
      <Stack.Screen name="PlantDetail" component={PlantDetailScreen} />
    </Stack.Navigator>
  );
};

// Profile stack navigator
const ProfileStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="PlantDetail" component={PlantDetailScreen} />
    </Stack.Navigator>
  );
};

// Bottom tab bar icon component
const TabBarIcon = ({ route, focused }) => {
  let iconName;
  let label;
  
  if (route.name === 'HomeTab') {
    iconName = focused ? 'home' : 'home-outline';
    label = 'Home';
  } else if (route.name === 'ExploreTab') {
    iconName = focused ? 'leaf' : 'leaf-outline';
    label = 'Explore';
  } else if (route.name === 'SavedTab') {
    iconName = focused ? 'heart' : 'heart-outline';
    label = 'Saved';
  } else if (route.name === 'ProfileTab') {
    iconName = focused ? 'person' : 'person-outline';
    label = 'Profile';
  }
  
  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      paddingTop: 8,
      paddingBottom: 4
    }}>
      <Ionicons name={iconName} size={24} color={focused ? '#4CAF50' : '#757575'} />
      <Text style={{ 
        fontSize: 12, 
        color: focused ? '#4CAF50' : '#757575',
        marginTop: 4,
        fontWeight: focused ? '500' : 'normal'
      }}>
        {label}
      </Text>
    </View>
  );
};

// Main tab navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabBarIcon route={route} focused={focused} />,
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#757575',
        tabBarShowLabel: false,
        headerShown: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 70,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#EEEEEE',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            android: {
              elevation: 8,
            }
          })
        },
        tabBarItemStyle: {
          height: '100%',
        }
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} />
      <Tab.Screen name="ExploreTab" component={DiscoverStack} />
      <Tab.Screen name="SavedTab" component={SavedStack} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} />
    </Tab.Navigator>
  );
};

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
          <Stack.Screen name="AllPopularPlants" component={AllPopularPlantsScreen} />
          <Stack.Screen name="ScanPlant" component={ScanPlantScreen} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="AllAlerts" component={AllAlertsScreen} />
          <Stack.Screen name="ReminderDetail" component={ReminderDetailScreen} />
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

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  tabBarLabel: {
    fontSize: 12,
    marginBottom: 5,
  },
  addButton: {
    backgroundColor: '#F1F8E9',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
});