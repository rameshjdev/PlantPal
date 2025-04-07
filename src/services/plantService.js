import { supabase } from './supabaseService';
import { 
  fetchPlantsFromDB, 
  addPlantToDB, 
  updatePlantInDB, 
  deletePlantFromDB, 
  getPlantByIdFromDB,
  searchPlantsInDB 
} from './plantDatabaseService';

/**
 * Plant Service
 * Handles all plant-related operations using the database
 */

const plantService = {
  // Fetch all plants
  fetchPlants: async () => {
    try {
      const { data, error } = await fetchPlantsFromDB();
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error in fetchPlants:', error);
      return [];
    }
  },

  // Search plants by name or species
  searchPlants: async (query) => {
    try {
      const response = await searchPlantsInDB(query);
      if (response.error) throw response.error;
      return response.data || [];
    } catch (error) {
      console.error('Error in searchPlants:', error);
      return [];
    }
  },

  // Get a single plant by ID
  getPlantById: async (id) => {
    try {
      const response = await getPlantByIdFromDB(id);
      if (response.error) throw response.error;
      return response.data || null;
    } catch (error) {
      console.error('Error in getPlantById:', error);
      return null;
    }
  },

  // Get popular plants (most recently added)
  getPopularPlants: async () => {
    try {
      const { data: plants, error } = await supabase
        .from('plants')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return plants || [];
    } catch (error) {
      console.error('Error in getPopularPlants:', error);
      return [];
    }
  },

  // Add a new plant
  addPlant: async (plantData) => {
    try {
      const { data: plant, error } = await addPlantToDB(plantData);
      if (error) throw error;
      return plant;
    } catch (error) {
      console.error('Error in addPlant:', error);
      throw error;
    }
  },

  // Update an existing plant
  updatePlant: async (plantId, updates) => {
    try {
      const { data: plant, error } = await updatePlantInDB(plantId, updates);
      if (error) throw error;
      return plant;
    } catch (error) {
      console.error('Error in updatePlant:', error);
      throw error;
    }
  },

  // Delete a plant
  deletePlant: async (plantId) => {
    try {
      const { error } = await deletePlantFromDB(plantId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error in deletePlant:', error);
      throw error;
    }
  }
};

export default plantService;