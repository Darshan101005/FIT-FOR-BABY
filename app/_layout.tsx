import PWAInstallBanner from '@/components/PWAInstallBanner';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { initPWA } from '@/services/pwa.service';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, View } from 'react-native';

const isWeb = Platform.OS === 'web';

// Loading screen component
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <Image
        source={require('../assets/logos/fit_for_baby_horizontal.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.loadingTitle}>Fit for Baby</Text>
      <ActivityIndicator size="large" color="#006dab" style={styles.spinner} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

// Main navigation with auth check
function RootNavigator() {
  const { isLoading } = useAuth();

  // Initialize PWA on web
  useEffect(() => {
    if (isWeb) {
      initPWA();
    }
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth & Onboarding Routes */}
        <Stack.Screen name="index" />
        <Stack.Screen name="get-started" />
        <Stack.Screen name="landing" />
        <Stack.Screen name="login" />
        <Stack.Screen name="admin-login" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="questionnaire" />
        
        {/* Nested Route Groups */}
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="user" />
        
        {/* 404 Not Found */}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
      
      {/* PWA Install Banner - shows only on mobile web browsers */}
      {isWeb && <PWAInstallBanner />}
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <AuthProvider>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </AuthProvider>
    </AppProvider>
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
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#006dab',
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
});
