import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import plantsReducer from './plantsSlice';
import weatherReducer from './weatherSlice';
import remindersReducer from './remindersSlice';
import authReducer from './authSlice';

const rootReducer = combineReducers({
  plants: plantsReducer,
  weather: weatherReducer,
  reminders: remindersReducer,
  auth: authReducer,
});

// Add a middleware to ensure consistent tab icon alignment
const tabAlignmentMiddleware = () => next => action => {
  // This middleware doesn't actually modify any actions
  // It's a placeholder for where we would handle tab-related actions if needed
  return next(action);
};

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware().concat(tabAlignmentMiddleware),
});

export default store;