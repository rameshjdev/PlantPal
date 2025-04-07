import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch, ScrollView, Platform, Alert, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { addReminder, updateReminder } from '../store/remindersSlice';
import { schedulePlantCareReminder, cancelNotification } from '../services/notificationService';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { nanoid } from '@reduxjs/toolkit';

const SetReminderScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  
  // Get reminder ID from params if we're editing
  const reminderId = route.params?.reminderId;
  // Get plant ID from params if coming from plant detail
  const plantIdFromParams = route.params?.plantId;
  const isEditing = !!reminderId;
  
  // Get all plants to select from
  const plants = useSelector(state => state.plants.userPlants);
  
  // Get the reminder if we're editing
  const existingReminder = useSelector(state =>
    state.reminders.reminders.find(r => r.id === reminderId)
  );
  
  // Form state
  const [selectedPlantId, setSelectedPlantId] = useState(plantIdFromParams || null);
  const [reminderType, setReminderType] = useState('watering'); // watering, fertilizing, pruning, other
  const [frequency, setFrequency] = useState('weekly'); // daily, weekly, biweekly, monthly
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [preferredDayOfWeek, setPreferredDayOfWeek] = useState('monday');
  const [preferredTime, setPreferredTime] = useState('morning'); // morning, afternoon, evening
  const [notes, setNotes] = useState('');
  const [enabled, setEnabled] = useState(true);
  
  // Load existing reminder data if editing
  useEffect(() => {
    if (existingReminder) {
      setSelectedPlantId(existingReminder.plantId);
      setReminderType(existingReminder.type);
      setFrequency(existingReminder.frequency);
      setStartDate(existingReminder.startDate);
      setPreferredDayOfWeek(existingReminder.preferredDay || 'monday');
      setPreferredTime(existingReminder.preferredTime || 'morning');
      setNotes(existingReminder.notes || '');
      setEnabled(existingReminder.enabled);
    }
  }, [existingReminder]);
  
  // Get selected plant details
  const selectedPlant = plants.find(p => p.id === selectedPlantId);
  
  // Save reminder with proper next due date calculation
  const handleSaveReminder = () => {
    // Validate form
    if (!selectedPlantId) {
      Alert.alert('Error', 'Please select a plant');
      return;
    }
    
    // Calculate next due date based on frequency and start date
    const calculateNextDueDate = () => {
      const date = new Date(startDate);
      // Adjust date based on preferred day of week if applicable
      if (frequency === 'weekly' || frequency === 'biweekly') {
        // Map preferred day to day index (0 = Sunday, 1 = Monday, etc.)
        const dayMap = { 
          sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
          thursday: 4, friday: 5, saturday: 6 
        };
        const preferredDayIndex = dayMap[preferredDayOfWeek];
        
        // Find the next occurrence of the preferred day
        const currentDayIndex = date.getDay();
        let daysToAdd = preferredDayIndex - currentDayIndex;
        if (daysToAdd < 0) daysToAdd += 7;
        
        date.setDate(date.getDate() + daysToAdd);
      }
      
      // For monthly and other long-term reminders, we can leave the start date as is
      
      return date.toISOString().split('T')[0];
    };
    
    const nextDue = calculateNextDueDate();
    
    // Prepare title based on reminder type
    const getReminderTitle = () => {
      switch(reminderType) {
        case 'watering':
          return `Water your ${selectedPlant.name}`;
        case 'fertilizing':
          return `Fertilize your ${selectedPlant.name}`;
        case 'pruning':
          return `Prune your ${selectedPlant.name}`;
        default:
          return `${selectedPlant.name} care reminder`;
      }
    };
    
    const reminderData = {
      id: isEditing ? reminderId : nanoid(),
      plantId: selectedPlantId,
      plantName: selectedPlant.name,
      location: selectedPlant.location,
      type: reminderType,
      title: getReminderTitle(),
      frequency,
      startDate,
      nextDue, // Calculated based on frequency and preferred day
      preferredDay: preferredDayOfWeek,
      preferredTime,
      notes,
      enabled,
      createdAt: isEditing ? existingReminder.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    if (isEditing) {
      dispatch(updateReminder(reminderData));
      Alert.alert('Success', 'Reminder updated successfully');
    } else {
      dispatch(addReminder(reminderData));
      Alert.alert('Success', 'Reminder created successfully');
    }
    
    // Schedule notification based on date and time
    const scheduleNotification = async () => {
      if (!enabled) return;
      
      try {
        // Calculate notification time
        const timeMap = {
          'morning': '08:00',
          'afternoon': '13:00',
          'evening': '19:00'
        };
        const time = timeMap[preferredTime] || '08:00';
        
        // Create notification date
        const notificationDate = new Date(nextDue);
        
        // Ensure the date is valid before proceeding
        if (isNaN(notificationDate.getTime())) {
          console.error('Invalid notification date:', nextDue);
          return;
        }
        
        // Parse hours and minutes safely
        if (time && time.includes(':')) {
          const [hours, minutes] = time.split(':');
          if (!isNaN(parseInt(hours, 10)) && !isNaN(parseInt(minutes, 10))) {
            notificationDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
          }
        } else {
          // Default to 8:00 AM if time format is invalid
          notificationDate.setHours(8, 0, 0);
        }
        
        // Cancel previous notification if editing
        if (isEditing && existingReminder) {
          await cancelNotification(existingReminder.id);
        }
        
        // Only schedule if we have a valid date
        if (isNaN(notificationDate.getTime())) {
          console.error('Invalid notification date after time adjustment');
          return;
        }
        
        // Schedule new notification
        await schedulePlantCareReminder(
          reminderData.id,
          reminderData.title || `Reminder for ${selectedPlant.name}`,
          reminderData.notes || `Time to care for your ${selectedPlant.name}`,
          notificationDate,
          {
            plantId: selectedPlantId,
            reminderId: reminderData.id,
            reminderType
          }
        );
        
        console.log('Notification scheduled for', notificationDate);
      } catch (error) {
        console.error('Error scheduling notification:', error);
      }
    };
    
    scheduleNotification();
    
    navigation.goBack();
  };
  
  const renderPlantSelector = () => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>Select Plant</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.plantSelectorContainer}
      >
        {plants.map(plant => (
          <TouchableOpacity
            key={plant.id}
            style={[
              styles.plantItem,
              selectedPlantId === plant.id && styles.selectedPlantItem
            ]}
            onPress={() => setSelectedPlantId(plant.id)}
          >
            <View style={styles.plantCircle}>
              <Ionicons 
                name="leaf-outline" 
                size={24} 
                color={selectedPlantId === plant.id ? '#FFFFFF' : '#4CAF50'} 
              />
            </View>
            <Text style={[
              styles.plantName,
              selectedPlantId === plant.id && styles.selectedPlantName
            ]}>
              {plant.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
  
  const renderReminderTypeSelector = () => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>Reminder Type</Text>
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.optionButton,
            reminderType === 'watering' && styles.selectedOptionButton
          ]}
          onPress={() => setReminderType('watering')}
        >
          <Ionicons 
            name="water-outline" 
            size={20} 
            color={reminderType === 'watering' ? '#FFFFFF' : '#4CAF50'} 
          />
          <Text style={[
            styles.optionText,
            reminderType === 'watering' && styles.selectedOptionText
          ]}>Watering</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.optionButton,
            reminderType === 'fertilizing' && styles.selectedOptionButton
          ]}
          onPress={() => setReminderType('fertilizing')}
        >
          <Ionicons 
            name="flask-outline" 
            size={20} 
            color={reminderType === 'fertilizing' ? '#FFFFFF' : '#4CAF50'} 
          />
          <Text style={[
            styles.optionText,
            reminderType === 'fertilizing' && styles.selectedOptionText
          ]}>Fertilizing</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.optionButton,
            reminderType === 'pruning' && styles.selectedOptionButton
          ]}
          onPress={() => setReminderType('pruning')}
        >
          <Ionicons 
            name="cut-outline" 
            size={20} 
            color={reminderType === 'pruning' ? '#FFFFFF' : '#4CAF50'} 
          />
          <Text style={[
            styles.optionText,
            reminderType === 'pruning' && styles.selectedOptionText
          ]}>Pruning</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.optionButton,
            reminderType === 'other' && styles.selectedOptionButton
          ]}
          onPress={() => setReminderType('other')}
        >
          <Ionicons 
            name="ellipsis-horizontal-outline" 
            size={20} 
            color={reminderType === 'other' ? '#FFFFFF' : '#4CAF50'} 
          />
          <Text style={[
            styles.optionText,
            reminderType === 'other' && styles.selectedOptionText
          ]}>Other</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderFrequencySelector = () => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>Frequency</Text>
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.optionButton,
            frequency === 'daily' && styles.selectedOptionButton
          ]}
          onPress={() => setFrequency('daily')}
        >
          <Text style={[
            styles.optionText,
            frequency === 'daily' && styles.selectedOptionText
          ]}>Daily</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.optionButton,
            frequency === 'weekly' && styles.selectedOptionButton
          ]}
          onPress={() => setFrequency('weekly')}
        >
          <Text style={[
            styles.optionText,
            frequency === 'weekly' && styles.selectedOptionText
          ]}>Weekly</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.optionButton,
            frequency === 'biweekly' && styles.selectedOptionButton
          ]}
          onPress={() => setFrequency('biweekly')}
        >
          <Text style={[
            styles.optionText,
            frequency === 'biweekly' && styles.selectedOptionText
          ]}>Biweekly</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.optionButton,
            frequency === 'monthly' && styles.selectedOptionButton
          ]}
          onPress={() => setFrequency('monthly')}
        >
          <Text style={[
            styles.optionText,
            frequency === 'monthly' && styles.selectedOptionText
          ]}>Monthly</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderDateInput = () => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>Start Date</Text>
      <TouchableOpacity style={styles.dateInput}>
        <Text style={styles.dateText}>{startDate}</Text>
        <Ionicons name="calendar-outline" size={20} color="#666" />
      </TouchableOpacity>
      <Text style={styles.helperText}>Tap to select a date (not implemented in this demo)</Text>
    </View>
  );
  
  const renderPreferredDaySelector = () => {
    // Only show for weekly, biweekly or monthly frequencies
    if (frequency === 'daily') return null;
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    return (
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Preferred Day</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysContainer}
        >
          {days.map(day => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButton,
                preferredDayOfWeek === day && styles.selectedDayButton
              ]}
              onPress={() => setPreferredDayOfWeek(day)}
            >
              <Text style={[
                styles.dayText,
                preferredDayOfWeek === day && styles.selectedDayText
              ]}>
                {day.charAt(0).toUpperCase() + day.slice(1, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };
  
  const renderPreferredTimeSelector = () => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>Preferred Time</Text>
      <View style={styles.timeContainer}>
        <TouchableOpacity
          style={[
            styles.timeButton,
            preferredTime === 'morning' && styles.selectedTimeButton
          ]}
          onPress={() => setPreferredTime('morning')}
        >
          <Ionicons 
            name="sunny-outline" 
            size={20} 
            color={preferredTime === 'morning' ? '#FFFFFF' : '#4CAF50'} 
          />
          <Text style={[
            styles.timeText,
            preferredTime === 'morning' && styles.selectedTimeText
          ]}>Morning</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.timeButton,
            preferredTime === 'afternoon' && styles.selectedTimeButton
          ]}
          onPress={() => setPreferredTime('afternoon')}
        >
          <Ionicons 
            name="partly-sunny-outline" 
            size={20} 
            color={preferredTime === 'afternoon' ? '#FFFFFF' : '#4CAF50'} 
          />
          <Text style={[
            styles.timeText,
            preferredTime === 'afternoon' && styles.selectedTimeText
          ]}>Afternoon</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.timeButton,
            preferredTime === 'evening' && styles.selectedTimeButton
          ]}
          onPress={() => setPreferredTime('evening')}
        >
          <Ionicons 
            name="moon-outline" 
            size={20} 
            color={preferredTime === 'evening' ? '#FFFFFF' : '#4CAF50'} 
          />
          <Text style={[
            styles.timeText,
            preferredTime === 'evening' && styles.selectedTimeText
          ]}>Evening</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderNotesInput = () => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>Notes (Optional)</Text>
      <TextInput
        style={styles.notesInput}
        multiline
        numberOfLines={4}
        placeholder="Add any additional notes for this reminder"
        value={notes}
        onChangeText={setNotes}
      />
    </View>
  );
  
  const renderEnabledToggle = () => (
    <View style={styles.enabledContainer}>
      <Text style={styles.enabledText}>Enable Reminder</Text>
      <Switch
        value={enabled}
        onValueChange={setEnabled}
        trackColor={{ false: '#DDDDDD', true: '#A5D6A7' }}
        thumbColor={enabled ? '#4CAF50' : '#F5F5F5'}
      />
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Edit Reminder' : 'New Reminder'}</Text>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSaveReminder}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          {renderPlantSelector()}
          {renderReminderTypeSelector()}
          {renderFrequencySelector()}
          {renderDateInput()}
          {renderPreferredDaySelector()}
          {renderPreferredTimeSelector()}
          {renderNotesInput()}
          {renderEnabledToggle()}
          
          <TouchableOpacity 
            style={styles.saveButtonLarge}
            onPress={handleSaveReminder}
          >
            <Text style={styles.saveButtonLargeText}>
              {isEditing ? 'Update Reminder' : 'Create Reminder'}
            </Text>
          </TouchableOpacity>
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
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  saveButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  plantSelectorContainer: {
    paddingBottom: 8,
  },
  plantItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
  },
  selectedPlantItem: {
    opacity: 1,
  },
  plantCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPlantCircle: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  plantName: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  selectedPlantName: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  selectedOptionButton: {
    backgroundColor: '#4CAF50',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  selectedOptionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  daysContainer: {
    paddingVertical: 8,
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedDayButton: {
    backgroundColor: '#4CAF50',
  },
  dayText: {
    fontSize: 14,
    color: '#666',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 4,
  },
  selectedTimeButton: {
    backgroundColor: '#4CAF50',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  selectedTimeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  notesInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  enabledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    marginBottom: 24,
  },
  enabledText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButtonLarge: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  saveButtonLargeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SetReminderScreen;