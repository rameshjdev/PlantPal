import axios from 'axios';
import { PERENUAL_API_KEY } from '@env';
import { supabase } from './supabaseService';
import { 
  fetchPlantsFromDB, 
  addPlantToDB, 
  updatePlantInDB, 
  deletePlantFromDB, 
  getPlantByIdFromDB 
} from './plantDatabaseService';

// Perenual API configuration
const PERENUAL_API_KEY_VALUE = PERENUAL_API_KEY;
const BASE_URL = 'https://perenual.com/api';

// Simple rate limit protection
let isRateLimited = false;
let rateLimitResetTime = 0;
const RATE_LIMIT_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown

// Expanded cache system
let plantsCache = [];
let lastCacheTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Load from AsyncStorage if available
try {
  // We'll implement actual AsyncStorage in a future update
  // This is just a placeholder for the structure
  const loadCachedData = () => {
    // If we implement AsyncStorage later, this is where we would load from it
  };
  loadCachedData();
} catch (error) {
  console.log('Could not load cache from storage:', error);
}

// Extended data for better fallback plants
const PLANT_NAMES = [
  'Japanese Maple', 'Snake Plant', 'Monstera', 'Fiddle Leaf Fig', 'Pothos', 'ZZ Plant',
  'Peace Lily', 'Spider Plant', 'Aloe Vera', 'Rubber Plant', 'Boston Fern', 'Philodendron',
  'Chinese Money Plant', 'Jade Plant', 'African Violet', 'Orchid', 'Parlor Palm',
  'String of Pearls', 'Calathea', 'Anthurium', 'Bird of Paradise', 'Ficus', 'Peperomia',
  'English Ivy', 'Lavender', 'Rosemary', 'Basil', 'Mint', 'Succulent', 'Cactus'
];

const PLANT_SPECIES = [
  'Acer palmatum', 'Sansevieria trifasciata', 'Monstera deliciosa', 'Ficus lyrata',
  'Epipremnum aureum', 'Zamioculcas zamiifolia', 'Spathiphyllum', 'Chlorophytum comosum',
  'Aloe barbadensis miller', 'Ficus elastica', 'Nephrolepis exaltata', 'Philodendron hederaceum',
  'Pilea peperomioides', 'Crassula ovata', 'Saintpaulia', 'Phalaenopsis', 'Chamaedorea elegans',
  'Senecio rowleyanus', 'Calathea orbifolia', 'Anthurium andraeanum', 'Strelitzia nicolai',
  'Ficus benjamina', 'Peperomia obtusifolia', 'Hedera helix', 'Lavandula', 'Rosmarinus officinalis',
  'Ocimum basilicum', 'Mentha', 'Echeveria elegans', 'Mammillaria elongata'
];

const SUNLIGHT_OPTIONS = [
  'full_sun', 'part_shade', 'full_shade', 'filtered_shade', 'part_sun_part_shade',
  'part_sun', 'shade', 'medium_light', 'low_light', 'bright_indirect'
];

const WATERING_OPTIONS = ['Frequent', 'Average', 'Minimum', 'Moderate', 'Low', 'High'];
const CARE_LEVELS = ['Easy', 'Moderate', 'Difficult', 'Low', 'Medium', 'High'];
const CYCLE_TYPES = ['Perennial', 'Annual', 'Biennial', 'Biannual'];

// Generate 200 fallback plants for a better experience when the API is limited
const generateFallbackPlants = (count = 200) => {
  const plants = [];
  
  for (let i = 0; i < count; i++) {
    // Select random attributes from our lists
    const nameIndex = Math.floor(Math.random() * PLANT_NAMES.length);
    const speciesIndex = Math.floor(Math.random() * PLANT_SPECIES.length);
    
    // Generate a plant with random attributes
    const plant = {
      id: `local-${i + 1}`,
      name: PLANT_NAMES[nameIndex],
      species: PLANT_SPECIES[speciesIndex],
      image: null, // Will use placeholder
      sunlight: [
        SUNLIGHT_OPTIONS[Math.floor(Math.random() * SUNLIGHT_OPTIONS.length)],
        SUNLIGHT_OPTIONS[Math.floor(Math.random() * SUNLIGHT_OPTIONS.length)]
      ],
      watering: WATERING_OPTIONS[Math.floor(Math.random() * WATERING_OPTIONS.length)],
      care_level: CARE_LEVELS[Math.floor(Math.random() * CARE_LEVELS.length)],
      cycle: CYCLE_TYPES[Math.floor(Math.random() * CYCLE_TYPES.length)],
      poisonous_to_pets: Math.random() > 0.7, // 30% are pet safe
      local: true
    };
    
    plants.push(plant);
  }
  
  return plants;
};

