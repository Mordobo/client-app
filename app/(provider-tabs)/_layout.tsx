import { HapticTab } from "@/components/haptic-tab";
import { AvailabilityProvider } from "@/contexts/AvailabilityContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMode } from "@/contexts/ModeContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProviderTabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const colors = useThemeColors();
  const { user } = useAuth();
  const { mode } = useMode();
  const isFocused = useIsFocused();
  const bottomPadding = Math.max(insets.bottom, 24);

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
});
