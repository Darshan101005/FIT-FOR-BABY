import { AppProvider } from '@/context/AppContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AppProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Auth & Onboarding Routes */}
          <Stack.Screen name="index" />
          <Stack.Screen name="get-started" />
          <Stack.Screen name="landing" />
          <Stack.Screen name="login" />
          <Stack.Screen name="admin-login" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="verify-otp" />
          <Stack.Screen name="questionnaire" />
          
          {/* Nested Route Groups */}
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="user" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AppProvider>
  );
}
