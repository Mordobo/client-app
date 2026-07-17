import MordoboLogo from "@/components/MordoboLogo";
import { PaymentComplianceBadges } from "@/components/payment/PaymentComplianceBadges";
import { MERCHANT } from "@/constants/merchant";
import { t } from "@/i18n";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Section = { heading: string; paragraphs: string[] };

export type PublicPolicy = {
  title: string;
  updated: string;
  intro: string;
  sections: Section[];
};

interface PublicPolicyPageProps {
  policy: PublicPolicy;
  /** Azul requires 3DS marks on the card-data security policy page. */
  showPaymentMarks?: boolean;
}

export function PublicPolicyPage({ policy, showPaymentMarks = false }: PublicPolicyPageProps) {
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
          <Text style={styles.brandName}>Mordobo</Text>
        </View>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.eyebrow}>{MERCHANT.legalName} · RNC {MERCHANT.rnc}</Text>
        <Text style={styles.title}>{policy.title}</Text>
        <Text style={styles.updated}>{t("compliance.lastUpdated", { date: policy.updated })}</Text>
        <Text style={styles.intro}>{policy.intro}</Text>

        {showPaymentMarks ? (
          <View style={styles.marks}>
            <PaymentComplianceBadges appearance="light" showContact={false} />
          </View>
        ) : null}

        {policy.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.heading}</Text>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>{paragraph}</Text>
            ))}
          </View>
        ))}

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>{t("compliance.needHelp")}</Text>
          <Text style={styles.contactText}>
            {t("compliance.contactSupport", {
              email: MERCHANT.supportEmail,
              phone: MERCHANT.supportPhoneDisplay,
            })}
          </Text>
          <Text style={styles.addressText}>{MERCHANT.address}</Text>
          <View style={styles.contactActions}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => Linking.openURL(`mailto:${MERCHANT.supportEmail}`)}
            >
              <Ionicons name="mail-outline" size={17} color="#FFFFFF" />
              <Text style={styles.contactButtonText}>{t("compliance.email")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => Linking.openURL(`https://wa.me/${MERCHANT.supportPhoneE164}`)}
            >
              <Ionicons name="logo-whatsapp" size={17} color="#FFFFFF" />
              <Text style={styles.contactButtonText}>{t("compliance.whatsapp")}</Text>
            </TouchableOpacity>
          </View>
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
  page: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    height: 64,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  back: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandName: { fontSize: 19, fontWeight: "800", color: "#111827" },
  content: { width: "100%", maxWidth: 820, alignSelf: "center", padding: 24 },
  eyebrow: { color: "#059669", fontSize: 13, fontWeight: "700", marginBottom: 10 },
  title: { color: "#111827", fontSize: 32, lineHeight: 39, fontWeight: "800" },
  updated: { color: "#64748B", fontSize: 13, marginTop: 8, marginBottom: 22 },
  intro: { color: "#334155", fontSize: 16, lineHeight: 25, marginBottom: 24 },
  marks: {
    marginBottom: 28,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  section: { marginBottom: 22 },
  sectionTitle: { color: "#111827", fontSize: 19, fontWeight: "700", marginBottom: 8 },
  paragraph: { color: "#475569", fontSize: 15, lineHeight: 24, marginBottom: 8 },
  contactCard: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
  },
  contactTitle: { fontSize: 17, fontWeight: "700", color: "#065F46" },
  contactText: { color: "#047857", lineHeight: 21, marginTop: 6 },
  addressText: { color: "#065F46", fontSize: 13, lineHeight: 19, marginTop: 8 },
  contactActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  contactButton: {
    backgroundColor: "#059669",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  contactButtonText: { color: "#FFFFFF", fontWeight: "700" },
  footer: { color: "#64748B", fontSize: 12, lineHeight: 19, textAlign: "center", marginTop: 28 },
});
