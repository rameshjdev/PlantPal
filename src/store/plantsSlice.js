import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import plantService from '../services/plantService';

// Initial state with empty arrays
const initialState = {
  plants: [],
  userPlants: [],
  searchResults: [],
  status: 'idle',
  searchStatus: 'idle',
  error: null,
};

// Async thunk for fetching plants from API
export const fetchPlants = createAsyncThunk(
  'plants/fetchPlants',
  async (_, { rejectWithValue }) => {
    try {
      const data = await plantService.fetchPlants();
      console.log(`Fetched ${data.length} plants from service in thunk`);
      return data;
    } catch (error) {
      console.error('Error fetching plants:', error);
      return rejectWithValue(error.message || 'Failed to fetch plants from API');
    }
  }
);

// Async thunk for searching plants
export const searchPlants = createAsyncThunk(
  'plants/searchPlants',
  async (query, { rejectWithValue }) => {
    try {
      const data = await plantService.searchPlants(query);
      return data;
    } catch (error) {
      console.error('Error searching plants:', error);
      return rejectWithValue(error.message || 'Failed to search plants');
    }
  }
);

// Async thunk for adding a plant to collection
export const addPlant = createAsyncThunk(
  'plants/addPlant',
  async (plant, { getState, rejectWithValue }) => {
    try {
      const { plants } = getState();
      
      // Check if plant already exists in user plants
      const existingPlant = plants.userPlants.find(p => p.id === plant.id);
      if (existingPlant) {
        return { 
          plantId: plant.id, 
          action: 'ALREADY_EXISTS'
        };
      }
      
      // Format the plant with proper structure
      const currentDate = new Date().toISOString().split('T')[0];
      const plantData = {
        ...plant,
        id: plant.id || Date.now().toString(),
        isFavorite: false,
        lastWatered: currentDate,
        nextWatering: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };
      
      return plantData;
    } catch (error) {
      return rejectWithValue('Failed to add plant');
    }
  }
);

// Async thunk for updating a plant (simulated API call)
export const updatePlant = createAsyncThunk(
  'plants/updatePlant',
  async (plant) => {
    // In a real app, this would be an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(plant);
      }, 500);
    });
  }
);

// Async thunk for removing a plant
export const removePlant = createAsyncThunk(
  'plants/removePlant',
  async (plantId, { rejectWithValue }) => {
    try {
      // In a real app with full backend, you would delete from API here
      // For now, just return the plantId to remove from state
      return plantId;
    } catch (error) {
      return rejectWithValue('Failed to remove plant');
    }
  }
);

export const toggleFavorite = createAsyncThunk(
  'plants/toggleFavorite',
  async (plantId, { getState, rejectWithValue }) => {
    try {
      const { plants } = getState();
      
      // Ensure plantId is a string for consistent comparison
      const plantIdStr = String(plantId);
      
      // Find if plant exists in user plants
      const existingUserPlantIndex = plants.userPlants.findIndex(p => String(p.id) === plantIdStr);
      
      if (existingUserPlantIndex !== -1) {
        // Plant is already in user plants, toggle favorite status
        const existingUserPlant = plants.userPlants[existingUserPlantIndex];
        const updatedFavoriteStatus = !existingUserPlant.isFavorite;
        
        // If toggling to unfavorite, we'll keep the plant in userPlants
        // but update its favorite status
        return { 
          plantId: plantIdStr, 
          isFavorite: updatedFavoriteStatus,
          action: 'TOGGLE_EXISTING'
        };
      }
      
      // Plant is not in user plants, find it in all plants and add to user plants as favorite
      const plantToFavorite = plants.plants.find(p => String(p.id) === plantIdStr);
      
      if (plantToFavorite) {
        const currentDate = new Date().toISOString().split('T')[0];
        return {
          ...plantToFavorite,
          isFavorite: true,
          lastWatered: currentDate,
          nextWatering: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          action: 'ADD_NEW'
        };
      }
      
      // If we don't find the plant in the main list, check the filtered list or search results
      const fromFiltered = plants.searchResults.find(p => String(p.id) === plantIdStr);
      if (fromFiltered) {
        const currentDate = new Date().toISOString().split('T')[0];
        return {
          ...fromFiltered,
          isFavorite: true,
          lastWatered: currentDate,
          nextWatering: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          action: 'ADD_NEW'
        };
      }
      
      // Plant not found
      return rejectWithValue('Plant not found');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return rejectWithValue(error.message || 'Failed to toggle favorite');
    }
  }
);

