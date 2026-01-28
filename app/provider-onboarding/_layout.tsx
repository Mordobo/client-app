import { Stack } from 'expo-router';
import React from 'react';

export default function ProviderOnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="business" />
      <Stack.Screen name="services" />
      <Stack.Screen name="availability" />
      <Stack.Screen name="documents" />
      <Stack.Screen name="bank" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="verification" />
    </Stack>
  );
}