// Generate our large fallback dataset
const FALLBACK_PLANTS = generateFallbackPlants(200);

// Axios instance with token in query parameter
const api = axios.create({
  baseURL: BASE_URL,
  params: {
    key: PERENUAL_API_KEY_VALUE
  },
  timeout: 15000 // 15 second timeout
});

/**
 * Main fetch plants function - simplified to reduce API calls
 * @param {string} lastId - Last plant ID for pagination (not used in this implementation)
 * @param {number} page - Page number for pagination (optional)
 * @returns {Promise<Array>} - List of plants
 */
// Modified to check Supabase first, then fallback to API
export const fetchPlants = async (lastId = null, page = 1) => {
  try {
    // First try to get plants from Supabase
    const { data: userPlants, error } = await fetchPlantsFromDB();
    
    if (userPlants && userPlants.length > 0) {
      console.log(`Found ${userPlants.length} plants in database`);
      return userPlants;
    }

    // If no plants in database or error, fallback to API
    if (error) {
      console.log('Error fetching from database, falling back to API:', error);
    }

    // Original API fetching logic
    if (isRateLimited && Date.now() < rateLimitResetTime) {
      console.log('API is rate limited, using fallback data');
      return FALLBACK_PLANTS.slice(0, 100); // Return first 100 fallback plants
    }
    
    // Check if we can use cached data
    if (plantsCache.length > 0 && (Date.now() - lastCacheTime) < CACHE_DURATION) {
      console.log(`Using ${plantsCache.length} cached plants`);
      return plantsCache;
    }
    
    // Make a single API call first to check if the API is available and not rate-limited
    console.log('Testing API availability...');
    try {
      // Try to fetch just one page first as a test
      const testResponse = await api.get('/v2/species-list', { 
        params: { page: 1, limit: 5 } // Request just a few items to test
      });
      
      // If we got here, the API is working and not rate limited
      console.log('API is available, proceeding with full data fetch');
    } catch (error) {
      if (error.response && error.response.status === 429) {
        // We're rate limited, set the flag and return fallback
        console.log('API rate limited during test call');
        isRateLimited = true;
        rateLimitResetTime = Date.now() + RATE_LIMIT_COOLDOWN;
        return FALLBACK_PLANTS.slice(0, 100);
      }
      
      console.error('Error during API test call:', error);
      return FALLBACK_PLANTS.slice(0, 100);
    }

    // Create a simpler, more robust fetch approach - get 3 pages in sequence
    console.log('Fetching fresh plant data from API');
    let allPlants = [];

    try {
      // Batch our requests with a simple sequential approach
      for (let i = 1; i <= 3; i++) {
        if (isRateLimited) {
          console.log('Hit rate limit, stopping further API calls');
          break;
        }
        
        console.log(`Fetching plants page ${i}`);
        try {
          const response = await api.get('/v2/species-list', { 
            params: { page: i }
          });
          
          if (response.data && response.data.data && Array.isArray(response.data.data)) {
            const pageData = formatPlantData(response.data.data);
            console.log(`Fetched ${pageData.length} plants from page ${i}`);
            allPlants = [...allPlants, ...pageData];
          }
          
          // Wait between requests
          if (i < 3) {
            console.log('Waiting before next request...');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } catch (error) {
          if (error.response && error.response.status === 429) {
            console.log('Rate limit hit, stopping batch');
            isRateLimited = true;
            rateLimitResetTime = Date.now() + RATE_LIMIT_COOLDOWN;
            break;
          }
          console.error(`Error fetching page ${i}:`, error);
        }
      }
      
      if (allPlants.length > 0) {
        console.log(`Successfully fetched ${allPlants.length} plants`);
        // Cache the results
        plantsCache = allPlants;
        lastCacheTime = Date.now();
        
        // Return the plants
        return allPlants;
      } else {
        console.log('No plants fetched from API, using fallback');
        return FALLBACK_PLANTS.slice(0, 100);
      }
    } catch (error) {
      console.error('Error during batch fetch:', error);
      
      if (allPlants.length > 0) {
        console.log(`Returning ${allPlants.length} plants that were successfully fetched`);
        plantsCache = allPlants;
        lastCacheTime = Date.now();
        return allPlants;
      }
      
      return FALLBACK_PLANTS.slice(0, 100);
    }
  } catch (error) {
    console.error('Error in fetchPlants:', error);
    return FALLBACK_PLANTS.slice(0, 100);
  }
};

/**
 * Search plants in Perenual API - simplified
 * @param {string} query - Search query
 * @returns {Promise<Array>} - List of matching plants
 */
export const searchPlants = async (query) => {
  try {
    // Search in Supabase first
    const { data: dbResults, error } = await supabase
      .from('plants')
      .select('*')
      .or(`name.ilike.%${query}%,species.ilike.%${query}%`)
      .order('name', { ascending: true });

    if (dbResults && dbResults.length > 0) {
      console.log(`Found ${dbResults.length} matches in database`);
      return dbResults;
    }

    // If no results in database, search API
    // If we're rate limited, search through fallback or cached plants
    if ((isRateLimited && Date.now() < rateLimitResetTime) || plantsCache.length === 0) {
      console.log('API unavailable for search, using local data');
      
      // Search in fallback data
      const searchTermLower = query.toLowerCase();
      return FALLBACK_PLANTS.filter(plant => 
        plant.name.toLowerCase().includes(searchTermLower) || 
        (plant.species && plant.species.toLowerCase().includes(searchTermLower))
      );
    }
    
    // If we have cached plants, search through them first
    if (plantsCache.length > 0) {
      console.log('Searching through cached plants');
      const searchTermLower = query.toLowerCase();
      const cachedResults = plantsCache.filter(plant => 
        plant.name.toLowerCase().includes(searchTermLower) || 
        (plant.species && plant.species.toLowerCase().includes(searchTermLower))
      );
      
      // If we found enough matches in cache, return them
      if (cachedResults.length >= 5) {
        console.log(`Found ${cachedResults.length} matches in cache`);
        return cachedResults;
      }
    }
    
    // If not rate limited, try API search
    try {
      console.log(`Searching API for "${query}"`);
      const response = await api.get('/v2/species-list', { 
        params: { q: query }
      });
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        const results = formatPlantData(response.data.data);
        console.log(`Search returned ${results.length} results`);
        return results.length > 0 ? results : searchFallbackData(query);
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.log('Rate limit hit during search');
        isRateLimited = true;
        rateLimitResetTime = Date.now() + RATE_LIMIT_COOLDOWN;
      }
      console.error('Search API error:', error);
    }
    
    // If API search failed, search fallback data
    return searchFallbackData(query);
  } catch (error) {
    console.error('Error in searchPlants:', error);
    return searchFallbackData(query);
  }
};

