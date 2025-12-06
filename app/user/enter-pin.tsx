import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { coupleService } from '@/services/firestore.service';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
  const { setSessionExpiry, refreshAuthState } = useAuth();

  // State for couple data (can come from params or AsyncStorage)
  const [coupleData, setCoupleData] = useState<{
    coupleId: string;
    maleName: string;
    femaleName: string;
    maleStatus: string;
    femaleStatus: string;
    showProfileSelection: boolean;
    initialGender: 'male' | 'female' | null;
  } | null>(null);
  const [isLoadingCoupleData, setIsLoadingCoupleData] = useState(true);

  // Load couple data from params or AsyncStorage
  useEffect(() => {
    const loadCoupleData = async () => {
      // First try to get from params
      const paramCoupleId = params.coupleId as string;
      
      if (paramCoupleId) {
        // Params are available, use them
        setCoupleData({
          coupleId: paramCoupleId,
          maleName: params.maleName as string || '',
          femaleName: params.femaleName as string || '',
          maleStatus: params.maleStatus as string || 'active',
          femaleStatus: params.femaleStatus as string || 'active',
          showProfileSelection: params.showProfileSelection === 'true',
          initialGender: (params.gender as 'male' | 'female') || null,
        });
        setIsLoadingCoupleData(false);
        return;
      }

      // No params - try to load from AsyncStorage (redirected from index.tsx)
      try {
        const [storedCoupleId, storedGender] = await Promise.all([
          AsyncStorage.getItem('coupleId'),
          AsyncStorage.getItem('userGender'),
        ]);

        if (!storedCoupleId) {
          // No couple data at all - redirect to login
          router.replace('/login');
          return;
        }

        // Load couple data from Firestore
        const couple = await coupleService.get(storedCoupleId);
        if (!couple) {
          // Couple not found - clear state and redirect
          await AsyncStorage.multiRemove(['coupleId', 'userGender', 'quickAccessMode', 'userRole']);
          router.replace('/login');
          return;
        }

        setCoupleData({
          coupleId: storedCoupleId,
          maleName: couple.male.name,
          femaleName: couple.female.name,
          maleStatus: couple.male.status,
          femaleStatus: couple.female.status,
          showProfileSelection: !storedGender, // Show selection if no gender stored
          initialGender: storedGender as 'male' | 'female' | null,
        });
      } catch (error) {
        console.error('Error loading couple data:', error);
        router.replace('/login');
      } finally {
        setIsLoadingCoupleData(false);
      }
    };

    loadCoupleData();
  }, [params.coupleId]);

  // Derived values from coupleData
  const coupleId = coupleData?.coupleId || '';
  const maleName = coupleData?.maleName || '';
  const femaleName = coupleData?.femaleName || '';
  const maleStatus = coupleData?.maleStatus || 'active';
  const femaleStatus = coupleData?.femaleStatus || 'active';
  const showProfileSelection = coupleData?.showProfileSelection ?? true;
  const initialGender = coupleData?.initialGender || null;
  
  // Profile selection state
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  const [isProfileSelected, setIsProfileSelected] = useState(false);
  
  // Update state when coupleData loads
  useEffect(() => {
    if (coupleData) {
      setSelectedGender(coupleData.initialGender);
      setIsProfileSelected(!coupleData.showProfileSelection && !!coupleData.initialGender);
    }
  }, [coupleData]);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    name: 'Loading...',
    gender: selectedGender || 'male',
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

  // Load profile data when gender is selected
  useEffect(() => {
    const loadProfile = async () => {
      if (!selectedGender || !coupleId) return;
      
      try {
        const couple = await coupleService.get(coupleId);
        if (couple) {
          const user = couple[selectedGender];
          const names = user.name.split(' ');
          const initials = names.length > 1 
            ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
            : user.name.substring(0, 2).toUpperCase();
          
          setProfileData({
            name: user.name,
            gender: selectedGender,
            userId: user.id,
            initials: initials,
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    
    if (isProfileSelected && selectedGender) {
      loadProfile();
    }
  }, [coupleId, selectedGender, isProfileSelected]);

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
    if (!selectedGender) return;
    
    try {
      const isValid = await coupleService.verifyPin(coupleId, selectedGender, enteredPin);
      
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
        await coupleService.updateLastLogin(coupleId, selectedGender);
        await AsyncStorage.setItem('userRole', 'user');
        await AsyncStorage.setItem('coupleId', coupleId);
        await AsyncStorage.setItem('userGender', selectedGender);
        await AsyncStorage.setItem('userId', profileData.userId);
        await AsyncStorage.setItem('userName', profileData.name);
        
        // Clear intermediate auth state flags
        await AsyncStorage.removeItem('pendingProfileSelection');
        await AsyncStorage.removeItem('quickAccessMode');
        
        // Set flag to force reload UserDataContext on home page
        await AsyncStorage.setItem('forceUserDataReload', 'true');
        
        // Set session expiry (30 days for quick access)
        await setSessionExpiry(true);
        
        // Refresh auth context state to sync with AsyncStorage
        await refreshAuthState();
        
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

  // Handle profile selection
  const handleProfileSelect = async (gender: 'male' | 'female') => {
    try {
      const couple = await coupleService.get(coupleId);
      if (!couple) {
        setError('Account not found. Please try again.');
        return;
      }
      
      const user = couple[gender];
      
      // Check if user is inactive
      if (user.status === 'inactive') {
        setError('This profile is paused. Contact admin.');
        return;
      }
      
      // Update basic info for this session (but NOT userId - that comes after PIN)
      await AsyncStorage.setItem('userRole', 'user');
      await AsyncStorage.setItem('coupleId', coupleId);
      await AsyncStorage.setItem('userGender', gender);
      // Don't set userId yet - that happens after successful PIN verification
      // This keeps the partial auth state until PIN is verified
      
      // Check if password reset is needed (for profile-select mode from password login)
      if (!user.isPasswordReset) {
        // For password reset flow, set full auth since they'll re-enter password
        await AsyncStorage.setItem('userId', user.id);
        await AsyncStorage.setItem('userName', user.name);
        await AsyncStorage.removeItem('pendingProfileSelection');
        await AsyncStorage.removeItem('quickAccessMode');
        
        // Refresh auth state so AuthContext knows user is authenticated
        await refreshAuthState();
        
        router.replace({
          pathname: '/reset-password',
          params: { 
            mode: 'first-login',
            coupleId: coupleId,
            gender: gender,
          }
        });
        return;
      }
      
      // Check if PIN needs to be set
      if (!user.isPinSet) {
        // For PIN setup flow, set full auth since they'll create a new PIN
        await AsyncStorage.setItem('userId', user.id);
        await AsyncStorage.setItem('userName', user.name);
        await AsyncStorage.removeItem('pendingProfileSelection');
        await AsyncStorage.removeItem('quickAccessMode');
        
        // Refresh auth state so AuthContext knows user is authenticated
        await refreshAuthState();
        
        router.replace({
          pathname: '/user/manage-pin',
          params: { 
            mode: 'setup',
            coupleId: coupleId,
            gender: gender,
          }
        });
        return;
      }
      
      // For normal PIN entry - set profile data but keep partial auth state
      // Full auth (userId) will be set after successful PIN verification
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
      
      // Mark profile as selected, show PIN entry
      setSelectedGender(gender);
      setIsProfileSelected(true);
      
    } catch (error: any) {
      console.error('Profile selection error:', error);
      setError(error.message || 'Failed to select profile');
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

  // Profile Selection Colors
  const COLORS = {
    male: '#3b82f6',
    female: '#ec4899',
    accent: '#98be4e',
  };

  // Loading state while fetching couple data
  if (isLoadingCoupleData || !coupleData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <View style={styles.loadingContainer}>
            <Animated.View style={{ transform: [{ rotate: '0deg' }] }}>
              <Ionicons name="sync" size={40} color={colors.primary} />
            </Animated.View>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Render profile selection screen
  if (showProfileSelection && !isProfileSelected) {
    const isMaleInactive = maleStatus === 'inactive';
    const isFemaleInactive = femaleStatus === 'inactive';

    const handleBackToLogin = async () => {
      // Clear partial auth state when going back to login
      await AsyncStorage.multiRemove(['quickAccessMode', 'userRole', 'coupleId', 'userGender', 'pendingProfileSelection']);
      router.replace('/login');
    };
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Simple back button */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            onPress={handleBackToLogin} 
            style={[styles.backButton, { backgroundColor: isDarkMode ? colors.cardBackground : '#f1f5f9' }]}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.content, isMobile && styles.contentMobile]}>
          {/* Header */}
          <View style={styles.profileSelectHeader}>
            <Text style={[styles.profileSelectTitle, { color: colors.text }]}>Who's logging in?</Text>
            <Text style={[styles.profileSelectSubtitle, { color: colors.textSecondary }]}>
              Select your profile, then enter your PIN
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={16} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Profile Cards */}
          <View style={styles.profileCardsContainer}>
            {/* Male Card */}
            <TouchableOpacity
              style={[
                styles.profileSelectCard,
                { borderColor: COLORS.male + '40' },
                isMaleInactive && styles.profileCardInactive,
              ]}
              onPress={() => handleProfileSelect('male')}
              disabled={isMaleInactive}
              activeOpacity={0.8}
            >
              <View style={[styles.profileIconCircle, { backgroundColor: isMaleInactive ? '#94a3b815' : COLORS.male + '15' }]}>
                <Ionicons name="man" size={48} color={isMaleInactive ? '#94a3b8' : COLORS.male} />
              </View>
              <Text style={[styles.profileSelectName, { color: isMaleInactive ? '#94a3b8' : COLORS.male }]}>
                {maleName || 'Partner 1'}
              </Text>
              <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>
                {isMaleInactive ? 'Paused' : 'Male'}
              </Text>
            </TouchableOpacity>

            {/* Female Card */}
            <TouchableOpacity
              style={[
                styles.profileSelectCard,
                { borderColor: COLORS.female + '40' },
                isFemaleInactive && styles.profileCardInactive,
              ]}
              onPress={() => handleProfileSelect('female')}
              disabled={isFemaleInactive}
              activeOpacity={0.8}
            >
              <View style={[styles.profileIconCircle, { backgroundColor: isFemaleInactive ? '#94a3b815' : COLORS.female + '15' }]}>
                <Ionicons name="woman" size={48} color={isFemaleInactive ? '#94a3b8' : COLORS.female} />
              </View>
              <Text style={[styles.profileSelectName, { color: isFemaleInactive ? '#94a3b8' : COLORS.female }]}>
                {femaleName || 'Partner 2'}
              </Text>
              <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>
                {isFemaleInactive ? 'Paused' : 'Female'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Access Info */}
          <View style={styles.quickAccessInfo}>
            <Ionicons name="flash" size={16} color={COLORS.accent} />
            <Text style={[styles.quickAccessText, { color: colors.textSecondary }]}>Quick Access Mode - PIN only</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
          <View style={[styles.avatar, { backgroundColor: getGenderColor(selectedGender || 'male') + '20' }]}>
            <Text style={[styles.avatarText, { color: getGenderColor(selectedGender || 'male') }]}>
              {profileData.initials}
            </Text>
            <View style={[styles.genderBadge, { backgroundColor: getGenderColor(selectedGender || 'male') }]}>
              <Ionicons 
                name={selectedGender === 'male' ? 'male' : 'female'} 
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
  // Profile Selection Styles
  profileSelectHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileSelectTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  profileSelectSubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  profileCardsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  profileSelectCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileCardInactive: {
    opacity: 0.5,
  },
  profileIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileSelectName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileLabel: {
    fontSize: 13,
  },
  quickAccessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
  },
  quickAccessText: {
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
