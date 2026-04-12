import { useThemeColors } from "@/hooks/useThemeColors";
import { Stack } from "expo-router";
import React from "react";

export default function JobsLayout() {
  const colors = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.screenBackground },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="in-progress" />
      <Stack.Screen name="complete" />
      <Stack.Screen name="invoice" />
      <Stack.Screen name="rate-client" />
    </Stack>
  );
}
