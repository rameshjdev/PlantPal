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
  Platform,
  ActivityIndicator
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
  
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

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

  const renderBanner = () => {
    const plantImage = getPlantImage();
    const hasImage = !!plantImage;

    return (
      <View style={styles.banner}>
        {hasImage ? (
          <Image 
            source={plantImage}
            style={styles.bannerImage}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
          />
        ) : (
          <View style={[styles.bannerImage, styles.bannerPlaceholder]}>
            <Ionicons name="leaf-outline" size={48} color="#4CAF50" />
          </View>
        )}
        {imageLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        )}
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
            reminderId: reminder.id
          })}
        >
          <Ionicons name="pencil" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {renderBanner()}
        
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
          
          {reminder.notes && (
            <View style={styles.infoItem}>
              <Ionicons name="document-text-outline" size={24} color="#4CAF50" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Notes</Text>
                <Text style={styles.infoValue}>{reminder.notes}</Text>
              </View>
            </View>
          )}
          
          {/* <View style={styles.divider} /> */}
          
          {/* Plant Info - if plant exists */}
          {/* {plant && (
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
          )} */}
          
          {/* <View style={styles.divider} /> */}
          
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
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
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
    height: 280,
    position: 'relative',
    marginBottom: 24,
    backgroundColor: '#E8F5E9',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: 280,
    resizeMode: 'cover',
  },
  bannerPlaceholder: {
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
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
    bottom: 32,
    left: 24,
    right: 24,
  },
  reminderType: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  reminderTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    lineHeight: 38,
  },
  infoContainer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: -32,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
  },
  infoTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  todayText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  overdueText: {
    color: '#FF5252',
    fontWeight: '600',
  },
  upcomingText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 20,
  },
  plantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  plantImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginRight: 16,
  },
  plantInfo: {
    flex: 1,
  },
  plantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  plantSpecies: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  enableContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  enableLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  deleteButton: {
    backgroundColor: '#FF5252',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FF5252',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
    letterSpacing: 0.5,
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
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
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
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default ReminderDetailScreen; 