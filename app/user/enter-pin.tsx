import { useTheme } from '@/context/ThemeContext';
import { coupleService } from '@/services/firestore.service';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';

const isWeb = Platform.OS === 'web';

interface ProfileData {
  name: string;
  gender: 'male' | 'female';
  userId: string;
  initials: string;
}

export default function EnterPinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const { colors, isDarkMode } = useTheme();

  // Get params
  const coupleId = params.coupleId as string;
  const gender = (params.gender as 'male' | 'female') || 'male';
  
  const [profileData, setProfileData] = useState<ProfileData>({
    name: 'Loading...',
    gender: gender,
    userId: '',
    initials: '...',
  });

  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef([...Array(4)].map(() => new Animated.Value(1))).current;
  const dotAnims = useRef([...Array(4)].map(() => new Animated.Value(0))).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (coupleId) {
          const couple = await coupleService.get(coupleId);
          if (couple) {
            const user = couple[gender];
            const names = user.name.split(' ');
            const initials = names.length > 1 
              ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
              : user.name.substring(0, 2).toUpperCase();
            
            setProfileData({
              name: user.name,
              gender: gender,
              userId: user.id,
              initials: initials,
            });
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    
    loadProfile();
  }, [coupleId, gender]);

  useEffect(() => {
    if (isLocked && lockTimer > 0) {
      const timer = setTimeout(() => setLockTimer(lockTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (lockTimer === 0 && isLocked) {
      setIsLocked(false);
      setAttempts(0);
    }
  }, [lockTimer, isLocked]);

  const getGenderColor = (gender: 'male' | 'female') => {
    return gender === 'male' ? '#3b82f6' : '#ec4899';
  };

  const animateDot = (index: number, filled: boolean) => {
    Animated.spring(dotAnims[index], {
      toValue: filled ? 1 : 0,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handleNumberPress = (num: string) => {
    if (isLocked) return;
    
    const emptyIndex = pin.findIndex(p => p === '');
    if (emptyIndex === -1) return;

    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnims[emptyIndex], {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[emptyIndex], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const newPin = [...pin];
    newPin[emptyIndex] = num;
    setPin(newPin);
    setError('');
    animateDot(emptyIndex, true);

    // Check if PIN is complete
    if (emptyIndex === 3) {
      setTimeout(() => verifyPin(newPin.join('')), 300);
    }
  };

  const handleBackspace = () => {
    if (isLocked) return;
    
    const lastFilledIndex = pin.map((p, i) => p !== '' ? i : -1).filter(i => i !== -1).pop();
    if (lastFilledIndex === undefined) return;

    const newPin = [...pin];
    newPin[lastFilledIndex] = '';
    setPin(newPin);
    animateDot(lastFilledIndex, false);
  };

  const verifyPin = async (enteredPin: string) => {
    try {
      const isValid = await coupleService.verifyPin(coupleId, gender, enteredPin);
      
      if (isValid) {
        // Success - show animation
        if (!isWeb) Vibration.vibrate(50);
        setIsSuccess(true);
        
        // Animate success
        Animated.spring(successAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }).start();
        
        // Update storage and redirect after animation
        await coupleService.updateLastLogin(coupleId, gender);
        await AsyncStorage.setItem('userRole', 'user');
        await AsyncStorage.setItem('coupleId', coupleId);
        await AsyncStorage.setItem('userGender', gender);
        await AsyncStorage.setItem('userId', profileData.userId);
        await AsyncStorage.setItem('userName', profileData.name);
        
        setTimeout(() => {
          router.replace('/user/home' as any);
        }, 1200);
      } else {
        // Wrong PIN
        if (!isWeb) Vibration.vibrate([0, 100, 50, 100]);
        
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          setIsLocked(true);
          setLockTimer(30);
          setError('Too many attempts. Try again in 30 seconds.');
        } else {
          setError(`Incorrect PIN. ${3 - newAttempts} attempts remaining.`);
        }
        
        // Shake animation
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();

        // Reset PIN
        setPin(['', '', '', '']);
        dotAnims.forEach((anim) => {
          Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        });
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      setError('Something went wrong. Please try again.');
      setPin(['', '', '', '']);
      dotAnims.forEach((anim) => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      });
    }
  };

  const renderNumberPad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'back'],
    ];

    return (
      <View style={styles.numberPad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberRow}>
            {row.map((num, colIndex) => {
              if (num === '') {
                return <View key={colIndex} style={styles.emptyKey} />;
              }
              if (num === 'back') {
                return (
                  <TouchableOpacity
                    key={colIndex}
                    style={[styles.numberKey, { backgroundColor: 'transparent' }]}
                    onPress={handleBackspace}
                    disabled={isLocked}
                  >
                    <Ionicons 
                      name="backspace-outline" 
                      size={28} 
                      color={isLocked ? colors.textMuted : colors.text} 
                    />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={colIndex}
                  style={[
                    styles.numberKey, 
                    { backgroundColor: isDarkMode ? colors.cardBackground : '#f1f5f9' },
                    isLocked && { opacity: 0.5 },
                  ]}
                  onPress={() => handleNumberPress(num)}
                  disabled={isLocked}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.numberText, { color: colors.text }]}>{num}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Success Overlay */}
      {isSuccess && (
        <Animated.View 
          style={[
            styles.successOverlay,
            { 
              backgroundColor: colors.background,
              opacity: successAnim,
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.successContent,
              {
                transform: [
                  { 
                    scale: successAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    })
                  }
                ],
              }
            ]}
          >
            <View style={[styles.successIcon, { backgroundColor: '#22c55e' }]}>
              <Ionicons name="checkmark" size={48} color="#fff" />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>
              Welcome back!
            </Text>
            <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
              Switching to {profileData.name}...
            </Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Simple back button only */}
      <View style={styles.topBar}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backButton, { backgroundColor: isDarkMode ? colors.cardBackground : '#f1f5f9' }]}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.content, isMobile && styles.contentMobile]}>
        {/* Profile Avatar */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: getGenderColor(gender) + '20' }]}>
            <Text style={[styles.avatarText, { color: getGenderColor(gender) }]}>
              {profileData.initials}
            </Text>
            <View style={[styles.genderBadge, { backgroundColor: getGenderColor(gender) }]}>
              <Ionicons 
                name={gender === 'male' ? 'male' : 'female'} 
                size={14} 
                color="#fff" 
              />
            </View>
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>{profileData.name}</Text>
          <Text style={[styles.profileId, { color: colors.textSecondary }]}>
            {profileData.userId}
          </Text>
        </View>

        {/* PIN Entry */}
        <Text style={[styles.pinLabel, { color: colors.textSecondary }]}>
          {isLocked ? `Locked for ${lockTimer}s` : 'Enter 4-digit PIN'}
        </Text>

        <Animated.View 
          style={[
            styles.pinContainer,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {pin.map((digit, index) => (
            <Animated.View
              key={index}
              style={[
                styles.pinDot,
                { 
                  backgroundColor: isDarkMode ? colors.cardBackground : '#f1f5f9',
                  borderColor: error ? '#ef4444' : colors.border,
                  transform: [
                    { 
                      scale: dotAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.05],
                      }) 
                    }
                  ],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.pinDotFill,
                  { 
                    backgroundColor: '#1f2937', // Black color for filled dots
                    opacity: dotAnims[index],
                    transform: [
                      { 
                        scale: dotAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1],
                        }) 
                      }
                    ],
                  },
                ]}
              />
            </Animated.View>
          ))}
        </Animated.View>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={16} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.errorContainer} />
        )}

        {/* Number Pad */}
        {renderNumberPad()}

        {/* Forgot PIN */}
        <TouchableOpacity 
          style={styles.forgotButton}
          onPress={() => router.push({
            pathname: '/user/manage-pin',
            params: { mode: 'reset', coupleId, gender }
          } as any)}
        >
          <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot PIN?</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContent: {
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
  },
  topBar: {
    paddingTop: isWeb ? 16 : 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  contentMobile: {
    padding: 16,
    paddingTop: 0,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
  },
  genderBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  profileId: {
    fontSize: 13,
  },
  pinLabel: {
    fontSize: 14,
    marginBottom: 16,
  },
  pinContainer: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  pinDot: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDotFill: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 22,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  numberPad: {
    gap: 10,
    marginBottom: 20,
  },
  numberRow: {
    flexDirection: 'row',
    gap: 16,
  },
  numberKey: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyKey: {
    width: 64,
    height: 64,
  },
  numberText: {
    fontSize: 22,
    fontWeight: '600',
  },
  forgotButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
