import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Switch, Alert, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchReminders, toggleReminderEnabled, deleteReminder, markReminderCompleted } from '../store/remindersSlice';
import { cancelNotification, schedulePlantCareReminder } from '../services/notificationService';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const ReminderItem = ({ reminder, onToggle, onEdit, onDelete, onComplete }) => {
  // Format the time (HH:MM) to a more readable format
  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Get icon based on reminder type
  const getReminderIcon = (type) => {
    switch (type) {
      case 'watering': return '💧';
      case 'fertilizing': return '🌱';
      case 'rotation': return '🔄';
      case 'repotting': return '🪴';
      default: return '⏰';
    }
  };

  // Format the next due date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.reminderItem}>
      <View style={styles.reminderHeader}>
        <View style={styles.reminderIconContainer}>
          <Text style={styles.reminderIcon}>{getReminderIcon(reminder.type)}</Text>
        </View>
        <View style={styles.reminderInfo}>
          <Text style={styles.reminderTitle}>{reminder.plantName}</Text>
          <Text style={styles.reminderType}>
            {reminder.type.charAt(0).toUpperCase() + reminder.type.slice(1)} • {formatTime(reminder.time)}
          </Text>
          <Text style={styles.reminderFrequency}>
            {reminder.frequency.charAt(0).toUpperCase() + reminder.frequency.slice(1)}
            {reminder.day ? ` on ${reminder.day}` : ''}
          </Text>
          <Text style={styles.reminderNextDue}>Next: {formatDate(reminder.nextDue)}</Text>
        </View>
        <Switch
          value={reminder.enabled}
          onValueChange={() => onToggle(reminder.id)}
          trackColor={{ false: '#E0E0E0', true: '#AED581' }}
          thumbColor={reminder.enabled ? '#2E7D32' : '#BDBDBD'}
        />
      </View>
      <View style={styles.reminderActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onComplete(reminder.id)}>
          <Text style={styles.actionButtonText}>Mark Done</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(reminder)}>
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => onDelete(reminder.id)}>
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const RemindersScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { reminders, status } = useSelector((state) => state.reminders);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    dispatch(fetchReminders());
  }, [dispatch]);

  // Filter reminders based on selected type
  const filteredReminders = filterType === 'all' 
    ? reminders 
    : reminders.filter(reminder => reminder.type === filterType);

  // Handle toggling a reminder's enabled status
  const handleToggleReminder = async (reminderId) => {
    const reminder = reminders.find(r => r.id === reminderId);
    
    if (reminder) {
      // Toggle in Redux store
      dispatch(toggleReminderEnabled(reminderId));
      
      // Update notification
      if (!reminder.enabled) {
        // If enabling, schedule a new notification
        try {
          const notificationId = await schedulePlantCareReminder({
            ...reminder,
            enabled: true
          });
          console.log('Scheduled notification:', notificationId);
        } catch (error) {
          console.error('Failed to schedule notification:', error);
        }
      } else {
        // If disabling, cancel the notification
        try {
          await cancelNotification(reminder.notificationId);
        } catch (error) {
          console.error('Failed to cancel notification:', error);
        }
      }
    }
  };

  // Handle editing a reminder
  const handleEditReminder = (reminder) => {
    navigation.navigate('SetReminder', { 
      plantId: reminder.plantId,
      reminderId: reminder.id,
      editMode: true
    });
  };

  // Handle deleting a reminder
  const handleDeleteReminder = (reminderId) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const reminder = reminders.find(r => r.id === reminderId);
            
            // Delete from Redux store
            dispatch(deleteReminder(reminderId));
            
            // Cancel notification if it exists
            if (reminder && reminder.notificationId) {
              try {
                await cancelNotification(reminder.notificationId);
              } catch (error) {
                console.error('Failed to cancel notification:', error);
              }
            }
          }
        },
      ]
    );
  };

  // Handle marking a reminder as completed
  const handleCompleteReminder = (reminderId) => {
    const today = new Date().toISOString().split('T')[0];
    dispatch(markReminderCompleted({ reminderId, completionDate: today }));
    
    // Show confirmation
    Alert.alert('Success', 'Reminder marked as completed!');
  };

  // Render filter buttons
  const renderFilterButtons = () => {
    const filters = [
      { label: 'All', value: 'all' },
      { label: '💧 Watering', value: 'watering' },
      { label: '🌱 Fertilizing', value: 'fertilizing' },
      { label: '🔄 Rotation', value: 'rotation' },
      { label: '🪴 Repotting', value: 'repotting' },
    ];
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.value}
            style={[styles.filterButton, filterType === filter.value && styles.filterButtonActive]}
            onPress={() => setFilterType(filter.value)}
          >
            <Text 
              style={[styles.filterButtonText, filterType === filter.value && styles.filterButtonTextActive]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Plant Care Reminders</Text>
        </View>
        
        {renderFilterButtons()}
        
        {status === 'loading' ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading reminders...</Text>
          </View>
        ) : filteredReminders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No reminders found</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('PlantList', { selectForReminder: true })}
            >
              <View style={styles.addButtonContent}>
                <MaterialCommunityIcons name="plus" size={18} color="white" />
                <Text style={styles.addButtonText}>Add Reminder</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredReminders}
            renderItem={({ item }) => (
              <ReminderItem 
                reminder={item} 
                onToggle={handleToggleReminder}
                onEdit={handleEditReminder}
                onDelete={handleDeleteReminder}
                onComplete={handleCompleteReminder}
              />
            )}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
          />
        )}
        
        {filteredReminders.length > 0 && (
          <TouchableOpacity 
            style={styles.floatingButton}
            onPress={() => navigation.navigate('PlantList', { selectForReminder: true })}
          >
            <MaterialCommunityIcons name="plus" size={24} color="white" />
          </TouchableOpacity>
        )}
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
    paddingBottom: 80, // Add padding to prevent content from being hidden behind the button
  },
  header: {
    backgroundColor: '#2E7D32',
    paddingTop: Platform.OS === 'ios' ? 10 : 30,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'flex-start', // Align items to the left
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: Platform.OS === 'ios' ? 40 : 20, // Add margin top to push title down
  },
  filterContainer: {
    marginTop: 15,
    marginBottom: 5,
  },
  filterContent: {
    paddingHorizontal: 15,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonIcon: {
    marginRight: 4,
  },
  filterButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  filterButtonText: {
    color: '#666666',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 15,
  },
  reminderItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      }
    }),
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F8E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  reminderIcon: {
    fontSize: 24,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  reminderType: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  reminderFrequency: {
    fontSize: 14,
    color: '#666666',
  },
  reminderNextDue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 4,
  },
  reminderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 10,
  },
  actionButtonText: {
    color: '#2E7D32',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  floatingButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999, // Add zIndex to ensure button appears above content
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      }
    }),
  },
});

export default RemindersScreen;