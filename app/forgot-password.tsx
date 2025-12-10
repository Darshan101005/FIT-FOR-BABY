import { coupleService } from '@/services/firestore.service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
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

type Step = 'identify' | 'verify-pin' | 'reset-password' | 'success';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  
  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState('');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  const [pin, setPin] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [coupleData, setCoupleData] = useState<any>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const toastAnim = useRef(new Animated.Value(-100)).current;
  
  const pinRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  const isMobileWeb = useMemo(() => {
    if (!isWeb) return false;
    return /Mobi|Android|iPhone/i.test(navigator.userAgent);
  }, []);

  const logoSize = isMobileWeb
    ? Math.min(screenWidth * 0.8, 500)
    : isWeb
    ? Math.min(screenWidth * 0.5, 350)
    : Math.min(screenWidth * 0.85, 420);

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

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handleFindAccount = async () => {
    if (!identifier.trim()) {
      showToast('Please enter your Email, Phone or Username', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const trimmedIdentifier = identifier.trim();

      // Block Couple ID format - only individual credentials allowed
      if (trimmedIdentifier.match(/^C_\d+$/i)) {
        showToast('Please use your individual Email, Phone or Username. Couple ID is not allowed.', 'error');
        setIsLoading(false);
        return;
      }

      // Use the existing findByCredential method
      const result = await coupleService.findByCredential(trimmedIdentifier);

      if (!result) {
        showToast('Account not found. Please check your details.', 'error');
        setIsLoading(false);
        return;
      }

      const { couple, gender } = result;
      setCoupleData(couple);

      if (gender === 'both') {
        // Shared credential - not allowed for password reset
        showToast('This credential is shared by both partners. Please use your unique Email, Phone or Username.', 'error');
        setIsLoading(false);
        return;
      } else {
        // Single profile matched - this is what we want
        setSelectedGender(gender);
        
        // Check if PIN is set for this user
        if (!couple[gender].isPinSet || !couple[gender].pin) {
          showToast('No PIN set for this account. Please contact support.', 'error');
          setIsLoading(false);
          return;
        }
        
        setStep('verify-pin');
        showToast('Account found! Please enter your 4-digit PIN.', 'success');
      }
    } catch (error) {
      console.error('Error finding account:', error);
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    const enteredPin = pin.join('');
    
    if (enteredPin.length !== 4) {
      showToast('Please enter complete 4-digit PIN', 'error');
      return;
    }

    if (!selectedGender) {
      showToast('Please select a profile first', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // Use the existing verifyPin method
      const isValid = await coupleService.verifyPin(coupleData.coupleId, selectedGender, enteredPin);
      
      if (isValid) {
        setStep('reset-password');
        showToast('PIN verified! Create your new password.', 'success');
      } else {
        showToast('Incorrect PIN. Please try again.', 'error');
        setPin(['', '', '', '']);
        pinRefs[0].current?.focus();
      }
    } catch (error) {
      console.error('Error verifying PIN:', error);
      showToast('Verification failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const trimmedPassword = password.trim();

    if (trimmedPassword.length < 8) {
      errors.push('At least 8 characters required');
    }
    if (!/[A-Z]/.test(trimmedPassword)) {
      errors.push('One uppercase letter required');
    }
    if (!/[a-z]/.test(trimmedPassword)) {
      errors.push('One lowercase letter required');
    }
    if (!/[0-9]/.test(trimmedPassword)) {
      errors.push('One number required');
    }
    if (/\s/.test(password)) {
      errors.push('Spaces are not allowed');
    }

    return { isValid: errors.length === 0, errors };
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

    if (!selectedGender) {
      showToast('Profile not selected', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // Use the existing resetPassword method
      await coupleService.resetPassword(coupleData.coupleId, selectedGender, newPassword.trim());
      setStep('success');
    } catch (error) {
      console.error('Error resetting password:', error);
      showToast('Failed to reset password. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const password = newPassword.trim();
    if (!password) return { strength: 0, label: '', color: '#94a3b8' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength: 1, label: 'Weak', color: '#ef4444' };
    if (strength <= 3) return { strength: 2, label: 'Medium', color: '#f59e0b' };
    if (strength <= 4) return { strength: 3, label: 'Strong', color: '#22c55e' };
    return { strength: 4, label: 'Very Strong', color: '#10b981' };
  };

  const renderStepIndicator = () => {
    const steps = ['Find Account', 'Verify PIN', 'New Password'];
    const currentStepIndex = step === 'identify' ? 0 : step === 'verify-pin' ? 1 : 2;

    return (
      <View style={styles.stepIndicator}>
        {steps.map((s, index) => (
          <View key={s} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                index <= currentStepIndex && styles.stepDotActive,
                index < currentStepIndex && styles.stepDotCompleted,
              ]}
            >
              {index < currentStepIndex ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={[styles.stepNumber, index <= currentStepIndex && styles.stepNumberActive]}>
                  {index + 1}
                </Text>
              )}
            </View>
            <Text style={[styles.stepLabel, index <= currentStepIndex && styles.stepLabelActive]}>
              {s}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderIdentifyStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="search" size={40} color="#006dab" />
      </View>
      <Text style={styles.stepTitle}>Find Your Account</Text>
      <Text style={styles.stepDescription}>
        Enter your Email, Phone or Username to find your account
      </Text>

      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email / Phone / Username"
          placeholderTextColor="#64748b"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleFindAccount}
        disabled={isLoading}
      >
        <LinearGradient colors={['#006dab', '#005a8f']} style={styles.buttonGradient}>
          {isLoading ? (
            <Text style={styles.buttonText}>Searching...</Text>
          ) : (
            <>
              <Text style={styles.buttonText}>Find Account</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderVerifyPinStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="keypad" size={40} color="#006dab" />
      </View>
      <Text style={styles.stepTitle}>Verify Your Identity</Text>
      <Text style={styles.stepDescription}>
        Enter the 4-digit PIN associated with your account
      </Text>

      <View style={styles.pinContainer}>
        {pin.map((digit, index) => (
          <TextInput
            key={index}
            ref={pinRefs[index]}
            style={[styles.pinInput, digit && styles.pinInputFilled]}
            value={digit}
            onChangeText={(value) => handlePinChange(index, value)}
            onKeyPress={({ nativeEvent }) => handlePinKeyPress(index, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            secureTextEntry
            editable={!isLoading}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleVerifyPin}
        disabled={isLoading}
      >
        <LinearGradient colors={['#006dab', '#005a8f']} style={styles.buttonGradient}>
          {isLoading ? (
            <Text style={styles.buttonText}>Verifying...</Text>
          ) : (
            <>
              <Text style={styles.buttonText}>Verify PIN</Text>
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backLink} onPress={() => setStep('identify')}>
        <Ionicons name="arrow-back" size={16} color="#006dab" />
        <Text style={styles.backLinkText}>Back to Find Account</Text>
      </TouchableOpacity>
    </View>
  );

  const renderResetPasswordStep = () => {
    const passwordStrength = getPasswordStrength();

    return (
      <View style={styles.stepContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-open" size={40} color="#006dab" />
        </View>
        <Text style={styles.stepTitle}>Create New Password</Text>
        <Text style={styles.stepDescription}>
          Choose a strong password for your account
        </Text>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="New Password"
            placeholderTextColor="#64748b"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            editable={!isLoading}
          />
          <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
            <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {newPassword.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBars}>
              {[1, 2, 3, 4].map((level) => (
                <View
                  key={level}
                  style={[
                    styles.strengthBar,
                    { backgroundColor: level <= passwordStrength.strength ? passwordStrength.color : '#e2e8f0' },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
              {passwordStrength.label}
            </Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#64748b"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            editable={!isLoading}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
            <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {confirmPassword.length > 0 && newPassword !== confirmPassword && (
          <View style={styles.mismatchWarning}>
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text style={styles.mismatchText}>Passwords do not match</Text>
          </View>
        )}

        <View style={styles.passwordRules}>
          <Text style={styles.rulesTitle}>Password must contain:</Text>
          {[
            { rule: 'At least 8 characters', met: newPassword.length >= 8 },
            { rule: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(newPassword) },
            { rule: 'One lowercase letter (a-z)', met: /[a-z]/.test(newPassword) },
            { rule: 'One number (0-9)', met: /[0-9]/.test(newPassword) },
          ].map((item) => (
            <View key={item.rule} style={styles.ruleItem}>
              <Ionicons
                name={item.met ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={item.met ? '#006dab' : '#94a3b8'}
              />
              <Text style={[styles.ruleText, item.met && styles.ruleTextMet]}>{item.rule}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          <LinearGradient colors={['#98be4e', '#7da33e']} style={styles.buttonGradient}>
            {isLoading ? (
              <Text style={styles.buttonText}>Resetting...</Text>
            ) : (
              <>
                <Text style={styles.buttonText}>Reset Password</Text>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={() => setStep('verify-pin')}>
          <Ionicons name="arrow-back" size={16} color="#006dab" />
          <Text style={styles.backLinkText}>Back to PIN Verification</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSuccessStep = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconContainer, styles.successIcon]}>
        <Ionicons name="checkmark-circle" size={60} color="#006dab" />
      </View>
      <Text style={styles.stepTitle}>Password Changed!</Text>
      <Text style={styles.stepDescription}>
        Your password has been successfully reset. You can now login with your new password.
      </Text>

      <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/login')}>
        <LinearGradient colors={['#006dab', '#005a8f']} style={styles.buttonGradient}>
          <Text style={styles.buttonText}>Go to Login</Text>
          <Ionicons name="log-in" size={20} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {toast.visible && (
        <Animated.View
          style={[
            styles.toast,
            toast.type === 'error' ? styles.toastError : styles.toastSuccess,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <Ionicons
            name={toast.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
            size={20}
            color="#fff"
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}

      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Forgot Password</Text>
            
            {step !== 'success' && renderStepIndicator()}

            {step === 'identify' && renderIdentifyStep()}
            {step === 'verify-pin' && renderVerifyPinStep()}
            {step === 'reset-password' && renderResetPasswordStep()}
            {step === 'success' && renderSuccessStep()}
          </View>

          <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={16} color="#006dab" />
            <Text style={styles.loginLinkText}>Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: isWeb ? 40 : 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    maxWidth: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 24,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepDotActive: {
    backgroundColor: '#006dab',
  },
  stepDotCompleted: {
    backgroundColor: '#006dab',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#006dab',
    fontWeight: '600',
  },
  stepContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successIcon: {
    backgroundColor: '#e0f2fe',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    overflow: 'visible',
  },
  inputIcon: {
    marginRight: 10,
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: 'transparent',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  eyeIcon: {
    padding: 8,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  pinInput: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  pinInputFilled: {
    borderColor: '#006dab',
    backgroundColor: '#e0f2fe',
  },
  strengthContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  strengthBars: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 80,
    textAlign: 'right',
  },
  mismatchWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  mismatchText: {
    fontSize: 13,
    color: '#ef4444',
  },
  passwordRules: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  rulesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 10,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  ruleText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  ruleTextMet: {
    color: '#006dab',
  },
  primaryButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  backLinkText: {
    fontSize: 14,
    color: '#006dab',
    fontWeight: '600',
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#006dab',
    fontWeight: '600',
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 10,
  },
  toastError: {
    backgroundColor: '#ef4444',
  },
  toastSuccess: {
    backgroundColor: '#006dab',
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});