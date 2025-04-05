import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Set up notification categories/actions
if (Platform.OS === 'ios') {
  Notifications.setNotificationCategoryAsync('plant-care', [
    {
      identifier: 'mark-done',
      buttonTitle: 'Mark as Done',
      options: {
        isDestructive: false,
        isAuthenticationRequired: false,
      },
    },
    {
      identifier: 'snooze',
      buttonTitle: 'Remind me later',
      options: {
        isDestructive: false,
        isAuthenticationRequired: false,
      },
    },
  ]);
}

// Hook to set up notification listeners
export const useNotificationListeners = (onNotificationReceived, onNotificationResponse) => {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Request permissions
    requestNotificationPermissions();

    // Set up notification received listener
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Set up notification response listener
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      if (onNotificationResponse) {
        onNotificationResponse(response);
      }
    });

    // Clean up listeners on unmount
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [onNotificationReceived, onNotificationResponse]);
};

// Get the expo push token for the device
export const registerForPushNotifications = async () => {
  let token;
  
  if (Constants.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
};

// Request permissions for notifications
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    // Only ask if permissions have not already been determined
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    // Check if we still don't have permission
    if (finalStatus !== 'granted') {
      throw new Error('Permission not granted for notifications');
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

// Schedule a notification
export const scheduleNotification = async ({
  title,
  body,
  data,
  trigger,
}) => {
  try {
    // Ensure we have permission
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      throw new Error('No notification permission');
    }
    
    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
      },
      trigger,
    });
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
};

// Schedule a plant care reminder
export const schedulePlantCareReminder = async (reminder) => {
  try {
    const { plantName, type, time, day, frequency } = reminder;
    
    // Parse time (format: HH:MM)
    const [hours, minutes] = time.split(':').map(Number);
    
    // Create appropriate trigger based on frequency
    let trigger;
    
    if (frequency === 'daily') {
      // Daily at specified time
      trigger = {
        hour: hours,
        minute: minutes,
        repeats: true,
      };
    } else if (frequency === 'weekly' && day) {
      // Weekly on specified day at specified time
      const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const weekday = weekdays.indexOf(day) + 1; // 1-7 where 1 is Monday
      
      trigger = {
        weekday,
        hour: hours,
        minute: minutes,
        repeats: true,
      };
    } else {
      // For other frequencies, we'll use a date trigger and reschedule after completion
      // Parse the nextDue date
      let nextDueDate = new Date(reminder.nextDue);
      nextDueDate.setHours(hours, minutes, 0, 0);
      
      // Ensure the date is in the future
      const now = new Date();
      if (nextDueDate <= now) {
        // If the date is in the past, set it to tomorrow same time
        nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + 1);
        nextDueDate.setHours(hours, minutes, 0, 0);
        console.log(`Adjusted past due date to future: ${nextDueDate}`);
      }
      
      // Ensure there's at least a 60-second interval
      const minTimeIntervalInSeconds = 60;
      const diffInSeconds = Math.floor((nextDueDate - now) / 1000);
      
      if (diffInSeconds < minTimeIntervalInSeconds) {
        nextDueDate = new Date(now.getTime() + minTimeIntervalInSeconds * 1000);
        console.log(`Adjusted time interval to minimum 60 seconds: ${nextDueDate}`);
      }
      
      trigger = nextDueDate;
    }
    
    // Create title and body based on reminder type
    let title, body;
    
    switch (type) {
      case 'watering':
        title = `Time to water your ${plantName}! 💧`;
        body = `Your ${plantName} is thirsty and needs some water.`;
        break;
      case 'fertilizing':
        title = `Time to fertilize your ${plantName}! 🌱`;
        body = `Your ${plantName} needs nutrients to grow healthy.`;
        break;
      case 'rotation':
        title = `Time to rotate your ${plantName}! 🔄`;
        body = `Rotating your ${plantName} helps it grow evenly.`;
        break;
      case 'repotting':
        title = `Time to repot your ${plantName}! 🪴`;
        body = `Your ${plantName} might need a bigger home.`;
        break;
      default:
        title = `Plant care reminder for ${plantName}`;
        body = `It's time for some plant care!`;
    }
    
    // Schedule the notification
    const notificationId = await scheduleNotification({
      title,
      body,
      data: { reminderId: reminder.id, plantId: reminder.plantId, type },
      trigger,
    });
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling plant care reminder:', error);
    throw error;
  }
};

// Cancel a scheduled notification
export const cancelNotification = async (notificationId) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    return true;
  } catch (error) {
    console.error('Error canceling notification:', error);
    return false;
  }
};

// Cancel all scheduled notifications
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return true;
  } catch (error) {
    console.error('Error canceling all notifications:', error);
    return false;
  }
};

// Get all scheduled notifications
export const getAllScheduledNotifications = async () => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    throw error;
  }
};

export default {
  requestNotificationPermissions,
  scheduleNotification,
  schedulePlantCareReminder,
  cancelNotification,
  cancelAllNotifications,
  getAllScheduledNotifications,
};