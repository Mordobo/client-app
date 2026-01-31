import { getLocale, t } from "@/i18n";
import {
  exportEarnings,
  getEarningsChart,
  getEarningsSummary,
  getEarningsTransactions,
  type EarningsPeriod,
  type ProviderEarningsTransaction,
} from "@/services/providerDashboard";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { enUS, es } from "date-fns/locale";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_BG = "#12121A";
const CARD_BG = "#1E1B2E";
const CARD_BORDER = "rgba(61, 51, 112, 0.3)";
const GRADIENT_START = "#6366F1";
const GRADIENT_MID = "#8B5CF6";
const GRADIENT_END = "#EC4899";
const STATUS_COMPLETED_BG = "rgba(34, 197, 94, 0.15)";
const STATUS_COMPLETED_TEXT = "#22C55E";
const STATUS_PENDING_BG = "rgba(251, 191, 36, 0.15)";
const STATUS_PENDING_TEXT = "#FBBF24";
const STATUS_PROCESSING_BG = "rgba(139, 92, 246, 0.15)";
const STATUS_PROCESSING_TEXT = "#8B5CF6";

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
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
    const dayStr = d.toISOString().slice(0, 10);
    if (dayStr === today) {
      return format(d, "HH:mm");
    }
    if (dayStr === yesterdayStr) {
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
  const [period, setPeriod] = useState<EarningsPeriod>("month");
  const [txPage, setTxPage] = useState(1);
  const [txStatusFilter, setTxStatusFilter] = useState<"all" | "completed" | "pending" | "processing">("all");
  const [accumulatedTx, setAccumulatedTx] = useState<ProviderEarningsTransaction[]>([]);

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

  const maxChartValue = useMemo(() => {
    const max = Math.max(...chartData.map((p) => p.total), 1);
    return max;
  }, [chartData]);

  const nextPayoutFormatted = summary?.nextPayoutDate
    ? formatNextPayout(summary.nextPayoutDate)
    : "";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={summaryQuery.isRefetching || chartQuery.isRefetching}
            onRefresh={refetch}
            tintColor="#8B5CF6"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("providerDashboard.earnings.title")}</Text>
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
              onPress={() => Alert.alert(t("providerDashboard.earnings.withdraw"), "Coming soon")}
            >
              <Text style={styles.balanceButtonText}>{t("providerDashboard.earnings.withdraw")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.balanceButton} onPress={() => setTxPage(1)}>
              <Text style={styles.balanceButtonText}>{t("providerDashboard.earnings.history")}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Period Tabs */}
        <View style={styles.periodTabs}>
          {PERIOD_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.periodTab, period === tab.key && styles.periodTabActive]}
              onPress={() => setPeriod(tab.key)}
            >
              <Text style={[styles.periodTabText, period === tab.key && styles.periodTabTextActive]}>
                {t(`providerDashboard.earnings.${tab.labelKey}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardFirst]}>
            <Text style={styles.statLabel}>{t("providerDashboard.earnings.periodToday")}</Text>
            <Text style={styles.statValue}>{formatCurrency(summary?.todayEarnings ?? 0)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t("providerDashboard.earnings.periodWeek")}</Text>
            <Text style={styles.statValue}>{formatCurrency(summary?.weekEarnings ?? 0)}</Text>
          </View>
          <View style={[styles.statCard, styles.statCardLast]}>
            <Text style={styles.statLabel}>{t("providerDashboard.earnings.periodMonth")}</Text>
            <Text style={styles.statValue}>{formatCurrency(summary?.monthEarnings ?? 0)}</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartLabel}>{t("providerDashboard.earnings.chartLast7Days")}</Text>
          {chartQuery.isLoading ? (
            <ActivityIndicator color="#8B5CF6" size="small" style={styles.chartLoader} />
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
              <Text key={i} style={styles.chartDayLabel}>
                {d}
              </Text>
            ))}
          </View>
        </View>

        {/* Transaction filters */}
        <View style={styles.txFilterRow}>
          <Text style={styles.sectionLabel}>{t("providerDashboard.earnings.recentTransactions")}</Text>
          <View style={styles.txFilterChips}>
            {(["all", "completed", "pending", "processing"] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.txFilterChip,
                  txStatusFilter === status && styles.txFilterChipActive,
                ]}
                onPress={() => {
                  setTxStatusFilter(status);
                  setTxPage(1);
                }}
              >
                <Text
                  style={[
                    styles.txFilterChipText,
                    txStatusFilter === status && styles.txFilterChipTextActive,
                  ]}
                >
                  {status === "all"
                    ? t("providerDashboard.earnings.filterAll")
                    : t(`providerDashboard.earnings.status${status.charAt(0).toUpperCase() + status.slice(1)}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transaction list */}
        {transactionsQuery.isLoading && txPage === 1 ? (
          <ActivityIndicator color="#8B5CF6" size="small" style={styles.txLoader} />
        ) : transactions.length === 0 ? (
          <View style={styles.emptyTx}>
            <Text style={styles.emptyTxText}>{t("providerDashboard.earnings.noTransactions")}</Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} />
          ))
        )}
        {hasMoreTx && (
          <TouchableOpacity
            style={styles.loadMore}
            onPress={() => setTxPage((p) => p + 1)}
            disabled={transactionsQuery.isFetching}
          >
            <Text style={styles.loadMoreText}>
              {transactionsQuery.isFetching ? "..." : t("providerDashboard.earnings.loadMore")}
            </Text>
          </TouchableOpacity>
        )}

        {/* Export */}
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Ionicons name="download-outline" size={20} color="#8B5CF6" />
          <Text style={styles.exportButtonText}>{t("providerDashboard.earnings.exportData")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function TransactionItem({ transaction }: { transaction: ProviderEarningsTransaction }) {
  const isIncome = transaction.type === "income";
  const desc =
    transaction.type === "income"
      ? t("providerDashboard.earnings.serviceCompleted")
      : t("providerDashboard.earnings.withdrawalToAccount");
  const displayName = isIncome ? transaction.clientName : transaction.serviceName || "—";
  const amountStr = isIncome ? `+${formatCurrency(transaction.amount)}` : `-${formatCurrency(transaction.amount)}`;
  const statusStyle =
    transaction.status === "completed"
      ? { bg: STATUS_COMPLETED_BG, text: STATUS_COMPLETED_TEXT }
      : transaction.status === "processing"
        ? { bg: STATUS_PROCESSING_BG, text: STATUS_PROCESSING_TEXT }
        : { bg: STATUS_PENDING_BG, text: STATUS_PENDING_TEXT };
  const statusLabel =
    transaction.status === "completed"
      ? t("providerDashboard.earnings.statusCompleted")
      : transaction.status === "processing"
        ? t("providerDashboard.earnings.statusProcessing")
        : t("providerDashboard.earnings.statusPending");

  return (
    <View style={styles.txItem}>
      <View
        style={[
          styles.txIconWrap,
          { backgroundColor: isIncome ? STATUS_COMPLETED_BG : "rgba(239, 68, 68, 0.15)" },
        ]}
      >
        <Text style={styles.txIconText}>{isIncome ? "↓" : "↑"}</Text>
      </View>
      <View style={styles.txBody}>
        <Text style={styles.txDesc}>{desc}</Text>
        <Text style={styles.txClient}>{displayName}</Text>
        {isIncome && transaction.serviceName ? (
          <Text style={styles.txService}>{transaction.serviceName}</Text>
        ) : null}
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isIncome ? STATUS_COMPLETED_TEXT : "#EF4444" }]}>
          {amountStr}
        </Text>
        <View style={[styles.txBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.txBadgeText, { color: statusStyle.text }]}>{statusLabel}</Text>
        </View>
        <Text style={styles.txTime}>{formatTransactionDate(transaction.date)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  header: { marginBottom: 16 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
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
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  periodTabActive: {
    backgroundColor: "rgba(99, 102, 241, 0.5)",
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
  },
  periodTabTextActive: { color: "#FFFFFF" },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: "center",
  },
  statCardFirst: {},
  statCardLast: {},
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 16,
  },
  chartLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
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
    color: "rgba(255,255,255,0.3)",
  },
  txFilterRow: { marginBottom: 12 },
  sectionLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  txFilterChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  txFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  txFilterChipActive: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
  },
  txFilterChipText: { fontSize: 12, color: "rgba(255,255,255,0.6)" },
  txFilterChipTextActive: { color: "#FFFFFF" },
  txLoader: { paddingVertical: 24 },
  emptyTx: { paddingVertical: 24, alignItems: "center" },
  emptyTxText: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  txItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    marginBottom: 8,
    gap: 12,
  },
  txIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  txIconText: { fontSize: 16, color: "#22C55E" },
  txBody: { flex: 1, minWidth: 0 },
  txDesc: { fontSize: 14, color: "#FFFFFF", fontWeight: "500" },
  txClient: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  txService: { fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 14, fontWeight: "600" },
  txBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  txBadgeText: { fontSize: 10, fontWeight: "600" },
  txTime: { fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 },
  loadMore: {
    paddingVertical: 12,
    alignItems: "center",
  },
  loadMoreText: { color: "#8B5CF6", fontSize: 14 },
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
    color: "#8B5CF6",
  },
});
