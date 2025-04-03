import React, { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import store from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { useNotificationListeners, registerForPushNotifications } from './src/services/notificationService';
import { markReminderCompleted } from './src/store/remindersSlice';

import 'react-native-url-polyfill/auto';

// Wrap the app with notification listeners and theme
function AppWithNotifications() {
  
  // Initialize notification permissions on app load
  useEffect(() => {
    registerForPushNotifications().catch(error => {
      console.log('Failed to register for push notifications:', error);
    });
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

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
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
