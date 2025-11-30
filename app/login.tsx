import { loginWithEmail } from '@/services/firebase';
import { adminService } from '@/services/firestore.service';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';

const isWeb = Platform.OS === 'web';

export default function LoginScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginState, setLoginState] = useState < 'idle' | 'loading' | 'success' > ('idle');
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const spinnerAnim = useRef(new Animated.Value(0)).current;

  const isMobileWeb = useMemo(() => {
    if (!isWeb) return false;
    return /Mobi|Android|iPhone/i.test(navigator.userAgent);
  }, []);

  const logoSize = isMobileWeb ?
    Math.min(screenWidth * 0.8, 500) :
    (isWeb ? Math.min(screenWidth * 0.5, 350) : Math.min(screenWidth * 0.85, 420));

  useEffect(() => {
    if (loginState === 'loading') {
      Animated.loop(
        Animated.timing(spinnerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinnerAnim.setValue(0);
    }
  }, [loginState]);

  const showToast = (message: string, type: string) => {
    setToast({ visible: true, message, type });
    Animated.spring(toastAnim, {
      toValue: 20,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToast({ visible: false, message: '', type: '' });
      });
    }, 3000);
  };

  const handleContinue = async () => {
    if (!email || !password) {
      showToast('Enter email and password', 'error');
      return;
    }
    if (!email.includes('@')) {
      showToast('Invalid email format', 'error');
      return;
    }
    setLoginState('loading');
    
    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Login with Firebase
      const result = await loginWithEmail(normalizedEmail, password);
      
      if (!result.success) {
        showToast(result.error || 'Invalid email or password', 'error');
        setLoginState('idle');
        return;
      }

      const userUid = result.user!.uid;

      // Check if user is an admin
      const adminData = await adminService.get(userUid);
      
      if (adminData) {
        // This is an admin/superadmin/owner
        if (!adminData.isActive) {
          showToast('Your account has been paused. Contact the owner.', 'error');
          setLoginState('idle');
          return;
        }

        // Store admin info
        const isSuperAdmin = adminData.role === 'superadmin' || adminData.role === 'owner';
        await AsyncStorage.setItem('isSuperAdmin', isSuperAdmin ? 'true' : 'false');
        await AsyncStorage.setItem('userRole', adminData.role);
        await AsyncStorage.setItem('adminUid', adminData.uid);
        await AsyncStorage.setItem('adminEmail', adminData.email);
        await AsyncStorage.setItem('adminName', adminData.displayName);

        // Update last login
        await adminService.updateLastLogin(adminData.uid);

        setLoginState('success');
        const roleLabel = adminData.role === 'owner' ? 'Owner' : 
                          adminData.role === 'superadmin' ? 'Super Admin' : 'Admin';
        showToast(`Welcome ${roleLabel}!`, 'success');
        
        setTimeout(() => {
          router.replace('/admin/home');
        }, 800);
      } else {
        // This is a regular user - check users collection
        // TODO: Implement user login flow when user collection is ready
        await AsyncStorage.setItem('isSuperAdmin', 'false');
        await AsyncStorage.setItem('userRole', 'user');
        await AsyncStorage.setItem('userUid', userUid);
        await AsyncStorage.setItem('userEmail', normalizedEmail);

        setLoginState('success');
        showToast('OTP sent to your phone', 'success');
        
        setTimeout(() => {
          router.push('/verify-otp');
        }, 800);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      showToast(error.message || 'Login failed. Please try again.', 'error');
      setLoginState('idle');
    }
  };

  return (
    <View style={styles.container}>
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            toast.type === 'error' ? styles.toastError : styles.toastSuccess,
            { transform: [{ translateY: toastAnim }] }
          ]}
        >
          <View style={styles.toastContent}>
            <Text style={styles.toastIcon}>{toast.type === 'error' ? '✗' : '✓'}</Text>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, isMobileWeb && styles.mobileWebScrollContent]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.contentWrapper, isMobileWeb && styles.mobileWebContentWrapper]}>
            <View>
              <View style={[styles.logoSection, isMobileWeb && styles.mobileWebLogoSection]}>
                <Image
                  source={require('../assets/logos/logo-icon.svg')}
                  style={{ width: logoSize, height: logoSize }}
                  contentFit="contain"
                />
              </View>
              {!isMobileWeb && (
                <View style={styles.headerSection}>
                  <Text style={styles.title}>Login</Text>
                </View>
              )}
            </View>

            <View style={isMobileWeb && styles.mobileWebFormWrapper}>
              {isMobileWeb && (
                <View style={styles.headerSection}>
                  <Text style={styles.title}>Login</Text>
                </View>
              )}
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor="#94a3b8"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={loginState === 'idle'}
                      selectionColor="transparent"
                      underlineColorAndroid="transparent"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="Enter your password"
                      placeholderTextColor="#94a3b8"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      editable={loginState === 'idle'}
                      selectionColor="transparent"
                      underlineColorAndroid="transparent"
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.6}
                    >
                      <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.rememberMeContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                  </View>
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={handleContinue}
                  disabled={loginState !== 'idle'}
                  activeOpacity={0.85}
                >
                  {loginState === 'idle' && (
                    <LinearGradient colors={['#006dab', '#005a8f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientButton}>
                      <Text style={styles.continueButtonText}>Login</Text>
                    </LinearGradient>
                  )}
                  {loginState === 'loading' && (
                    <View style={[styles.gradientButton, styles.loadingButton]}>
                      <Animated.View style={[styles.spinner, { transform: [{ rotate: spinnerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
                    </View>
                  )}
                  {loginState === 'success' && (
                    <LinearGradient colors={['#006dab', '#005a8f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientButton}>
                      <Ionicons name="checkmark" size={32} color="#ffffff" />
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: isWeb ? undefined : 16,
    right: isWeb ? 20 : 16,
    zIndex: 1000,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: isWeb ? 320 : undefined,
    minWidth: isWeb ? undefined : 280,
    borderLeftWidth: 4,
  },
  toastError: {
    borderLeftColor: '#ef4444',
  },
  toastSuccess: {
    borderLeftColor: '#98be4e',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  toastIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    minWidth: 20,
  },
  toastText: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    flexWrap: 'wrap',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: isWeb ? 20 : 20,
    paddingTop: isWeb ? 30 : 40,
  },
  mobileWebScrollContent: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  contentWrapper: {
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: isWeb ? 40 : 24,
    marginTop: isWeb ? 0 : -32,
  },
  mobileWebContentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 0,
    paddingBottom: 80, // This brings the form up from the bottom
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: isWeb ? -118 : -88,
  },
  mobileWebLogoSection: {
    marginTop: -40,
    marginBottom: 0,
  },
  mobileWebFormWrapper: {
    marginTop: -80,
  },
  headerSection: {
    marginBottom: isWeb ? 12 : 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#006dab',
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#006dab',
  },
  inputWrapper: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
  },
  passwordInput: {
    paddingRight: 55,
  },
  eyeIcon: {
    position: 'absolute',
    right: 18,
    padding: 8,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#006dab',
    borderColor: '#006dab',
  },
  rememberMeText: {
    fontSize: 15,
    color: '#98be4e',
    fontWeight: '600',
  },
  continueButton: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  gradientButton: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  loadingButton: {
    backgroundColor: '#006dab',
  },
  spinner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: '#ffffff',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
  },
});