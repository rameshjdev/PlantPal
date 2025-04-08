import { supabase } from './supabaseService';

/**
 * Plant Database Service
 * Handles all plant-related database operations with Supabase
 */

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const cache = {
  plants: {
    data: null,
    timestamp: null,
  },
  plantById: new Map(),
  searchResults: new Map(),
};

// Helper function to check if cache is valid
const isCacheValid = (timestamp) => {
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_TTL;
};

// Clear cache after TTL
setInterval(() => {
  const now = Date.now();
  if (cache.plants.timestamp && !isCacheValid(cache.plants.timestamp)) {
    cache.plants.data = null;
    cache.plants.timestamp = null;
  }
  
  // Clear expired search results
  for (const [key, value] of cache.searchResults.entries()) {
    if (!isCacheValid(value.timestamp)) {
      cache.searchResults.delete(key);
    }
  }
  
  // Clear expired plantById cache
  for (const [key, value] of cache.plantById.entries()) {
    if (!isCacheValid(value.timestamp)) {
      cache.plantById.delete(key);
    }
  }
}, CACHE_TTL);

// Fetch all plants from the database
export const fetchPlantsFromDB = async () => {
  try {
    // Check cache first
    if (cache.plants.data && isCacheValid(cache.plants.timestamp)) {
      return { data: cache.plants.data, error: null };
    }

    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    
    // Transform the light array into a string if it exists
    const transformedData = data?.map(plant => ({
      ...plant,
      light: Array.isArray(plant.light) ? plant.light.join(', ') : plant.light || 'medium'
    }));

    // Update cache
    cache.plants.data = transformedData;
    cache.plants.timestamp = Date.now();

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Error fetching plants:', error);
    return { data: null, error };
  }
};

// Add a new plant to the database
export const addPlantToDB = async (plantData) => {
  try {
    const { data, error } = await supabase
      .from('plants')
      .insert([plantData])
      .select();

    if (error) throw error;
    return { data: data[0], error: null };
  } catch (error) {
    console.error('Error adding plant:', error);
    return { data: null, error };
  }
};

// Update an existing plant
export const updatePlantInDB = async (plantId, updates) => {
  try {
    const { data, error } = await supabase
      .from('plants')
      .update(updates)
      .eq('id', plantId)
      .select();

    if (error) throw error;
    return { data: data[0], error: null };
  } catch (error) {
    console.error('Error updating plant:', error);
    return { data: null, error };
  }
};

// Delete a plant from the database
export const deletePlantFromDB = async (plantId) => {
  try {
    const { error } = await supabase
      .from('plants')
      .delete()
      .eq('id', plantId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting plant:', error);
    return { error };
  }
};

// Get a single plant by ID
export const getPlantByIdFromDB = async (plantId) => {
  try {
    // Check cache first
    const cachedPlant = cache.plantById.get(plantId);
    if (cachedPlant && isCacheValid(cachedPlant.timestamp)) {
      return { data: cachedPlant.data, error: null };
    }

    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('id', plantId)
      .single();

    if (error) throw error;

    // Transform the light property for a single plant
    if (data) {
      const transformedData = {
        ...data,
        light: Array.isArray(data.light) ? data.light.join(', ') : data.light || 'medium'
      };
      
      // Update cache
      cache.plantById.set(plantId, {
        data: transformedData,
        timestamp: Date.now()
      });
      
      return { data: transformedData, error: null };
    }

    return { data: null, error: null };
  } catch (error) {
    console.error('Error fetching plant:', error);
    return { data: null, error };
  }
};

// Search plants by name or species
export const searchPlantsInDB = async (query) => {
  try {
    // Check cache first
    const cachedSearch = cache.searchResults.get(query);
    if (cachedSearch && isCacheValid(cachedSearch.timestamp)) {
      return { data: cachedSearch.data, error: null };
    }

    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .or(`name.ilike.%${query}%,species.ilike.%${query}%`)
      .order('name', { ascending: true });

    if (error) throw error;

    // Transform the light array into a string if it exists
    const transformedData = data?.map(plant => ({
      ...plant,
      light: Array.isArray(plant.light) ? plant.light.join(', ') : plant.light || 'medium'
    }));

    // Update cache
    cache.searchResults.set(query, {
      data: transformedData,
      timestamp: Date.now()
    });

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Error searching plants:', error);
    return { data: null, error };
  }
};