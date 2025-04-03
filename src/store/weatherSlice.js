import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchWeatherData } from '../services/weatherService';

// Async thunk for fetching weather data
export const fetchWeather = createAsyncThunk(
  'weather/fetchWeather',
  async (coordinates) => {
    const weatherData = await fetchWeatherData(coordinates);
    return weatherData;
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