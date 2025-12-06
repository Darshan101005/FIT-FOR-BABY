import { useAuth } from '@/context/AuthContext';
import { UserDataProvider } from '@/context/UserDataContext';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

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
  const { isAuthenticated, isLoading, userRole } = useAuth();
  const router = useRouter();

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
