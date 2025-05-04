import { 
  fetchRemindersFromDB, 
  addReminderToDB, 
  updateReminderInDB, 
  deleteReminderFromDB, 
  getReminderByIdFromDB,
  clearReminderCache
} from './reminderDatabaseService';

/**
 * Reminder Service
 * Handles all reminder-related operations using the database
 */

const reminderService = {
  // Fetch all reminders
  fetchReminders: async () => {
    try {
      const { data, error } = await fetchRemindersFromDB();
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error in fetchReminders:', error);
      return [];
    }
  },

  // Get a single reminder by ID
  getReminderById: async (id) => {
    try {
      const response = await getReminderByIdFromDB(id);
      if (response.error) throw response.error;
      return response.data || null;
    } catch (error) {
      console.error('Error in getReminderById:', error);
      return null;
    }
  },

  // Add a new reminder
  addReminder: async (reminderData) => {
    try {
      const response = await addReminderToDB(reminderData);
      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.error('Error in addReminder:', error);
      throw error;
    }
  },

  // Update an existing reminder
  updateReminder: async (reminderId, updates) => {
    try {
      const response = await updateReminderInDB(reminderId, updates);
      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.error('Error in updateReminder:', error);
      throw error;
    }
  },

  // Delete a reminder
  deleteReminder: async (reminderId) => {
    try {
      const response = await deleteReminderFromDB(reminderId);
      if (response.error) throw response.error;
      return true;
    } catch (error) {
      console.error('Error in deleteReminder:', error);
      throw error;
    }
  },

  // Clear the reminder cache
  clearCache: () => {
    clearReminderCache();
  }
};

export default reminderService; 