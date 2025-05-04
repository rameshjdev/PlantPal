import { supabase } from './supabaseService';

/**
 * Reminder Database Service
 * Handles all reminder-related database operations with Supabase
 */

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const cache = {
  reminders: {
    data: null,
    timestamp: null,
  },
  reminderById: new Map(),
};

// Helper function to check if cache is valid
const isCacheValid = (timestamp) => {
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_TTL;
};

// Fetch all reminders for the current user
export const fetchRemindersFromDB = async () => {
  try {
    // Check cache first
    if (cache.reminders.data && isCacheValid(cache.reminders.timestamp)) {
      return { data: cache.reminders.data, error: null };
    }

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .order('next_due', { ascending: true });

    if (error) throw error;

    // Update cache
    cache.reminders = {
      data,
      timestamp: Date.now()
    };

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return { data: null, error };
  }
};

// Add a new reminder to the database
export const addReminderToDB = async (reminderData) => {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .insert([reminderData])
      .select();

    if (error) throw error;

    // Update cache
    if (cache.reminders.data) {
      cache.reminders.data = [...cache.reminders.data, data[0]];
    }

    return { data: data[0], error: null };
  } catch (error) {
    console.error('Error adding reminder:', error);
    return { data: null, error };
  }
};

// Update an existing reminder
export const updateReminderInDB = async (reminderId, updates) => {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', reminderId)
      .select();

    if (error) throw error;

    // Update cache
    if (cache.reminders.data) {
      cache.reminders.data = cache.reminders.data.map(reminder => 
        reminder.id === reminderId ? data[0] : reminder
      );
    }

    return { data: data[0], error: null };
  } catch (error) {
    console.error('Error updating reminder:', error);
    return { data: null, error };
  }
};

// Delete a reminder from the database
export const deleteReminderFromDB = async (reminderId) => {
  try {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', reminderId);

    if (error) throw error;

    // Update cache
    if (cache.reminders.data) {
      cache.reminders.data = cache.reminders.data.filter(
        reminder => reminder.id !== reminderId
      );
    }

    return { error: null };
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return { error };
  }
};

// Get a single reminder by ID
export const getReminderByIdFromDB = async (reminderId) => {
  try {
    // Check cache first
    const cachedReminder = cache.reminderById.get(reminderId);
    if (cachedReminder && isCacheValid(cachedReminder.timestamp)) {
      return { data: cachedReminder.data, error: null };
    }

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', reminderId)
      .single();

    if (error) throw error;

    // Update cache
    cache.reminderById.set(reminderId, {
      data,
      timestamp: Date.now()
    });

    return { data, error: null };
  } catch (error) {
    console.error('Error getting reminder by ID:', error);
    return { data: null, error };
  }
};

// Clear the cache
export const clearReminderCache = () => {
  cache.reminders = {
    data: null,
    timestamp: null
  };
  cache.reminderById.clear();
}; 