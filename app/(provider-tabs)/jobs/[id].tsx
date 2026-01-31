import { t } from "@/i18n";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CARD_BG = "#1E1B2E";
const CARD_BORDER = "rgba(61, 51, 112, 0.3)";
const SCREEN_BG = "#12121A";

export default function ProviderJobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goBack = () => router.back();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.title}>{t("providerDashboard.viewDetails")}</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.card, styles.section]}>
          <View style={styles.clientRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={28} color="rgba(255,255,255,0.6)" />
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>—</Text>
              <Text style={styles.clientMeta}>—</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
                <Ionicons name="chatbubble-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.7}
                onPress={() => Linking.openURL("tel:")}
              >
                <Ionicons name="call-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.card, styles.section]}>
          <Text style={styles.sectionLabel}>—</Text>
          <Text style={styles.sectionTitle}>—</Text>
          <Text style={styles.sectionSub}>—</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>—</Text>
            <Text style={styles.price}>—</Text>
          </View>
        </View>

        <View style={[styles.card, styles.section]}>
          <Text style={styles.sectionLabel}>—</Text>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={48} color="rgba(255,255,255,0.3)" />
          </View>
          <Text style={styles.address}>—</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingTop: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    gap: 16,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  section: {
    padding: 16,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(61, 51, 112, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  clientMeta: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(61, 51, 112, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  priceLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
  price: {
    fontSize: 20,
    fontWeight: "700",
    color: "#22C55E",
  },
  mapPlaceholder: {
    height: 128,
    borderRadius: 8,
    backgroundColor: "rgba(61, 51, 112, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  address: {
    fontSize: 14,
    color: "#FFFFFF",
  },
});
