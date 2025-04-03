import axios from 'axios';

// Permapeople API credentials
// In a production app, you would store these in a secure environment variable
const API_KEY_ID = 'GPfrJNXBoPJk'; // Replace with your actual API key ID
const API_KEY_SECRET = '700d1598-739f-4b46-ae1b-a74ddecfc687'; // Replace with your actual API key secret
const BASE_URL = 'https://permapeople.org/api';

// Axios instance with auth headers
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-permapeople-key-id': API_KEY_ID,
    'x-permapeople-key-secret': API_KEY_SECRET
  }
});

/**
 * Fetch plants from Permapeople API
 * @param {number} lastId - Optional last ID for pagination
 * @returns {Promise<Array>} - List of plants
 */
export const fetchPlants = async (lastId = null) => {
  try {
    const params = lastId ? { last_id: lastId } : {};
    const response = await api.get('/plants', { params });
    return formatPlantData(response.data.plants);
  } catch (error) {
    console.error('Error fetching plants:', error);
    throw error;
  }
};

/**
 * Search plants in Permapeople API
 * @param {string} query - Search query
 * @returns {Promise<Array>} - List of matching plants
 */
export const searchPlants = async (query) => {
  try {
    const response = await api.post('/search', { q: query });
    return formatPlantData(response.data.plants);
  } catch (error) {
    console.error('Error searching plants:', error);
    throw error;
  }
};

/**
 * Get a single plant by ID
 * @param {number} id - Plant ID
 * @returns {Promise<Object>} - Plant details
 */
export const getPlantById = async (id) => {
  try {
    const response = await api.get(`/plants/${id}`);
    return formatSinglePlant(response.data);
  } catch (error) {
    console.error(`Error fetching plant with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Format plant data to fit our app's structure
 * @param {Array} plants - Plants from API
 * @returns {Array} - Formatted plants
 */
const formatPlantData = (plants) => {
  return plants.map(plant => formatSinglePlant(plant));
};

/**
 * Format a single plant to fit our app's structure
 * @param {Object} plant - Plant from API
 * @returns {Object} - Formatted plant
 */
const formatSinglePlant = (plant) => {
  // Extract care level from plant data
  const careLevel = getCareLevel(plant);
  
  // Extract water requirement from plant data
  const waterReq = getValueByKey(plant.data, 'Water requirement');
  
  // Extract light requirement from plant data
  const lightReq = getValueByKey(plant.data, 'Light requirement');
  
  // Map water requirement to watering frequency
  const waterFrequency = mapWaterToFrequency(waterReq);
  
  return {
    id: plant.id.toString(),
    name: plant.name,
    species: plant.scientific_name,
    image: getPlantImage(plant),
    careLevel: careLevel,
    light: lightReq || 'Unknown',
    water: waterFrequency,
    description: plant.description || '',
    data: plant.data || []
  };
};

/**
 * Get value by key from plant data array
 * @param {Array} data - Plant data array
 * @param {string} key - Key to look for
 * @returns {string} - Value for key
 */
const getValueByKey = (data, key) => {
  if (!data || !Array.isArray(data)) return null;
  const item = data.find(item => item.key === key);
  return item ? item.value : null;
};

/**
 * Map water requirement to watering frequency
 * @param {string} waterReq - Water requirement
 * @returns {string} - Watering frequency
 */
const mapWaterToFrequency = (waterReq) => {
  if (!waterReq) return 'Check plant needs';
  
  if (waterReq.includes('Dry') || waterReq.includes('Very dry')) {
    return 'Every 2-3 weeks';
  } else if (waterReq.includes('Moist')) {
    return 'Weekly';
  } else if (waterReq.includes('Wet')) {
    return 'Keep soil moist';
  } else if (waterReq.includes('Medium')) {
    return 'When soil is dry';
  } else {
    return 'Check plant needs';
  }
};

/**
 * Get care level based on plant data
 * @param {Object} plant - Plant object
 * @returns {string} - Care level (Very Easy, Easy, Moderate, Difficult)
 */
const getCareLevel = (plant) => {
  // This is a simplistic approach - in reality, you'd want to analyze multiple factors
  // like water requirements, light requirements, growth rate, etc.
  const waterReq = getValueByKey(plant.data, 'Water requirement');
  const lightReq = getValueByKey(plant.data, 'Light requirement');
  
  if (!waterReq || !lightReq) return 'Moderate';
  
  if (
    (waterReq.includes('Dry') || waterReq.includes('Medium')) && 
    lightReq.includes('Full sun')
  ) {
    return 'Very Easy';
  } else if (
    waterReq.includes('Moist') && 
    lightReq.includes('partial')
  ) {
    return 'Easy';
  } else if (
    waterReq.includes('Wet') || 
    (lightReq.includes('shade') && !lightReq.includes('partial'))
  ) {
    return 'Difficult';
  } else {
    return 'Moderate';
  }
};

/**
 * Get plant image URL or use fallback
 * @param {Object} plant - Plant object
 * @returns {Object} - Image source 
 */
const getPlantImage = (plant) => {
  // In a real implementation, you would check if the plant has an image URL
  // and return that. Since Permapeople API doesn't provide images in the
  // documentation, we'll use our fallback images
  
  // This is a simple hash function to assign one of our available images
  // based on the plant id for consistent results
  const imageOptions = [
    require('../../assets/monstera.png'),
    require('../../assets/snake_plant.png'),
    require('../../assets/peace_lily.png'),
    require('../../assets/fiddle_leaf.png'),
    require('../../assets/pothos.png'),
    require('../../assets/aloe_vera.png'),
    require('../../assets/spider_plant.png'),
    require('../../assets/zz_plant.png'),
  ];
  
  const index = plant.id % imageOptions.length;
  return imageOptions[index];
};

export default {
  fetchPlants,
  searchPlants,
  getPlantById
}; 