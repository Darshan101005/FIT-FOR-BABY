import { Stack } from 'expo-router';

export default function UserLayout() {
  return (
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
      <Stack.Screen name="profile" />
      <Stack.Screen name="personal-info" />
      <Stack.Screen name="device-management" />
      <Stack.Screen name="partner-settings" />
      <Stack.Screen name="enter-pin" />
      <Stack.Screen name="manage-pin" />
      <Stack.Screen name="help-center" />
      <Stack.Screen name="feedback" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
