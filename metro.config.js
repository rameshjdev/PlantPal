// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add resolution for expo-linear-gradient specifically
const modules = ['expo-linear-gradient'];
modules.forEach(module => {
  config.resolver.extraNodeModules[module] = require.resolve(module);
});

// Ensure we use a single instance of the expo-linear-gradient module
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Specifically target expo-linear-gradient to resolve any potential conflicts
  if (moduleName === 'expo-linear-gradient' || moduleName === 'react-native-linear-gradient') {
    return {
      filePath: require.resolve('expo-linear-gradient'),
      type: 'sourceFile',
    };
  }
  
  // Use the default resolver for all other modules
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config; 