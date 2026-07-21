import MordoboLogo from "@/components/MordoboLogo";
import { MERCHANT, formatDop } from "@/constants/merchant";
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

/**
 * Public sample payment receipt for Azul merchant review.
 * Mirrors the post-payment comprobante sent to customers (no auth required).
 */
export default function ReceiptSamplePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const sampleAmount = 1850;
  const rows: Array<{ label: string; value: string }> = [
    { label: "Número de recibo", value: "MRD-SAMPLE0001" },
    { label: "Reserva", value: "ORD-DEMO4582" },
    { label: "Fecha de pago", value: "21 jul 2026, 10:15 a. m." },
    { label: "Cliente", value: "Cliente de ejemplo" },
    { label: "Servicio", value: "Lavado de autos a domicilio" },
    { label: "Proveedor", value: "Proveedor independiente Mordobo" },
    { label: "Fecha del servicio", value: "22 jul 2026, 9:00 a. m." },
    { label: "Lugar del servicio", value: "Santo Domingo, República Dominicana" },
    { label: "Método de pago", value: "Visa •••• 4242" },
    { label: "Referencia", value: "AZUL-DEMO-REF-001" },
    { label: "Estado", value: "Completado" },
    { label: "Moneda", value: "RD$ / DOP (pesos dominicanos)" },
  ];

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
        <Text style={styles.title}>{t("compliance.receiptSampleTitle")}</Text>
        <Text style={styles.intro}>{t("compliance.receiptSampleIntro")}</Text>

        <View style={styles.receipt}>
          <View style={styles.brandBlock}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={25} color="#FFFFFF" />
            </View>
            <Text style={styles.merchant}>{MERCHANT.commercialName}</Text>
            <Text style={styles.legal}>
              {MERCHANT.legalName} · RNC {MERCHANT.rnc}
            </Text>
            <Text style={styles.address}>{MERCHANT.address}</Text>
            <Text style={styles.paid}>{t("compliance.paymentProcessed")}</Text>
          </View>

          <Text style={styles.amount}>{formatDop(sampleAmount)}</Text>
          <Text style={styles.currency}>Pesos dominicanos (RD$ / DOP)</Text>

          <View style={styles.divider} />
          {rows.map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.label}>{row.label}</Text>
              <Text style={styles.value}>{row.value}</Text>
            </View>
          ))}

          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total pagado</Text>
            <Text style={styles.totalValue}>{formatDop(sampleAmount)}</Text>
          </View>

          <View style={styles.securityBox}>
            <Ionicons name="shield-checkmark-outline" size={19} color="#047857" />
            <Text style={styles.securityText}>{t("compliance.receiptSecurityNote")}</Text>
          </View>
        </View>

        <Text style={styles.help}>
          {t("compliance.contactSupport", {
            email: MERCHANT.supportEmail,
            phone: MERCHANT.supportPhoneDisplay,
          })}
        </Text>
        <Text style={styles.policyLink} onPress={() => router.push("/refunds")}>
          {t("compliance.linkRefunds")}
        </Text>
        <Text style={styles.policyLink} onPress={() => router.push("/delivery")}>
          {t("compliance.linkDelivery")}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  back: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandName: { fontSize: 17, fontWeight: "700", color: "#111827" },
  content: { width: "100%", maxWidth: 620, alignSelf: "center", padding: 20 },
  eyebrow: { color: "#6B7280", fontSize: 12, fontWeight: "600", marginBottom: 6 },
  title: { color: "#111827", fontSize: 26, fontWeight: "800", marginBottom: 8 },
  intro: { color: "#4B5563", fontSize: 14, lineHeight: 21, marginBottom: 18 },
  receipt: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 22,
  },
  brandBlock: { alignItems: "center" },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  merchant: { color: "#111827", fontSize: 22, fontWeight: "800" },
  legal: { color: "#6B7280", fontSize: 12, marginTop: 3 },
  address: { color: "#6B7280", fontSize: 11, marginTop: 4, textAlign: "center", lineHeight: 16 },
  paid: { color: "#059669", fontSize: 13, fontWeight: "700", marginTop: 9 },
  amount: { color: "#111827", fontSize: 36, fontWeight: "800", textAlign: "center", marginTop: 22 },
  currency: { color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 3 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 20 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 13,
  },
  label: { color: "#6B7280", fontSize: 13, flex: 1 },
  value: { color: "#111827", fontSize: 13, fontWeight: "600", flex: 1.45, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { color: "#111827", fontSize: 16, fontWeight: "700" },
  totalValue: { color: "#059669", fontSize: 19, fontWeight: "800" },
  securityBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#ECFDF5",
    padding: 13,
    borderRadius: 12,
    marginTop: 20,
  },
  securityText: { color: "#047857", fontSize: 12, lineHeight: 18, flex: 1 },
  help: { color: "#6B7280", fontSize: 12, textAlign: "center", lineHeight: 19, marginTop: 18 },
  policyLink: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
  },
});