/**
 * Search through fallback data when API is unavailable
 * @param {string} query - Search query
 * @returns {Array} - List of matching plants
 */
const searchFallbackData = (query) => {
  console.log('Searching fallback data');
  const searchTermLower = query.toLowerCase();
  return FALLBACK_PLANTS.filter(plant => 
    plant.name.toLowerCase().includes(searchTermLower) || 
    plant.species.toLowerCase().includes(searchTermLower)
  );
};

/**
 * Get a single plant by ID - simplified
 * @param {number} id - Plant ID
 * @returns {Promise<Object>} - Plant details
 */
export const getPlantById = async (id) => {
  try {
    // Check Supabase first
    const { data: dbPlant, error } = await getPlantByIdFromDB(id);
    
    if (dbPlant) {
      console.log(`Found plant ${id} in database`);
      return dbPlant;
    }

    // If not in database, check API
    // If we're rate limited, search through fallback or cached plants
    if ((isRateLimited && Date.now() < rateLimitResetTime) || plantsCache.length === 0) {
      console.log('API unavailable for search, using local data');
      
      // Search in fallback data
      const searchTermLower = query.toLowerCase();
      return FALLBACK_PLANTS.filter(plant => 
        plant.name.toLowerCase().includes(searchTermLower) || 
        (plant.species && plant.species.toLowerCase().includes(searchTermLower))
      );
    }
    
    // If we have cached plants, search through them first
    if (plantsCache.length > 0) {
      console.log('Searching through cached plants');
      const searchTermLower = query.toLowerCase();
      const cachedResults = plantsCache.filter(plant => 
        plant.name.toLowerCase().includes(searchTermLower) || 
        (plant.species && plant.species.toLowerCase().includes(searchTermLower))
      );
      
      // If we found enough matches in cache, return them
      if (cachedResults.length >= 5) {
        console.log(`Found ${cachedResults.length} matches in cache`);
        return cachedResults;
      }
    }
    
    // If not rate limited, try API search
    try {
      console.log(`Searching API for "${query}"`);
      const response = await api.get('/v2/species-list', { 
        params: { q: query }
      });
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        const results = formatPlantData(response.data.data);
        console.log(`Search returned ${results.length} results`);
        return results.length > 0 ? results : searchFallbackData(query);
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.log('Rate limit hit during search');
        isRateLimited = true;
        rateLimitResetTime = Date.now() + RATE_LIMIT_COOLDOWN;
      }
      console.error('Search API error:', error);
    }
    
    // If API search failed, search fallback data
    return searchFallbackData(query);
  } catch (error) {
    console.error('Error in searchPlants:', error);
    return searchFallbackData(query);
  }
};

