import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Create a custom Supabase client with AsyncStorage
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Export the supabase client
export { supabase };

// Authentication functions
export const signUp = async (email, password, name = '') => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
        emailRedirectTo: 'plantpal://login',
      },
    });
    
    return { data, error };
  } catch (error) {
    console.error('Error signing up:', error);
    return { data: null, error };
  }
};

export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { data, error };
  } catch (error) {
    console.error('Error signing in:', error);
    return { data: null, error };
  }
};

export const signInWithGoogle = async (idToken) => {
  try {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    
    return { data, error };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    return { data: null, error };
  }
};

export const signInWithApple = async (idToken) => {
  try {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: idToken,
    });
    
    return { data, error };
  } catch (error) {
    console.error('Error signing in with Apple:', error);
    return { data: null, error };
  }
};

export const signInWithFacebook = async (accessToken) => {
  try {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'facebook',
      token: accessToken,
    });
    
    return { data, error };
  } catch (error) {
    console.error('Error signing in with Facebook:', error);
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error };
  }
};

export const resetPassword = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'plantpal://reset-password',
    });
    
    return { data, error };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { data: null, error };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    return { user: data?.user, error };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { user: null, error };
  }
};

export const updateUserProfile = async (updates) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    });
    
    return { data, error };
  } catch (error) {
    console.error('Error updating user profile:', error);
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
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;
    
    // Fetch the image data
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }
    
    // Convert image to blob
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Upload the image with public access
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        contentType: `image/${fileExt}`,
        upsert: true,
        cacheControl: '3600',
      });
    
    if (error) {
      console.error('Upload failed:', error.message);
      throw error;
    }
    
    // Get public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    console.log('Upload successful, public URL:', publicUrl);
    
    // Verify the public URL is accessible
    const verifyResponse = await fetch(publicUrl);
    if (!verifyResponse.ok) {
      throw new Error('Public URL is not accessible');
    }
    
    // Update user metadata with the new avatar URL
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: publicUrl },
    });
    
    if (updateError) throw updateError;
    
    // Update profile with the new avatar URL
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);
    
    if (profileError) throw profileError;
    
    return { publicUrl, error: null };
  } catch (error) {
    console.error('Upload error:', error.message);
    return { publicUrl: null, error };
  }
};

// Update user profile information
export const updateUserProfileInfo = async (updates) => {
  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) throw userError || new Error('No user found');

    // Prepare the update object with only the fields that are provided
    const updateData = {
      id: user.id,
      updated_at: new Date().toISOString(),
    };

    // Add fields only if they are provided in the updates
    if (updates.full_name !== undefined) updateData.full_name = updates.full_name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.avatar_url !== undefined) updateData.avatar_url = updates.avatar_url;

    console.log('Updating profile with data:', updateData);

    const { data, error } = await supabase
      .from('profiles')
      .upsert(updateData)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile in database:', error);
      throw error;
    }

    console.log('Profile updated in database:', data);

    // Also update auth metadata
    const authUpdateData = {};
    if (updates.full_name !== undefined) authUpdateData.full_name = updates.full_name;
    if (updates.avatar_url !== undefined) authUpdateData.avatar_url = updates.avatar_url;

    // Only update auth if there are fields to update
    if (Object.keys(authUpdateData).length > 0) {
      console.log('Updating auth metadata with:', authUpdateData);
      const { error: authError } = await supabase.auth.updateUser({
        data: authUpdateData,
      });

      if (authError) {
        console.error('Error updating auth metadata:', authError);
        throw authError;
      }
      console.log('Auth metadata updated successfully');
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { data: null, error };
  }
};

// Get user profile information
export const getUserProfileInfo = async () => {
  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) throw userError || new Error('No user found');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        return await createUserProfile(user);
      }
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error getting profile:', error);
    return { data: null, error };
  }
};

// Create user profile
const createUserProfile = async (user) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: user.id,
          full_name: user.user_metadata?.full_name || '',
          email: user.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating profile:', error);
    return { data: null, error };
  }
};

export default {
  supabase,
  signUp,
  signIn,
  signInWithGoogle,
  signInWithApple,
  signInWithFacebook,
  signOut,
  resetPassword,
  getCurrentUser,
  updateUserProfile,
  saveThemePreference,
  getUserThemePreference,
  uploadProfileImage,
  updateUserProfileInfo,
  getUserProfileInfo,
};