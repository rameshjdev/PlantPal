import React, { useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Platform } from 'react-native';
import SvgImage from '../utils/SvgImage';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPlants } from '../store/plantsSlice';

const HomeScreen = () => {
  const navigation = useNavigation();
  
  // Mock data for plant categories
  const categories = [
    { id: '1', name: 'Indoor Plants', image: require('../../assets/indoor.png') },
    { id: '2', name: 'Succulents', image: require('../../assets/succulent.png') },
    { id: '3', name: 'Flowering Plants', image: require('../../assets/flowering.png') },
    { id: '4', name: 'Herbs', image: require('../../assets/herbs.png') },
  ];

  const dispatch = useDispatch();
  const myPlants = useSelector(state => state.plants.plants);

  useEffect(() => {
    dispatch(fetchPlants());
  }, [dispatch]);

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.categoryItem}
      onPress={() => navigation.navigate('PlantList', { category: item.name })}
    >
      <SvgImage source={item.image} style={styles.categoryImage} />
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderPlantItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.plantItem}
      onPress={() => navigation.navigate('PlantDetail', { plantId: item.id })}
    >
      <SvgImage source={item.image} style={styles.plantImage} />
      <View style={styles.plantInfo}>
        <Text style={styles.plantName}>{item.name}</Text>
        <Text style={styles.plantSpecies}>{item.species}</Text>
        <Text style={styles.plantWatered}>Last watered: {item.lastWatered}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>PlantPal</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <SvgImage 
              source={require('../../assets/profile.png')} 
              style={styles.profileIcon} 
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Browse Categories</Text>
        <FlatList
          horizontal
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          style={styles.categoryList}
        />

        <View style={styles.myPlantsHeader}>
          <Text style={styles.sectionTitle}>My Plants</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddPlantTab')}>
            <View style={styles.addButtonContainer}>
              <MaterialCommunityIcons name="plus" size={16} color="#2E7D32" />
              <Text style={styles.addButton}>Add</Text>
            </View>
          </TouchableOpacity>
        </View>

        <FlatList
          data={myPlants}
          renderItem={renderPlantItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          style={styles.plantList}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: Platform.OS === 'ios' ? 0 : 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'contain',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  categoryList: {
    marginBottom: 20,
  },
  categoryItem: {
    marginRight: 15,
    alignItems: 'center',
    width: 100,
  },
  categoryImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  categoryName: {
    textAlign: 'center',
    fontSize: 14,
  },
  myPlantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addButton: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: 'bold',
  },
  plantList: {
    flex: 1,
  },
  addButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plantItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
      },
      android: {
        elevation: 2,
      }
    }),
  },
  plantImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
    resizeMode: 'contain',
  },
  plantInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  plantName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  plantSpecies: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  plantWatered: {
    fontSize: 12,
    color: '#2E7D32',
  },
});

export default HomeScreen;