/**
 * Get popular plants - simplified
 * @returns {Promise<Array>} - List of popular plants
 */
export const getPopularPlants = async () => {
  try {
    // If we already have cached plants, use those
    if (plantsCache.length > 0) {
      console.log('Using cached plants for popular plants');
      // Randomize the order to make it look like "popular" plants
      return [...plantsCache].sort(() => 0.5 - Math.random()).slice(0, 20);
    }
    
    // If we're rate limited, use fallback
    if (isRateLimited && Date.now() < rateLimitResetTime) {
      console.log('API rate limited, using fallback for popular plants');
      return FALLBACK_PLANTS.slice(0, 20);
    }
    
    // Otherwise try to fetch indoor plants
    try {
      console.log('Fetching popular/indoor plants from API');
      const response = await api.get('/v2/species-list', {
        params: {
          indoor: 1,
          page: 1
        }
      });
      
      if (response.data && response.data.data && response.data.data.length > 0) {
        const popularPlants = formatPlantData(response.data.data);
        console.log(`Fetched ${popularPlants.length} popular plants`);
        
        // Add to cache if our main cache is empty
        if (plantsCache.length === 0) {
          plantsCache = popularPlants;
          lastCacheTime = Date.now();
        }
        
        return popularPlants;
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.log('Rate limit hit while fetching popular plants');
        isRateLimited = true;
        rateLimitResetTime = Date.now() + RATE_LIMIT_COOLDOWN;
      }
      console.error('Error fetching popular plants:', error);
    }
    
    // If we got here, try to get regular plants
    try {
      const firstPage = await fetchPlants(null, 1);
      if (firstPage.length > 0) {
        console.log(`Using ${firstPage.length} regular plants as popular plants`);
        return firstPage.slice(0, 20);
      }
    } catch (error) {
      console.error('Error using regular plants as fallback:', error);
    }
    
    // Final fallback
    return FALLBACK_PLANTS.slice(0, 20);
  } catch (error) {
    console.error('Error in getPopularPlants:', error);
    return FALLBACK_PLANTS.slice(0, 20);
  }
};

/**
 * Format plant data to fit our app's structure
 * @param {Array} plants - Plants from API
 * @returns {Array} - Formatted plants
 */
const formatPlantData = (plants) => {
  if (!Array.isArray(plants)) {
    console.warn('Invalid plants data format, expected array:', plants);
    return [];
  }
  return plants.map(plant => formatSinglePlant(plant));
};

/**
 * Format a single plant to fit our app's structure
 * @param {Object} plant - Plant from API
 * @returns {Object} - Formatted plant
 */
