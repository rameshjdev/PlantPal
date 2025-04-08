import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk for fetching reminders (simulated API call)
export const fetchReminders = createAsyncThunk(
  'reminders/fetchReminders',
  async (_, { getState }) => {
    // In a real app, this would be an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        // Return the current reminders from the state
        const state = getState();
        resolve(state.reminders.reminders);
      }, 500);
    });
  }
);

// Async thunk for adding a reminder (simulated API call)
export const addReminder = createAsyncThunk(
  'reminders/addReminder',
  async (reminder) => {
    console.log('Adding reminder:', reminder);
    // In a real app, this would be an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        // Use the provided ID instead of generating a new one
        resolve(reminder);
      }, 500);
    });
  }
);

// Async thunk for updating a reminder (simulated API call)
export const updateReminder = createAsyncThunk(
  'reminders/updateReminder',
  async (reminder) => {
    console.log('Updating reminder:', reminder);
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