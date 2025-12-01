import { loginWithEmail } from '@/services/firebase';
import { adminService, coupleService } from '@/services/firestore.service';
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

// Login modes: individual (with password) or shared (quick access with PIN)
type LoginMode = 'individual' | 'shared';

export default function LoginScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [loginMode, setLoginMode] = useState<LoginMode>('individual');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginState, setLoginState] = useState<'idle' | 'loading' | 'success'>('idle');
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

  // Clear form when switching modes
  useEffect(() => {
    setEmail('');
    setPassword('');
  }, [loginMode]);

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

  // Main login handler - routes to appropriate mode
  const handleContinue = async () => {
    if (loginMode === 'shared') {
      await handleQuickAccess();
      return;
    }
    await handleIndividualLogin();
  };

  // MODE 2: Quick Access (shared credentials → profile picker → PIN)
  const handleQuickAccess = async () => {
    if (!email.trim()) {
      showToast('Enter Couple ID, shared Phone, or shared Email', 'error');
      return;
    }
    setLoginState('loading');
    const credential = email.trim();

    try {
      const coupleResult = await coupleService.findByCredential(credential);
      
      if (!coupleResult) {
        showToast('Couple not found. Check your Couple ID or shared credential.', 'error');
        setLoginState('idle');
        return;
      }
      
      const { couple } = coupleResult;
      
      // Check setup status for both users
      const maleSetupComplete = couple.male.isPasswordReset && couple.male.isPinSet;
      const femaleSetupComplete = couple.female.isPasswordReset && couple.female.isPinSet;
      
      if (!maleSetupComplete || !femaleSetupComplete) {
        // Get the name of the user who needs to complete setup
        const incompleteUser = !maleSetupComplete ? couple.male.name : couple.female.name;
        showToast(`${incompleteUser} needs to complete first-time setup. Use Individual Login.`, 'error');
        setLoginState('idle');
        return;
      }
      
      if (couple.male.status === 'inactive' && couple.female.status === 'inactive') {
        showToast('Both accounts are paused. Contact admin.', 'error');
        setLoginState('idle');
        return;
      }
      
      await AsyncStorage.setItem('userRole', 'user');
      await AsyncStorage.setItem('coupleId', couple.id);
      await AsyncStorage.setItem('quickAccessMode', 'true');
      
      setLoginState('success');
      showToast('Select your profile', 'success');
      
      setTimeout(() => {
        router.push({
          pathname: '/verify-otp',
          params: { 
            mode: 'quick-access',
            coupleId: couple.id,
            maleName: couple.male.name,
            femaleName: couple.female.name,
            maleStatus: couple.male.status,
            femaleStatus: couple.female.status,
          }
        });
      }, 500);
    } catch (error: any) {
      console.error('Quick access error:', error);
      showToast('Login failed. Please try again.', 'error');
      setLoginState('idle');
    }
  };

  // MODE 1: Individual Login (with password)
  const handleIndividualLogin = async () => {
    if (!email || !password) {
      showToast('Enter User ID/Email/Phone and password', 'error');
      return;
    }
    setLoginState('loading');
    
    const credential = email.trim();
    const isEmailCred = credential.includes('@');

    try {
      // If it looks like an email, try admin login FIRST (Firebase Auth)
      // This avoids permission errors from querying Firestore before authentication
      if (isEmailCred) {
        const normalizedEmail = credential.toLowerCase();
        
        // Try Firebase Auth login
        const result = await loginWithEmail(normalizedEmail, password);
        
        if (result.success) {
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
            return;
          }
          
          // Firebase Auth succeeded but not in admins collection
          // This could be a user with email - check couples collection
          // (Now we're authenticated, so we can query Firestore)
        }
        
        // Firebase Auth failed OR user not in admins - try couples collection
        // For emails, we need to check if this email belongs to a couple user
        try {
          const coupleResult = await coupleService.findByCredential(credential);
          
          if (coupleResult) {
            // Handle couple user login (same as below)
            await handleCoupleLogin(coupleResult);
            return;
          }
        } catch (coupleError) {
          // If couples query fails (e.g., not authenticated), just show auth error
          console.log('Couples query failed, likely not authenticated:', coupleError);
        }
        
        // Neither admin nor couple user found
        showToast(result.success ? 'Account not found. Contact admin.' : (result.error || 'Invalid email or password'), 'error');
        setLoginState('idle');
        return;
      }
      
      // Non-email credential (User ID or Phone) - could be admin with phone OR couple user
      // First try to find admin by phone number
      try {
        const adminByPhone = await adminService.findByCredential(credential);
        
        if (adminByPhone) {
          // Found admin by phone - verify password from stored password
          if (adminByPhone.password !== password) {
            showToast('Invalid password', 'error');
            setLoginState('idle');
            return;
          }
          
          if (!adminByPhone.isActive) {
            showToast('Your account has been paused. Contact the owner.', 'error');
            setLoginState('idle');
            return;
          }
          
          // Store admin info
          const isSuperAdmin = adminByPhone.role === 'superadmin' || adminByPhone.role === 'owner';
          await AsyncStorage.setItem('isSuperAdmin', isSuperAdmin ? 'true' : 'false');
          await AsyncStorage.setItem('userRole', adminByPhone.role);
          await AsyncStorage.setItem('adminUid', adminByPhone.uid);
          await AsyncStorage.setItem('adminEmail', adminByPhone.email || '');
          await AsyncStorage.setItem('adminName', adminByPhone.displayName);

          // Update last login
          await adminService.updateLastLogin(adminByPhone.uid);

          setLoginState('success');
          const roleLabel = adminByPhone.role === 'owner' ? 'Owner' : 
                            adminByPhone.role === 'superadmin' ? 'Super Admin' : 'Admin';
          showToast(`Welcome ${roleLabel}!`, 'success');
          
          setTimeout(() => {
            router.replace('/admin/home');
          }, 800);
          return;
        }
      } catch (adminPhoneError) {
        console.log('Admin phone lookup failed:', adminPhoneError);
        // Continue to check couples
      }
      
      // Not found as admin - try couples collection
      try {
        const coupleResult = await coupleService.findByCredential(credential);
        
        if (coupleResult) {
          await handleCoupleLogin(coupleResult);
          return;
        }
        
        // Not found in couples either
        showToast('User not found. Check your ID/Email/Phone.', 'error');
        setLoginState('idle');
      } catch (coupleError: any) {
        console.error('Couples query error:', coupleError);
        // If it's a permission error, the user likely doesn't exist
        showToast('User not found. Check your ID/Email/Phone.', 'error');
        setLoginState('idle');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      showToast(error.message || 'Login failed. Please try again.', 'error');
      setLoginState('idle');
    }
  };
  
  // Helper function to handle couple user login
  const handleCoupleLogin = async (coupleResult: { couple: any; gender: 'male' | 'female' | 'both' }) => {
    const { couple, gender } = coupleResult;
    
    // FIRST-TIME LOGIN CHECK: Block shared credentials if either user hasn't completed setup
    if (gender === 'both') {
      const maleNeedsSetup = !couple.male.isPasswordReset || !couple.male.isPinSet;
      const femaleNeedsSetup = !couple.female.isPasswordReset || !couple.female.isPinSet;
      
      if (maleNeedsSetup || femaleNeedsSetup) {
        // Block shared credential login - require individual login first
        showToast('Please use your personal credentials for first-time login.', 'error');
        setLoginState('idle');
        return;
      }
      
      // Both users have completed setup - allow shared credential with profile picker
      const malePasswordValid = await coupleService.verifyPassword(couple.id, 'male', password);
      const femalePasswordValid = await coupleService.verifyPassword(couple.id, 'female', password);
      
      if (!malePasswordValid && !femalePasswordValid) {
        showToast('Invalid password', 'error');
        setLoginState('idle');
        return;
      }
      
      // Store couple info and navigate to profile selection
      await AsyncStorage.setItem('userRole', 'user');
      await AsyncStorage.setItem('coupleId', couple.id);
      await AsyncStorage.setItem('pendingProfileSelection', 'true');
      
      setLoginState('success');
      showToast('Select your profile', 'success');
      
      setTimeout(() => {
        router.push({
          pathname: '/verify-otp',
          params: { 
            mode: 'profile-select',
            coupleId: couple.id,
            maleName: couple.male.name,
            femaleName: couple.female.name,
          }
        });
      }, 500);
      return;
    }
    
    // Single user match - verify password
    const passwordValid = await coupleService.verifyPassword(couple.id, gender, password);
    
    if (!passwordValid) {
      showToast('Invalid password', 'error');
      setLoginState('idle');
      return;
    }
    
    const user = couple[gender];
    
    // Check if user is inactive
    if (user.status === 'inactive') {
      showToast('Your account is paused. Contact admin.', 'error');
      setLoginState('idle');
      return;
    }
    
    // Store user info
    await AsyncStorage.setItem('userRole', 'user');
    await AsyncStorage.setItem('coupleId', couple.id);
    await AsyncStorage.setItem('userGender', gender);
    await AsyncStorage.setItem('userId', user.id);
    await AsyncStorage.setItem('userName', user.name);
    
    // Check if password reset is needed
    if (!user.isPasswordReset) {
      setLoginState('success');
      showToast('Please reset your password', 'success');
      
      setTimeout(() => {
        router.push({
          pathname: '/reset-password',
          params: { 
            mode: 'first-login',
            coupleId: couple.id,
            gender: gender,
          }
        });
      }, 500);
      return;
    }
    
    // Check if PIN needs to be set
    if (!user.isPinSet) {
      setLoginState('success');
      showToast('Please set your PIN', 'success');
      
      setTimeout(() => {
        router.push({
          pathname: '/user/manage-pin',
          params: { 
            mode: 'setup',
            coupleId: couple.id,
            gender: gender,
          }
        });
      }, 500);
      return;
    }
    
    // Update last login
    await coupleService.updateLastLogin(couple.id, gender);
    
    setLoginState('success');
    showToast(`Welcome ${user.name}!`, 'success');
    
    setTimeout(() => {
      router.replace('/user/home');
    }, 500);
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
                  <Text style={styles.title}>{loginMode === 'individual' ? 'Login' : 'Quick Access'}</Text>
                </View>
              )}
            </View>

            <View style={isMobileWeb && styles.mobileWebFormWrapper}>
              {isMobileWeb && (
                <View style={styles.headerSection}>
                  <Text style={styles.title}>{loginMode === 'individual' ? 'Login' : 'Quick Access'}</Text>
                </View>
              )}
              <View style={styles.formContainer}>
                {/* Credential Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {loginMode === 'individual' ? 'User ID / Email / Phone' : 'Couple ID / Shared Phone / Email'}
                  </Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder={loginMode === 'individual' 
                        ? 'Enter your User ID, Email or Phone' 
                        : 'Enter your Couple ID, Phone or Email'}
                      placeholderTextColor="#94a3b8"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="default"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={loginState === 'idle'}
                      selectionColor="transparent"
                      underlineColorAndroid="transparent"
                    />
                  </View>
                </View>

                {/* Password Input - Only for Individual mode */}
                {loginMode === 'individual' && (
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
                )}

                {/* Quick Access Info Box */}
                {loginMode === 'shared' && (
                  <View style={styles.infoBox}>
                    <Ionicons name="flash" size={16} color="#006dab" />
                    <Text style={styles.infoText}>Select your profile, then enter your 4-digit PIN</Text>
                  </View>
                )}

                {/* Remember Me - Only for Individual mode */}
                {loginMode === 'individual' && (
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
                )}

                {/* Login Button */}
                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={handleContinue}
                  disabled={loginState !== 'idle'}
                  activeOpacity={0.85}
                >
                  {loginState === 'idle' && (
                    <LinearGradient 
                      colors={loginMode === 'individual' ? ['#006dab', '#005a8f'] : ['#98be4e', '#7da33e']} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 0 }} 
                      style={styles.gradientButton}
                    >
                      <Text style={styles.continueButtonText}>
                        {loginMode === 'individual' ? 'Login' : 'Continue'}
                      </Text>
                    </LinearGradient>
                  )}
                  {loginState === 'loading' && (
                    <View style={[styles.gradientButton, styles.loadingButton, loginMode === 'shared' && styles.loadingButtonGreen]}>
                      <Animated.View style={[styles.spinner, { transform: [{ rotate: spinnerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
                    </View>
                  )}
                  {loginState === 'success' && (
                    <LinearGradient 
                      colors={loginMode === 'individual' ? ['#006dab', '#005a8f'] : ['#98be4e', '#7da33e']} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 0 }} 
                      style={styles.gradientButton}
                    >
                      <Ionicons name="checkmark" size={32} color="#ffffff" />
                    </LinearGradient>
                  )}
                </TouchableOpacity>

                {/* Mode Switch Link */}
                <TouchableOpacity 
                  style={styles.modeSwitchContainer} 
                  onPress={() => setLoginMode(loginMode === 'individual' ? 'shared' : 'individual')} 
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={loginMode === 'individual' ? 'people-outline' : 'person-outline'} 
                    size={18} 
                    color="#006dab" 
                  />
                  <Text style={styles.modeSwitchText}>
                    {loginMode === 'individual' 
                      ? 'Using shared credentials? Click here' 
                      : 'First-time or individual login? Click here'}
                  </Text>
                </TouchableOpacity>

                {/* Forgot Password Button */}
                {loginMode === 'individual' && (
                  <TouchableOpacity 
                    style={styles.forgotPasswordButton} 
                    onPress={() => router.push('/reset-password')} 
                    activeOpacity={0.7}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}
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
    gap: 16,
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
    borderColor: '#006dab',
    borderRadius: 12,
    borderStyle: 'solid',
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
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
  loadingButtonGreen: {
    backgroundColor: '#98be4e',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#006dab10',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#006dab20',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#006dab',
    fontWeight: '500',
  },
  modeSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  modeSwitchText: {
    fontSize: 14,
    color: '#006dab',
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    paddingVertical: 4,
    marginTop: 0,
  },
  forgotPasswordText: {
    fontSize: 15,
    color: '#98be4e',
    fontWeight: '700',
  },
});