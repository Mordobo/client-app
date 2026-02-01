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
      <Stack.Screen name="services" />
    </Stack>
  );
}
