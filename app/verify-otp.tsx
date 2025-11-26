import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const isWeb = Platform.OS === 'web';

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpState, setOtpState] = useState<'idle' | 'entering' | 'correct' | 'wrong'>('idle');
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const isMobileWeb = useMemo(() => {
    if (!isWeb) return false;
    return /Mobi|Android|iPhone/i.test(navigator.userAgent);
  }, []);

  // Responsive sizing
  const logoSize = isMobileWeb ?
    Math.min(screenWidth * 0.8, 500) :
    (isWeb ? Math.min(screenWidth * 0.5, 350) : Math.min(screenWidth * 0.8, 450));
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

  const getBoxStyle = (digit: string) => {
    if (otpState === 'correct') return styles.otpBoxCorrect;
    if (otpState === 'wrong') return styles.otpBoxWrong;
    if (otpState === 'entering' && digit) return styles.otpBoxEntering;
    if (digit) return styles.otpBoxFilled;
    return null;
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
});
