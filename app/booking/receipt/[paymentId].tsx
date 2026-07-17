import { MERCHANT, formatDop } from "@/constants/merchant";
import { useThemeColors } from "@/hooks/useThemeColors";
import { fetchOrderDetail, type OrderDetailResponse } from "@/services/orders";
import { fetchPayment, type Payment } from "@/services/payments";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function shortReference(value: string): string {
  return value.replace(/-/g, "").slice(-12).toUpperCase();
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function PaymentReceiptScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const { paymentId, orderId } = useLocalSearchParams<{ paymentId: string; orderId?: string }>();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [orderData, setOrderData] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const styles = useMemo(() => makeStyles(theme), [theme]);

  useEffect(() => {
    if (!paymentId) return;
    let active = true;
    (async () => {
      try {
        const paymentResult = await fetchPayment(paymentId);
        const resolvedOrderId = orderId || paymentResult.order_id;
        const orderResult = await fetchOrderDetail(resolvedOrderId);
        if (active) {
          setPayment(paymentResult);
          setOrderData(orderResult);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [orderId, paymentId]);

  if (loading) {
    return <View style={[styles.center, { paddingTop: insets.top }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  if (error || !payment || !orderData) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.error}>No fue posible cargar el comprobante.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { order, supplier, client, quote } = orderData;
  const service = quote?.line_items?.[0]?.description || order.service_name || "Servicio reservado";
  const cardLabel = payment.card_last4
    ? `${payment.card_brand || payment.card_type || "Tarjeta"} •••• ${payment.card_last4}`
    : "Tarjeta";

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comprobante de pago</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.receipt}>
          <View style={styles.brandBlock}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={25} color="#FFFFFF" />
            </View>
            <Text style={styles.merchant}>{MERCHANT.commercialName}</Text>
            <Text style={styles.legal}>{MERCHANT.legalName} · RNC {MERCHANT.rnc}</Text>
            <Text style={styles.address}>{MERCHANT.address}</Text>
            <Text style={styles.paid}>Pago procesado</Text>
          </View>

          <Text style={styles.amount}>{formatDop(Number(payment.amount))}</Text>
          <Text style={styles.currency}>Pesos dominicanos (DOP)</Text>

          <View style={styles.divider} />
          <ReceiptRow label="Número de recibo" value={`MRD-${shortReference(payment.id)}`} styles={styles} />
          <ReceiptRow label="Reserva" value={shortReference(order.id)} styles={styles} />
          <ReceiptRow label="Fecha de pago" value={formatDateTime(payment.created_at)} styles={styles} />
          <ReceiptRow label="Cliente" value={client?.full_name || "Cliente Mordobo"} styles={styles} />
          <ReceiptRow label="Servicio" value={service} styles={styles} />
          <ReceiptRow label="Proveedor" value={supplier?.business_name?.trim() || supplier?.full_name || "Proveedor Mordobo"} styles={styles} />
          {order.scheduled_at ? <ReceiptRow label="Fecha del servicio" value={formatDateTime(order.scheduled_at)} styles={styles} /> : null}
          <ReceiptRow label="Método de pago" value={cardLabel} styles={styles} />
          <ReceiptRow label="Referencia" value={payment.provider_ref || shortReference(payment.id)} styles={styles} />
          <ReceiptRow label="Estado" value={payment.status === "completed" ? "Completado" : payment.status} styles={styles} />

          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total pagado</Text>
            <Text style={styles.totalValue}>{formatDop(Number(payment.amount))}</Text>
          </View>

          <View style={styles.securityBox}>
            <Ionicons name="shield-checkmark-outline" size={19} color="#047857" />
            <Text style={styles.securityText}>
              Este comprobante no contiene el número completo de tu tarjeta ni el código CVV.
            </Text>
          </View>
        </View>

        <Text style={styles.help}>
          Soporte: {MERCHANT.supportEmail} · {MERCHANT.supportPhoneDisplay}
        </Text>
        <TouchableOpacity onPress={() => router.push("/refunds")}>
          <Text style={styles.policyLink}>Política de cancelaciones y reembolsos</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function ReceiptRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.screenBackground },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.screenBackground, padding: 24 },
    header: { height: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
    iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
    headerTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: "700" },
    content: { width: "100%", maxWidth: 620, alignSelf: "center", padding: 20 },
    receipt: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, padding: 22 },
    brandBlock: { alignItems: "center" },
    successIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center", marginBottom: 12 },
    merchant: { color: colors.textPrimary, fontSize: 22, fontWeight: "800" },
    legal: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
    address: { color: colors.textSecondary, fontSize: 11, marginTop: 4, textAlign: "center", lineHeight: 16 },
    paid: { color: "#059669", fontSize: 13, fontWeight: "700", marginTop: 9 },
    amount: { color: colors.textPrimary, fontSize: 36, fontWeight: "800", textAlign: "center", marginTop: 22 },
    currency: { color: colors.textSecondary, fontSize: 12, textAlign: "center", marginTop: 3 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 20 },
    row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 18, marginBottom: 13 },
    label: { color: colors.textSecondary, fontSize: 13, flex: 1 },
    value: { color: colors.textPrimary, fontSize: 13, fontWeight: "600", flex: 1.45, textAlign: "right" },
    totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    totalLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
    totalValue: { color: "#059669", fontSize: 19, fontWeight: "800" },
    securityBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#ECFDF5", padding: 13, borderRadius: 12, marginTop: 20 },
    securityText: { color: "#047857", fontSize: 12, lineHeight: 18, flex: 1 },
    help: { color: colors.textSecondary, fontSize: 12, textAlign: "center", lineHeight: 19, marginTop: 18 },
    policyLink: { color: colors.primary, fontSize: 13, fontWeight: "700", textAlign: "center", marginTop: 10 },
    error: { color: colors.textSecondary, textAlign: "center", marginBottom: 18 },
    primaryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
    primaryButtonText: { color: "#FFFFFF", fontWeight: "700" },
  });
}
