import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunk for fetching weather data
export const fetchWeather = createAsyncThunk(
  'weather/fetchWeather',
  async (coordinates) => {
    // In a real app, this would use a real weather API with your API key
    // For demo purposes, we'll return mock data
    
    // Example of how you would make a real API call:
    // const response = await axios.get(
    //   `https://api.openweathermap.org/data/2.5/weather?lat=${coordinates.latitude}&lon=${coordinates.longitude}&units=metric&appid=YOUR_API_KEY`
    // );
    // return response.data;
    
    // Mock data for demo
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          location: 'New York, NY',
          current: {
            temp: 22,
            humidity: 65,
            condition: 'Partly Cloudy',
            icon: '04d',
          },
          forecast: [
            { day: 'Today', temp: 22, condition: 'Partly Cloudy', icon: '04d', precipitation: 10 },
            { day: 'Tomorrow', temp: 25, condition: 'Sunny', icon: '01d', precipitation: 0 },
            { day: 'Wednesday', temp: 20, condition: 'Rain', icon: '10d', precipitation: 80 },
            { day: 'Thursday', temp: 18, condition: 'Rain', icon: '10d', precipitation: 60 },
            { day: 'Friday', temp: 21, condition: 'Partly Cloudy', icon: '04d', precipitation: 20 },
          ],
          alerts: [
            {
              type: 'rain',
              message: 'Heavy rain expected on Wednesday. Consider moving outdoor plants inside.',
            },
          ],
        });
      }, 500);
    });
  }
);

const weatherSlice = createSlice({
  name: 'weather',
  initialState: {
    data: null,
    status: 'idle',
    error: null,
    lastUpdated: null,
  },
  reducers: {
    clearWeatherData: (state) => {
      state.data = null;
      state.status = 'idle';
      state.error = null;
      state.lastUpdated = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWeather.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchWeather.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchWeather.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export const { clearWeatherData } = weatherSlice.actions;

export default weatherSlice.reducer;