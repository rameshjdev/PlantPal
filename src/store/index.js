import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import plantsReducer from './plantsSlice';
import weatherReducer from './weatherSlice';
import remindersReducer from './remindersSlice';

const rootReducer = combineReducers({
  plants: plantsReducer,
  weather: weatherReducer,
  reminders: remindersReducer,
});

const store = configureStore({
  reducer: rootReducer,
});

export default store;