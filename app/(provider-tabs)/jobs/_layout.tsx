import { Stack } from "expo-router";
import React from "react";

export default function JobsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#12121A" },
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
