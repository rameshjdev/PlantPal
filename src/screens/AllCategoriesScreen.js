import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';

// Memoized selector for categories
const selectPlantCategories = createSelector(
  state => state.plants.userPlants,
  userPlants => {
    const categoriesMap = userPlants.reduce((acc, plant) => {
      if (plant.location) {
        if (!acc[plant.location]) {
          acc[plant.location] = 0;
        }
        acc[plant.location]++;
      }
      return acc;
    }, {});
    
    // Ensure these categories exist even if they're empty
    const defaultCategories = ['Living Room', 'Kitchen', 'Drawing Room', 'Backyard'];
    defaultCategories.forEach(category => {
      if (!categoriesMap[category]) {
        categoriesMap[category] = 0;
      }
    });
    
    // Convert to array of objects for FlatList
    return Object.keys(categoriesMap).map(category => ({
      name: category,
      count: categoriesMap[category]
    }));
  }
);

const AllCategoriesScreen = () => {
  const navigation = useNavigation();
  const categories = useSelector(selectPlantCategories);

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'Kitchen':
        return { name: 'cafe-outline', bg: '#E3F2FD', color: '#1565C0' };
      case 'Drawing Room':
        return { name: 'home-outline', bg: '#FFF3E0', color: '#E65100' };
      case 'Backyard':
        return { name: 'flower-outline', bg: '#F3E5F5', color: '#6A1B9A' };
      case 'Living Room':
      default:
        return { name: 'square-outline', bg: '#E8F5E9', color: '#2E7D32' };
    }
  };

  const renderCategoryItem = ({ item }) => {
    const { name, count } = item;
    const { name: iconName, bg: backgroundColor, color: iconColor } = getCategoryIcon(name);
    
    return (
      <TouchableOpacity
        style={styles.categoryItem}
        onPress={() => navigation.navigate('CategoryPlants', { category: name })}
      >
        <View style={[styles.categoryIcon, { backgroundColor }]}>
          <Ionicons name={iconName} size={28} color={iconColor} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{name}</Text>
          <Text style={styles.categoryCount}>{count} Plants</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#999" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>All Categories</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={item => item.name}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  listContainer: {
    padding: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 14,
    color: '#666',
  },
});

export default AllCategoriesScreen; 