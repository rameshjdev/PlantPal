import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { signIn } from '../services/supabaseService';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
// Temporarily comment out these imports until we have proper development builds
// import * as WebBrowser from 'expo-web-browser';
// import * as Google from 'expo-auth-session/providers/google';
// import * as Facebook from 'expo-facebook';
// import * as AppleAuthentication from 'expo-apple-authentication';

// WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Comment out Google Auth Hook for now
  // const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
  //   expoClientId: 'YOUR_EXPO_CLIENT_ID',
  //   iosClientId: 'YOUR_IOS_CLIENT_ID',
  //   androidClientId: 'YOUR_ANDROID_CLIENT_ID',
  //   webClientId: 'YOUR_WEB_CLIENT_ID',
  // });

  // Initialize Facebook SDK
  // const initializeFacebook = async () => {
  //   try {
  //     await Facebook.initializeAsync({
  //       appId: 'YOUR_FACEBOOK_APP_ID',
  //     });
  //   } catch (e) {
  //     console.log(e);
  //   }
  // };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    let isValid = true;

    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
      isValid = false;
    } else {
      setEmailError('');
    }

    // Validate password
    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    } else {
      setPasswordError('');
    }

    if (isValid) {
      setLoading(true);
      try {
        const { data, error } = await signIn(email, password);
        
        if (error) {
          Alert.alert('Login Failed', error.message);
        } else {
          // Successfully logged in
          // The AuthContext will handle the navigation after signIn
          // No need to manually navigate
          console.log('Login successful');
        }
      } catch (error) {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Placeholder functions for social sign in
  const handleGoogleSignIn = async () => {
    Alert.alert('Coming Soon', 'Google sign in will be available in the next update.');
    // try {
    //   setSocialLoading(true);
    //   const result = await googlePromptAsync();
    //   
    //   if (result.type === 'success') {
    //     const { id_token } = result.params;
    //     const { error } = await signInWithGoogle(id_token);
    //     
    //     if (error) {
    //       Alert.alert('Google Sign In Failed', error.message);
    //     } else {
    //       console.log('Google sign in successful');
    //     }
    //   }
    // } catch (error) {
    //   Alert.alert('Google Sign In Failed', error.message);
    // } finally {
    //   setSocialLoading(false);
    // }
  };

  // Facebook Sign In
  const handleFacebookSignIn = async () => {
    Alert.alert('Coming Soon', 'Facebook sign in will be available in the next update.');
    // try {
    //   setSocialLoading(true);
    //   await initializeFacebook();
    //   
    //   const { type, token } = await Facebook.logInWithReadPermissionsAsync({
    //     permissions: ['public_profile', 'email'],
    //   });
    //   
    //   if (type === 'success') {
    //     const { error } = await signInWithFacebook(token);
    //     
    //     if (error) {
    //       Alert.alert('Facebook Sign In Failed', error.message);
    //     } else {
    //       console.log('Facebook sign in successful');
    //     }
    //   }
    // } catch (error) {
    //   Alert.alert('Facebook Sign In Failed', error.message);
    // } finally {
    //   setSocialLoading(false);
    // }
  };

  // Apple Sign In
  const handleAppleSignIn = async () => {
    Alert.alert('Coming Soon', 'Apple sign in will be available in the next update.');
    // try {
    //   setSocialLoading(true);
    //   
    //   const credential = await AppleAuthentication.signInAsync({
    //     requestedScopes: [
    //       AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    //       AppleAuthentication.AppleAuthenticationScope.EMAIL,
    //     ],
    //   });
    //   
    //   // Use the credential.identityToken to sign in with Supabase
    //   const { error } = await signInWithApple(credential.identityToken);
    //   
    //   if (error) {
    //     Alert.alert('Apple Sign In Failed', error.message);
    //   } else {
    //     console.log('Apple sign in successful');
    //   }
    // } catch (error) {
    //   // Handle error based on error.code
    //   if (error.code === 'ERR_CANCELED') {
    //     // User canceled the sign-in flow
    //   } else {
    //     Alert.alert('Apple Sign In Failed', error.message);
    //   }
    // } finally {
    //   setSocialLoading(false);
    // }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#3F9E7A', '#2E7D32', '#1B5E20']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
            <Text style={styles.appName}>PlantPal</Text>
            <Text style={styles.tagline}>Your plant journey begins here</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Welcome</Text>
            
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="email-outline" size={22} color="#4CAF50" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#90A4AE"
                />
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="lock-outline" size={22} color="#4CAF50" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#90A4AE"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordToggle}>
                  <MaterialCommunityIcons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={22} 
                    color="#90A4AE" 
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleLogin}
              disabled={loading || socialLoading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Log In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={handleGoogleSignIn}
                disabled={socialLoading}
              >
                <MaterialCommunityIcons name="google" size={24} color="#DB4437" />
              </TouchableOpacity>
              
              {Platform.OS === 'ios' && (
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={handleAppleSignIn}
                  disabled={socialLoading}
                >
                  <MaterialCommunityIcons name="apple" size={24} color="#000000" />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={handleFacebookSignIn}
                disabled={socialLoading}
              >
                <MaterialCommunityIcons name="facebook" size={24} color="#4267B2" />
              </TouchableOpacity>
            </View>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {socialLoading && (
        <View style={styles.socialLoadingOverlay}>
          <View style={styles.socialLoadingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.socialLoadingText}>Signing in...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradientBackground: {
    position: 'absolute',
    height: '50%',
    width: '100%',
    top: 0,
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 16,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#E8F5E9',
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 30,
    marginTop: 30,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 58,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#424242',
  },
  passwordToggle: {
    padding: 10,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#2E7D32',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    paddingHorizontal: 10,
    color: '#757575',
    fontSize: 14,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  socialButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signupText: {
    color: '#757575',
    fontSize: 15,
  },
  signupLink: {
    color: '#2E7D32',
    fontSize: 15,
    fontWeight: 'bold',
  },
  socialLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  socialLoadingContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  socialLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

export default LoginScreen;