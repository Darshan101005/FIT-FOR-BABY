import { useAuth } from '@/context/AuthContext';
import { UserDataProvider } from '@/context/UserDataContext';
import { deviceService } from '@/services/firestore.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, Image, Platform, StyleSheet, Text, View } from 'react-native';

// Loading screen for auth check
function AuthLoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <Image
        source={require('../../assets/logos/fit_for_baby_horizontal.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.loadingTitle}>Fit for Baby</Text>
      <ActivityIndicator size="large" color="#006dab" style={styles.spinner} />
      <Text style={styles.loadingText}>Verifying access...</Text>
    </View>
  );
}

export default function UserLayout() {
  const { isAuthenticated, isLoading, userRole, logout } = useAuth();
  const router = useRouter();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isLoggingOutRef = useRef(false);

  // Monitor device session for remote logout
  useEffect(() => {
    let isMounted = true;

    const setupDeviceMonitor = async () => {
      try {
        const coupleId = await AsyncStorage.getItem('coupleId');
        const userGender = await AsyncStorage.getItem('userGender');
        const deviceId = await AsyncStorage.getItem('currentDeviceId');

        if (coupleId && userGender && deviceId && isAuthenticated) {
          // Subscribe to device status changes for THIS device only
          unsubscribeRef.current = deviceService.subscribeToDeviceStatus(
            coupleId,
            userGender as 'male' | 'female',
            deviceId,
            async () => {
              // Only show alert if not already logging out and component is mounted
              if (isMounted && !isLoggingOutRef.current) {
                isLoggingOutRef.current = true;
                console.log('This device was remotely logged out');
                
                // Unsubscribe first to prevent multiple triggers
                if (unsubscribeRef.current) {
                  unsubscribeRef.current();
                  unsubscribeRef.current = null;
                }
                
                // Show alert based on platform
                if (Platform.OS === 'web') {
                  alert('You have been logged out from another device.');
                } else {
                  Alert.alert(
                    'Session Ended',
                    'You have been logged out from another device.',
                    [{ text: 'OK' }]
                  );
                }
                
                // Perform logout
                await logout();
                router.replace('/login');
              }
            }
          );
        }
      } catch (error) {
        console.error('Error setting up device monitor:', error);
      }
    };

    if (isAuthenticated && userRole === 'user') {
      setupDeviceMonitor();
    }

    return () => {
      isMounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isAuthenticated, userRole, logout, router]);

  useEffect(() => {
    // Redirect if not authenticated or not a user
    if (!isLoading && (!isAuthenticated || userRole !== 'user')) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (userRole !== 'user') {
        // Admin trying to access user routes
        router.replace('/admin/home');
      }
    }
  }, [isAuthenticated, isLoading, userRole, router]);

  // Show loading while checking auth
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  // Don't render if not authenticated or wrong role
  if (!isAuthenticated || userRole !== 'user') {
    return <AuthLoadingScreen />;
  }

  return (
    <UserDataProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="home" />
        <Stack.Screen name="log-food" />
        <Stack.Screen name="log-exercise" />
        <Stack.Screen name="log-weight" />
        <Stack.Screen name="log-steps" />
        <Stack.Screen name="diet-plan" />
        <Stack.Screen name="appointments" />
        <Stack.Screen name="progress" />
        <Stack.Screen name="messages" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="personal-info" />
        <Stack.Screen name="device-management" />
        <Stack.Screen name="partner-settings" />
        <Stack.Screen name="enter-pin" />
        <Stack.Screen name="manage-pin" />
        <Stack.Screen name="help-center" />
        <Stack.Screen name="feedback" />
        <Stack.Screen name="about" />
        <Stack.Screen name="contact-support" />
      </Stack>
    </UserDataProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#006dab',
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
});
