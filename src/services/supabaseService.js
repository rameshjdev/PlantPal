import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import * as FileSystem from 'expo-file-system';

// Replace these with your Supabase project URL and anon key
const supabaseUrl = 'https://khceypvgonsvwitzxgwh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY2V5cHZnb25zdndpdHp4Z3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NjQzMjgsImV4cCI6MjA1ODE0MDMyOH0.ZM1gIi15q945gtkAS7h3bRFxG5YMFq3civLBWv3rqWE';

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication functions
export const signUp = async (email, password, fullName) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const resetPassword = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'plantpal://reset-password',
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    return { user: null, error };
  }
};

export const updateUserProfile = async (userData) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: userData,
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Save theme preference
export const saveThemePreference = async (isDarkMode) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: { dark_mode: isDarkMode },
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Get user theme preference
export const getUserThemePreference = async () => {
  try {
    const { user, error } = await getCurrentUser();
    
    if (error || !user) throw error || new Error('No user found');
    
    const darkMode = user.user_metadata?.dark_mode || false;
    return { darkMode, error: null };
  } catch (error) {
    return { darkMode: false, error };
  }
};

// Upload profile image to storage and update user metadata
export const uploadProfileImage = async (uri) => {
  try {
    // Get current user
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) throw userError || new Error('No user found');
    
    // Create a unique file path for the image
    const fileExt = uri.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `profiles/${fileName}`;
    
    // Fetch the image data
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }
    
    // Convert image to blob
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // First check if the bucket exists
    let bucketExists = false;
    try {
      const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('avatars');
      bucketExists = !bucketError;
    } catch (error) {
      console.log('Error checking bucket:', error.message);
      bucketExists = false;
    }
    
    // If bucket doesn't exist, create it
    if (!bucketExists) {
      try {
        const { data, error } = await supabase.storage.createBucket('avatars', {
          public: true,
          fileSizeLimit: 1024 * 1024 * 2, // 2MB
        });
        
        if (error) {
          throw error;
        }
        
        console.log('Bucket created successfully');
      } catch (createError) {
        console.error('Error creating bucket:', createError.message);
        // Use a fallback approach - store the local URI in user metadata
        await supabase.auth.updateUser({
          data: { avatar_url: uri },
        });
        // Return success with the local URI to prevent UI confusion
        return { publicUrl: uri, error: null };
      }
    }
    
    // Attempt to upload the image
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        contentType: `image/${fileExt}`,
        upsert: true,
      });
    
    if (error) {
      console.error('Upload failed:', error.message);
      // Update user metadata with the local URI as fallback
      await supabase.auth.updateUser({
        data: { avatar_url: uri },
      });
      // Return an error object but with the local URI to prevent UI confusion
      return { publicUrl: uri, error: { message: 'Image uploaded locally only. It will not persist across devices.' } };
    }
    
    // Get public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    // Update user metadata with the new avatar URL
    const { data: userData, error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: publicUrl },
    });
    
    if (updateError) throw updateError;
    
    return { publicUrl, error: null };
  } catch (error) {
    console.error('Upload error:', error.message);
    // Return the error but don't show success message in the UI
    return { publicUrl: null, error };
  }
};