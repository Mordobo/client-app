import { useThemeColors } from "@/hooks/useThemeColors";
import { getLocale, t } from "@/i18n";
import {
    getEarningsSummary,
    getEarningsTransactions,
    getProviderBankAccounts,
    type ProviderBankAccount,
    type ProviderEarningsTransaction,
} from "@/services/providerDashboard";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CARD_BORDER_PRIMARY = "rgba(34, 197, 94, 0.3)";
const GRADIENT_START = "#6366F1";
const GRADIENT_MID = "#8B5CF6";
const GRADIENT_END = "#EC4899";

function formatCurrency(value: number): string {
  const str = value % 1 === 0 ? String(value) : value.toFixed(2);
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

function formatPayoutDate(iso: string): string {
  try {
    const d = parseISO(iso);
    return format(d, "d MMM yyyy");
  } catch {
    return iso.slice(0, 10);
  }
}

type PayoutFrequency = "weekly" | "biweekly" | "monthly";

export default function ProviderPaymentMethodsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [payoutFrequency, setPayoutFrequency] = useState<PayoutFrequency>("weekly");
  const [minWithdrawal, setMinWithdrawal] = useState("100");

  const summaryQuery = useQuery({
    queryKey: ["provider-earnings-summary", "month"],
    queryFn: () => getEarningsSummary({ period: "month" }),
  });
  const bankAccountsQuery = useQuery({
    queryKey: ["provider-bank-accounts"],
    queryFn: getProviderBankAccounts,
  });
  const transactionsQuery = useQuery({
    queryKey: ["provider-earnings-transactions", "month", "completed"],
    queryFn: () =>
      getEarningsTransactions({
        period: "month",
        status: "completed",
        page: 1,
        limit: 10,
      }),
  });

  const summary = summaryQuery.data;
  const bankAccounts = bankAccountsQuery.data ?? [];
  const transactions = transactionsQuery.data?.transactions ?? [];
  const firstBankLabel = bankAccounts[0]
    ? `${bankAccounts[0].bankName} ${bankAccounts[0].maskedClabe}`
    : "";

  const refetch = useCallback(() => {
    summaryQuery.refetch();
    bankAccountsQuery.refetch();
    transactionsQuery.refetch();
  }, [summaryQuery, bankAccountsQuery, transactionsQuery]);

  const nextPayoutFormatted = summary?.nextPayoutDate
    ? formatNextPayout(summary.nextPayoutDate)
    : "";

  const handleEarlyWithdrawal = () => {
    Alert.alert(
      t("providerDashboard.paymentMethods.earlyWithdrawal"),
      "Coming soon",
    );
  };

  const handleAddAccount = () => {
    router.push("/provider-onboarding/bank");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityLabel={t("providerDashboard.providerSettings.back")}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t("providerDashboard.paymentMethods.title")}
        </Text>
      </View>

      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={
              summaryQuery.isRefetching ||
              bankAccountsQuery.isRefetching ||
              transactionsQuery.isRefetching
            }
            onRefresh={refetch}
            tintColor="#8B5CF6"
          />
        }
      >
        {/* Balance Card */}
        <LinearGradient
          colors={[GRADIENT_START, GRADIENT_MID, GRADIENT_END]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>
            {t("providerDashboard.paymentMethods.balanceAvailable")}
          </Text>
          {summaryQuery.isLoading ? (
            <ActivityIndicator color="#fff" size="small" style={styles.balanceLoader} />
          ) : (
            <Text style={styles.balanceAmount}>
              {formatCurrency(summary?.balance ?? 0)}
            </Text>
          )}
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.nextPayoutLabel}>
                {t("providerDashboard.paymentMethods.nextPayout")}
              </Text>
              <Text style={styles.nextPayoutDate}>{nextPayoutFormatted}</Text>
            </View>
            <TouchableOpacity
              style={styles.earlyWithdrawalButton}
              onPress={handleEarlyWithdrawal}
              activeOpacity={0.8}
            >
              <Text style={styles.earlyWithdrawalText}>
                {t("providerDashboard.paymentMethods.earlyWithdrawal")}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Bank accounts */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t("providerDashboard.paymentMethods.bankAccountsSection")}
        </Text>
        <View style={styles.bankList}>
          {bankAccountsQuery.isLoading ? (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : (
            bankAccounts.map((account) => (
              <BankAccountCard key={account.id} account={account} colors={colors} />
            ))
          )}
          <TouchableOpacity
            style={styles.addAccountButton}
            onPress={handleAddAccount}
            activeOpacity={0.8}
          >
            <Text style={styles.addAccountText}>
              + {t("providerDashboard.paymentMethods.addAccount")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Payout frequency */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t("providerDashboard.paymentMethods.payoutFrequency")}
        </Text>
        <View style={[styles.frequencyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.frequencyRow}>
            {(
              [
                { key: "weekly" as const, labelKey: "providerDashboard.paymentMethods.weekly" },
                { key: "biweekly" as const, labelKey: "providerDashboard.paymentMethods.biweekly" },
                { key: "monthly" as const, labelKey: "providerDashboard.paymentMethods.monthly" },
              ] as const
            ).map(({ key, labelKey }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.frequencyButton,
                  { backgroundColor: payoutFrequency === key ? "transparent" : colors.surfaceSecondary },
                  payoutFrequency === key && styles.frequencyButtonActive,
                ]}
                onPress={() => setPayoutFrequency(key)}
                activeOpacity={0.8}
              >
                {payoutFrequency === key ? (
                  <LinearGradient
                    colors={[GRADIENT_START, GRADIENT_MID]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, styles.frequencyGradient]}
                  />
                ) : null}
                <Text
                  style={[
                    styles.frequencyButtonText,
                    { color: payoutFrequency === key ? "#FFFFFF" : colors.textSecondary },
                    payoutFrequency === key && styles.frequencyButtonTextActive,
                  ]}
                >
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.frequencyNote, { color: colors.textTertiary }]}>
            {t("providerDashboard.paymentMethods.payoutProcessedNote")}
          </Text>
        </View>

        {/* Minimum withdrawal */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t("providerDashboard.paymentMethods.minWithdrawal")}
        </Text>
        <View style={[styles.minWithdrawalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.minWithdrawalRow}>
            <Text style={[styles.currencyPrefix, { color: colors.textTertiary }]}>$</Text>
            <TextInput
              style={[styles.minWithdrawalInput, { color: colors.textPrimary }]}
              value={minWithdrawal}
              onChangeText={setMinWithdrawal}
              keyboardType="numeric"
              placeholder="100"
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={[styles.currencySuffix, { color: colors.textTertiary }]}>
              {t("providerDashboard.paymentMethods.currency")}
            </Text>
          </View>
          <Text style={[styles.minWithdrawalHint, { color: colors.textTertiary }]}>
            {t("providerDashboard.paymentMethods.minWithdrawalHint")}
          </Text>
        </View>

        {/* Recent payouts */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t("providerDashboard.paymentMethods.recentPayouts")}
        </Text>
        {transactionsQuery.isLoading ? (
          <View style={[styles.payoutItem, { backgroundColor: colors.card }]}>
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
        ) : transactions.length === 0 ? (
          <View style={[styles.payoutItem, { backgroundColor: colors.card }]}>
            <Text style={[styles.noPayouts, { color: colors.textSecondary }]}>
              {t("providerDashboard.paymentMethods.noPayouts")}
            </Text>
          </View>
        ) : (
          transactions
            .filter((tx) => tx.type === "income" && tx.status === "completed")
            .slice(0, 5)
            .map((tx) => (
              <PayoutItem
                key={tx.id}
                transaction={tx}
                destinationLabel={firstBankLabel}
                colors={colors}
              />
            ))
        )}
      </ScrollView>
    </View>
  );
}

