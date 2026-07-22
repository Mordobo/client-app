import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type PolicyHref =
  | "/service-catalog"
  | "/terms"
  | "/privacy"
  | "/refunds"
  | "/delivery"
  | "/payment-security"
  | "/receipt-sample"
  | "/informacion-comercio";

type PolicyLink = { label: string; href: PolicyHref };

/** Spanish labels hardcoded so Azul reviewers always see expected wording. */
const POLICY_LINKS: PolicyLink[] = [
  { label: "Servicios", href: "/service-catalog" },
  { label: "Términos", href: "/terms" },
  { label: "Privacidad", href: "/privacy" },
  { label: "Reembolsos", href: "/refunds" },
  { label: "Entrega", href: "/delivery" },
  { label: "Seguridad", href: "/payment-security" },
  { label: "Recibo", href: "/receipt-sample" },
];

interface MerchantPolicyLinksProps {
  /** light = dark text on light bg; dark = light text on dark bg (welcome). */
  appearance?: "light" | "dark";
  /** Optional title above the links. */
  showTitle?: boolean;
}

/**
 * In-site navigation to Azul-required merchant pages.
 * Compliance rejects email-only deep links; these must appear on the website.
 */
export function MerchantPolicyLinks({
  appearance = "light",
  showTitle = true,
}: MerchantPolicyLinksProps) {
  const router = useRouter();
  const isDark = appearance === "dark";
  const titleColor = isDark ? "#D1D5DB" : "#334155";
  const linkColor = isDark ? "#60A5FA" : "#2563EB";
  const separatorColor = isDark ? "#6B7280" : "#94A3B8";

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      {showTitle ? (
        <Text style={[styles.title, { color: titleColor }]}>
          Políticas y servicios del sitio
        </Text>
      ) : null}
      <View style={styles.row}>
        {POLICY_LINKS.map((item, index) => (
          <React.Fragment key={item.href}>
            {index > 0 ? <Text style={[styles.separator, { color: separatorColor }]}>•</Text> : null}
            <Text
              style={[styles.link, { color: linkColor }]}
              onPress={() => router.push(item.href)}
              accessibilityRole="link"
            >
              {item.label}
            </Text>
          </React.Fragment>
        ))}
      </View>
      <Text
        style={[styles.hubLink, { color: linkColor }]}
        onPress={() => router.push("/informacion-comercio")}
        accessibilityRole="link"
      >
        Ver toda la información del comercio
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  link: {
    fontSize: 13,
    fontWeight: "700",
  },
  separator: {
    fontSize: 11,
  },
  hubLink: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },
});
