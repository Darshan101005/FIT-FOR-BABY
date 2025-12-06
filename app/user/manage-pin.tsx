import BottomNavBar from '@/components/navigation/BottomNavBar';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { coupleService } from '@/services/firestore.service';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
  useWindowDimensions,
} from 'react-native';

const isWeb = Platform.OS === 'web';

type Mode = 'view' | 'setup' | 'update' | 'reset';
type Step = 'main' | 'enter-pin' | 'confirm-pin' | 'success';

export default function ManagePinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors, isDarkMode } = useTheme();
  const { refreshAuthState, setSessionExpiry } = useAuth();

  // Get params
  const paramMode = params.mode as Mode;
  const paramCoupleId = params.coupleId as string;
  const paramGender = params.gender as 'male' | 'female';
  
  // State for user data
  const [coupleId, setCoupleId] = useState(paramCoupleId || '');
  const [gender, setGender] = useState<'male' | 'female'>(paramGender || 'male');
  const [hasPinSet, setHasPinSet] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');

  // If coming from forgot PIN or setup, go directly to appropriate flow
  const initialMode = paramMode || 'view';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<Step>(initialMode === 'reset' || initialMode === 'setup' ? 'enter-pin' : 'main');
  
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toastAnim = useRef(new Animated.Value(-100)).current;
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  
  const pinRefs = useRef<(TextInput | null)[]>([]);
  const confirmPinRefs = useRef<(TextInput | null)[]>([]);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedCoupleId = paramCoupleId || await AsyncStorage.getItem('coupleId') || '';
        const storedGender = paramGender || (await AsyncStorage.getItem('userGender') as 'male' | 'female') || 'male';
        
        setCoupleId(storedCoupleId);
        setGender(storedGender);
        
        if (storedCoupleId) {
          const couple = await coupleService.get(storedCoupleId);
          if (couple) {
            const user = couple[storedGender];
            setHasPinSet(user.isPinSet || false);
            
            // Mask email
            if (user.email) {
              const [name, domain] = user.email.split('@');
              const masked = name.length > 2 
                ? `${name[0]}***@${domain}`
                : `${name}***@${domain}`;
              setMaskedEmail(masked);
            }
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    
    loadUserData();
  }, [paramCoupleId, paramGender]);

  const showToast = (message: string, type: 'error' | 'success' | 'info') => {
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
      }).start(() => setToast({ visible: false, message: '', type: '' }));
    }, 2500);
  };

  const handleSetPin = () => {
    setMode('setup');
    setStep('enter-pin');
    resetFields();
  };

  const handleUpdatePin = () => {
    setMode('update');
    setStep('enter-pin');
    resetFields();
  };

  const resetFields = () => {
    setPin(['', '', '', '']);
    setConfirmPin(['', '', '', '']);
    setError('');
  };

  const handlePinChange = (value: string, index: number, isConfirm: boolean) => {
    if (value.length > 1) return;
    
    const currentPin = isConfirm ? confirmPin : pin;
    const setCurrentPin = isConfirm ? setConfirmPin : setPin;
    const refs = isConfirm ? confirmPinRefs : pinRefs;
    
    const newPin = [...currentPin];
    newPin[index] = value;
    setCurrentPin(newPin);
    setError('');

    if (value && index < 3) {
      refs.current[index + 1]?.focus();
    }

    if (index === 3 && value) {
      if (!isConfirm) {
        setTimeout(() => setStep('confirm-pin'), 300);
      } else {
        const pinStr = pin.join('');
        const confirmStr = newPin.join('');
        if (pinStr === confirmStr) {
          savePIN(pinStr);
        } else {
          setError('PINs do not match. Please try again.');
          setConfirmPin(['', '', '', '']);
          setTimeout(() => confirmPinRefs.current[0]?.focus(), 100);
        }
      }
    }
  };

  const handlePinKeyPress = (key: string, index: number, isConfirm: boolean) => {
    const currentPin = isConfirm ? confirmPin : pin;
    const refs = isConfirm ? confirmPinRefs : pinRefs;
    
    if (key === 'Backspace' && !currentPin[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const savePIN = async (pinValue: string) => {
    setIsLoading(true);
    try {
      await coupleService.setPin(coupleId, gender, pinValue);
      
      // Update AsyncStorage
      await AsyncStorage.setItem('userPinSet', 'true');
      
      setStep('success');
    } catch (error) {
      console.error('Error saving PIN:', error);
      setError('Failed to save PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    if (step === 'main') return 'Manage Session PIN';
    switch (mode) {
      case 'setup': return 'Set Up Session PIN';
      case 'update': return 'Update Session PIN';
      case 'reset': return 'Reset Session PIN';
      default: return 'Manage Session PIN';
    }
  };

  const renderMainView = () => (
    <View style={styles.mainContainer}>
      {/* Current PIN Status Card */}
      <View style={[styles.pinStatusCard, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.pinStatusHeader}>
          <View style={[styles.pinIconContainer, { backgroundColor: hasPinSet ? '#22c55e20' : '#f59e0b20' }]}>
            <Ionicons 
              name={hasPinSet ? 'lock-closed' : 'lock-open'} 
              size={28} 
              color={hasPinSet ? '#22c55e' : '#f59e0b'} 
            />
          </View>
          <View style={styles.pinStatusInfo}>
            <Text style={[styles.pinStatusTitle, { color: colors.text }]}>
              {hasPinSet ? 'Session PIN Active' : 'No PIN Set'}
            </Text>
            <Text style={[styles.pinStatusSubtitle, { color: colors.textSecondary }]}>
              {hasPinSet ? 'Your profile is secured' : 'Set a PIN to secure your profile'}
            </Text>
          </View>
        </View>
        
        {hasPinSet && (
          <View style={styles.currentPinDisplay}>
            <Text style={[styles.currentPinLabel, { color: colors.textSecondary }]}>
              Current PIN
            </Text>
            <View style={styles.currentPinDots}>
              {[0, 1, 2, 3].map((_, index) => (
                <View 
                  key={index} 
                  style={[styles.currentPinDot, { backgroundColor: '#1f2937' }]} 
                />
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {!hasPinSet ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleSetPin}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="add" size={22} color="#fff" />
            </View>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonTitle}>Set PIN</Text>
              <Text style={styles.actionButtonSubtitle}>Create a new 4-digit PIN</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleUpdatePin}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="refresh" size={22} color="#fff" />
            </View>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonTitle}>Update PIN</Text>
              <Text style={styles.actionButtonSubtitle}>Change your existing PIN</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}
      </View>

      {/* Info Note */}
      <View style={[styles.infoNote, { backgroundColor: isDarkMode ? colors.primaryLight : '#eff6ff' }]}>
        <Ionicons name="information-circle" size={20} color={colors.primary} />
        <Text style={[styles.infoNoteText, { color: colors.textSecondary }]}>
          Your session PIN is used to switch between profiles on shared devices. 
          Both partners need their own PIN to access their profile.
        </Text>
      </View>
    </View>
  );

  const renderPinStep = (isConfirm: boolean) => {
    const currentPin = isConfirm ? confirmPin : pin;
    const refs = isConfirm ? confirmPinRefs : pinRefs;

    return (
      <View style={styles.stepContainer}>
        <View style={[styles.iconContainer, { backgroundColor: '#22c55e20' }]}>
          <Ionicons name={isConfirm ? 'checkmark-circle' : 'lock-closed'} size={40} color="#22c55e" />
        </View>
        
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          {isConfirm ? 'Confirm Your PIN' : mode === 'update' ? 'Enter New PIN' : 'Create Your PIN'}
        </Text>
        <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
          {isConfirm 
            ? 'Re-enter your 4-digit PIN to confirm'
            : 'Choose a 4-digit PIN for profile switching'
          }
        </Text>

        <View style={styles.pinInputContainer}>
          {currentPin.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { refs.current[index] = ref; }}
              style={[
                styles.pinInput,
                { 
                  backgroundColor: isDarkMode ? colors.cardBackground : '#f8fafc',
                  borderColor: error ? '#ef4444' : digit ? '#22c55e' : colors.border,
                  color: colors.text,
                },
              ]}
              value={digit ? '●' : ''}
              onChangeText={(value) => handlePinChange(value.replace(/[^0-9]/g, ''), index, isConfirm)}
              onKeyPress={({ nativeEvent }) => handlePinKeyPress(nativeEvent.key, index, isConfirm)}
              keyboardType="number-pad"
              maxLength={1}
              secureTextEntry
              selectTextOnFocus
              autoFocus={index === 0}
            />
          ))}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={16} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {isConfirm && (
          <TouchableOpacity
            style={styles.backToPinButton}
            onPress={() => {
              setStep('enter-pin');
              setConfirmPin(['', '', '', '']);
              setError('');
            }}
          >
            <Ionicons name="arrow-back" size={16} color={colors.primary} />
            <Text style={[styles.backToPinText, { color: colors.primary }]}>
              Change PIN
            </Text>
          </TouchableOpacity>
        )}

        <View style={[styles.tipBox, { backgroundColor: isDarkMode ? colors.cardBackground : '#f0fdf4' }]}>
          <Ionicons name="bulb" size={18} color="#22c55e" />
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            Tip: Choose a PIN that's easy for you to remember but hard for others to guess.
          </Text>
        </View>
      </View>
    );
  };

  const renderSuccessStep = () => {
    const handleDone = async () => {
      if (mode === 'setup') {
        // First-time setup complete - clear pendingSetup flag, set session and go to home
        await AsyncStorage.removeItem('pendingSetup');
        await setSessionExpiry(true);
        await refreshAuthState();
        router.replace('/user/home' as any);
      } else {
        router.back();
      }
    };
    
    return (
      <View style={styles.stepContainer}>
        <View style={[styles.successIcon, { backgroundColor: '#22c55e20' }]}>
          <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
        </View>
        
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          {mode === 'setup' ? 'PIN Created!' : 'PIN Updated!'}
        </Text>
        <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
          Your session PIN has been {mode === 'setup' ? 'created' : 'updated'} successfully. 
          You can now use it to switch between profiles.
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleDone}
        >
          <Text style={styles.primaryButtonText}>{mode === 'setup' ? 'Continue' : 'Done'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStepIndicator = () => {
    const steps = ['enter-pin', 'confirm-pin'];
    const stepLabels = ['1', '2'];
    const currentIndex = steps.indexOf(step);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((s, index) => (
          <React.Fragment key={s}>
            <View style={[
              styles.stepDot,
              { backgroundColor: index <= currentIndex ? colors.primary : colors.border },
            ]}>
              {index < currentIndex ? (
                <Ionicons name="checkmark" size={12} color="#fff" />
              ) : (
                <Text style={[
                  styles.stepNumber,
                  { color: index <= currentIndex ? '#fff' : colors.textMuted },
                ]}>
                  {stepLabels[index]}
                </Text>
              )}
            </View>
            {index < steps.length - 1 && (
              <View style={[
                styles.stepLine,
                { backgroundColor: index < currentIndex ? colors.primary : colors.border },
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const handleBack = () => {
    if (step === 'main') {
      router.back();
    } else if (step === 'enter-pin') {
      // Go back to main (or exit if in setup/reset mode from params)
      if (mode === 'setup' || mode === 'reset') {
        router.back();
      } else {
        setStep('main');
        setMode('view');
        resetFields();
      }
    } else if (step === 'confirm-pin') {
      setStep('enter-pin');
      setConfirmPin(['', '', '', '']);
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: colors.cardBackground },
            toast.type === 'error' ? styles.toastError : 
            toast.type === 'success' ? styles.toastSuccess : styles.toastInfo,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <View style={styles.toastContent}>
            <Text style={[styles.toastIcon, { color: colors.text }]}>
              {toast.type === 'error' ? '✗' : toast.type === 'success' ? '✓' : 'ℹ'}
            </Text>
            <Text style={[styles.toastText, { color: colors.text }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient colors={colors.headerBackground as [string, string]} style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{getTitle()}</Text>
              <View style={{ width: 40 }} />
            </View>
          </LinearGradient>

          <View style={[styles.content, isMobile && styles.contentMobile]}>
            {step === 'main' && renderMainView()}
            {step === 'enter-pin' && (
              <>
                {renderStepIndicator()}
                {renderPinStep(false)}
              </>
            )}
            {step === 'confirm-pin' && (
              <>
                {renderStepIndicator()}
                {renderPinStep(true)}
              </>
            )}
            {step === 'success' && renderSuccessStep()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: isWeb ? undefined : 16,
    right: isWeb ? 20 : 16,
    zIndex: 1000,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: isWeb ? 320 : undefined,
    borderLeftWidth: 4,
  },
  toastError: { borderLeftColor: '#ef4444' },
  toastSuccess: { borderLeftColor: '#98be4e' },
  toastInfo: { borderLeftColor: '#3b82f6' },
  toastContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toastIcon: { fontSize: 18, fontWeight: 'bold' },
  toastText: { fontSize: 14, fontWeight: '600', flex: 1 },
  scrollContent: { 
    flexGrow: 1, 
    paddingBottom: isWeb ? 40 : 100,
  },
  header: {
    paddingTop: isWeb ? 20 : 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    padding: isWeb ? 40 : 20,
    maxWidth: 450,
    width: '100%',
    alignSelf: 'center',
  },
  contentMobile: {
    padding: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepLine: {
    width: 60,
    height: 2,
    marginHorizontal: 8,
  },
  stepContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 8,
    minWidth: 200,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  otpLabel: {
    fontSize: 14,
    marginBottom: 16,
  },
  otpContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  otpInput: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
  },
  resendButton: {
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pinInputContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  pinInput: {
    width: 56,
    height: 64,
    borderRadius: 14,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  backToPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    marginBottom: 24,
  },
  backToPinText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 16,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  // Main view styles
  mainContainer: {
    flex: 1,
  },
  pinStatusCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pinStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  pinStatusInfo: {
    flex: 1,
  },
  pinStatusTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  pinStatusSubtitle: {
    fontSize: 13,
  },
  currentPinDisplay: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
  },
  currentPinLabel: {
    fontSize: 12,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentPinDots: {
    flexDirection: 'row',
    gap: 12,
  },
  currentPinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  actionButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
});
