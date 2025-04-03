import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk for fetching reminders (simulated API call)
export const fetchReminders = createAsyncThunk(
  'reminders/fetchReminders',
  async () => {
    // In a real app, this would be an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(initialReminders);
      }, 500);
    });
  }
);

// Async thunk for adding a reminder (simulated API call)
export const addReminder = createAsyncThunk(
  'reminders/addReminder',
  async (reminder) => {
    // In a real app, this would be an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const newReminder = {
          ...reminder,
          id: Date.now().toString(),
        };
        resolve(newReminder);
      }, 500);
    });
  }
);

// Async thunk for updating a reminder (simulated API call)
export const updateReminder = createAsyncThunk(
  'reminders/updateReminder',
  async (reminder) => {
    // In a real app, this would be an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(reminder);
      }, 500);
    });
  }
);

// Async thunk for deleting a reminder (simulated API call)
export const deleteReminder = createAsyncThunk(
  'reminders/deleteReminder',
  async (reminderId) => {
    // In a real app, this would be an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(reminderId);
      }, 500);
    });
  }
);

// Mock initial reminders data
const initialReminders = [
  {
    id: '1',
    plantId: '1',
    plantName: 'Monstera',
    type: 'watering',
    frequency: 'weekly',
    day: 'Monday',
    time: '09:00',
    enabled: true,
    lastCompleted: '2023-06-15',
    nextDue: '2023-06-22',
  },
  {
    id: '2',
    plantId: '1',
    plantName: 'Monstera',
    type: 'fertilizing',
    frequency: 'monthly',
    day: null,
    time: '10:00',
    enabled: true,
    lastCompleted: '2023-06-01',
    nextDue: '2023-07-01',
  },
  {
    id: '3',
    plantId: '2',
    plantName: 'Snake Plant',
    type: 'watering',
    frequency: 'biweekly',
    day: 'Friday',
    time: '18:00',
    enabled: true,
    lastCompleted: '2023-06-10',
    nextDue: '2023-06-24',
  },
];

const remindersSlice = createSlice({
  name: 'reminders',
  initialState: {
    reminders: [],
    status: 'idle',
    error: null,
  },
  reducers: {
    toggleReminderEnabled: (state, action) => {
      const reminderId = action.payload;
      const reminder = state.reminders.find(r => r.id === reminderId);
      if (reminder) {
        reminder.enabled = !reminder.enabled;
      }
    },
    markReminderCompleted: (state, action) => {
      const { reminderId, completionDate } = action.payload;
      const reminder = state.reminders.find(r => r.id === reminderId);
      if (reminder) {
        reminder.lastCompleted = completionDate;
        
        // Calculate next due date based on frequency
        const nextDate = new Date(completionDate);
        switch (reminder.frequency) {
          case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
          case 'every3days':
            nextDate.setDate(nextDate.getDate() + 3);
            break;
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case 'biweekly':
            nextDate.setDate(nextDate.getDate() + 14);
            break;
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
          case 'sixmonthly':
            nextDate.setMonth(nextDate.getMonth() + 6);
            break;
          case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
          case 'biannually':
            nextDate.setFullYear(nextDate.getFullYear() + 2);
            break;
          default:
            nextDate.setDate(nextDate.getDate() + 7); // Default to weekly
        }
        
        reminder.nextDue = nextDate.toISOString().split('T')[0];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReminders.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchReminders.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.reminders = action.payload;
      })
      .addCase(fetchReminders.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(addReminder.fulfilled, (state, action) => {
        state.reminders.push(action.payload);
      })
      .addCase(updateReminder.fulfilled, (state, action) => {
        const index = state.reminders.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.reminders[index] = action.payload;
        }
      })
      .addCase(deleteReminder.fulfilled, (state, action) => {
        state.reminders = state.reminders.filter(r => r.id !== action.payload);
      });
  },
});

export const { toggleReminderEnabled, markReminderCompleted } = remindersSlice.actions;

export default remindersSlice.reducer;