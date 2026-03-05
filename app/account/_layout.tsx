import { Stack } from "expo-router";

export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="edit" />
      <Stack.Screen name="configuration" />
      <Stack.Screen name="security" />
      <Stack.Screen name="notification-preferences" />
      <Stack.Screen name="language" />
      <Stack.Screen name="theme" />
      <Stack.Screen name="payment-methods" />
      <Stack.Screen name="my-addresses" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="support" />
      <Stack.Screen name="invoices" />
      <Stack.Screen name="chat-history" />
    </Stack>
  );
}
