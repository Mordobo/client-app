import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, AppState, type AppStateStatus, Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MaintenanceScreen } from "@/components/MaintenanceScreen";
import { initializeGoogleSignIn } from "@/config/google-signin";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ModeProvider } from "@/contexts/ModeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ApiError } from "@/services/auth";
import { fetchPlatformStatus } from "@/services/platformStatus";
import { useEffect } from "react";


export const unstable_settings = {
  anchor: "(auth)",
};

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isLoading } = useAuth();
  const colorScheme = useColorScheme();

  const {
    data: platformStatus,
    isPending: platformStatusPending,
    isError: platformStatusError,
    refetch: refetchPlatformStatus,
    isFetching: platformStatusFetching,
  } = useQuery({
    queryKey: ["platform-status"],
    queryFn: fetchPlatformStatus,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        void refetchPlatformStatus();
      }
    });
    return () => sub.remove();
  }, [refetchPlatformStatus]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const maintenanceOn =
    !platformStatusError && platformStatus?.maintenance_mode === true;

  if (platformStatusPending && !platformStatusError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (maintenanceOn) {
    return (
      <MaintenanceScreen onRetry={() => void refetchPlatformStatus()} isChecking={platformStatusFetching} />
    );
  }

  const statusBarBackgroundColor = colorScheme === "dark" ? "#1a1a2e" : "#F9FAFB";

  return (
    <NavigationThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colorScheme === "dark" ? "#12121A" : "#F9FAFB" },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(provider-tabs)"
          options={{ headerShown: false, contentStyle: { backgroundColor: colorScheme === "dark" ? "#12121A" : "#F9FAFB" } }}
        />
        <Stack.Screen
          name="switch-mode"
          options={{ headerShown: false, contentStyle: { backgroundColor: colorScheme === "dark" ? "#12121A" : "#F9FAFB" } }}
        />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
      </Stack>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} backgroundColor={statusBarBackgroundColor} translucent={Platform.OS === "android"} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    initializeGoogleSignIn();
  }, []);

  // Prevent "Uncaught Error" overlay when token invalid/expired (session expired or cleared, user stays on welcome)
  // Only on web: window.addEventListener/removeEventListener do not exist in React Native (APK)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const w = typeof window !== "undefined" ? window : null;
    if (!w?.addEventListener || !w?.removeEventListener) return;

    const isTokenExpiredError = (reason: unknown): boolean => {
      if (reason instanceof ApiError && reason.sessionExpired) return true;
      const msg = reason instanceof Error ? reason.message?.toLowerCase() ?? "" : "";
      return msg.includes("invalid") && (msg.includes("expired") || msg.includes("token"));
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (isTokenExpiredError(event?.reason)) {
        event.preventDefault();
      }
    };

    const handleError = (event: ErrorEvent) => {
      const msg = (event?.message ?? "").toLowerCase();
      if (msg.includes("invalid") && (msg.includes("expired") || msg.includes("token"))) {
        event.preventDefault();
        return true;
      }
      return false;
    };

    w.addEventListener("unhandledrejection", handleRejection);
    w.addEventListener("error", handleError);
    return () => {
      w.removeEventListener("unhandledrejection", handleRejection);
      w.removeEventListener("error", handleError);
    };
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
