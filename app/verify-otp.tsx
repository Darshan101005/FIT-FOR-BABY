import { coupleService } from '@/services/firestore.service';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const isWeb = Platform.OS === 'web';

// Colors
const COLORS = {
  primary: '#006dab',
  primaryDark: '#005a8f',
  accent: '#98be4e',
  male: '#3b82f6',
  female: '#ec4899',
  success: '#22c55e',
  error: '#ef4444',
  background: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
};

export default function VerifyOTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width: screenWidth } = useWindowDimensions();
  
  // Mode from params
  const mode = params.mode as string;
  const coupleId = params.coupleId as string;
  const maleName = params.maleName as string;
  const femaleName = params.femaleName as string;
  
  // OTP mode state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpState, setOtpState] = useState<'idle' | 'entering' | 'correct' | 'wrong'>('idle');
  
  // Profile selection mode state
  const [selectedProfile, setSelectedProfile] = useState<'male' | 'female' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const isMobileWeb = useMemo(() => {
    if (!isWeb) return false;
    return /Mobi|Android|iPhone/i.test(navigator.userAgent);
  }, []);

  // Responsive sizing
  const logoSize = isMobileWeb ?
    Math.min(screenWidth * 0.6, 350) :
    (isWeb ? Math.min(screenWidth * 0.35, 280) : Math.min(screenWidth * 0.65, 320));
  const boxSize = isMobileWeb ? 48 : (isWeb ? Math.min(screenWidth * 0.065, 55) : Math.min(screenWidth * 0.12, 48));
  const boxHeight = 48;

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

  const handleOtpChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpState('entering');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const otpValue = otp.join('');
    
    if (otpValue.length !== 6) {
      showToast('Enter complete 6-digit OTP', 'error');
      return;
    }

    // Accept OTP: 111111 (six 1s)
    if (otpValue === '111111') {
      setOtpState('correct');
      showToast('OTP verified successfully!', 'success');
      setTimeout(() => {
        router.replace('/user/home');
      }, 1500);
    } else {
      setOtpState('wrong');
      showToast('Incorrect OTP. Use: 111111', 'error');
      setTimeout(() => {
        setOtpState('idle');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }, 1500);
    }
  };

  const handleResend = () => {
    showToast('OTP resent to your email', 'success');
    setOtp(['', '', '', '', '', '']);
    setOtpState('idle');
    inputRefs.current[0]?.focus();
  };

  // Profile selection handler
  const handleProfileSelect = async (gender: 'male' | 'female') => {
    setSelectedProfile(gender);
    setIsLoading(true);
    
    try {
      const couple = await coupleService.get(coupleId);
      if (!couple) {
        showToast('Account not found. Please try again.', 'error');
        setIsLoading(false);
        return;
      }
      
      const user = couple[gender];
      
      // Check if user is inactive
      if (user.status === 'inactive') {
        showToast('Your profile is paused. Contact admin.', 'error');
        setIsLoading(false);
        setSelectedProfile(null);
        return;
      }
      
      // Store user info
      await AsyncStorage.setItem('userRole', 'user');
      await AsyncStorage.setItem('coupleId', coupleId);
      await AsyncStorage.setItem('userGender', gender);
      await AsyncStorage.setItem('userId', user.id);
      await AsyncStorage.setItem('userName', user.name);
      await AsyncStorage.removeItem('pendingProfileSelection');
      
      // QUICK ACCESS MODE: Skip password check, go directly to PIN
      if (mode === 'quick-access') {
        // Quick access mode already verified setup is complete (PIN set)
        router.replace({
          pathname: '/user/enter-pin',
          params: { 
            coupleId: coupleId,
            gender: gender,
          }
        });
        return;
      }
      
      // PROFILE SELECT MODE (after shared credential login with password)
      // Check if password reset is needed
      if (!user.isPasswordReset) {
        showToast('Please reset your password', 'success');
        
        setTimeout(() => {
          router.replace({
            pathname: '/reset-password',
            params: { 
              mode: 'first-login',
              coupleId: coupleId,
              gender: gender,
            }
          });
        }, 500);
        return;
      }
      
      // Check if PIN needs to be set
      if (!user.isPinSet) {
        showToast('Please set your PIN', 'success');
        
        setTimeout(() => {
          router.replace({
            pathname: '/user/manage-pin',
            params: { 
              mode: 'setup',
              coupleId: coupleId,
              gender: gender,
            }
          });
        }, 500);
        return;
      }
      
      // If PIN is set, verify it
      router.replace({
        pathname: '/user/enter-pin',
        params: { 
          coupleId: coupleId,
          gender: gender,
        }
      });
      
    } catch (error: any) {
      console.error('Profile selection error:', error);
      showToast(error.message || 'Failed to select profile', 'error');
      setIsLoading(false);
      setSelectedProfile(null);
    }
  };

  const getBoxStyle = (digit: string) => {
    if (otpState === 'correct') return styles.otpBoxCorrect;
    if (otpState === 'wrong') return styles.otpBoxWrong;
    if (otpState === 'entering' && digit) return styles.otpBoxEntering;
    if (digit) return styles.otpBoxFilled;
    return null;
  };

  // Profile Selection Mode UI
  if (mode === 'profile-select' || mode === 'quick-access') {
    const maleStatus = params.maleStatus as string;
    const femaleStatus = params.femaleStatus as string;
    const isMaleInactive = maleStatus === 'inactive';
    const isFemaleInactive = femaleStatus === 'inactive';
    
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

        <ScrollView 
          contentContainerStyle={styles.profileSelectContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.profileLogoSection}>
            <Image 
              source={require('../assets/logos/logo-icon.svg')}
              style={{ width: logoSize, height: logoSize }}
              contentFit="contain"
            />
          </View>

          {/* Header */}
          <View style={styles.profileHeader}>
            <Text style={styles.profileTitle}>Who's logging in?</Text>
            <Text style={styles.profileSubtitle}>
              {mode === 'quick-access' 
                ? 'Select your profile, then enter your PIN'
                : 'Select your profile to continue'}
            </Text>
          </View>

          {/* Profile Cards */}
          <View style={styles.profileCardsContainer}>
            {/* Male Card */}
            <TouchableOpacity
              style={[
                styles.profileCard,
                styles.maleCard,
                selectedProfile === 'male' && styles.profileCardSelected,
                isMaleInactive && styles.profileCardInactive,
              ]}
              onPress={() => handleProfileSelect('male')}
              disabled={isLoading || isMaleInactive}
              activeOpacity={0.8}
            >
              <View style={[styles.profileIconCircle, { backgroundColor: isMaleInactive ? '#94a3b815' : COLORS.male + '15' }]}>
                <Ionicons name="man" size={48} color={isMaleInactive ? '#94a3b8' : COLORS.male} />
              </View>
              <Text style={[styles.profileName, { color: isMaleInactive ? '#94a3b8' : COLORS.male }]}>
                {maleName || 'Partner 1'}
              </Text>
              <Text style={styles.profileLabel}>{isMaleInactive ? 'Paused' : 'Male'}</Text>
              {selectedProfile === 'male' && isLoading && (
                <View style={styles.profileLoadingOverlay}>
                  <View style={styles.profileSpinner} />
                </View>
              )}
            </TouchableOpacity>

            {/* Female Card */}
            <TouchableOpacity
              style={[
                styles.profileCard,
                styles.femaleCard,
                selectedProfile === 'female' && styles.profileCardSelected,
                isFemaleInactive && styles.profileCardInactive,
              ]}
              onPress={() => handleProfileSelect('female')}
              disabled={isLoading || isFemaleInactive}
              activeOpacity={0.8}
            >
              <View style={[styles.profileIconCircle, { backgroundColor: isFemaleInactive ? '#94a3b815' : COLORS.female + '15' }]}>
                <Ionicons name="woman" size={48} color={isFemaleInactive ? '#94a3b8' : COLORS.female} />
              </View>
              <Text style={[styles.profileName, { color: isFemaleInactive ? '#94a3b8' : COLORS.female }]}>
                {femaleName || 'Partner 2'}
              </Text>
              <Text style={styles.profileLabel}>{isFemaleInactive ? 'Paused' : 'Female'}</Text>
              {selectedProfile === 'female' && isLoading && (
                <View style={styles.profileLoadingOverlay}>
                  <View style={styles.profileSpinner} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Access Info */}
          {mode === 'quick-access' && (
            <View style={styles.quickAccessInfo}>
              <Ionicons name="flash" size={16} color={COLORS.accent} />
              <Text style={styles.quickAccessInfoText}>Quick Access Mode - PIN only</Text>
            </View>
          )}

          {/* Back to login */}
          <View style={styles.backContainer}>
            <TouchableOpacity onPress={() => router.replace('/login')} activeOpacity={0.7}>
              <Text style={styles.backLink}>← Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

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
            <View style={[styles.logoSection, isMobileWeb && styles.mobileWebLogoSection]}>
              <Image 
                source={require('../assets/logos/logo-icon.svg')}
                style={{ width: logoSize, height: logoSize }}
                contentFit="contain"
              />
            </View>

            <View style={isMobileWeb && styles.mobileWebFormWrapper}>
              <View style={styles.headerSection}>
                <Text style={styles.title}>Verify OTP</Text>
                <Text style={styles.subtitle}>
                  Enter the 6-digit code sent to your email
                </Text>
              </View>

              <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={[
                    {
                      width: boxSize,
                      height: boxHeight,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: '#006dab',
                      textAlign: 'center',
                      fontSize: isWeb ? 20 : 18,
                      fontWeight: 'bold',
                      color: '#006dab',
                      backgroundColor: '#ffffff',
                    },
                    getBoxStyle(digit),
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  selectionColor="transparent"
                  editable={otpState !== 'correct' && otpState !== 'wrong'}
                />
              ))}
            </View>

            <TouchableOpacity 
              style={styles.verifyButton}
              onPress={handleVerify}
              disabled={otpState === 'correct' || otpState === 'wrong'}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#006dab', '#005a8f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.verifyButtonText}>Verify OTP</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                <Text style={styles.resendLink}>Resend OTP</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isWeb ? 30 : 20,
    marginTop: isWeb ? -48 : -128,
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
    marginTop: isWeb ? -120 : -30,
  },
  mobileWebContentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    marginTop: 0,
    paddingTop: 0,
    paddingBottom: 80,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: isWeb ? -30 : -30,
  },
  mobileWebLogoSection: {
    marginTop: 30,
    marginBottom: 0,
  },
  mobileWebFormWrapper: {
    marginTop: 0,
  },
  headerSection: {
    marginBottom: isWeb ? 20 : 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#006dab',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: isWeb ? 12 : 8,
  },
  otpBoxFilled: {
    borderColor: '#006dab',
    borderWidth: 2,
  },
  otpBoxEntering: {
    borderColor: '#fbbf24',
    borderWidth: 2,
    backgroundColor: '#fef3c7',
  },
  otpBoxCorrect: {
    borderColor: '#98be4e',
    borderWidth: 2,
    backgroundColor: '#f0fdf4',
  },
  otpBoxWrong: {
    borderColor: '#ef4444',
    borderWidth: 2,
    backgroundColor: '#fee2e2',
  },
  verifyButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#006dab',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 24,
  },
  gradientButton: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  resendLink: {
    fontSize: 15,
    color: '#98be4e',
    fontWeight: '700',
  },

  // Profile Selection Styles
  profileSelectContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: isWeb ? 40 : 60,
    paddingBottom: 40,
  },
  profileLogoSection: {
    alignItems: 'center',
    marginBottom: isWeb ? -20 : -10,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8,
  },
  profileSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  profileCardsContainer: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 20,
    width: '100%',
    maxWidth: isWeb ? 500 : 300,
    marginBottom: 32,
  },
  profileCard: {
    flex: isWeb ? 1 : undefined,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  maleCard: {
    borderColor: COLORS.male + '30',
  },
  femaleCard: {
    borderColor: COLORS.female + '30',
  },
  profileCardSelected: {
    borderWidth: 3,
  },
  profileIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  profileLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  profileSpinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: COLORS.border,
    borderTopColor: COLORS.primary,
  },
  backContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  backLink: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  profileCardInactive: {
    opacity: 0.6,
    borderColor: '#94a3b850',
  },
  quickAccessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.accent + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  quickAccessInfoText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
});
