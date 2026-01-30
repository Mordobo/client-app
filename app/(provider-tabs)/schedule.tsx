import { t } from "@/i18n";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function ProviderScheduleScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("providerDashboard.scheduleTab")}</Text>
      <Text style={styles.placeholder}>{t("providerDashboard.scheduleTab")} — Coming soon</Text>
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
  placeholder: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
});
