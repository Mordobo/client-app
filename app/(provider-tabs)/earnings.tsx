import { useThemeColors } from "@/hooks/useThemeColors";
import { getLocale, t } from "@/i18n";
import {
  exportEarnings,
  getEarningsChart,
  getEarningsSummary,
  getEarningsTransactions,
  requestWithdrawal,
  type EarningsPeriod,
  type ProviderEarningsTransaction,
} from "@/services/providerDashboard";
import type { ThemeColors } from "@/utils/themeStyles";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { enUS, es } from "date-fns/locale";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GRADIENT_START = "#6366F1";
const GRADIENT_MID = "#8B5CF6";
const GRADIENT_END = "#EC4899";
const STATUS_COMPLETED_BG = "rgba(34, 197, 94, 0.15)";
const STATUS_COMPLETED_TEXT = "#22C55E";
const STATUS_PENDING_BG = "rgba(251, 191, 36, 0.15)";
const STATUS_PENDING_TEXT = "#FBBF24";
const STATUS_PROCESSING_BG = "rgba(139, 92, 246, 0.15)";
const STATUS_PROCESSING_TEXT = "#8B5CF6";
const STATUS_REFUNDED_BG = "rgba(239, 68, 68, 0.15)";
const STATUS_REFUNDED_TEXT = "#EF4444";

function formatCurrency(value: number | null | undefined): string {
  const num = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  const str = num % 1 === 0 ? String(num) : num.toFixed(2);
  return "$" + str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatNextPayout(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    const locale = getLocale() === "es" ? es : enUS;
    return format(d, "EEEE d MMM", { locale });
  } catch {
    return dateStr;
  }
}

function formatTransactionDate(iso: string): string {
  try {
    const d = parseISO(iso);
    if (isToday(d)) {
      return format(d, "HH:mm");
    }
    if (isYesterday(d)) {
      return t("providerDashboard.earnings.yesterday");
    }
    return format(d, "d MMM");
  } catch {
    return iso.slice(0, 10);
  }
}

const PERIOD_TABS: { key: EarningsPeriod; labelKey: string }[] = [
  { key: "today", labelKey: "periodToday" },
  { key: "week", labelKey: "periodWeek" },
  { key: "month", labelKey: "periodMonth" },
];

