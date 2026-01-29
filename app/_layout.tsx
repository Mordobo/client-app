import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Platform, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { initializeGoogleSignIn } from "@/config/google-signin";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ModeProvider } from "@/contexts/ModeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useEffect } from "react";

export const unstable_settings = {
  anchor: "(auth)",
};

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const colorScheme = useColorScheme();

  // Force re-render when authentication state changes
  // This ensures navigation updates immediately
  // IMPORTANT: useEffect must be called before any conditional returns
  useEffect(() => {
    console.log("[RootLayoutNav] Authentication state changed - isAuthenticated:", isAuthenticated, "user:", user ? "exists" : "null");
  }, [isAuthenticated, user]);

  console.log("[RootLayoutNav] Render - isAuthenticated:", isAuthenticated, "isLoading:", isLoading, "user:", user ? "exists" : "null");

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // StatusBar colors matching theme
  const statusBarBackgroundColor = colorScheme === "dark" ? "#1a1a2e" : "#F9FAFB";

  return (
    <NavigationThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
        key={isAuthenticated ? "authenticated" : "unauthenticated"}
      >
        {isAuthenticated ?
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="chat" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
          </>
        : <>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </>
        }
      </Stack>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} backgroundColor={statusBarBackgroundColor} translucent={Platform.OS === "android"} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    initializeGoogleSignIn();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProviderWrapper />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function ThemeProviderWrapper() {
  const { isAuthenticated } = useAuth();
  return (
    <ThemeProvider isAuthenticated={isAuthenticated}>
      <ModeProvider isAuthenticated={isAuthenticated}>
        <RootLayoutNav />
      </ModeProvider>
    </ThemeProvider>
  );
}
