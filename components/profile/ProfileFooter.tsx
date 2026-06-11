import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/i18n";
import { fetchPlatformStatus, PLATFORM_STATUS_QUERY_KEY } from "@/services/platformStatus";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import React from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * Shared footer for Client and Provider profile screens: app version label and logout button.
 * Reused to avoid duplicating logic and ensure consistent layout and behavior.
 */
export function ProfileFooter() {
  const { logout } = useAuth();
  const { data: platformStatus } = useQuery({
    queryKey: PLATFORM_STATUS_QUERY_KEY,
    queryFn: fetchPlatformStatus,
    staleTime: 15_000,
  });
  const bundledVersion = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? "0.0.0";
  const visibleVersion = platformStatus?.app_version?.trim() || bundledVersion;

  const handleLogout = () => {
    const performLogout = async () => {
      try {
        await logout();
        // Navigation: (tabs)/(provider-tabs) layouts redirect to /(auth) when unauthenticated.
        // Avoid router.replace here — it races unmount and triggers "navigate before Root Layout".
      } catch (error) {
        console.error("[ProfileFooter] Logout error:", error);
        Alert.alert(t("common.error"), t("profile.logoutError"));
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(`${t("profile.logout")}\n\n${t("profile.logoutConfirm")}`);
      if (confirmed) performLogout();
    } else {
      Alert.alert(t("profile.logout"), t("profile.logoutConfirm"), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("profile.logout"), style: "destructive", onPress: performLogout },
      ]);
    }
  };

  return (
    <View style={styles.footer}>
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>{t("profile.logout")}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>{t("profile.version")} {visibleVersion}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 20,
  },
  logoutContainer: {
    padding: 20,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    backgroundColor: "#ef444420",
  },
  logoutIcon: {
    fontSize: 20,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ef4444",
  },
  versionContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 12,
    color: "#9ca3af",
  },
});
