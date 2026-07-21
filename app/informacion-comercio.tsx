import MordoboLogo from "@/components/MordoboLogo";
import { PaymentComplianceBadges } from "@/components/payment/PaymentComplianceBadges";
import { MERCHANT } from "@/constants/merchant";
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

type HubLink = {
  title: string;
  description: string;
  href: "/service-catalog" | "/refunds" | "/delivery" | "/privacy" | "/payment-security" | "/receipt-sample" | "/terms";
};

/**
 * Public Spanish hub for Azul merchant review.
 * Hardcoded in Spanish so reviewers with English browsers still see the required labels.
 */
const HUB_LINKS: HubLink[] = [
  {
    title: "1. Descripción de productos y servicios",
    description:
      "Catálogo completo de categorías de servicios con descripción clara, ejemplos y precios referenciales en RD$.",
    href: "/service-catalog",
  },
  {
    title: "2. Política de devoluciones, cancelaciones y reembolsos",
    description:
      "Derechos y responsabilidades del tarjetahabiente antes y después de la compra.",
    href: "/refunds",
  },
  {
    title: "3. Política clara de entrega",
    description:
      "Cómo se presta/entrega el servicio (a domicilio en fecha y lugar acordados; no hay envío de productos físicos).",
    href: "/delivery",
  },
  {
    title: "4. Moneda de compra: RD$ / DOP$",
    description:
      "Todos los precios se muestran y cobran en pesos dominicanos (RD$ / DOP). Ver también el catálogo de servicios.",
    href: "/service-catalog",
  },
  {
    title: "5. Modelo de recibo / comprobante de pago",
    description:
      "Ejemplo del comprobante que recibe el cliente tras un pago exitoso.",
    href: "/receipt-sample",
  },
  {
    title: "6. Política de privacidad",
    description: "Tratamiento de datos personales de clientes y proveedores.",
    href: "/privacy",
  },
  {
    title: "7. Políticas de seguridad de datos de tarjeta",
    description:
      "SSL, AES-256, PCI-DSS y procesamiento de pagos a través de AZUL.",
    href: "/payment-security",
  },
];

export default function InformacionComercioPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Volver"
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
        <Text style={styles.eyebrow}>
          {MERCHANT.legalName} · RNC {MERCHANT.rnc}
        </Text>
        <Text style={styles.title}>Información del comercio</Text>
        <Text style={styles.intro}>
          Esta página concentra la información requerida para la revisión del comercio. También puede
          accederse desde la página principal (mordobo.com) con el botón “Información del comercio”.
        </Text>

        <View style={styles.identityCard}>
          <Text style={styles.identityTitle}>Datos del comercio</Text>
          <Text style={styles.identityLine}>Nombre comercial: {MERCHANT.commercialName}</Text>
          <Text style={styles.identityLine}>Razón social: {MERCHANT.legalName}</Text>
          <Text style={styles.identityLine}>RNC: {MERCHANT.rnc}</Text>
          <Text style={styles.identityLine}>Dirección: {MERCHANT.address}</Text>
          <Text style={styles.identityLine}>
            Atención al cliente: {MERCHANT.supportEmail} · {MERCHANT.supportPhoneDisplay}
          </Text>
          <Text style={styles.currencyHighlight}>
            Moneda de compra: RD$ / DOP$ (pesos dominicanos)
          </Text>
        </View>

        {HUB_LINKS.map((item) => (
          <TouchableOpacity
            key={item.title}
            style={styles.linkCard}
            onPress={() => router.push(item.href)}
            accessibilityRole="link"
          >
            <View style={styles.linkCardText}>
              <Text style={styles.linkTitle}>{item.title}</Text>
              <Text style={styles.linkDescription}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#2563EB" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.secondaryLink} onPress={() => router.push("/terms")}>
          <Text style={styles.secondaryLinkText}>Ver también: Términos y Condiciones</Text>
        </TouchableOpacity>

        <View style={styles.marks}>
          <PaymentComplianceBadges appearance="light" showContact={false} />
        </View>
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
  title: { color: "#111827", fontSize: 28, fontWeight: "800", marginBottom: 10 },
  intro: { color: "#374151", fontSize: 15, lineHeight: 22, marginBottom: 16 },
  identityCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 6,
  },
  identityTitle: { color: "#065F46", fontSize: 14, fontWeight: "800", marginBottom: 4 },
  identityLine: { color: "#064E3B", fontSize: 13, lineHeight: 19 },
  currencyHighlight: {
    marginTop: 8,
    color: "#047857",
    fontSize: 14,
    fontWeight: "800",
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  linkCardText: { flex: 1 },
  linkTitle: { color: "#111827", fontSize: 15, fontWeight: "800", marginBottom: 4 },
  linkDescription: { color: "#4B5563", fontSize: 13, lineHeight: 19 },
  secondaryLink: { marginTop: 6, marginBottom: 18 },
  secondaryLinkText: { color: "#2563EB", fontSize: 14, fontWeight: "700" },
  marks: { marginTop: 4 },
});
