import axios from 'axios';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// PlantNet API Configuration
const API_KEY = '2b10MTO9hSwmHFBeb8mEdGoPC'; // IMPORTANT: This is a test key - get your own key from https://my.plantnet.org/
const API_URL = 'https://my-api.plantnet.org/v2/identify/all';

/**
 * Plant Identification Service
 * Uses the Pl@ntNet API to identify plants from images
 */
const plantIdentificationService = {
  /**
   * Identify a plant from an image uri
   * @param {string} imageUri - The URI of the image to identify
   * @param {Object} options - Additional options for identification
   * @param {string} options.organ - The plant organ in the image (leaf, flower, fruit, bark, habit)
   * @returns {Promise<Array>} - Array of potential plant matches
   */
  identifyPlant: async (imageUri, options = {}) => {
    try {
      // Create a FormData object to send the image
      const formData = new FormData();
      
      // Add the image to the form data
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      // Check if the file exists and is accessible
      try {
        const fileInfo = await FileSystem.getInfoAsync(imageUri);
        if (!fileInfo.exists) {
          throw new Error('Image file does not exist or is not accessible');
        }
      } catch (fileError) {
        console.log('Error checking file:', fileError);
        // Continue anyway as the image might be accessible in other ways
      }

      // Create file object to send
      formData.append('images', {
        uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
        name: filename || 'plant_image.jpg',
        type
      });

      // Add organ parameter if provided
      if (options.organ) {
        formData.append('organs', options.organ);
      } else {
        // Default to auto-detection if no organ specified
        formData.append('organs', 'auto');
      }

      // Make the API call to PlantNet
      console.log('Sending request to PlantNet API...');
      const response = await axios.post(`${API_URL}?api-key=${API_KEY}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000 // 30 second timeout
      });

      console.log('PlantNet API response received');
      
      // Process the response
      if (response.data && response.data.results && response.data.results.length > 0) {
        return response.data.results.map(result => {
          // Handle the case where some data might be missing
          const species = result.species || {};
          const family = species.family || {};
          const genus = species.genus || {};
          
          // Generate a unique ID string if scientificName is available, otherwise use timestamp
          const uniqueId = species.scientificNameWithoutAuthor 
            ? `plant_${species.scientificNameWithoutAuthor.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`
            : `unknown_plant_${Date.now()}`;
          
          return {
            id: uniqueId,
            name: (species.commonNames && species.commonNames.length > 0) 
              ? species.commonNames[0] 
              : (species.scientificNameWithoutAuthor || 'Unknown Plant'),
            scientificName: species.scientificNameWithoutAuthor || 'Unknown',
            family: family.scientificNameWithoutAuthor || 'Unknown',
            genus: genus.scientificNameWithoutAuthor || 'Unknown',
            confidence: result.score || 0,
            matchedImages: result.images || [],
            image: (result.images && result.images.length > 0 && result.images[0].url)
              ? result.images[0].url.m || result.images[0].url.o || result.images[0].url.s
              : null
          };
        });
      }
      
      // If we got here with data but no results, return empty array
      if (response.data) {
        console.log('No plants identified in the image');
        return [];
      }
      
      // If we get an unexpected response
      throw new Error('Invalid response from PlantNet API');
    } catch (error) {
      console.error('Error identifying plant:', error.message || error);
      // For network errors, provide a more specific message
      if (error.code === 'ECONNABORTED') {
        throw new Error('Connection timeout. Please try again.');
      }
      if (error.response) {
        console.log('Error response:', error.response.status, error.response.data);
        if (error.response.status === 404) {
          throw new Error('Plant identification service not found');
        }
        if (error.response.status === 403) {
          throw new Error('API key invalid or quota exceeded');
        }
      }
      throw error;
    }
  },

  /**
   * Get additional information about an identified plant
   * @param {string} scientificName - The scientific name of the plant to get more information about
   * @returns {Promise<Object>} - Detailed plant information
   */
  getPlantInformation: async (scientificName) => {
    try {
      // For now, we'll return mock data
      // In a production app, you would call another API to get more detailed information
      
      return {
        scientificName,
        description: `${scientificName} is a plant identified using the Pl@ntNet service. This is a placeholder description that would typically come from a plant database API.`,
        careInstructions: {
          watering: 'Regular watering, allowing soil to dry slightly between waterings',
          light: 'Medium to bright indirect light',
          soil: 'Well-draining potting mix',
          fertilizer: 'Monthly during growing season with balanced fertilizer'
        },
        toxicity: 'Unknown - please research this plant before keeping it around children or pets',
        propagation: 'Typically propagated by cuttings, division, or seeds depending on the species'
      };
    } catch (error) {
      console.error('Error getting plant information:', error);
      throw new Error('Failed to get detailed plant information');
    }
  }
};

export default plantIdentificationService; 