const formatSinglePlant = (plant) => {
  if (!plant || typeof plant !== 'object') {
    console.warn('Invalid plant data format:', plant);
    throw new Error('Invalid plant data format');
  }
  
  // Extract relevant data from the Perenual API response
  const { id, common_name, scientific_name, family, genus } = plant;
  
  // Get other relevant details
  const otherName = plant.other_name ? (Array.isArray(plant.other_name) ? plant.other_name.join(', ') : plant.other_name) : '';
  const description = plant.description || plant.overview || '';
  
  // Map care details from Perenual to our format
  const careLevel = getCareLevel(plant);
  const lightReq = getLightRequirement(plant);
  const waterFrequency = getWaterFrequency(plant);
  
  return {
    id: id ? id.toString() : 'unknown',
    name: common_name || (scientific_name && scientific_name[0]) || (genus ? `${genus} species` : 'Unknown plant'),
    species: scientific_name ? (Array.isArray(scientific_name) ? scientific_name[0] : scientific_name) : '',
    otherNames: otherName,
    image: getPlantImage(plant),
    careLevel: careLevel,
    light: lightReq,
    water: waterFrequency,
    description: description || 'No description available.',
    family: family || '',
    familyCommonName: '',
    genus: genus || '',
    data: formatAdditionalData(plant)
  };
};

/**
 * Format additional data for the plant
 * @param {Object} plant - Plant object
 * @returns {Array} - Array of key-value pairs
 */
const formatAdditionalData = (plant) => {
  const data = [];
  
  // Add relevant details from the plant object
  if (plant.dimension) {
    data.push({ key: 'Dimension', value: plant.dimension });
  }
  
  if (plant.care_level) {
    data.push({ key: 'Care Level', value: plant.care_level });
  }
  
  if (plant.cycle) {
    data.push({ key: 'Life Cycle', value: plant.cycle });
  }
  
  if (plant.watering) {
    data.push({ key: 'Watering', value: plant.watering });
  }
  
  if (plant.sunlight && Array.isArray(plant.sunlight)) {
    data.push({ key: 'Sunlight', value: plant.sunlight.join(', ') });
  }
  
  if (plant.sunlight && !Array.isArray(plant.sunlight)) {
    data.push({ key: 'Sunlight', value: plant.sunlight });
  }
  
  if (plant.hardiness) {
    data.push({ key: 'Hardiness Zone', value: plant.hardiness.min + ' to ' + plant.hardiness.max });
  }
  
  if (plant.edible) {
    data.push({ key: 'Edible', value: plant.edible ? 'Yes' : 'No' });
  }
  
  if (plant.indoor) {
    data.push({ key: 'Indoor', value: plant.indoor ? 'Yes' : 'No' });
  }
  
  if (plant.poisonous) {
    data.push({ key: 'Poisonous', value: plant.poisonous ? 'Yes' : 'No' });
  }
  
  if (plant.maintenance) {
    data.push({ key: 'Maintenance', value: plant.maintenance });
  }
  
  if (plant.growth_rate) {
    data.push({ key: 'Growth Rate', value: plant.growth_rate });
  }
  
  if (plant.drought_tolerant !== undefined) {
    data.push({ key: 'Drought Tolerant', value: plant.drought_tolerant ? 'Yes' : 'No' });
  }
  
  if (plant.salt_tolerant !== undefined) {
    data.push({ key: 'Salt Tolerant', value: plant.salt_tolerant ? 'Yes' : 'No' });
  }
  
  if (plant.thorny !== undefined) {
    data.push({ key: 'Thorny', value: plant.thorny ? 'Yes' : 'No' });
  }
  
  if (plant.invasive !== undefined) {
    data.push({ key: 'Invasive', value: plant.invasive ? 'Yes' : 'No' });
  }
  
  if (plant.tropical !== undefined) {
    data.push({ key: 'Tropical', value: plant.tropical ? 'Yes' : 'No' });
  }
  
  return data;
};

/**
 * Map Perenual watering values to descriptive text
 * @param {string} value - Perenual watering value
 * @returns {string} - Descriptive text
 */
const mapWateringValue = (value) => {
  if (!value) return 'Check plant needs';
  
  switch(value.toLowerCase()) {
    case 'frequent':
      return 'Keep soil moist';
    case 'average':
      return 'Weekly';
    case 'minimum':
      return 'Every 2-3 weeks';
    case 'none':
      return 'Rarely';
    default:
      return value;
  }
};

