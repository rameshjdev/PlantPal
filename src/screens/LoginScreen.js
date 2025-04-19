import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  Dimensions,
  Animated,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { signIn, resetPassword } from '../services/supabaseService';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
// Temporarily comment out these imports until we have proper development builds
// import * as WebBrowser from 'expo-web-browser';
// import * as Google from 'expo-auth-session/providers/google';
// import * as Facebook from 'expo-facebook';
// import * as AppleAuthentication from 'expo-apple-authentication';

// WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
  };

  const handleFacebookSignIn = async () => {
    Alert.alert('Coming Soon', 'Facebook sign in will be available in the next update.');
  };

  const handleAppleSignIn = async () => {
    Alert.alert('Coming Soon', 'Apple sign in will be available in the next update.');
  };

  const handleForgotPassword = async () => {
    // Validate email
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Password Reset Email Sent',
          'Please check your email for instructions to reset your password.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Background */}
      <Image 
        source={require('../../assets/monstera.png')} 
        style={styles.backgroundImage} 
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,90,50,0.8)']}
        style={styles.gradientOverlay}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidContainer}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons name="account-lock-open" size={28} color="#00FF7F" />
            </View>
            <Text style={styles.headerTitle}>Login</Text>
            {/* <Text style={styles.headerSubtitle}>New here? <Text style={styles.signUpText}>Sign Up</Text> to get started.</Text> */}
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email or Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Email or Phone"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Enter password here"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordToggle}>
                  <MaterialCommunityIcons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={22} 
                    color="rgba(255,255,255,0.5)" 
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            <View style={styles.rememberContainer}>
              <View style={styles.checkboxContainer}>
                <TouchableOpacity 
                  style={[styles.checkbox, password ? styles.checkboxChecked : null]}
                  onPress={() => {/* Toggle remember me */}}
                />
                <Text style={styles.rememberText}>Remember Me</Text>
              </View>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot password</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>Or</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn}>
                <MaterialCommunityIcons name="google" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} onPress={handleFacebookSignIn}>
                <MaterialCommunityIcons name="facebook" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.socialButton} onPress={handleAppleSignIn}>
                  <MaterialCommunityIcons name="apple" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.socialButton} onPress={() => {}}>
                <MaterialCommunityIcons name="instagram" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.bottomTextContainer}>
              <Text style={styles.bottomText}>Don't have an Account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.loginLink}>Signup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundImage: {
    position: 'absolute',
    width: width,
    height: height,
    opacity: 0.9,
  },
  gradientOverlay: {
    position: 'absolute',
    width: width,
    height: height,
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 255, 127, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  signUpText: {
    color: '#00FF7F',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#FFFFFF',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    height: 50,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  passwordToggle: {
    padding: 12,
  },
  rememberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#00FF7F',
    borderColor: '#00FF7F',
  },
  rememberText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  forgotPasswordText: {
    color: '#00FF7F',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#00FF7F',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonText: {
    color: '#000000',
    fontSize: 16,
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
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.7)',
    marginHorizontal: 16,
    fontSize: 14,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  bottomTextContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  loginLink: {
    color: '#00FF7F',
    fontSize: 14,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
  },
});

export default LoginScreen;