function BankAccountCard({
  account,
  colors: themeColors,
}: {
  account: ProviderBankAccount;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View
      style={[
        styles.bankCard,
        { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder },
        account.primary && styles.bankCardPrimary,
      ]}
    >
      <View style={[styles.bankIconBox, { backgroundColor: themeColors.surfaceSecondary }]}>
        <Ionicons name="business-outline" size={24} color={themeColors.icon} />
      </View>
      <View style={styles.bankCardBody}>
        <View style={styles.bankCardTitleRow}>
          <Text style={[styles.bankName, { color: themeColors.textPrimary }]}>{account.bankName}</Text>
          {account.primary && (
            <View style={styles.primaryBadge}>
              <Text style={styles.primaryBadgeText}>
                {t("providerDashboard.paymentMethods.primary")}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.bankMasked, { color: themeColors.textSecondary }]}>{account.maskedClabe}</Text>
      </View>
      <TouchableOpacity hitSlop={12}>
        <Ionicons name="ellipsis-vertical" size={20} color={themeColors.iconSecondary} />
      </TouchableOpacity>
    </View>
  );
}

function PayoutItem({
  transaction,
  destinationLabel,
  colors: themeColors,
}: {
  transaction: ProviderEarningsTransaction;
  destinationLabel: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={[styles.payoutItem, { backgroundColor: themeColors.card }]}>
      <View style={styles.payoutItemLeft}>
        <View style={styles.payoutIconWrap}>
          <Ionicons name="checkmark" size={14} color="#22C55E" />
        </View>
        <View>
          <Text style={[styles.payoutDate, { color: themeColors.textPrimary }]}>
            {formatPayoutDate(transaction.date)}
          </Text>
          <Text style={[styles.payoutDestination, { color: themeColors.textSecondary }]}>
            {destinationLabel || "—"}
          </Text>
        </View>
      </View>
      <Text style={styles.payoutAmount}>
        {formatCurrency(transaction.amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
  },
  balanceCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  balanceLoader: { marginVertical: 8 },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nextPayoutLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  nextPayoutDate: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
  earlyWithdrawalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  earlyWithdrawalText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  bankList: { marginBottom: 20 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  bankCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  bankCardPrimary: {
    borderColor: CARD_BORDER_PRIMARY,
  },
  bankIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bankCardBody: { flex: 1 },
  bankCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bankName: { fontSize: 14, fontWeight: "500" },
  primaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#22C55E",
  },
  bankMasked: {
    fontSize: 14,
    marginTop: 2,
  },
  addAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  addAccountText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8B5CF6",
  },
  frequencyCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  frequencyRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  frequencyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  frequencyButtonActive: {
    backgroundColor: "transparent",
  },
  frequencyGradient: {
    borderRadius: 8,
  },
  frequencyButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  frequencyButtonTextActive: {
    color: "#fff",
  },
  frequencyNote: {
    fontSize: 12,
  },
  minWithdrawalCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  minWithdrawalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  currencyPrefix: { fontSize: 18 },
  minWithdrawalInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "500",
    padding: 0,
  },
  currencySuffix: { fontSize: 14 },
  minWithdrawalHint: {
    fontSize: 12,
    marginTop: 8,
  },
  payoutItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  payoutItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  payoutIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  payoutDate: { fontSize: 14, fontWeight: "500" },
  payoutDestination: {
    fontSize: 12,
    marginTop: 2,
  },
  payoutAmount: { fontSize: 14, fontWeight: "500", color: "#22C55E" },
  noPayouts: {
    fontSize: 14,
    paddingVertical: 16,
  },
});