export default function ProviderEarningsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [period, setPeriod] = useState<EarningsPeriod>("month");
  const [txPage, setTxPage] = useState(1);
  const [txStatusFilter, setTxStatusFilter] = useState<"all" | "completed" | "pending" | "processing" | "refunded">("all");
  const [accumulatedTx, setAccumulatedTx] = useState<ProviderEarningsTransaction[]>([]);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ["provider-earnings-summary", period],
    queryFn: () => getEarningsSummary({ period }),
  });
  const chartQuery = useQuery({
    queryKey: ["provider-earnings-chart", "week"],
    queryFn: () => getEarningsChart("week"),
  });
  const transactionsQuery = useQuery({
    queryKey: ["provider-earnings-transactions", period, txPage, txStatusFilter],
    queryFn: () =>
      getEarningsTransactions({
        period,
        status: txStatusFilter,
        page: txPage,
        limit: 20,
      }),
  });

  const summary = summaryQuery.data;
  const chartData = chartQuery.data?.data ?? [];
  const pageData = transactionsQuery.data;
  const pageTx = pageData?.transactions ?? [];
  const hasMoreTx = pageData?.hasMore ?? false;

  React.useEffect(() => {
    setTxPage(1);
    setAccumulatedTx([]);
  }, [period, txStatusFilter]);

  React.useEffect(() => {
    if (!pageData) return;
    if (txPage === 1) {
      setAccumulatedTx(pageTx);
    } else {
      setAccumulatedTx((prev) => {
        const ids = new Set(prev.map((t) => t.id));
        const newOnes = pageTx.filter((t) => !ids.has(t.id));
        return prev.concat(newOnes);
      });
    }
  }, [pageData, txPage, pageTx]);
  const transactions = accumulatedTx;
  const isLoading =
    summaryQuery.isLoading || chartQuery.isLoading || (transactionsQuery.isLoading && txPage === 1);
  const refetch = useCallback(() => {
    summaryQuery.refetch();
    chartQuery.refetch();
    setTxPage(1);
    transactionsQuery.refetch();
  }, [summaryQuery, chartQuery, transactionsQuery]);

  const handleExport = useCallback(async () => {
    try {
      const { csv, filename } = await exportEarnings({ format: "csv", period });
      const dir = FileSystem.cacheDirectory;
      if (!dir) {
        Alert.alert(t("providerDashboard.earnings.exportData"), "Export not available on this device.");
        return;
      }
      const path = `${dir}${filename}`;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Share.share({
        url: path,
        type: "text/csv",
        title: filename,
      });
    } catch (e) {
      Alert.alert(t("providerDashboard.earnings.errors.exportFailed"), String(e));
    }
  }, [period]);

  const availableBalance = summary?.balance ?? 0;
  const handleWithdraw = useCallback(async () => {
    const amount = parseFloat(withdrawAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert(t("providerDashboard.earnings.withdraw"), t("providerDashboard.earnings.withdrawInvalidAmount"));
      return;
    }
    if (amount > availableBalance) {
      Alert.alert(t("providerDashboard.earnings.withdraw"), t("providerDashboard.earnings.withdrawExceeds"));
      return;
    }
    setWithdrawing(true);
    try {
      await requestWithdrawal(amount);
      setWithdrawing(false);
      setWithdrawVisible(false);
      setWithdrawAmount("");
      summaryQuery.refetch();
      Alert.alert(t("providerDashboard.earnings.withdraw"), t("providerDashboard.earnings.withdrawSuccess"));
    } catch (e) {
      setWithdrawing(false);
      Alert.alert(
        t("providerDashboard.earnings.withdraw"),
        e instanceof Error ? e.message : t("providerDashboard.earnings.errors.withdrawFailed"),
      );
    }
  }, [withdrawAmount, availableBalance, summaryQuery]);

  const maxChartValue = useMemo(() => {
    const max = Math.max(...chartData.map((p) => p.total), 1);
    return max;
  }, [chartData]);

  const nextPayoutFormatted = summary?.nextPayoutDate
    ? formatNextPayout(summary.nextPayoutDate)
    : "";

  const cardStyle = { backgroundColor: colors.card, borderColor: colors.cardBorder };
  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={summaryQuery.isRefetching || chartQuery.isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t("providerDashboard.earnings.title")}</Text>
        </View>

        {/* Balance Card - Gradient */}
        <LinearGradient
          colors={[GRADIENT_START, GRADIENT_MID, GRADIENT_END]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>{t("providerDashboard.earnings.balanceAvailable")}</Text>
          {summaryQuery.isLoading ? (
            <ActivityIndicator color="#fff" size="small" style={styles.balanceLoader} />
          ) : (
            <Text style={styles.balanceAmount}>{formatCurrency(summary?.balance ?? 0)}</Text>
          )}
          {nextPayoutFormatted ? (
            <Text style={styles.nextPayout}>
              {t("providerDashboard.earnings.nextPayout")}: {nextPayoutFormatted}
            </Text>
          ) : null}
          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={styles.balanceButton}
              onPress={() => setWithdrawVisible(true)}
            >
              <Text style={styles.balanceButtonText}>{t("providerDashboard.earnings.withdraw")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.balanceButton} onPress={() => setTxPage(1)}>
              <Text style={styles.balanceButtonText}>{t("providerDashboard.earnings.history")}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Period Tabs — theme-aware (light: inactive was white-on-light = invisible) */}
        <View style={styles.periodTabs}>
          {PERIOD_TABS.map((tab) => {
            const active = period === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.periodTab,
                  {
                    backgroundColor: active ? "rgba(139, 92, 246, 0.18)" : colors.surfaceSecondary,
                    borderWidth: active ? 0 : 1,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setPeriod(tab.key)}
              >
                <Text style={[styles.periodTabText, { color: active ? colors.primary : colors.textSecondary }]}>
                  {t(`providerDashboard.earnings.${tab.labelKey}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardFirst, cardStyle]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("providerDashboard.earnings.periodToday")}</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatCurrency(summary?.todayEarnings ?? 0)}</Text>
          </View>
          <View style={[styles.statCard, cardStyle]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("providerDashboard.earnings.periodWeek")}</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatCurrency(summary?.weekEarnings ?? 0)}</Text>
          </View>
          <View style={[styles.statCard, styles.statCardLast, cardStyle]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("providerDashboard.earnings.periodMonth")}</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatCurrency(summary?.monthEarnings ?? 0)}</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={[styles.chartCard, cardStyle]}>
          <Text style={[styles.chartLabel, { color: colors.textSecondary }]}>{t("providerDashboard.earnings.chartLast7Days")}</Text>
          {chartQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} size="small" style={styles.chartLoader} />
          ) : (
            <View style={styles.chartBars}>
              {chartData.map((point, idx) => (
                <View key={point.date} style={styles.chartBarWrap}>
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: `${Math.max(8, (point.total / maxChartValue) * 100)}%`,
                        backgroundColor:
                          idx === chartData.length - 1
                            ? undefined
                            : "rgba(139, 92, 246, 0.3)",
                      },
                    ]}
                  >
                    {idx === chartData.length - 1 ? (
                      <LinearGradient
                        colors={[GRADIENT_MID, GRADIENT_START]}
                        style={StyleSheet.absoluteFill}
                      />
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={styles.chartDays}>
            {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
              <Text key={i} style={[styles.chartDayLabel, { color: colors.textSecondary }]}>
                {d}
              </Text>
            ))}
          </View>
        </View>

        {/* Transaction filters */}
        <View style={styles.txFilterRow}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t("providerDashboard.earnings.recentTransactions")}</Text>
          <View style={styles.txFilterChips}>
            {(["all", "completed", "pending", "processing", "refunded"] as const).map((status) => {
              const chipActive = txStatusFilter === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.txFilterChip,
                    {
                      backgroundColor: chipActive ? "rgba(139, 92, 246, 0.15)" : colors.surfaceSecondary,
                      borderWidth: chipActive ? 0 : 1,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    setTxStatusFilter(status);
                    setTxPage(1);
                  }}
                >
                  <Text style={[styles.txFilterChipText, { color: chipActive ? colors.textPrimary : colors.textSecondary }]}>
                    {status === "all"
                      ? t("providerDashboard.earnings.filterAll")
                      : t(`providerDashboard.earnings.status${status.charAt(0).toUpperCase() + status.slice(1)}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Transaction list */}
        {transactionsQuery.isLoading && txPage === 1 ? (
          <ActivityIndicator color={colors.primary} size="small" style={styles.txLoader} />
        ) : transactions.length === 0 ? (
          <View style={styles.emptyTx}>
            <Text style={[styles.emptyTxText, { color: colors.textSecondary }]}>{t("providerDashboard.earnings.noTransactions")}</Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} colors={colors} />
          ))
        )}
        {hasMoreTx && (
          <TouchableOpacity
            style={styles.loadMore}
            onPress={() => setTxPage((p) => p + 1)}
            disabled={transactionsQuery.isFetching}
          >
            <Text style={[styles.loadMoreText, { color: colors.primary }]}>
              {transactionsQuery.isFetching ? "..." : t("providerDashboard.earnings.loadMore")}
            </Text>
          </TouchableOpacity>
        )}

        {/* Export */}
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Ionicons name="download-outline" size={20} color={colors.primary} />
          <Text style={[styles.exportButtonText, { color: colors.primary }]}>{t("providerDashboard.earnings.exportData")}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Withdrawal request modal (MDB-452) */}
      <Modal visible={withdrawVisible} transparent animationType="fade" onRequestClose={() => setWithdrawVisible(false)}>
        <View style={styles.withdrawBackdrop}>
          <View style={[styles.withdrawCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.withdrawTitle, { color: colors.textPrimary }]}>
              {t("providerDashboard.earnings.withdrawTitle")}
            </Text>
            <Text style={[styles.withdrawHint, { color: colors.textSecondary }]}>
              {t("providerDashboard.earnings.balanceAvailable")}: {formatCurrency(availableBalance)}
            </Text>
            <TextInput
              style={[styles.withdrawInput, { color: colors.textPrimary, borderColor: colors.border }]}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              editable={!withdrawing}
            />
            <Text style={[styles.withdrawNote, { color: colors.textTertiary }]}>
              {t("providerDashboard.earnings.withdrawCommissionNote")}
            </Text>
            <View style={styles.withdrawActions}>
              <TouchableOpacity
                style={styles.withdrawCancel}
                onPress={() => setWithdrawVisible(false)}
                disabled={withdrawing}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.withdrawConfirm, { backgroundColor: colors.primary }]}
                onPress={handleWithdraw}
                disabled={withdrawing}
              >
                {withdrawing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.withdrawConfirmText}>{t("providerDashboard.earnings.withdrawConfirm")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TransactionItem({ transaction, colors }: { transaction: ProviderEarningsTransaction; colors: ThemeColors }) {
  const isIncome = transaction.type === "income";
  const isRefund = transaction.type === "refund";
  const desc =
    transaction.type === "income"
      ? t("providerDashboard.earnings.serviceCompleted")
      : transaction.type === "refund"
        ? t("providerDashboard.earnings.refundIssued")
        : t("providerDashboard.earnings.withdrawalToAccount");
  const displayName = isIncome || isRefund ? transaction.clientName : transaction.serviceName || "—";
  const amountStr = isIncome ? `+${formatCurrency(transaction.amount)}` : `-${formatCurrency(transaction.amount)}`;
  const statusStyle =
    transaction.status === "completed"
      ? { bg: STATUS_COMPLETED_BG, text: STATUS_COMPLETED_TEXT }
      : transaction.status === "refunded"
        ? { bg: STATUS_REFUNDED_BG, text: STATUS_REFUNDED_TEXT }
        : transaction.status === "processing"
          ? { bg: STATUS_PROCESSING_BG, text: STATUS_PROCESSING_TEXT }
          : { bg: STATUS_PENDING_BG, text: STATUS_PENDING_TEXT };
  const statusLabel =
    transaction.status === "completed"
      ? t("providerDashboard.earnings.statusCompleted")
      : transaction.status === "refunded"
        ? t("providerDashboard.earnings.statusRefunded")
        : transaction.status === "processing"
          ? t("providerDashboard.earnings.statusProcessing")
          : t("providerDashboard.earnings.statusPending");

  return (
    <View style={[styles.txItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View
        style={[
          styles.txIconWrap,
          { backgroundColor: isIncome ? STATUS_COMPLETED_BG : STATUS_REFUNDED_BG },
        ]}
      >
        <Ionicons
          name={isIncome ? "arrow-down" : "arrow-up"}
          size={18}
          color={isIncome ? STATUS_COMPLETED_TEXT : STATUS_REFUNDED_TEXT}
        />
      </View>
      <View style={styles.txBody}>
        <Text style={[styles.txDesc, { color: colors.textPrimary }]}>{desc}</Text>
        <Text style={[styles.txClient, { color: colors.textSecondary }]}>{displayName}</Text>
        {isIncome && transaction.serviceName ? (
          <Text style={[styles.txService, { color: colors.textSecondary }]}>{transaction.serviceName}</Text>
        ) : null}
        {isRefund && transaction.refundReason ? (
          <Text style={[styles.txService, { color: colors.textSecondary }]}>{transaction.refundReason}</Text>
        ) : null}
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isIncome ? STATUS_COMPLETED_TEXT : STATUS_REFUNDED_TEXT }]}>
          {amountStr}
        </Text>
        <View style={[styles.txBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.txBadgeText, { color: statusStyle.text }]}>{statusLabel}</Text>
        </View>
        <Text style={[styles.txTime, { color: colors.textSecondary }]}>{formatTransactionDate(transaction.date)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  header: { marginBottom: 16 },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  balanceCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  balanceLoader: { marginVertical: 8 },
  nextPayout: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 16,
  },
  balanceActions: { flexDirection: "row", gap: 12 },
  balanceButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
  },
  balanceButtonText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  periodTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  periodTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  statCardFirst: {},
  statCardLast: {},
  statLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartLabel: {
    fontSize: 12,
    marginBottom: 12,
  },
  chartLoader: { height: 96, justifyContent: "center" },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 96,
    gap: 8,
  },
  chartBarWrap: { flex: 1, height: "100%", justifyContent: "flex-end" },
  chartBar: {
    width: "100%",
    minHeight: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    overflow: "hidden",
  },
  chartDays: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  chartDayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
  },
  txFilterRow: { marginBottom: 12 },
  sectionLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  txFilterChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  txFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  txFilterChipText: { fontSize: 12, fontWeight: "500" },
  txLoader: { paddingVertical: 24 },
  emptyTx: { paddingVertical: 24, alignItems: "center" },
  emptyTxText: { fontSize: 14 },
  txItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
  },
  txIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  txBody: { flex: 1, minWidth: 0 },
  txDesc: { fontSize: 14, fontWeight: "500" },
  txClient: { fontSize: 12, marginTop: 2 },
  txService: { fontSize: 11, marginTop: 1 },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 14, fontWeight: "600" },
  txBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  txBadgeText: { fontSize: 10, fontWeight: "600" },
  txTime: { fontSize: 11, marginTop: 2 },
  loadMore: {
    paddingVertical: 12,
    alignItems: "center",
  },
  loadMoreText: { fontSize: 14 },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    marginTop: 8,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  withdrawBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  withdrawCard: {
    borderRadius: 18,
    padding: 22,
  },
  withdrawTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  withdrawHint: { fontSize: 13, marginBottom: 16 },
  withdrawInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "600",
  },
  withdrawNote: { fontSize: 12, marginTop: 8, lineHeight: 16 },
  withdrawActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 20 },
  withdrawCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  withdrawConfirm: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    minWidth: 110,
    alignItems: "center",
  },
  withdrawConfirmText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
