import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const SetReminderScreen = ({ route }) => {
  const { plantId } = route.params;
  const navigation = useNavigation();
  
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

  // Mock plant data
  const plant = {
    id: plantId,
    name: 'Monstera',
    image: require('../../assets/monstera.png'),
  };

  const handleSaveReminders = () => {
    // In a real app, this would save the reminder settings to a database
    // and schedule actual notifications
    
    // For now, we'll just show a success message and navigate back
    navigation.goBack();
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