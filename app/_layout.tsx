import PWAInstallBanner from '@/components/PWAInstallBanner';
import OfflineModal from '@/components/ui/OfflineModal';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { initPWA } from '@/services/pwa.service';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

const isWeb = Platform.OS === 'web';

// Loading screen component
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#006dab" style={styles.spinner} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

// Main navigation with auth check
function RootNavigator() {
  const { isLoading } = useAuth();
  const { isOfflineModalVisible, setIsOfflineModalVisible } = useNetworkStatus();

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
      <Head>
        <title>FIT FOR BABY</title>
        <meta name="description" content="A comprehensive pregnancy wellness app. Track your health, get expert advice, and stay fit during your journey." />
        <meta name="google-site-verification" content="OZ1fHfsqBmfx2MLJIc1EIpJlYt5WnC5YAx9mVBu9S6g" />
        <meta property="og:title" content="Fit For Baby | Pregnancy Wellness App" />
        <meta property="og:description" content="A comprehensive pregnancy wellness app. Track your health, get expert advice, and stay fit during your journey." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fitforbaby.site" />
        <meta property="og:image" content="https://fitforbaby.site/assets/images/withbg.png" />
      </Head>
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

      {/* Offline Modal - shows when no internet connection */}
      <OfflineModal
        visible={isOfflineModalVisible}
        onExit={() => setIsOfflineModalVisible(false)}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <RootNavigator />
          </LanguageProvider>
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
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
});
