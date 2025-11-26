import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '@/context/AppContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth & Onboarding Routes */}
        <Stack.Screen name="index" />
        <Stack.Screen name="get-started" />
        <Stack.Screen name="landing" />
        <Stack.Screen name="login" />
        <Stack.Screen name="verify-otp" />
        <Stack.Screen name="questionnaire" />
        
        {/* User Routes */}
        <Stack.Screen name="user/home" />
        <Stack.Screen name="user/log-food" />
        <Stack.Screen name="user/log-exercise" />
        <Stack.Screen name="user/log-weight" />
        <Stack.Screen name="user/appointments" />
        <Stack.Screen name="user/progress" />
        <Stack.Screen name="user/messages" />
        <Stack.Screen name="user/profile" />
        
        {/* Admin Routes */}
        <Stack.Screen name="admin/home" />
        <Stack.Screen name="admin/users" />
        <Stack.Screen name="admin/goals" />
        <Stack.Screen name="admin/reports" />
      </Stack>
      <StatusBar style="auto" />
    </AppProvider>
  );
}
