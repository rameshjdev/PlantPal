import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDERS_STORAGE_KEY = '@plantpal_reminders';

export const loadReminders = async () => {
  try {
    const savedReminders = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
    return savedReminders ? JSON.parse(savedReminders) : [];
  } catch (error) {
    console.error('Error loading reminders:', error);
    return [];
  }
};

export const saveReminders = async (reminders) => {
  try {
    await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
  } catch (error) {
    console.error('Error saving reminders:', error);
  }
}; 