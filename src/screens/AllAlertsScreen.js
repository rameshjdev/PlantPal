import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  StatusBar,
  Switch 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSelector, useDispatch } from 'react-redux';
import { toggleReminderEnabled, markReminderCompleted } from '../store/remindersSlice';

const AllAlertsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [filter, setFilter] = useState('all'); // 'all', 'today', 'upcoming', 'completed'
  
  // Get all reminders
  const reminders = useSelector(state => state.reminders.reminders);
  
  // Get current date for filtering
  const today = new Date().toISOString().split('T')[0];
  
  // Filter reminders based on the selected filter
  const filteredReminders = reminders.filter(reminder => {
    if (filter === 'all') return true;
    if (filter === 'today') return reminder.nextDue === today;
    if (filter === 'upcoming') return reminder.nextDue > today;
    if (filter === 'completed') {
      return reminder.lastCompleted && reminder.lastCompleted === today;
    }
    return true;
  });

  const handleToggleEnabled = (reminderId) => {
    dispatch(toggleReminderEnabled(reminderId));
  };

  const handleMarkCompleted = (reminderId) => {
    dispatch(markReminderCompleted({
      reminderId,
      completionDate: today
    }));
  };

  const renderReminderItem = ({ item }) => {
    const isToday = item.nextDue === today;
    const isPast = item.nextDue < today;
    
    let imageUrl;
    if (item.type === 'watering') {
      imageUrl = 'https://images.unsplash.com/photo-1604762524889-3e2fcc145683?w=200';
    } else if (item.type === 'fertilizing') {
      imageUrl = 'https://images.unsplash.com/photo-1611438213165-e9d6606e59a1?w=200';
    } else if (item.type === 'pruning') {
      imageUrl = 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=200';
    } else {
      imageUrl = 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=200';
    }
    
    return (
      <TouchableOpacity 
        style={[
          styles.reminderItem,
          isPast && styles.overdueReminderItem
        ]}
        onPress={() => navigation.navigate('ReminderDetail', { reminderId: item.id })}
      >
        <Image source={{ uri: imageUrl }} style={styles.reminderImage} />
        <View style={styles.reminderInfo}>
          <Text style={styles.reminderTitle}>
            {item.type === 'watering' 
              ? `Water your ${item.plantName}` 
              : item.type === 'fertilizing'
                ? `Fertilize your ${item.plantName}`
                : item.type === 'pruning'
                  ? `Prune your ${item.plantName}`
                  : `Check your ${item.plantName}`
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
              value={item.enabled}
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
          onPress={() => navigation.navigate('SetReminder')}
        >
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {renderFilterButtons()}

      {filteredReminders.length > 0 ? (
        <FlatList
          data={filteredReminders}
          renderItem={renderReminderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.reminderList}
        />
      ) : (
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
            onPress={() => navigation.navigate('SetReminder')}
          >
            <Text style={styles.createButtonText}>Create Alert</Text>
          </TouchableOpacity>
        </View>
      )}
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
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
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
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
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AllAlertsScreen; 