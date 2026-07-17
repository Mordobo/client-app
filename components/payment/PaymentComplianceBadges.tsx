import { CardBrandMark } from "@/components/payment/CardBrandMark";
import { ThreeDSecureMark } from "@/components/payment/ThreeDSecureMarks";
import { MERCHANT } from "@/constants/merchant";
import { t } from "@/i18n";
import { Ionicons } from "@expo/vector-icons";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Appearance = "light" | "dark";

interface PaymentComplianceBadgesProps {
  appearance?: Appearance;
  /** Show Visa / Mastercard acceptance marks. */
  showCardBrands?: boolean;
  /** Show Verified by Visa + Mastercard Identity Check (Azul 3DS requirement). */
  showThreeDs?: boolean;
  /** Show support email, phone, and merchant address. */
  showContact?: boolean;
  compact?: boolean;
}

export function PaymentComplianceBadges({
  appearance = "light",
  showCardBrands = true,
  showThreeDs = true,
  showContact = false,
  compact = false,
}: PaymentComplianceBadgesProps) {
  const isDark = appearance === "dark";
  const labelColor = isDark ? "#9CA3AF" : "#64748B";
  const contactColor = isDark ? "#D1D5DB" : "#334155";
  const cardWidth = compact ? 52 : 64;
  const threeDsWidth = compact ? 132 : 148;

  return (
    <View style={styles.wrap} accessibilityLabel={t("compliance.paymentMarksA11y")}>
      {showCardBrands ? (
        <View style={styles.block}>
          <Text style={[styles.label, { color: labelColor }]}>{t("compliance.acceptedCards")}</Text>
          <View style={styles.row}>
            <CardBrandMark variant="visa" width={cardWidth} />
            <CardBrandMark variant="mastercard" width={cardWidth} />
          </View>
        </View>
      ) : null}

      {showThreeDs ? (
        <View style={styles.block}>
          <Text style={[styles.label, { color: labelColor }]}>{t("compliance.threeDsLabel")}</Text>
          <View style={styles.row}>
            <ThreeDSecureMark variant="visa_secure" width={threeDsWidth} />
            <ThreeDSecureMark variant="mastercard_id_check" width={threeDsWidth} />
          </View>
        </View>
      ) : null}

      {showContact ? (
        <View style={[styles.contact, isDark && styles.contactDark]}>
          <Text style={[styles.contactTitle, { color: contactColor }]}>
            {t("compliance.customerService")}
          </Text>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL(`mailto:${MERCHANT.supportEmail}`)}
            accessibilityRole="link"
          >
            <Ionicons name="mail-outline" size={15} color={isDark ? "#93C5FD" : "#059669"} />
            <Text style={[styles.contactLink, isDark && styles.contactLinkDark]}>
              {MERCHANT.supportEmail}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL(`https://wa.me/${MERCHANT.supportPhoneE164}`)}
            accessibilityRole="link"
          >
            <Ionicons name="call-outline" size={15} color={isDark ? "#93C5FD" : "#059669"} />
            <Text style={[styles.contactLink, isDark && styles.contactLinkDark]}>
              {MERCHANT.supportPhoneDisplay}
            </Text>
          </TouchableOpacity>
          <View style={styles.contactRow}>
            <Ionicons name="location-outline" size={15} color={isDark ? "#9CA3AF" : "#64748B"} />
            <Text style={[styles.address, { color: labelColor }]}>{MERCHANT.address}</Text>
          </View>
          <Text style={[styles.currency, { color: labelColor }]}>
            {t("compliance.currencyNote")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: 14,
    alignItems: "center",
  },
  block: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  contact: {
    width: "100%",
    marginTop: 2,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 7,
  },
  contactDark: {
    backgroundColor: "#252542",
    borderColor: "#374151",
  },
  contactTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactLink: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "600",
  },
  contactLinkDark: {
    color: "#93C5FD",
  },
  address: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  currency: {
    fontSize: 11,
    marginTop: 2,
  },
});