// Async thunk for adding a plant to collection
export const addToCollection = createAsyncThunk(
  'plants/addToCollection',
  async (plantId, { getState, rejectWithValue }) => {
    try {
      const { plants } = getState();
      
      // Ensure plantId is a string for consistent comparison
      const plantIdStr = String(plantId);
      
      // Check if plant already exists in user plants
      const existingPlant = plants.userPlants.find(p => String(p.id) === plantIdStr);
      if (existingPlant) {
        return { 
          plantId: plantIdStr, 
          action: 'ALREADY_EXISTS'
        };
      }
      
      // Find the plant in all plants list
      const plantToAdd = plants.plants.find(p => String(p.id) === plantIdStr);
      
      if (plantToAdd) {
        const currentDate = new Date().toISOString().split('T')[0];
        return {
          ...plantToAdd,
          isFavorite: false, // Not a favorite by default
          lastWatered: currentDate,
          nextWatering: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          action: 'ADD_NEW'
        };
      }
      
      // If we don't find the plant in the main list, check the search results
      const fromSearch = plants.searchResults.find(p => String(p.id) === plantIdStr);
      if (fromSearch) {
        const currentDate = new Date().toISOString().split('T')[0];
        return {
          ...fromSearch,
          isFavorite: false, // Not a favorite by default
          lastWatered: currentDate,
          nextWatering: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          action: 'ADD_NEW'
        };
      }
      
      // Plant not found
      return rejectWithValue('Plant not found');
    } catch (error) {
      console.error('Error adding to collection:', error);
      return rejectWithValue(error.message || 'Failed to add to collection');
    }
  }
);

const plantsSlice = createSlice({
  name: 'plants',
  initialState,
  reducers: {
    updateWateringDate: (state, action) => {
      const { plantId, date } = action.payload;
      const plant = state.userPlants.find(p => p.id === plantId);
      if (plant) {
        plant.lastWatered = date;
        // Calculate next watering date based on care requirements
        const nextDate = new Date(date);
        
        // Use plant's watering frequency to determine next watering
        // Default to 7 days if not specified
        let daysToAdd = 7;
        
        if (plant.water) {
          if (plant.water.includes('2-3 weeks') || plant.water.includes('Rarely')) {
            daysToAdd = 14; // Two weeks
          } else if (plant.water.includes('Weekly')) {
            daysToAdd = 7; // One week
          } else if (plant.water.includes('moist') || plant.water.includes('Daily')) {
            daysToAdd = 3; // Every few days
          }
        }
        
        nextDate.setDate(nextDate.getDate() + daysToAdd);
        plant.nextWatering = nextDate.toISOString().split('T')[0];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlants.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPlants.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.plants = action.payload;
      })
      .addCase(fetchPlants.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      })
      .addCase(searchPlants.pending, (state) => {
        state.searchStatus = 'loading';
      })
      .addCase(searchPlants.fulfilled, (state, action) => {
        state.searchStatus = 'succeeded';
        state.searchResults = action.payload;
      })
      .addCase(searchPlants.rejected, (state, action) => {
        state.searchStatus = 'failed';
        state.error = action.payload || action.error.message;
      })
      .addCase(addPlant.fulfilled, (state, action) => {
        state.userPlants.push(action.payload);
      })
      .addCase(updatePlant.fulfilled, (state, action) => {
        const index = state.userPlants.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.userPlants[index] = action.payload;
        }
      })
      .addCase(removePlant.fulfilled, (state, action) => {
        state.userPlants = state.userPlants.filter(p => p.id !== action.payload);
      })
      .addCase(removePlant.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        if (action.payload.action === 'ADD_NEW') {
          // Add new plant to userPlants with logging
          console.log('Adding new plant to favorites:', action.payload.name);
          
          // Create a clean copy without the action property
          const newPlant = { ...action.payload };
          delete newPlant.action;
          
          state.userPlants.push(newPlant);
        } else if (action.payload.action === 'TOGGLE_EXISTING') {
          // Update favorite status for existing plant
          const plant = state.userPlants.find(p => String(p.id) === String(action.payload.plantId));
          if (plant) {
            plant.isFavorite = action.payload.isFavorite;
            console.log(`${plant.name} favorite status set to: ${plant.isFavorite}`);
          }
        }
      })
      .addCase(toggleFavorite.rejected, (state, action) => {
        // Log the error but don't break the app
        console.warn('Failed to toggle favorite:', action.payload);
        state.error = action.payload;
      })
      .addCase(addToCollection.fulfilled, (state, action) => {
        if (action.payload.action === 'ADD_NEW') {
          console.log('Adding plant to collection:', action.payload.name);
          
          // Create a clean copy without the action property
          const newPlant = { ...action.payload };
          delete newPlant.action;
          
          state.userPlants.push(newPlant);
        } else if (action.payload.action === 'ALREADY_EXISTS') {
          console.log('Plant already exists in collection');
        }
      })
      .addCase(addToCollection.rejected, (state, action) => {
        console.warn('Failed to add to collection:', action.payload);
        state.error = action.payload;
      });
  },
});

export const { updateWateringDate } = plantsSlice.actions;

export default plantsSlice.reducer;