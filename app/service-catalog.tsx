import MordoboLogo from "@/components/MordoboLogo";
import { MERCHANT, formatDop } from "@/constants/merchant";
import {
  PUBLIC_CATALOG_INTRO,
  PUBLIC_SERVICE_CATALOG,
} from "@/constants/publicServiceCatalog";
import { t } from "@/i18n";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Public catalog for Azul review — descriptions + RD$ prices without requiring live suppliers. */
export default function ServiceCatalogPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel={t("compliance.back")}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(auth)/welcome"))}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={23} color="#111827" />
        </TouchableOpacity>
        <View style={styles.brand}>
          <MordoboLogo size={34} />
          <Text style={styles.brandName}>{MERCHANT.commercialName}</Text>
        </View>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.eyebrow}>
          {MERCHANT.legalName} · RNC {MERCHANT.rnc}
        </Text>
        <Text style={styles.title}>{t("compliance.servicesTitle")}</Text>
        <Text style={styles.updated}>{t("compliance.lastUpdated", { date: "21 de julio de 2026" })}</Text>

        <View style={styles.currencyBanner}>
          <Ionicons name="cash-outline" size={18} color="#047857" />
          <Text style={styles.currencyBannerText}>{t("compliance.currencyBanner")}</Text>
        </View>

        <Text style={styles.intro}>{PUBLIC_CATALOG_INTRO}</Text>

        {PUBLIC_SERVICE_CATALOG.map((item) => (
          <View key={item.key} style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardDescription}>{item.description}</Text>
            <Text style={styles.examplesLabel}>{t("compliance.includesLabel")}</Text>
            <Text style={styles.examples}>{item.examples.join(" · ")}</Text>
            <Text style={styles.price}>
              {t("compliance.fromPrice", { amount: formatDop(item.fromPriceDop) })}
            </Text>
            <Text style={styles.priceNote}>{t("compliance.priceNote")}</Text>
          </View>
        ))}

        <View style={styles.links}>
          <Text style={styles.link} onPress={() => router.push("/delivery")}>
            {t("compliance.linkDelivery")}
          </Text>
          <Text style={styles.link} onPress={() => router.push("/receipt-sample")}>
            {t("compliance.linkReceiptSample")}
          </Text>
          <Text style={styles.link} onPress={() => router.push("/refunds")}>
            {t("compliance.linkRefunds")}
          </Text>
        </View>

        <Text style={styles.footer}>
          {t("compliance.footerPrices", {
            name: MERCHANT.commercialName,
            address: MERCHANT.address,
          })}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  back: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandName: { fontSize: 17, fontWeight: "700", color: "#111827" },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  eyebrow: { color: "#6B7280", fontSize: 12, fontWeight: "600", marginBottom: 6 },
  title: { color: "#111827", fontSize: 28, fontWeight: "800", marginBottom: 6 },
  updated: { color: "#9CA3AF", fontSize: 12, marginBottom: 14 },
  currencyBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  currencyBannerText: { flex: 1, color: "#047857", fontSize: 13, fontWeight: "700", lineHeight: 19 },
  intro: { color: "#374151", fontSize: 15, lineHeight: 23, marginBottom: 20 },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#F9FAFB",
  },
  cardTitle: { color: "#111827", fontSize: 17, fontWeight: "800", marginBottom: 6 },
  cardDescription: { color: "#374151", fontSize: 14, lineHeight: 21, marginBottom: 10 },
  examplesLabel: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  examples: { color: "#4B5563", fontSize: 13, lineHeight: 19, marginBottom: 10 },
  price: { color: "#059669", fontSize: 16, fontWeight: "800" },
  priceNote: { color: "#6B7280", fontSize: 11, marginTop: 3 },
  links: { marginTop: 10, gap: 10, marginBottom: 16 },
  link: { color: "#2563EB", fontSize: 14, fontWeight: "700" },
  footer: { color: "#9CA3AF", fontSize: 12, lineHeight: 18 },
});
