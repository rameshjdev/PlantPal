import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch, ScrollView, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { addReminder, updateReminder } from '../store/remindersSlice';
import { schedulePlantCareReminder, cancelNotification } from '../services/notificationService';

const SetReminderScreen = ({ route }) => {
  const { plantId, reminderId, editMode } = route.params || {};
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  // Get all reminders from the Redux store
  const { reminders } = useSelector(state => state.reminders);
  
  // States for reminder settings
  const [wateringEnabled, setWateringEnabled] = useState(true);
  const [wateringFrequency, setWateringFrequency] = useState('weekly');
  const [wateringDay, setWateringDay] = useState('Monday');
  
  const [fertilizingEnabled, setFertilizingEnabled] = useState(true);
  const [fertilizingFrequency, setFertilizingFrequency] = useState('monthly');
  
  const [rotationEnabled, setRotationEnabled] = useState(false);
  const [rotationFrequency, setRotationFrequency] = useState('biweekly');
  
  const [repottingEnabled, setRepottingEnabled] = useState(false);
  const [repottingFrequency, setRepottingFrequency] = useState('yearly');
  
  const [weatherAlertsEnabled, setWeatherAlertsEnabled] = useState(true);
  
  // If in edit mode, load the reminder data
  useEffect(() => {
    if (editMode && reminderId) {
      const reminderToEdit = reminders.find(r => r.id === reminderId);
      
      if (reminderToEdit) {
        // Set all reminder types to disabled initially
        setWateringEnabled(false);
        setFertilizingEnabled(false);
        setRotationEnabled(false);
        setRepottingEnabled(false);
        
        // Enable and set the values for the specific reminder type
        switch (reminderToEdit.type) {
          case 'watering':
            setWateringEnabled(true);
            setWateringFrequency(reminderToEdit.frequency);
            if (reminderToEdit.day) {
              setWateringDay(reminderToEdit.day);
            }
            break;
          case 'fertilizing':
            setFertilizingEnabled(true);
            setFertilizingFrequency(reminderToEdit.frequency);
            break;
          case 'rotation':
            setRotationEnabled(true);
            setRotationFrequency(reminderToEdit.frequency);
            break;
          case 'repotting':
            setRepottingEnabled(true);
            setRepottingFrequency(reminderToEdit.frequency);
            break;
        }
      }
    }
  }, [editMode, reminderId, reminders]);

  // Plant data
  const plant = {
    id: plantId,
    name: 'Monstera', // In a real app, you would fetch this from your plant data
    image: require('../../assets/monstera.png'),
  };

  const handleSaveReminders = () => {
    // Create an array to store reminder objects
    const remindersToSave = [];
    
    // Get current date and time
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Set the time for reminders to be in the future (at least 1 minute ahead)
    let reminderHour = currentHour;
    let reminderMinute = currentMinute + 2; // Add 2 minutes to ensure it's in the future
    
    // Adjust if minutes overflow
    if (reminderMinute >= 60) {
      reminderHour = (reminderHour + 1) % 24;
      reminderMinute = reminderMinute % 60;
    }
    
    // Format time as HH:MM
    const time = `${reminderHour.toString().padStart(2, '0')}:${reminderMinute.toString().padStart(2, '0')}`;
    
    // If editing an existing reminder, find it
    let existingReminder = null;
    if (editMode && reminderId) {
      // Use the reminders from the Redux state
      existingReminder = reminders.find(r => r.id === reminderId);
    }
    
    // Add watering reminder if enabled
    if (wateringEnabled) {
      // If we're editing a watering reminder, update it, otherwise create a new one
      if (editMode && existingReminder && existingReminder.type === 'watering') {
        remindersToSave.push({
          ...existingReminder,
          frequency: wateringFrequency,
          day: wateringFrequency === 'weekly' ? wateringDay : null,
          time,
          nextDue: calculateNextDueDate(wateringFrequency, wateringDay),
          enabled: true,
        });
      } else {
        remindersToSave.push({
          id: `water-${plantId}-${Date.now()}`,
          plantId,
          plantName: plant.name,
          type: 'watering',
          frequency: wateringFrequency,
          day: wateringFrequency === 'weekly' ? wateringDay : null,
          time,
          nextDue: calculateNextDueDate(wateringFrequency, wateringDay),
          enabled: true,
          lastCompleted: null,
        });
      }
    }
    
    // Add fertilizing reminder if enabled
    if (fertilizingEnabled) {
      // If we're editing a fertilizing reminder, update it, otherwise create a new one
      if (editMode && existingReminder && existingReminder.type === 'fertilizing') {
        remindersToSave.push({
          ...existingReminder,
          frequency: fertilizingFrequency,
          day: fertilizingFrequency === 'weekly' ? 'Monday' : null,
          time,
          nextDue: calculateNextDueDate(fertilizingFrequency),
          enabled: true,
        });
      } else {
        remindersToSave.push({
          id: `fertilize-${plantId}-${Date.now() + 1}`,
          plantId,
          plantName: plant.name,
          type: 'fertilizing',
          frequency: fertilizingFrequency,
          day: fertilizingFrequency === 'weekly' ? 'Monday' : null, // Default to Monday for weekly
          time,
          nextDue: calculateNextDueDate(fertilizingFrequency),
          enabled: true,
          lastCompleted: null,
        });
      }
    }
    
    // Add rotation reminder if enabled
    if (rotationEnabled) {
      // If we're editing a rotation reminder, update it, otherwise create a new one
      if (editMode && existingReminder && existingReminder.type === 'rotation') {
        remindersToSave.push({
          ...existingReminder,
          frequency: rotationFrequency,
          day: rotationFrequency === 'weekly' ? 'Wednesday' : null,
          time,
          nextDue: calculateNextDueDate(rotationFrequency),
          enabled: true,
        });
      } else {
        remindersToSave.push({
          id: `rotate-${plantId}-${Date.now() + 2}`,
          plantId,
          plantName: plant.name,
          type: 'rotation',
          frequency: rotationFrequency,
          day: rotationFrequency === 'weekly' ? 'Wednesday' : null, // Default to Wednesday for weekly
          time,
          nextDue: calculateNextDueDate(rotationFrequency),
          enabled: true,
          lastCompleted: null,
        });
      }
    }
    
    // Add repotting reminder if enabled
    if (repottingEnabled) {
      // If we're editing a repotting reminder, update it, otherwise create a new one
      if (editMode && existingReminder && existingReminder.type === 'repotting') {
        remindersToSave.push({
          ...existingReminder,
          frequency: repottingFrequency,
          day: null,
          time,
          nextDue: calculateNextDueDate(repottingFrequency),
          enabled: true,
        });
      } else {
        remindersToSave.push({
          id: `repot-${plantId}-${Date.now() + 3}`,
          plantId,
          plantName: plant.name,
          type: 'repotting',
          frequency: repottingFrequency,
          day: null, // Not applicable for longer frequencies
          time,
          nextDue: calculateNextDueDate(repottingFrequency),
          enabled: true,
          lastCompleted: null,
        });
      }
    }
    
    // Helper function to calculate next due date based on frequency and day
    function calculateNextDueDate(frequency, day = null) {
      const date = new Date();
      
      // Ensure the date is in the future by starting with tomorrow
      date.setDate(date.getDate() + 1);
      
      switch (frequency) {
        case 'daily':
          // Already set to tomorrow
          break;
        case 'every3days':
          date.setDate(date.getDate() + 2); // Tomorrow + 2 = 3 days
          break;
        case 'weekly':
          // If day is specified, set to next occurrence of that day
          if (day) {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const targetDayIndex = days.indexOf(day);
            if (targetDayIndex !== -1) {
              const currentDayIndex = date.getDay();
              let daysToAdd = targetDayIndex - currentDayIndex;
              if (daysToAdd <= 0) daysToAdd += 7; // Ensure it's in the future
              date.setDate(date.getDate() + daysToAdd - 1); // -1 because we already added 1 day
            }
          } else {
            date.setDate(date.getDate() + 6); // Tomorrow + 6 = 7 days
          }
          break;
        case 'biweekly':
          date.setDate(date.getDate() + 13); // Tomorrow + 13 = 14 days
          break;
        case 'monthly':
          date.setMonth(date.getMonth() + 1);
          break;
        case 'quarterly':
          date.setMonth(date.getMonth() + 3);
          break;
        case 'sixmonthly':
          date.setMonth(date.getMonth() + 6);
          break;
        case 'yearly':
          date.setFullYear(date.getFullYear() + 1);
          break;
        case 'biannually':
          date.setFullYear(date.getFullYear() + 2);
          break;
        default:
          date.setDate(date.getDate() + 7); // Default to weekly
      }
      
      // Return formatted date string
      return date.toISOString().split('T')[0];
    }
    
    // Process each reminder in sequence
    const processReminders = async () => {
      try {
        for (const reminder of remindersToSave) {
          if (editMode && reminder.id === reminderId) {
            // If editing, cancel the old notification first
            if (reminder.notificationId) {
              try {
                await cancelNotification(reminder.notificationId);
              } catch (error) {
                console.error('Failed to cancel existing notification:', error);
              }
            }
            
            // Schedule a new notification
            const notificationId = await schedulePlantCareReminder(reminder);
            
            // Update reminder with new notification ID
            reminder.notificationId = notificationId;
            
            // Update in Redux store
            await dispatch(updateReminder(reminder)).unwrap();
            
            console.log(`Reminder updated and notification rescheduled (ID: ${notificationId}) for ${reminder.type}`);
          } else {
            // Schedule notification for new reminder
            const notificationId = await schedulePlantCareReminder(reminder);
            
            // Add notification ID to reminder
            reminder.notificationId = notificationId;
            
            // Dispatch to Redux store
            await dispatch(addReminder(reminder)).unwrap();
            
            console.log(`Reminder created and notification scheduled (ID: ${notificationId}) for ${reminder.type}`);
          }
        }
        
        // Show success message and navigate back
        Alert.alert(
          'Reminders Saved',
          `${remindersToSave.length} plant care reminder${remindersToSave.length !== 1 ? 's' : ''} have been set up.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } catch (error) {
        console.error('Error creating reminders:', error);
        Alert.alert(
          'Error',
          'There was a problem setting up your reminders. Please try again.',
          [{ text: 'OK' }]
        );
      }
    };
    
    // Start processing reminders
    processReminders();
  };

  const renderFrequencyOptions = (currentFrequency, setFrequency, options) => {
    return (
      <View style={styles.frequencyOptions}>
        {options.map(option => (
          <TouchableOpacity 
            key={option.value}
            style={[styles.frequencyOption, currentFrequency === option.value && styles.frequencyOptionSelected]}
            onPress={() => setFrequency(option.value)}
          >
            <Text style={[styles.frequencyOptionText, currentFrequency === option.value && styles.frequencyOptionTextSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderDayOptions = (currentDay, setDay) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    return (
      <View style={styles.dayOptions}>
        {days.map(day => (
          <TouchableOpacity 
            key={day}
            style={[styles.dayOption, currentDay === day && styles.dayOptionSelected]}
            onPress={() => setDay(day)}
          >
            <Text style={[styles.dayOptionText, currentDay === day && styles.dayOptionTextSelected]}>
              {day.substring(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Care Reminders</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.plantHeader}>
          <Text style={styles.plantName}>{plant.name}</Text>
          <Text style={styles.reminderSubtitle}>Set up care reminders for your plant</Text>
        </View>

        <View style={styles.reminderSection}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderIconContainer}>
              <Text style={styles.reminderIcon}>💧</Text>
            </View>
            <Text style={styles.reminderTitle}>Watering</Text>
            <Switch
              value={wateringEnabled}
              onValueChange={setWateringEnabled}
              trackColor={{ false: '#E0E0E0', true: '#AED581' }}
              thumbColor={wateringEnabled ? '#2E7D32' : '#BDBDBD'}
            />
          </View>
          
          {wateringEnabled && (
            <View style={styles.reminderOptions}>
              <Text style={styles.optionLabel}>Frequency:</Text>
              {renderFrequencyOptions(wateringFrequency, setWateringFrequency, [
                { label: 'Daily', value: 'daily' },
                { label: 'Every 3 days', value: 'every3days' },
                { label: 'Weekly', value: 'weekly' },
                { label: 'Biweekly', value: 'biweekly' },
                { label: 'Monthly', value: 'monthly' },
              ])}
              
              {wateringFrequency === 'weekly' && (
                <>
                  <Text style={styles.optionLabel}>Day of the week:</Text>
                  {renderDayOptions(wateringDay, setWateringDay)}
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.reminderSection}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderIconContainer}>
              <Text style={styles.reminderIcon}>🌱</Text>
            </View>
            <Text style={styles.reminderTitle}>Fertilizing</Text>
            <Switch
              value={fertilizingEnabled}
              onValueChange={setFertilizingEnabled}
              trackColor={{ false: '#E0E0E0', true: '#AED581' }}
              thumbColor={fertilizingEnabled ? '#2E7D32' : '#BDBDBD'}
            />
          </View>
          
          {fertilizingEnabled && (
            <View style={styles.reminderOptions}>
              <Text style={styles.optionLabel}>Frequency:</Text>
              {renderFrequencyOptions(fertilizingFrequency, setFertilizingFrequency, [
                { label: 'Weekly', value: 'weekly' },
                { label: 'Biweekly', value: 'biweekly' },
                { label: 'Monthly', value: 'monthly' },
                { label: 'Quarterly', value: 'quarterly' },
              ])}
            </View>
          )}
        </View>

        <View style={styles.reminderSection}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderIconContainer}>
              <Text style={styles.reminderIcon}>🔄</Text>
            </View>
            <Text style={styles.reminderTitle}>Rotation</Text>
            <Switch
              value={rotationEnabled}
              onValueChange={setRotationEnabled}
              trackColor={{ false: '#E0E0E0', true: '#AED581' }}
              thumbColor={rotationEnabled ? '#2E7D32' : '#BDBDBD'}
            />
          </View>
          
          {rotationEnabled && (
            <View style={styles.reminderOptions}>
              <Text style={styles.optionLabel}>Frequency:</Text>
              {renderFrequencyOptions(rotationFrequency, setRotationFrequency, [
                { label: 'Weekly', value: 'weekly' },
                { label: 'Biweekly', value: 'biweekly' },
                { label: 'Monthly', value: 'monthly' },
              ])}
            </View>
          )}
        </View>

        <View style={styles.reminderSection}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderIconContainer}>
              <Text style={styles.reminderIcon}>🪴</Text>
            </View>
            <Text style={styles.reminderTitle}>Repotting</Text>
            <Switch
              value={repottingEnabled}
              onValueChange={setRepottingEnabled}
              trackColor={{ false: '#E0E0E0', true: '#AED581' }}
              thumbColor={repottingEnabled ? '#2E7D32' : '#BDBDBD'}
            />
          </View>
          
          {repottingEnabled && (
            <View style={styles.reminderOptions}>
              <Text style={styles.optionLabel}>Frequency:</Text>
              {renderFrequencyOptions(repottingFrequency, setRepottingFrequency, [
                { label: 'Every 6 months', value: 'sixmonthly' },
                { label: 'Yearly', value: 'yearly' },
                { label: 'Every 2 years', value: 'biannually' },
              ])}
            </View>
          )}
        </View>

        <View style={styles.reminderSection}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderIconContainer}>
              <Text style={styles.reminderIcon}>🌦️</Text>
            </View>
            <Text style={styles.reminderTitle}>Weather Alerts</Text>
            <Switch
              value={weatherAlertsEnabled}
              onValueChange={setWeatherAlertsEnabled}
              trackColor={{ false: '#E0E0E0', true: '#AED581' }}
              thumbColor={weatherAlertsEnabled ? '#2E7D32' : '#BDBDBD'}
            />
          </View>
          
          {weatherAlertsEnabled && (
            <View style={styles.reminderOptions}>
              <Text style={styles.weatherDescription}>
                Receive alerts when extreme weather conditions might affect your plant.
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveReminders}>
          <Text style={styles.saveButtonText}>Save Reminders</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F8E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  plantHeader: {
    marginBottom: 20,
  },
  plantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  reminderSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  reminderSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reminderIcon: {
    fontSize: 20,
  },
  reminderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  reminderOptions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    color: '#555',
  },
  frequencyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  frequencyOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    marginBottom: 8,
  },
  frequencyOptionSelected: {
    backgroundColor: '#2E7D32',
  },
  frequencyOptionText: {
    fontSize: 14,
    color: '#555',
  },
  frequencyOptionTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  dayOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  dayOptionSelected: {
    backgroundColor: '#2E7D32',
  },
  dayOptionText: {
    fontSize: 12,
    color: '#555',
  },
  dayOptionTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  weatherDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SetReminderScreen;