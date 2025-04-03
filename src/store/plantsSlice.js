import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Mock plant data - in a real app, this would come from an API
const initialPlants = [
  { 
    id: '1', 
    name: 'Monstera', 
    species: 'Monstera deliciosa', 
    image: require('../../assets/monstera.png'),
    description: 'The Monstera deliciosa is a species of flowering plant native to tropical forests of southern Mexico, south to Panama.',
    lastWatered: '2023-06-15',
    nextWatering: '2023-06-22',
    care: {
      water: 'Medium - Allow soil to dry out between waterings',
      light: 'Bright indirect light',
      temperature: '65-85°F (18-29°C)',
      humidity: 'High',
      soil: 'Well-draining potting mix',
      fertilizer: 'Monthly during growing season',
      repotting: 'Every 2-3 years',
    },
    isFavorite: false,
  },
  { 
    id: '2', 
    name: 'Snake Plant', 
    species: 'Sansevieria trifasciata', 
    image: require('../../assets/snake_plant.png'),
    description: 'Sansevieria trifasciata is a species of flowering plant in the family Asparagaceae, native to tropical West Africa.',
    lastWatered: '2023-06-10',
    nextWatering: '2023-06-30',
    care: {
      water: 'Low - Allow soil to completely dry between waterings',
      light: 'Low to bright indirect light',
      temperature: '60-85°F (15-29°C)',
      humidity: 'Low to average',
      soil: 'Well-draining cactus or succulent mix',
      fertilizer: 'Sparingly, 2-3 times per year',
      repotting: 'Every 2-5 years',
    },
    isFavorite: true,
  },
  { 
    id: '3', 
    name: 'Peace Lily', 
    species: 'Spathiphyllum', 
    image: require('../../assets/peace_lily.png'),
    description: 'Spathiphyllum is a genus of about 47 species of monocotyledonous flowering plants in the family Araceae.',
    lastWatered: '2023-06-18',
    nextWatering: '2023-06-23',
    care: {
      water: 'Medium to high - Keep soil consistently moist',
      light: 'Low to medium indirect light',
      temperature: '65-80°F (18-27°C)',
      humidity: 'High',
      soil: 'Rich, loose potting soil',
      fertilizer: 'Every 6 weeks during growing season',
      repotting: 'Every 1-2 years',
    },
    isFavorite: false,
  },
];

// Async thunk for fetching plants (simulated API call)
export const fetchPlants = createAsyncThunk(
  'plants/fetchPlants',
  async () => {
    // In a real app, this would be an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(initialPlants);
      }, 500);
    });
  }
);

// Async thunk for adding a plant (simulated API call)
export const addPlant = createAsyncThunk(
  'plants/addPlant',
  async (plant) => {
    // In a real app, this would be an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        const newPlant = {
          ...plant,
          id: Date.now().toString(),
        };
        resolve(newPlant);
      }, 500);
    });
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

const plantsSlice = createSlice({
  name: 'plants',
  initialState: {
    plants: [],
    userPlants: [],
    status: 'idle',
    error: null,
  },
  reducers: {
    toggleFavorite: (state, action) => {
      const plantId = action.payload;
      const plant = state.userPlants.find(p => p.id === plantId);
      if (plant) {
        plant.isFavorite = !plant.isFavorite;
      }
    },
    updateWateringDate: (state, action) => {
      const { plantId, date } = action.payload;
      const plant = state.userPlants.find(p => p.id === plantId);
      if (plant) {
        plant.lastWatered = date;
        // Calculate next watering date based on care requirements
        // This is a simplified example
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 7); // Add 7 days for weekly watering
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
        // Initialize userPlants with the mock data for demo purposes
        // In a real app, this would be separate user-specific data
        if (state.userPlants.length === 0) {
          state.userPlants = initialPlants;
        }
      })
      .addCase(fetchPlants.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(addPlant.fulfilled, (state, action) => {
        state.userPlants.push(action.payload);
      })
      .addCase(updatePlant.fulfilled, (state, action) => {
        const index = state.userPlants.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.userPlants[index] = action.payload;
        }
      });
  },
});

export const { toggleFavorite, updateWateringDate } = plantsSlice.actions;

export default plantsSlice.reducer;