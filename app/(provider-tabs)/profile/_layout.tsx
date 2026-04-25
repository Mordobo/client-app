import { Stack } from "expo-router";

export default function ProviderProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="availability" />
      <Stack.Screen name="reviews" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="notification-preferences" />
      <Stack.Screen name="security" />
      <Stack.Screen name="documents" />
      <Stack.Screen name="language" />
      <Stack.Screen name="theme" />
      <Stack.Screen name="statistics" />
      <Stack.Screen name="service-area" />
      <Stack.Screen name="payment-methods" />
      <Stack.Screen name="add-bank-account" />
      <Stack.Screen name="services" />
      <Stack.Screen name="help-center" />
      <Stack.Screen name="contact-support" />
      <Stack.Screen name="terms-privacy" />
      <Stack.Screen name="legal-document/[docType]" />
    </Stack>
  );
}
