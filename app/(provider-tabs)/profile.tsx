import { ModeSwitch } from "@/components/common/ModeSwitch";
import { useAuth } from "@/contexts/AuthContext";
import { useMode } from "@/contexts/ModeContext";
import { t } from "@/i18n";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ProviderProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { mode, setMode } = useMode();

  const handleModeChange = useCallback(
    async (newMode: "client" | "provider") => {
      if (newMode !== "client") return;
      try {
        await setMode("client");
        router.replace("/(tabs)");
      } catch (e) {
        console.error("[ProviderProfile] Switch to client failed:", e);
      }
    },
    [setMode, router],
  );

  const displayName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
    : "—";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("providerDashboard.profileTab")}</Text>
      <Text style={styles.name}>{displayName}</Text>
      <View style={styles.switchWrap}>
        <ModeSwitch
          variant="pill"
          currentMode={mode}
          onModeChange={handleModeChange}
          size="medium"
          showLabels={true}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#12121A",
    padding: 20,
    paddingTop: 60,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  name: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    marginBottom: 24,
  },
  switchWrap: {
    marginTop: 8,
  },
});
