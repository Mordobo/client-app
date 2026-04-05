import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/i18n";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

/** Version label shown in profile footer for both Client and Provider. */
const PROFILE_VERSION_LABEL = "3.0.6";

/**
 * Shared footer for Client and Provider profile screens: app version label and logout button.
 * Reused to avoid duplicating logic and ensure consistent layout and behavior.
 */
export function ProfileFooter() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = () => {
    const performLogout = async () => {
      try {
        await logout();
        setTimeout(() => {
          try {
            router.replace("/(auth)");
          } catch {
            router.replace("/(auth)/welcome");
          }
        }, 100);
      } catch (error) {
        console.error("[ProfileFooter] Logout error:", error);
        try {
          router.replace("/(auth)");
        } catch (navError) {
          console.error("[ProfileFooter] Navigation error after logout failure:", navError);
          Alert.alert(t("common.error"), t("profile.logoutError"));
        }
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
        <Text style={styles.versionText}>{t("profile.version")} {PROFILE_VERSION_LABEL}</Text>
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
