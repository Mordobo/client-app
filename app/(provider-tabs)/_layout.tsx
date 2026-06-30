import { t } from "@/i18n";
import { HapticTab } from "@/components/haptic-tab";
import { AvailabilityProvider } from "@/contexts/AvailabilityContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMode } from "@/contexts/ModeContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { checkProviderStatus } from "@/services/providers";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter, useSegments } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACTIVE_STATUS = "active";

export default function ProviderTabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const colors = useThemeColors();
  const { user } = useAuth();
  const { mode } = useMode();
  const isFocused = useIsFocused();
  const bottomPadding = Math.max(insets.bottom, 24);

  const [providerStatusCheck, setProviderStatusCheck] = useState<{
    loading: boolean;
    status: string | null;
    onboardingCompleted: boolean;
  }>({ loading: true, status: null, onboardingCompleted: false });

  const refreshProviderStatus = useCallback(async () => {
    try {
      const res = await checkProviderStatus();
      setProviderStatusCheck({
        loading: false,
        status: res.status ?? null,
        onboardingCompleted: Boolean(res.onboardingCompleted),
      });
    } catch {
      setProviderStatusCheck({ loading: false, status: null, onboardingCompleted: false });
    }
  }, []);

  useEffect(() => {
    if (!user || !isFocused) return;
    refreshProviderStatus();
  }, [user, isFocused, refreshProviderStatus]);

  // When provider is not active: send users who still need onboarding to the flow (not verification).
  // Verification auto-submits step 7 on mount; sending incomplete onboarding there caused bogus
  // "request sent" submissions when Android back popped to this layout under the welcome screen.
  useEffect(() => {
    if (providerStatusCheck.loading || !isFocused) return;
    if (providerStatusCheck.status === ACTIVE_STATUS) return;
    if (!providerStatusCheck.onboardingCompleted) {
      router.replace("/provider-onboarding");
    } else {
      // Already submitted and awaiting approval: show the "in review" status without
      // resubmitting step 7 (status=1 puts verification in read-only mode). (MDB-453)
      router.replace({ pathname: "/provider-onboarding/verification", params: { status: "1" } });
    }
  }, [
    providerStatusCheck.loading,
    providerStatusCheck.status,
    providerStatusCheck.onboardingCompleted,
    isFocused,
    router,
  ]);

  // MDB-257: When Profile tab is pressed from a nested route (e.g. /profile/security), navigate to profile root.
  const isNestedProfileRoute =
    segments[0] === "(provider-tabs)" && segments[1] === "profile" && segments.length > 2;

  // Redirect when not authenticated (e.g. after logout) to avoid protected API calls without token.
  useEffect(() => {
    if (!user && isFocused) {
      router.replace("/(tabs)");
    }
  }, [user, isFocused, router]);

  // Safety net: if mode becomes client while provider tabs are focused, redirect.
  useEffect(() => {
    if (mode === "client" && isFocused) {
      router.replace("/(tabs)");
    }
  }, [mode, isFocused, router]);

  const isActive = providerStatusCheck.status === ACTIVE_STATUS;

  if (providerStatusCheck.loading || !isActive) {
    return (
      <View style={[styles.screenBg, styles.centered, { backgroundColor: colors.screenBackground }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screenBg, { backgroundColor: colors.screenBackground }]} collapsable={false}>
      <AvailabilityProvider enabled>
        <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarStyle: {
            backgroundColor: colors.tabBarBg,
            borderTopWidth: 1,
            borderTopColor: colors.tabBarBorder,
            paddingVertical: 12,
            paddingBottom: bottomPadding,
            height: 60 + bottomPadding,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: "400" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("providerDashboard.home"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: t("providerDashboard.inbox.title"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="requests"
          options={{
            href: null,
            title: t("providerDashboard.requestsScreenTitle"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "document-text" : "document-text-outline"} size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            href: null,
            title: t("providerDashboard.providerNotifications.title"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "notifications" : "notifications-outline"} size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="jobs"
          options={{
            title: t("providerDashboard.jobsTab"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "clipboard" : "clipboard-outline"} size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: t("providerDashboard.scheduleTab"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "calendar" : "calendar-outline"} size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="earnings"
          options={{
            title: t("providerDashboard.earningsTab"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "wallet" : "wallet-outline"} size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t("providerDashboard.profileTab"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "person" : "person-outline"} size={20} color={color} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              if (isNestedProfileRoute) {
                e.preventDefault();
                router.replace("/(provider-tabs)/profile");
              }
            },
          }}
        />
      </Tabs>
    </AvailabilityProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
});
