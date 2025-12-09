import PWAInstallBanner from '@/components/PWAInstallBanner';
import OfflineModal from '@/components/ui/OfflineModal';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { initPWA } from '@/services/pwa.service';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
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
    // Check for OTA updates on native platforms
    if (!isWeb) {
      const checkForUpdates = async () => {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            // Optionally, show a prompt to the user before reloading
            await Updates.reloadAsync();
          }
        } catch (e) {
          // Handle or log error if needed
          console.log('OTA update check failed:', e);
        }
      };
      checkForUpdates();
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