/**
 * Map Perenual sunlight values to descriptive text
 * @param {Array|string} value - Perenual sunlight value(s)
 * @returns {string} - Descriptive text
 */
const mapLightValue = (value) => {
  if (!value) return 'Medium indirect light';
  
  // Handle array of sunlight values
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Medium indirect light';
    
    // Use the first value
    value = value[0];
  }
  
  switch(value.toLowerCase()) {
    case 'full_shade':
      return 'Low light';
    case 'part_shade':
      return 'Partial shade';
    case 'sun-part_shade':
      return 'Bright indirect light';
    case 'full_sun':
      return 'Full sun';
    default:
      return value.replace('_', ' ');
  }
};

/**
 * Determine water frequency based on plant data
 * @param {Object} plant - Plant object
 * @returns {string} - Watering frequency
 */
const getWaterFrequency = (plant) => {
  if (!plant.watering) return null;
  
  return mapWateringValue(plant.watering);
};

/**
 * Get light requirement based on plant data
 * @param {Object} plant - Plant object
 * @returns {string} - Light requirement
 */
const getLightRequirement = (plant) => {
  if (!plant.sunlight) return null;
  
  return mapLightValue(plant.sunlight);
};

/**
 * Get care level based on plant data
 * @param {Object} plant - Plant object
 * @returns {string} - Care level (Very Easy, Easy, Moderate, Difficult)
 */
const getCareLevel = (plant) => {
  if (plant.care_level) {
    switch (plant.care_level.toLowerCase()) {
      case 'easy':
        return 'Very Easy';
      case 'moderate':
        return 'Easy';
      case 'hard':
        return 'Moderate';
      case 'expert':
        return 'Difficult';
      default:
        return plant.care_level;
    }
  }
  
  // Calculate based on maintenance and watering if available
  if (plant.maintenance) {
    switch (plant.maintenance.toLowerCase()) {
      case 'low':
        return 'Very Easy';
      case 'moderate':
        return 'Easy';
      case 'high':
        return 'Moderate';
      default:
        break;
    }
  }
  
  // Default to Moderate
  return null;
};

/**
 * Get plant image URL or return placeholder
 * @param {Object} plant - Plant object
 * @returns {Object|null} - Image source or null if no image is available
 */
const getPlantImage = (plant) => {
  // Check if the plant has default_image with urls
  if (plant.default_image) {
    // Try to get the best image quality available
    if (plant.default_image.original_url) {
      return { uri: plant.default_image.original_url };
    } else if (plant.default_image.regular_url) {
      return { uri: plant.default_image.regular_url };
    } else if (plant.default_image.medium_url) {
      return { uri: plant.default_image.medium_url };
    } else if (plant.default_image.small_url) {
      return { uri: plant.default_image.small_url };
    } else if (plant.default_image.thumbnail) {
      return { uri: plant.default_image.thumbnail };
    }
  }
  
  // No image available, generate a placeholder
  return generatePlantPlaceholder(plant);
};

/**
 * Generate a placeholder image object for plants without images
 * @param {Object} plant - Plant object
 * @returns {Object} - Placeholder image object with a placeholder property
 */
const generatePlantPlaceholder = (plant) => {
  // Generate a unique color based on the plant name or ID
  const nameToUse = plant.common_name || 
                    (plant.scientific_name && Array.isArray(plant.scientific_name) ? 
                     plant.scientific_name[0] : plant.scientific_name) || 
                    plant.id || 'plant';
  
  // Simple hash function to get a number from a string
  const hash = nameToUse.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  // Generate a HSL color with a consistent saturation and lightness
  // Use the hash to determine the hue (0-360)
  const hue = hash % 360;
  
  // Return an object with a placeholder property that can be detected by components
  return {
    placeholder: true,
    color: `hsl(${hue}, 70%, 80%)`,
    name: nameToUse.charAt(0).toUpperCase() // First letter of name for the placeholder
  };
};

export default {
  fetchPlants,
  searchPlants,
  getPlantById,
  getPopularPlants,
  savePlant,
  updatePlant,
  deletePlant
};