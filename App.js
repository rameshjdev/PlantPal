import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import store from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { useNotificationListeners, registerForPushNotifications } from './src/services/notificationService';
import { markReminderCompleted } from './src/store/remindersSlice';
import SplashScreen from './src/screens/SplashScreen';
import * as SplashScreenExpo from 'expo-splash-screen';

import 'react-native-url-polyfill/auto';

// Prevent the splash screen from auto hiding
SplashScreenExpo.preventAutoHideAsync().catch(console.warn);

// Wrap the app with notification listeners and theme
function AppWithNotifications() {
  const [isAppReady, setIsAppReady] = useState(false);
  
  // Initialize notification permissions on app load
  useEffect(() => {
    async function prepare() {
      try {
        // Prepare your app - load necessary data, etc.
        await registerForPushNotifications().catch(error => {
          console.log('Failed to register for push notifications:', error);
        });
        
        // Artificially delay for a smooth startup experience
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn('Error during app initialization:', e);
      } finally {
        // Tell the application to render
        setIsAppReady(true);
        // Hide the native splash screen
        await SplashScreenExpo.hideAsync().catch(console.warn);
      }
    }

    prepare();
  }, []);
  
  // Handle received notifications when app is in foreground
  const handleNotificationReceived = useCallback((notification) => {
    console.log('Notification received in foreground:', notification);
    // You can show a custom alert or UI element here if desired
  }, []);

  // Handle notification responses (when user taps on notification)
  const handleNotificationResponse = useCallback((response) => {
    const { notification } = response;
    const data = notification.request.content.data;
    console.log('Notification response:', data);
    
    // Handle different notification actions
    if (response.actionIdentifier === 'mark-done') {
      // Mark the reminder as done
      if (data.reminderId) {
        store.dispatch(markReminderCompleted({
          reminderId: data.reminderId,
          completionDate: new Date().toISOString().split('T')[0]
        }));
        Alert.alert('Success', 'Reminder marked as completed!');
      }
    } else if (response.actionIdentifier === 'snooze') {
      // Snooze the reminder (reschedule for later)
      // This would be implemented in a real app
      Alert.alert('Reminder snoozed', 'We\'ll remind you again in 1 hour');
    } else {
      // Default action when tapping the notification
      // Navigate to the appropriate screen based on notification data
      // This would be handled by the navigation ref in a real app
    }
  }, []);

  // Set up notification listeners
  useNotificationListeners(handleNotificationReceived, handleNotificationResponse);

  const handleSplashScreenAnimationComplete = () => {
    // No need to do anything here since our custom splash screen animation is already done
  };

  if (!isAppReady) {
    return <SplashScreen onAnimationComplete={handleSplashScreenAnimationComplete} />;
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppWithNotifications />
    </Provider>
  );
}
