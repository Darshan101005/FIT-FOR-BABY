import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';

export default function SplashScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const [isReady, setIsReady] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    // Check auth state to determine where to navigate
    const checkAuthAndNavigate = async () => {
      try {
        const [userRole, userId, adminUid, coupleId, quickAccessMode, sessionExpiry, pendingProfileSelection, pendingSetup] = await Promise.all([
          AsyncStorage.getItem('userRole'),
          AsyncStorage.getItem('userId'),
          AsyncStorage.getItem('adminUid'),
          AsyncStorage.getItem('coupleId'),
          AsyncStorage.getItem('quickAccessMode'),
          AsyncStorage.getItem('sessionExpiry'),
          AsyncStorage.getItem('pendingProfileSelection'),
          AsyncStorage.getItem('pendingSetup'),
        ]);

        // If user is in setup flow (password reset or PIN setup), don't interfere
        if (pendingSetup) {
          // User is in setup flow - stay on current page or let them continue
          // Don't redirect anywhere
          return;
        }

        // Check if session has expired
        const sessionExpired = sessionExpiry ? Date.now() > parseInt(sessionExpiry, 10) : false;
        
        // Determine if user is fully authenticated (not partial auth)
        // Partial auth = has coupleId but no userId (waiting for profile selection)
        const isFullyAuthenticated = !sessionExpired && (
          (userRole === 'user' && userId && coupleId) || // User fully logged in
          (userRole && adminUid) // Admin logged in
        );
        
        // Check for partial auth (quick access mode without profile selected)
        // This means user is in the middle of profile selection - DON'T interrupt!
        const isPartialAuth = !sessionExpired && userRole === 'user' && coupleId && !userId && (quickAccessMode || pendingProfileSelection);

        if (!isMobile) {
          // Desktop: go to landing page (it has its own login buttons)
          router.replace('/landing' as any);
        } else if (isFullyAuthenticated) {
          // Mobile + fully authenticated: go directly to dashboard
          if (userRole === 'user') {
            router.replace('/user/home' as any);
          } else {
            router.replace('/admin/home' as any);
          }
        } else if (isPartialAuth) {
          // Mobile + partial auth: User is in profile selection flow
          // DO NOT clear state - redirect to enter-pin to continue
          router.replace('/user/enter-pin' as any);
        } else {
          // Mobile + not authenticated: go to get-started
          router.replace('/get-started' as any);
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        // On error, default to get-started for mobile, landing for desktop
        if (isMobile) {
          router.replace('/get-started' as any);
        } else {
          router.replace('/landing' as any);
        }
      }
    };

    if (!isMobile) {
      // Desktop: immediate redirect to landing
      router.replace('/landing' as any);
      return;
    }

    // Mobile: Show splash animation then check auth
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 15,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    // After animation, check auth and navigate appropriately
    setTimeout(() => {
      checkAuthAndNavigate();
    }, 2800);
  }, [isMobile, isReady]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <Image 
          source={require('../assets/logos/logo-full.svg')}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>
      
      <View style={styles.loadingContainer}>
        <View style={styles.loadingBar}>
          <Animated.View style={[styles.loadingProgress, { width: progressWidth }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 420,
    height: 420,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    width: 240,
  },
  loadingBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
});
