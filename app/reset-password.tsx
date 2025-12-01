import { coupleService } from '@/services/firestore.service';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const isWeb = Platform.OS === 'web';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width: screenWidth } = useWindowDimensions();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(true); // Visible by default
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;
  
  // Mode from params: 'first-login' = password reset after enrollment
  const mode = params.mode as string;
  const coupleId = params.coupleId as string;
  const gender = params.gender as 'male' | 'female';

  const isMobileWeb = useMemo(() => {
    if (!isWeb) return false;
    return /Mobi|Android|iPhone/i.test(navigator.userAgent);
  }, []);

  // Responsive sizing - same as login page
  const logoSize = isMobileWeb ?
    Math.min(screenWidth * 0.8, 500) :
    (isWeb ? Math.min(screenWidth * 0.5, 350) : Math.min(screenWidth * 0.85, 420));

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

  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Trim and check for empty
    const trimmedPassword = password.trim();
    
    // Check minimum length
    if (trimmedPassword.length < 8) {
      errors.push('At least 8 characters required');
    }
    
    // Check for uppercase letter
    if (!/[A-Z]/.test(trimmedPassword)) {
      errors.push('One uppercase letter required');
    }
    
    // Check for lowercase letter  
    if (!/[a-z]/.test(trimmedPassword)) {
      errors.push('One lowercase letter required');
    }
    
    // Check for number
    if (!/[0-9]/.test(trimmedPassword)) {
      errors.push('One number required');
    }
    
    // Check for spaces (not allowed in password)
    if (/\s/.test(password)) {
      errors.push('Spaces are not allowed');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      showToast('Please enter new password', 'error');
      return;
    }

    if (!confirmPassword.trim()) {
      showToast('Please confirm your password', 'error');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      showToast(validation.errors[0], 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (mode === 'first-login' && coupleId && gender) {
        // First-time password reset after enrollment
        await coupleService.resetPassword(coupleId, gender, newPassword);
        
        // Check if PIN needs to be set
        const couple = await coupleService.get(coupleId);
        const user = couple?.[gender];
        
        showToast('Password set successfully!', 'success');
        
        setTimeout(() => {
          if (!user?.isPinSet) {
            // Navigate to PIN setup
            router.replace({
              pathname: '/user/manage-pin',
              params: { 
                mode: 'setup',
                coupleId: coupleId,
                gender: gender,
              }
            });
          } else {
            // Navigate to home
            router.replace('/user/home');
          }
        }, 1000);
      } else {
        // Generic password reset - navigate back to login
        showToast('Password reset successfully!', 'success');
        setTimeout(() => {
          router.replace('/login');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      showToast(error.message || 'Failed to reset password', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrength = () => {
    if (!newPassword) return { level: 0, text: '', color: '#e2e8f0' };
    
    const trimmedPassword = newPassword.trim();
    let strength = 0;
    
    // Check all 4 required rules (same as validation)
    if (trimmedPassword.length >= 8) strength++;
    if (/[A-Z]/.test(trimmedPassword)) strength++;
    if (/[a-z]/.test(trimmedPassword)) strength++;
    if (/[0-9]/.test(trimmedPassword)) strength++;
    
    // Deduct if spaces are present (invalid)
    const hasSpaces = /\s/.test(newPassword);

    // Strength levels based on rules met (out of 4)
    if (strength === 0 || hasSpaces) return { level: 0, text: hasSpaces ? 'Invalid' : '', color: hasSpaces ? '#ef4444' : '#e2e8f0' };
    if (strength === 1) return { level: 1, text: 'Weak', color: '#ef4444' };
    if (strength === 2) return { level: 2, text: 'Weak', color: '#ef4444' };
    if (strength === 3) return { level: 3, text: 'Medium', color: '#f59e0b' };
    return { level: 4, text: 'Strong', color: '#22c55e' };
  };

  const passwordStrength = getPasswordStrength();

  // Check if all password rules are satisfied and passwords match
  const isPasswordValid = () => {
    const trimmedPassword = newPassword.trim();
    const hasMinLength = trimmedPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(trimmedPassword);
    const hasLowercase = /[a-z]/.test(trimmedPassword);
    const hasNumber = /[0-9]/.test(trimmedPassword);
    const hasNoSpaces = !/\s/.test(newPassword);
    const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
    
    return hasMinLength && hasUppercase && hasLowercase && hasNumber && hasNoSpaces && passwordsMatch;
  };

  const canSubmit = isPasswordValid() && !isSubmitting;

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
            <Text style={styles.toastIcon}>
              {toast.type === 'error' ? '✗' : '✓'}
            </Text>
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
            </View>

            <View style={isMobileWeb && styles.mobileWebFormWrapper}>
              <View style={styles.headerSection}>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  Create a new secure password for your account
                </Text>
              </View>

              {/* New Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#006dab" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, isWeb && { outlineStyle: 'none' as any }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity 
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons 
                      name={showNewPassword ? 'eye-outline' : 'eye-off-outline'} 
                      size={22} 
                      color="#006dab" 
                    />
                  </TouchableOpacity>
                </View>
                
                {/* Password Strength Indicator */}
                {newPassword.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3, 4].map((level) => (
                        <View 
                          key={level}
                          style={[
                            styles.strengthBar,
                            { backgroundColor: level <= passwordStrength.level ? passwordStrength.color : '#e2e8f0' }
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                      {passwordStrength.text}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#006dab" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, isWeb && { outlineStyle: 'none' as any }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={true}
                    autoCapitalize="none"
                  />
                </View>
                
                {/* Password Match Indicator */}
                {confirmPassword.length > 0 && (
                  <View style={styles.matchContainer}>
                    <Ionicons 
                      name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'} 
                      size={16} 
                      color={newPassword === confirmPassword ? '#22c55e' : '#ef4444'} 
                    />
                    <Text style={[
                      styles.matchText,
                      { color: newPassword === confirmPassword ? '#22c55e' : '#ef4444' }
                    ]}>
                      {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Password Requirements */}
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>Password must contain:</Text>
                <View style={styles.requirementItem}>
                  <Ionicons 
                    name={newPassword.trim().length >= 8 ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={14} 
                    color={newPassword.trim().length >= 8 ? '#22c55e' : '#94a3b8'} 
                  />
                  <Text style={[styles.requirementText, newPassword.trim().length >= 8 && styles.requirementMet]}>
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons 
                    name={/[A-Z]/.test(newPassword.trim()) ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={14} 
                    color={/[A-Z]/.test(newPassword.trim()) ? '#22c55e' : '#94a3b8'} 
                  />
                  <Text style={[styles.requirementText, /[A-Z]/.test(newPassword.trim()) && styles.requirementMet]}>
                    One uppercase letter
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons 
                    name={/[a-z]/.test(newPassword.trim()) ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={14} 
                    color={/[a-z]/.test(newPassword.trim()) ? '#22c55e' : '#94a3b8'} 
                  />
                  <Text style={[styles.requirementText, /[a-z]/.test(newPassword.trim()) && styles.requirementMet]}>
                    One lowercase letter
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons 
                    name={/[0-9]/.test(newPassword.trim()) ? 'checkmark-circle' : 'ellipse-outline'} 
                    size={14} 
                    color={/[0-9]/.test(newPassword.trim()) ? '#22c55e' : '#94a3b8'} 
                  />
                  <Text style={[styles.requirementText, /[0-9]/.test(newPassword.trim()) && styles.requirementMet]}>
                    One number
                  </Text>
                </View>
                {/\s/.test(newPassword) && (
                  <View style={styles.requirementItem}>
                    <Ionicons 
                      name="close-circle" 
                      size={14} 
                      color="#ef4444" 
                    />
                    <Text style={[styles.requirementText, { color: '#ef4444' }]}>
                      Spaces are not allowed
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity 
                style={[styles.resetButton, !canSubmit && styles.resetButtonDisabled]}
                onPress={handleResetPassword}
                activeOpacity={0.85}
                disabled={!canSubmit}
              >
                <LinearGradient
                  colors={!canSubmit ? ['#94a3b8', '#94a3b8'] : ['#006dab', '#005a8f']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.resetButtonText}>
                    {isSubmitting ? 'Saving...' : (mode === 'first-login' ? 'Set Password' : 'Reset Password')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {mode !== 'first-login' && (
                <View style={styles.backContainer}>
                  <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                    <Text style={styles.backLink}>← Back to Login</Text>
                  </TouchableOpacity>
                </View>
              )}
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
    paddingBottom: isWeb ? 40 : 40,
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
    paddingBottom: 80,
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
    marginBottom: isWeb ? 24 : 20,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  title: {
    fontSize: isWeb ? 32 : 28,
    fontWeight: '900',
    color: '#006dab',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: isWeb ? 15 : 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: isWeb ? 20 : 16,
  },
  inputLabel: {
    fontSize: isWeb ? 16 : 15,
    fontWeight: '700',
    color: '#006dab',
    marginBottom: isWeb ? 10 : 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#006dab',
    borderStyle: 'solid',
    paddingHorizontal: isWeb ? 16 : 14,
    height: isWeb ? 58 : 52,
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: isWeb ? 16 : 15,
    color: '#1e293b',
    fontWeight: '600',
    height: '100%',
    paddingVertical: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  eyeButton: {
    padding: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '500',
  },
  requirementsContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: isWeb ? 14 : 12,
    marginBottom: isWeb ? 24 : 20,
  },
  requirementsTitle: {
    fontSize: isWeb ? 13 : 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: isWeb ? 10 : 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: isWeb ? 6 : 4,
  },
  requirementText: {
    fontSize: isWeb ? 13 : 12,
    color: '#94a3b8',
  },
  requirementMet: {
    color: '#22c55e',
  },
  resetButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: isWeb ? 24 : 20,
  },
  resetButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  gradientButton: {
    paddingVertical: isWeb ? 20 : 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: isWeb ? 64 : 56,
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: isWeb ? 19 : 17,
    fontWeight: '800',
  },
  backContainer: {
    alignItems: 'center',
    marginBottom: isWeb ? 20 : 30,
    paddingBottom: isWeb ? 20 : 10,
  },
  backLink: {
    fontSize: isWeb ? 15 : 14,
    color: '#006dab',
    fontWeight: '600',
  },
});
