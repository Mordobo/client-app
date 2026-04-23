import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import {
  getJobInvoice,
  sendInvoiceEmail,
  type InvoiceData,
} from "@/services/providerDashboard";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PURPLE_GRADIENT_START = "#6366F1";
const PURPLE_GRADIENT_END = "#8B5CF6";
const GREEN = "#22C55E";
const GREEN_TEXT = "#4ADE80";
const GREEN_BG = "rgba(34, 197, 94, 0.1)";

function formatCurrency(value: number): string {
  const str = value % 1 === 0 ? String(value) : value.toFixed(2);
  return "$" + str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatCommissionPercent(percent: number): string {
  if (!Number.isFinite(percent)) return "0";
  const rounded = Math.round(percent * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1).replace(/\.0$/, "");
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export default function InvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InvoiceData | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await getJobInvoice(id);
        if (cancelled) return;
        setData(result);
      } catch (err) {
        console.error("[Invoice] Failed to load:", err);
        if (!cancelled) {
          Alert.alert(t("common.error"), t("providerDashboard.invoice.errors.loadFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const goBack = useCallback(() => router.back(), [router]);

  const handleDownloadPdf = useCallback(() => {
    Alert.alert(t("common.success"), "PDF download coming soon.");
  }, []);

  const handleSendEmail = useCallback(async () => {
    if (!id || sendingEmail) return;
    setSendingEmail(true);
    try {
      await sendInvoiceEmail(id);
      Alert.alert(t("common.success"), t("providerDashboard.invoice.sendEmail"));
    } catch {
      Alert.alert(t("common.error"), t("providerDashboard.invoice.errors.emailFailed"));
    } finally {
      setSendingEmail(false);
    }
  }, [id, sendingEmail]);

  const handleContinueToRate = useCallback(() => {
    if (!id) return;
    router.push({ pathname: "/(provider-tabs)/jobs/rate-client", params: { id } });
  }, [id, router]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{t("providerDashboard.invoice.errors.loadFailed")}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  const footerBottom = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t("providerDashboard.invoice.title")}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Invoice Card */}
        <View style={[styles.invoiceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Invoice Header */}
          <View style={styles.invoiceHeader}>
            <Text style={styles.invoiceHeaderLabel}>{t("providerDashboard.invoice.invoiceLabel")}</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
          </View>

          {/* Invoice Content */}
          <View style={styles.invoiceContent}>
            {/* Provider & Client */}
            <View style={styles.partiesRow}>
              <View style={styles.partyCol}>
                <Text style={styles.partyLabel}>{t("providerDashboard.invoice.from")}</Text>
                <Text style={styles.partyName}>{data.provider.name}</Text>
                {data.provider.taxId && (
                  <Text style={styles.partyMeta}>RFC: {data.provider.taxId}</Text>
                )}
              </View>
              <View style={styles.partyCol}>
                <Text style={styles.partyLabel}>{t("providerDashboard.invoice.to")}</Text>
                <Text style={styles.partyName}>{data.client.name}</Text>
                {data.client.email && (
                  <Text style={styles.partyMeta}>{data.client.email}</Text>
                )}
              </View>
            </View>

            <View style={styles.dividerLight} />

            {/* Service details (all info required for the service) */}
            {data.service && (data.service.serviceName || data.service.address || data.service.workSummary || data.service.orderNotes) && (
              <>
                <Text style={styles.sectionTitle}>{t("providerDashboard.invoice.serviceDetails")}</Text>
                <View style={styles.serviceDetailsBox}>
                  {data.service.serviceName ? (
                    <View style={styles.serviceDetailRow}>
                      <Text style={styles.serviceDetailLabel}>{t("providerDashboard.invoice.serviceName")}</Text>
                      <Text style={styles.serviceDetailValue}>{data.service.serviceName}</Text>
                    </View>
                  ) : null}
                  {data.service.serviceDescription ? (
                    <View style={styles.serviceDetailRow}>
                      <Text style={styles.serviceDetailLabel}>{t("providerDashboard.invoice.serviceDescription")}</Text>
                      <Text style={styles.serviceDetailValue}>{data.service.serviceDescription}</Text>
                    </View>
                  ) : null}
                  {data.service.address ? (
                    <View style={styles.serviceDetailRow}>
                      <Text style={styles.serviceDetailLabel}>{t("providerDashboard.invoice.address")}</Text>
                      <Text style={styles.serviceDetailValue}>{data.service.address}</Text>
                    </View>
                  ) : null}
                  {data.service.scheduledAt ? (
                    <View style={styles.serviceDetailRow}>
                      <Text style={styles.serviceDetailLabel}>{t("providerDashboard.invoice.scheduledDate")}</Text>
                      <Text style={styles.serviceDetailValue}>{formatDate(data.service.scheduledAt)}</Text>
                    </View>
                  ) : null}
                  {data.service.completedAt ? (
                    <View style={styles.serviceDetailRow}>
                      <Text style={styles.serviceDetailLabel}>{t("providerDashboard.invoice.completedDate")}</Text>
                      <Text style={styles.serviceDetailValue}>{formatDate(data.service.completedAt)}</Text>
                    </View>
                  ) : null}
                  {data.service.workSummary ? (
                    <View style={styles.serviceDetailRow}>
                      <Text style={styles.serviceDetailLabel}>{t("providerDashboard.invoice.workSummary")}</Text>
                      <Text style={styles.serviceDetailValue}>{data.service.workSummary}</Text>
                    </View>
                  ) : null}
                  {data.service.orderNotes ? (
                    <View style={styles.serviceDetailRow}>
                      <Text style={styles.serviceDetailLabel}>{t("providerDashboard.invoice.orderNotes")}</Text>
                      <Text style={styles.serviceDetailValue}>{data.service.orderNotes}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.dividerLight} />
              </>
            )}

            {/* Items Table Header (all services / line items) */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.tableConceptCol]}>
                {t("providerDashboard.invoice.concept")}
              </Text>
              <Text style={[styles.tableHeaderCell, styles.tableQtyCol]}>
                {t("providerDashboard.invoice.qty")}
              </Text>
              <Text style={[styles.tableHeaderCell, styles.tablePriceCol]}>
                {t("providerDashboard.invoice.price")}
              </Text>
            </View>

            {/* Items */}
            {data.lineItems.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableConceptCol]}>{item.name}</Text>
                <Text style={[styles.tableCellMuted, styles.tableQtyCol]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.tablePriceCol]}>
                  {formatCurrency(item.price)}
                </Text>
              </View>
            ))}

            <View style={styles.dividerLight} />

            {/* Totals */}
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t("providerDashboard.invoice.subtotal")}</Text>
                <Text style={styles.totalValue}>{formatCurrency(data.subtotal)}</Text>
              </View>
              {data.discountAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    {t("providerDashboard.invoice.discount", { percent: String(data.discountPercent) })}
                  </Text>
                  <Text style={styles.discountValue}>-{formatCurrency(data.discountAmount)}</Text>
                </View>
              )}
              {data.platformCommission && (
                <>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, styles.totalLabelWrap]}>
                      {t("providerDashboard.commission.mordoboServiceFee", {
                        percent: formatCommissionPercent(data.platformCommission.commissionPercent),
                      })}
                    </Text>
                    <Text style={styles.discountValue}>
                      -{formatCurrency(data.platformCommission.estimatedPlatformFee)}
                    </Text>
                  </View>
                  <Text style={[styles.invoiceFeeNote, { color: colors.textTertiary }]}>
                    {t("providerDashboard.commission.withdrawalNote")}
                  </Text>
                </>
              )}
              <View style={styles.totalDivider} />
              <View style={styles.totalRow}>
                <Text style={styles.grandTotalLabel}>{t("providerDashboard.invoice.total")}</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(data.total)}</Text>
              </View>
              {data.platformCommission && (
                <>
                  <View style={styles.totalDivider} />
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, styles.totalLabelWrap]}>
                      {t("providerDashboard.commission.estimatedYourEarnings")}
                    </Text>
                    <Text style={styles.grandTotalValue}>
                      {formatCurrency(data.platformCommission.estimatedNetToProvider)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Payment Status */}
            {data.payment.status === "paid" && (
              <View style={styles.paymentStatus}>
                <View style={styles.paymentStatusLeft}>
                  <View style={styles.paymentCheckCircle}>
                    <Text style={styles.paymentCheckmark}>✓</Text>
                  </View>
                  <View>
                    <Text style={styles.paymentPaidText}>{t("providerDashboard.invoice.paid")}</Text>
                    {data.payment.cardLast4 && (
                      <Text style={styles.paymentCardText}>
                        {t("providerDashboard.invoice.cardEnding", { last4: data.payment.cardLast4 })}
                      </Text>
                    )}
                  </View>
                </View>
                {data.payment.paidAt && (
                  <Text style={styles.paymentDate}>{formatDate(data.payment.paidAt)}</Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={handleDownloadPdf} activeOpacity={0.7}>
            <Text style={styles.actionCardIcon}>📄</Text>
            <Text style={[styles.actionCardLabel, { color: colors.textSecondary }]}>{t("providerDashboard.invoice.downloadPdf")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={handleSendEmail} activeOpacity={0.7} disabled={sendingEmail}>
            {sendingEmail ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.actionCardIcon}>📧</Text>
                <Text style={[styles.actionCardLabel, { color: colors.textSecondary }]}>{t("providerDashboard.invoice.sendEmail")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={[styles.footer, { paddingBottom: footerBottom }]}>
        <TouchableOpacity style={[styles.continueBtn, { backgroundColor: colors.primary }]} onPress={handleContinueToRate} activeOpacity={0.8}>
          <Text style={styles.continueBtnText}>{t("providerDashboard.invoice.continueToRate")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // Invoice Card
  invoiceCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 16,
  },
  invoiceHeader: {
    backgroundColor: PURPLE_GRADIENT_START,
    paddingVertical: 16,
    alignItems: "center",
  },
  invoiceHeaderLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 2,
  },
  invoiceNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  invoiceContent: {
    padding: 16,
  },

  // Parties
  partiesRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  partyCol: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 4,
  },
  partyName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  partyMeta: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  dividerLight: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 16,
  },

  // Service details
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  serviceDetailsBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  serviceDetailRow: {
    gap: 2,
  },
  serviceDetailLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  serviceDetailValue: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 20,
  },

  // Table
  tableHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  tableConceptCol: {
    flex: 6,
  },
  tableQtyCol: {
    flex: 2,
    textAlign: "center",
  },
  tablePriceCol: {
    flex: 4,
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
  },
  tableCell: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  tableCellMuted: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },

  // Totals
  totalsSection: {
    gap: 6,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
  totalLabelWrap: {
    flex: 1,
    paddingRight: 12,
  },
  invoiceFeeNote: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: -2,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  discountValue: {
    fontSize: 14,
    color: GREEN_TEXT,
  },
  totalDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 8,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: GREEN_TEXT,
  },

  // Payment Status
  paymentStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: GREEN_BG,
    borderRadius: 12,
    padding: 12,
  },
  paymentStatusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paymentCheckCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentCheckmark: {
    fontSize: 14,
    color: GREEN_TEXT,
  },
  paymentPaidText: {
    fontSize: 14,
    fontWeight: "500",
    color: GREEN_TEXT,
  },
  paymentCardText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  paymentDate: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },

  // Action Cards
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionCardIcon: {
    fontSize: 16,
  },
  actionCardLabel: {
    fontSize: 14,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  continueBtn: {
    backgroundColor: PURPLE_GRADIENT_START,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
