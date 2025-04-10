import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSelector, useDispatch } from 'react-redux';
import { toggleReminderEnabled, markReminderCompleted, deleteReminder } from '../store/remindersSlice';

const ReminderDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const reminderId = route.params?.reminderId;
  
  // Get the specific reminder from the Redux store
  const reminder = useSelector(state => 
    state.reminders.reminders.find(r => r.id === reminderId)
  );
  
  // Get the associated plant if any
  const plant = useSelector(state => 
    state.plants.userPlants.find(p => p.id === reminder?.plantId)
  );
  
  // Get current date for operations
  const today = new Date().toISOString().split('T')[0];
  
  // Calculate if the reminder is for today, overdue, or upcoming
  const isToday = reminder?.nextDue === today;
  const isPast = reminder?.nextDue < today;
  const isUpcoming = reminder?.nextDue > today;
  
  if (!reminder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Reminder Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Reminder not found</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Get appropriate image based on reminder type
  let imageUrl;
  if (reminder.type === 'watering') {
    imageUrl = 'https://images.unsplash.com/photo-1604762524889-3e2fcc145683?w=200';
  } else if (reminder.type === 'fertilizing') {
    imageUrl = 'https://images.unsplash.com/photo-1611438213165-e9d6606e59a1?w=200';
  } else if (reminder.type === 'pruning') {
    imageUrl = 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=200';
  } else {
    imageUrl = 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=200';
  }
  
  const handleToggleEnabled = () => {
    dispatch(toggleReminderEnabled(reminder.id));
  };

  const handleMarkCompleted = () => {
    dispatch(markReminderCompleted({
      reminderId: reminder.id,
      completionDate: today
    }));
    Alert.alert(
      'Reminder Completed',
      'This task has been marked as complete. The next occurrence has been scheduled.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };
  
  const handleDeleteReminder = () => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch(deleteReminder(reminder.id));
            navigation.goBack();
          }
        }
      ]
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
        <Text style={styles.title}>Reminder Details</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => navigation.navigate('SetReminder', { 
            reminderToEdit: reminder
          })}
        >
          <Ionicons name="pencil" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Banner with plant image */}
        <View style={styles.banner}>
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.bannerImage} 
          />
          <View style={styles.bannerOverlay} />
          <View style={styles.bannerContent}>
            <Text style={styles.reminderType}>
              {reminder.type.charAt(0).toUpperCase() + reminder.type.slice(1)} Reminder
            </Text>
            <Text style={styles.reminderTitle}>
              {reminder.type === 'watering' 
                ? `Water your ${reminder.plantName}` 
                : reminder.type === 'fertilizing'
                  ? `Fertilize your ${reminder.plantName}`
                  : reminder.type === 'pruning'
                    ? `Prune your ${reminder.plantName}`
                    : `Check your ${reminder.plantName}`
              }
            </Text>
          </View>
        </View>
        
        {/* Reminder Info */}
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={24} color="#4CAF50" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Due Date</Text>
              <Text style={[
                styles.infoValue, 
                isToday && styles.todayText,
                isPast && styles.overdueText,
                isUpcoming && styles.upcomingText
              ]}>
                {isToday 
                  ? 'Today' 
                  : isPast
                    ? `Overdue: ${reminder.nextDue}`
                    : `${reminder.nextDue}`
                }
              </Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="repeat-outline" size={24} color="#4CAF50" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Frequency</Text>
              <Text style={styles.infoValue}>
                {reminder.frequency === 'daily' ? 'Every day' :
                 reminder.frequency === 'every3days' ? 'Every 3 days' :
                 reminder.frequency === 'weekly' ? 'Every week' :
                 reminder.frequency === 'biweekly' ? 'Every 2 weeks' :
                 reminder.frequency === 'monthly' ? 'Every month' :
                 reminder.frequency === 'quarterly' ? 'Every 3 months' :
                 reminder.frequency === 'sixmonthly' ? 'Every 6 months' :
                 reminder.frequency === 'yearly' ? 'Every year' : 
                 'Custom'}
              </Text>
            </View>
          </View>
          
          {reminder.day && (
            <View style={styles.infoItem}>
              <Ionicons name="today-outline" size={24} color="#4CAF50" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Preferred Day</Text>
                <Text style={styles.infoValue}>{reminder.day}</Text>
              </View>
            </View>
          )}
          
          {reminder.time && (
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={24} color="#4CAF50" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Preferred Time</Text>
                <Text style={styles.infoValue}>{reminder.time}</Text>
              </View>
            </View>
          )}
          
          {reminder.location && (
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={24} color="#4CAF50" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{reminder.location}</Text>
              </View>
            </View>
          )}
          
          {reminder.lastCompleted && (
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Last Completed</Text>
                <Text style={styles.infoValue}>{reminder.lastCompleted}</Text>
              </View>
            </View>
          )}
          
          <View style={styles.divider} />
          
          {/* Plant Info - if plant exists */}
          {plant && (
            <TouchableOpacity 
              style={styles.plantContainer}
              onPress={() => navigation.navigate('PlantDetail', { plantId: plant.id })}
            >
              <Image 
                source={{ uri: plant.image }} 
                style={styles.plantImage} 
              />
              <View style={styles.plantInfo}>
                <Text style={styles.plantName}>{plant.name}</Text>
                <Text style={styles.plantSpecies}>{plant.species || 'Houseplant'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>
          )}
          
          <View style={styles.divider} />
          
          {/* Actions */}
          <View style={styles.actionsContainer}>
            <View style={styles.enableContainer}>
              <Text style={styles.enableLabel}>Enable Reminder</Text>
              <Switch
                value={reminder.enabled}
                onValueChange={handleToggleEnabled}
                trackColor={{ false: '#DDDDDD', true: '#A5D6A7' }}
                thumbColor={reminder.enabled ? '#4CAF50' : '#F5F5F5'}
              />
            </View>
            
            {isToday && (
              <TouchableOpacity 
                style={styles.completeButton}
                onPress={handleMarkCompleted}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text style={styles.completeButtonText}>Mark as Complete</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDeleteReminder}
            >
              <Ionicons name="trash-outline" size={18} color="#FFF" />
              <Text style={styles.deleteButtonText}>Delete Reminder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  banner: {
    height: 200,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bannerContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  reminderType: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  reminderTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  infoContainer: {
    padding: 16,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  todayText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  overdueText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  upcomingText: {
    color: '#2196F3',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 16,
  },
  plantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
  },
  plantImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  plantInfo: {
    flex: 1,
  },
  plantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  plantSpecies: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    marginTop: 8,
  },
  enableContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  enableLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  completeButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
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
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ReminderDetailScreen; 