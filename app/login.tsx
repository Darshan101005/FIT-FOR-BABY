import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginState, setLoginState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const spinnerAnim = useRef(new Animated.Value(0)).current;

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

  const showToast = (message: string, type: 'error' | 'success') => {
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

  const handleContinue = () => {
    if (!email || !password) {
      showToast('Enter email and password', 'error');
      return;
    }

    if (!email.includes('@')) {
      showToast('Invalid email format', 'error');
      return;
    }

    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    // Simulate login process
    setLoginState('loading');

    // Simulate API call
    setTimeout(() => {
      const isPasswordCorrect = password === 'admin123'; // Mock validation
      
      if (isPasswordCorrect) {
        setLoginState('success');
        
        setTimeout(() => {
          router.push('/verify-otp');
        }, 800);
      } else {
        showToast('Incorrect password', 'error');
        setLoginState('idle');
      }
    }, 1500);
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
            <View style={styles.toastIconContainer}>
              {toast.type === 'error' ? (
                <View style={styles.errorIcon}>
                  <View style={[styles.iconLine, styles.iconLineLeft]} />
                  <View style={[styles.iconLine, styles.iconLineRight]} />
                </View>
              ) : (
                <View style={styles.successIcon}>
                  <View style={[styles.checkLine, styles.checkLineShort]} />
                  <View style={[styles.checkLine, styles.checkLineLong]} />
                </View>
              )}
            </View>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentWrapper}>
            <View style={styles.logoSection}>
              <Image 
                source={require('../assets/logos/logo-icon.svg')}
                style={styles.logo}
                contentFit="contain"
              />
            </View>

            <View style={styles.headerSection}>
              <Text style={styles.title}>Login</Text>
            </View>

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
                    <Ionicons 
                      name={showPassword ? "eye-outline" : "eye-off-outline"} 
                      size={22} 
                      color="#64748b" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && (
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  )}
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
                  <LinearGradient
                    colors={['#006dab', '#005a8f']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.continueButtonText}>Login</Text>
                  </LinearGradient>
                )}
                
                {loginState === 'loading' && (
                  <View style={[styles.gradientButton, styles.loadingButton]}>
                    <Animated.View 
                      style={[
                        styles.spinner,
                        {
                          transform: [{
                            rotate: spinnerAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg'],
                            })
                          }]
                        }
                      ]} 
                    />
                  </View>
                )}
                
                {loginState === 'success' && (
                  <LinearGradient
                    colors={['#98be4e', '#7da53e']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    <Ionicons name="checkmark" size={32} color="#ffffff" />
                  </LinearGradient>
                )}
              </TouchableOpacity>
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
    right: isWeb ? 20 : 16,
    zIndex: 1000,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: 320,
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
  },
  toastIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLine: {
    position: 'absolute',
    width: 2,
    height: 18,
    backgroundColor: '#ef4444',
    borderRadius: 1,
  },
  iconLineLeft: {
    transform: [{ rotate: '45deg' }],
  },
  iconLineRight: {
    transform: [{ rotate: '-45deg' }],
  },
  successIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLine: {
    position: 'absolute',
    backgroundColor: '#98be4e',
    borderRadius: 1,
  },
  checkLineShort: {
    width: 2,
    height: 6,
    bottom: 6,
    left: 5,
    transform: [{ rotate: '-45deg' }],
  },
  checkLineLong: {
    width: 2,
    height: 12,
    bottom: 3,
    left: 9,
    transform: [{ rotate: '45deg' }],
  },
  toastText: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: isWeb ? 10 : 10,
  },
  contentWrapper: {
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: isWeb ? 40 : 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: -150,
  },
  logo: {
    width: 400,
    height: 400,
  },
  headerSection: {
    marginBottom: 24,
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
    fontSize: 17,
    color: '#1e293b',
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
    color: '#64748b',
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
