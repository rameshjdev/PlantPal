import { supabase } from './supabaseService';

/**
 * Plant Database Service
 * Handles all plant-related database operations with Supabase
 */

// Fetch all plants from the database
export const fetchPlantsFromDB = async () => {
  try {
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

    return { data: transformedData, error: null };
  } catch (error) {
    console.error('Error searching plants:', error);
    return { data: null, error };
  }
};