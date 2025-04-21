import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  StatusBar,
  Switch,
  Modal,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSelector, useDispatch } from 'react-redux';
import { toggleReminderEnabled, markReminderCompleted, fetchReminders } from '../store/remindersSlice';

const AllAlertsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [filter, setFilter] = useState('all'); // 'all', 'today', 'upcoming', 'completed'
  const [showNoPlantsModal, setShowNoPlantsModal] = useState(false);
  
  // Get all reminders and loading state
  const reminders = useSelector(state => state.reminders.reminders);
  const status = useSelector(state => state.reminders.status);
  const userPlants = useSelector(state => state.plants.userPlants);
  
  // Fetch reminders on component mount
  useEffect(() => {
    const loadReminders = async () => {
      console.log('Starting to fetch reminders...');
      try {
        await dispatch(fetchReminders()).unwrap();
        console.log('Successfully fetched reminders');
      } catch (error) {
        console.error('Failed to fetch reminders:', error);
        Alert.alert(
          'Error',
          'Failed to load reminders. Please try again.',
          [{ text: 'OK' }]
        );
      }
    };
    
    loadReminders();
    
    // Reload reminders when the component is focused
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Screen focused, reloading reminders...');
      loadReminders();
    });
    
    return unsubscribe;
  }, [dispatch, navigation]);
  
  // Get current date for filtering
  const today = new Date().toISOString().split('T')[0];
  
  // Filter reminders based on the selected filter
  const filteredReminders = reminders.filter(reminder => {
    if (!reminder) return false;
    
    console.log('Checking reminder:', reminder);
    
    // Add better date handling and comparison
    const reminderDate = reminder.nextDue ? new Date(reminder.nextDue).toISOString().split('T')[0] : null;
    const lastCompletedDate = reminder.lastCompleted ? new Date(reminder.lastCompleted).toISOString().split('T')[0] : null;
    
    // Debug logging
    console.log(`Reminder "${reminder.type}" for "${reminder.plantName}": nextDue=${reminderDate}, today=${today}, lastCompleted=${lastCompletedDate}`);
    
    if (filter === 'all') return true;
    
    if (filter === 'today') {
      return reminderDate === today;
    }
    
    if (filter === 'upcoming') {
      if (!reminderDate) return false;
      return reminderDate > today;
    }
    
    if (filter === 'completed') {
      if (!lastCompletedDate) return false;
      return lastCompletedDate === today;
    }
    
    return true;
  });

  console.log('All reminders:', reminders);
  console.log('Filtered reminders:', filteredReminders);
  console.log('Current filter:', filter);
  console.log('Today\'s date:', today);

  const handleToggleEnabled = (reminderId) => {
    dispatch(toggleReminderEnabled(reminderId));
  };

  const handleMarkCompleted = (reminderId) => {
    dispatch(markReminderCompleted({
      reminderId,
      completionDate: today
    }));
  };

  const handleAddReminder = () => {
    if (userPlants.length === 0) {
      setShowNoPlantsModal(true);
      return;
    }
    navigation.navigate('SetReminder');
  };

  const renderReminderItem = ({ item }) => {
    if (!item) return null;
    
    console.log('Rendering reminder item:', item);
    
    // Properly format dates for comparison
    const reminderDate = item.nextDue ? new Date(item.nextDue).toISOString().split('T')[0] : null;
    const isToday = reminderDate === today;
    const isPast = reminderDate && reminderDate < today;
    
    // Get the associated plant
    const plant = userPlants.find(p => p.id === item.plantId);
    
    // Get the plant name from various sources
    const plantName = item.plantName || (plant ? plant.name : 'Unknown Plant');
    
    const getPlantImage = () => {
      if (!plant) return null;
      
      if (plant.default_image && plant.default_image.medium_url) {
        return { uri: plant.default_image.medium_url };
      }
      
      if (typeof plant.image === 'number') return plant.image;
      if (plant.image && plant.image.uri) return { uri: plant.image.uri };
      if (typeof plant.image === 'string') return { uri: plant.image };
      if (plant.image_url) return { uri: plant.image_url };
      
      return null;
    };
    
    const plantImage = getPlantImage();
    const hasImage = !!plantImage;
    
    return (
      <TouchableOpacity 
        style={[
          styles.reminderItem,
          isPast && styles.overdueReminderItem
        ]}
        onPress={() => navigation.navigate('ReminderDetail', { reminderId: item.id })}
      >
        {hasImage ? (
          <Image 
            source={plantImage} 
            style={styles.reminderImage} 
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.reminderImage, styles.reminderPlaceholder]}>
            <Text style={styles.reminderPlaceholderText}>
              {plantName.charAt(0)}
            </Text>
          </View>
        )}
        <View style={styles.reminderInfo}>
          <Text style={styles.reminderTitle}>
            {item.type === 'watering' 
              ? `Water your ${plantName}` 
              : item.type === 'fertilizing'
                ? `Fertilize your ${plantName}`
                : item.type === 'pruning'
                  ? `Prune your ${plantName}`
                  : `Check your ${plantName}`
            }
            {item.location ? ` (${item.location.toLowerCase()})` : ''}
          </Text>
          
          <Text style={styles.reminderDate}>
            {isToday 
              ? 'Today' 
              : isPast
                ? `Overdue: ${item.nextDue}`
                : `Due: ${item.nextDue}`
            }
          </Text>
          
          <View style={styles.reminderActions}>
            <Switch
              value={!!item.enabled}
              onValueChange={() => handleToggleEnabled(item.id)}
              trackColor={{ false: '#DDDDDD', true: '#A5D6A7' }}
              thumbColor={item.enabled ? '#4CAF50' : '#F5F5F5'}
              style={styles.reminderSwitch}
            />
            
            {isToday && (
              <TouchableOpacity 
                style={styles.completeButton} 
                onPress={() => handleMarkCompleted(item.id)}
              >
                <Text style={styles.completeButtonText}>Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity 
        style={[styles.filterButton, filter === 'all' && styles.activeFilterButton]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>All</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.filterButton, filter === 'today' && styles.activeFilterButton]}
        onPress={() => setFilter('today')}
      >
        <Text style={[styles.filterText, filter === 'today' && styles.activeFilterText]}>Today</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.filterButton, filter === 'upcoming' && styles.activeFilterButton]}
        onPress={() => setFilter('upcoming')}
      >
        <Text style={[styles.filterText, filter === 'upcoming' && styles.activeFilterText]}>Upcoming</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.filterButton, filter === 'completed' && styles.activeFilterButton]}
        onPress={() => setFilter('completed')}
      >
        <Text style={[styles.filterText, filter === 'completed' && styles.activeFilterText]}>Completed</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="hourglass-outline" size={60} color="#CCCCCC" />
          <Text style={styles.emptyText}>Loading reminders...</Text>
        </View>
      );
    }

    if (status === 'failed') {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF5252" />
          <Text style={styles.emptyText}>Failed to load reminders</Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => dispatch(fetchReminders())}
          >
            <Text style={styles.createButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Check if we have valid reminders
    console.log('Reminders data:', JSON.stringify(reminders));
    console.log('Filtered reminders:', JSON.stringify(filteredReminders));
    
    if (!Array.isArray(reminders) || reminders.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={60} color="#CCCCCC" />
          <Text style={styles.emptyText}>No alerts found</Text>
          <Text style={styles.emptySubtext}>
            You have no plant care alerts setup yet
          </Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={handleAddReminder}
          >
            <Text style={styles.createButtonText}>Create Alert</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (filteredReminders.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={60} color="#CCCCCC" />
          <Text style={styles.emptyText}>No alerts found</Text>
          <Text style={styles.emptySubtext}>
            {filter === 'all' 
              ? 'You have no plant care alerts setup yet' 
              : filter === 'today'
                ? 'You have no alerts for today'
                : filter === 'upcoming'
                  ? 'You have no upcoming alerts'
                  : 'You have no completed alerts'}
          </Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={handleAddReminder}
          >
            <Text style={styles.createButtonText}>Create Alert</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredReminders.filter(reminder => reminder !== null && reminder !== undefined)}
        renderItem={renderReminderItem}
        keyExtractor={item => String(item.id || Math.random().toString())}
        contentContainerStyle={styles.reminderList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={60} color="#CCCCCC" />
            <Text style={styles.emptyText}>No alerts found</Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={handleAddReminder}
            >
              <Text style={styles.createButtonText}>Create Alert</Text>
            </TouchableOpacity>
          </View>
        }
      />
    );
  };

  const NoPlantsModal = () => (
    <Modal
      visible={showNoPlantsModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowNoPlantsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalIconContainer}>
            <Ionicons name="leaf-outline" size={48} color="#4CAF50" />
          </View>
          <Text style={styles.modalTitle}>No Plants in Collection</Text>
          <Text style={styles.modalMessage}>
            You need to add plants to your collection before setting up reminders. Would you like to add some plants now?
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowNoPlantsModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => {
                setShowNoPlantsModal(false);
                navigation.navigate('PlantList', { category: 'All Plants', usePopularPlants: true });
              }}
            >
              <Text style={styles.confirmButtonText}>Add Plants</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
        <Text style={styles.title}>All Alerts</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddReminder}
        >
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {renderFilterButtons()}
      {renderContent()}
      <NoPlantsModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FFF8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  activeFilterButton: {
    backgroundColor: '#E8F5E9',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  reminderList: {
    padding: 16,
  },
  reminderItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  overdueReminderItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF5252',
  },
  reminderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  reminderPlaceholder: {
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderPlaceholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reminderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    ...Platform.select({
      ios: {
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default AllAlertsScreen; 