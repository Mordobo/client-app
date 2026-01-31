import { HapticTab } from "@/components/haptic-tab";
import { AvailabilityProvider } from "@/contexts/AvailabilityContext";
import { t } from "@/i18n";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProviderTabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 24);

  return (
    <AvailabilityProvider enabled>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: "#FB923C",
          tabBarInactiveTintColor: "rgba(255,255,255,0.4)",
          tabBarStyle: {
            backgroundColor: "rgba(30, 27, 46, 0.95)",
            borderTopWidth: 1,
            borderTopColor: "rgba(61, 51, 112, 0.5)",
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
        />
      </Tabs>
    </AvailabilityProvider>
  );
}
