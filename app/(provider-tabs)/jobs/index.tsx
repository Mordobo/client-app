import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import { fetchOrderDetail } from "@/services/orders";
import { getProviderActiveJobs, type ProviderActiveJob, type ProviderActiveJobStatus } from "@/services/providerDashboard";
import type { ThemeColors } from "@/utils/themeStyles";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FILTER_ACTIVE_GRADIENT = ["#6366F1", "#8B5CF6"];
const FILTER_INACTIVE_BG = "rgba(255,255,255,0.05)";
const STATUS_PENDING_BG = "rgba(245, 158, 11, 0.15)";
const STATUS_PENDING_TEXT = "#FBBF24";
const STATUS_IN_PROGRESS_BG = "rgba(139, 92, 246, 0.15)";
const STATUS_IN_PROGRESS_TEXT = "#A78BFA";
const STATUS_ON_WAY_BG = "rgba(59, 130, 246, 0.15)";
const STATUS_ON_WAY_TEXT = "#60A5FA";
const ETA_REFETCH_MS = 60 * 1000;

type FilterType = "pending" | "in_progress" | "scheduled";

function formatCurrency(value: number): string {
  const str = value % 1 === 0 ? String(value) : value.toFixed(2);
  return "$" + str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function sortByPriority(jobs: ProviderActiveJob[]): ProviderActiveJob[] {
  const order: Record<ProviderActiveJobStatus, number> = {
    in_progress: 0,
    on_way: 1,
    scheduled: 2,
    pending: 3,
  };
  return [...jobs].sort((a, b) => order[a.status] - order[b.status]);
}

function getFilteredJobs(jobs: ProviderActiveJob[], filter: FilterType): ProviderActiveJob[] {
  const sorted = sortByPriority(jobs);
  if (filter === "pending") {
    return sorted.filter((j) => j.status === "pending");
  }
  if (filter === "in_progress") {
    return sorted.filter((j) => j.status === "in_progress" || j.status === "on_way");
  }
  return sorted.filter((j) => j.status === "scheduled");
}

function JobStatusBadge({ status }: { status: ProviderActiveJobStatus }) {
  const config = {
    pending: { label: t("providerDashboard.statusPending"), bg: STATUS_PENDING_BG, text: STATUS_PENDING_TEXT },
    in_progress: { label: t("providerDashboard.statusInProgress"), bg: STATUS_IN_PROGRESS_BG, text: STATUS_IN_PROGRESS_TEXT },
    on_way: { label: t("providerDashboard.statusOnTheWay"), bg: STATUS_ON_WAY_BG, text: STATUS_ON_WAY_TEXT },
    scheduled: { label: t("providerDashboard.filterScheduled"), bg: STATUS_ON_WAY_BG, text: STATUS_ON_WAY_TEXT },
    pending_review: { label: t("orders.status.pending_review"), bg: STATUS_IN_PROGRESS_BG, text: STATUS_IN_PROGRESS_TEXT },
  };
  const c = config[status] ?? config.pending;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

function JobCard({ job, onChat, onCall, onDetails, colors }: { job: ProviderActiveJob; onChat: (job: ProviderActiveJob) => void; onCall: (job: ProviderActiveJob) => void; onDetails: (job: ProviderActiveJob) => void; colors: ThemeColors }) {
  const isScheduled = job.status === "scheduled";
  const isPendingReview = job.status === "pending_review";
  const timeLabel =
    isPendingReview
      ? t("providerDashboard.completeJob.waitingForClientReview")
      : isScheduled ?
      job.scheduledAt ?
        new Date(job.scheduledAt).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })
      : "—"
    : job.etaMinutes != null ?
      job.etaMinutes <= 60 ?
        t("providerDashboard.etaArrival", { time: `${job.etaMinutes} min` })
      : t("providerDashboard.remainingTime", {
          time: `${Math.floor(job.etaMinutes / 60)}h ${job.etaMinutes % 60}min`,
        })
    : "—";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={22} color={colors.textTertiary} />
            </View>
            <View>
              <Text style={[styles.clientName, { color: colors.textPrimary }]}>{job.clientName}</Text>
              <Text style={styles.serviceName}>{job.serviceName}</Text>
            </View>
          </View>
          <Text style={styles.price}>{formatCurrency(job.agreedPrice)}</Text>
        </View>
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.address, { color: colors.textTertiary }]} numberOfLines={1}>
            {job.address}
          </Text>
        </View>
        <View style={styles.statusRow}>
          {job.status !== "scheduled" && <JobStatusBadge status={job.status} />}
          <Text style={[styles.timeLabel, { color: colors.textTertiary }]}>{timeLabel}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.footerBtn} onPress={() => onChat(job)} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.textTertiary} />
          <Text style={[styles.footerBtnText, { color: colors.textTertiary }]}>{t("providerDashboard.chat")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerBtn, styles.footerBtnBorder]} onPress={() => onCall(job)} activeOpacity={0.7}>
          <Ionicons name="call-outline" size={18} color={colors.textTertiary} />
          <Text style={[styles.footerBtnText, { color: colors.textTertiary }]}>{t("providerDashboard.call")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerBtn, styles.footerBtnBorder]} onPress={() => onDetails(job)} activeOpacity={0.7}>
          <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          <Text style={[styles.footerBtnText, styles.footerBtnTextAccent, { color: colors.primary }]}>{t("providerDashboard.viewDetails")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ProviderJobsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeColors();
  const [filter, setFilter] = useState<FilterType>("pending");
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: rawJobs = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["providerActiveJobs"],
    queryFn: getProviderActiveJobs,
    refetchInterval: ETA_REFETCH_MS,
    staleTime: 30 * 1000,
  });

  const jobs = useMemo(() => rawJobs, [rawJobs]);

  const filteredJobs = useMemo(() => getFilteredJobs(jobs, filter), [jobs, filter]);
  const pendingCount = useMemo(() => jobs.filter((j) => j.status === "pending").length, [jobs]);
  const inProgressCount = useMemo(() => jobs.filter((j) => j.status === "in_progress" || j.status === "on_way").length, [jobs]);
  const scheduledCount = useMemo(() => jobs.filter((j) => j.status === "scheduled").length, [jobs]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCall = React.useCallback((job: ProviderActiveJob) => {
    const url =
      job.clientPhone ?
        job.clientPhone.startsWith("+") ?
          `tel:${job.clientPhone}`
        : `tel:${job.clientPhone}`
      : null;
    if (url) Linking.openURL(url);
  }, []);

  const handleChat = React.useCallback(
    async (job: ProviderActiveJob) => {
      try {
        const detail = await fetchOrderDetail(job.orderId);
        if (detail.conversation_id) {
          router.push(`/chat/${detail.conversation_id}`);
        } else {
          Alert.alert(t("common.error"), t("chat.conversationNotFound"));
        }
      } catch (err) {
        console.error("[ProviderJobs] Failed to open chat:", err);
        Alert.alert(t("common.error"), t("errors.requestFailed"));
      }
    },
    [router],
  );

  const handleDetails = React.useCallback(
    (job: ProviderActiveJob) => {
      router.push(`/(provider-tabs)/jobs/${job.id}`);
    },
    [router],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 80, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t("providerDashboard.jobsScreenTitle")}</Text>
      </View>

      <View style={styles.filters}>
        {(["pending", "in_progress", "scheduled"] as FilterType[]).map((f) => {
          const label =
            f === "pending"
              ? `${t("providerDashboard.filterPending")} (${pendingCount})`
              : f === "in_progress"
                ? `${t("providerDashboard.filterInProgress")} (${inProgressCount})`
                : `${t("providerDashboard.filterScheduled")} (${scheduledCount})`;
          const isActive = filter === f;
          return isActive ? (
            <TouchableOpacity key={f} onPress={() => setFilter(f)} activeOpacity={0.8} style={styles.filterBtnWrapper}>
              <LinearGradient colors={FILTER_ACTIVE_GRADIENT as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.filterBtn}>
                <Text style={[styles.filterBtnText, styles.filterBtnTextActive, { color: colors.textPrimary }]}>{label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity key={f} style={styles.filterBtn} onPress={() => setFilter(f)} activeOpacity={0.8}>
              <Text style={[styles.filterBtnText, { color: colors.textTertiary }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ?
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      : filteredJobs.length === 0 ?
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t("providerDashboard.emptyActiveJobs")}</Text>
        </View>
      : <FlatList data={filteredJobs} keyExtractor={(item) => item.id} renderItem={({ item }) => <JobCard job={item} onChat={handleChat} onCall={handleCall} onDetails={handleDetails} colors={colors} />} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing || isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingTop: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  filterBtnWrapper: {
    borderRadius: 999,
    overflow: "hidden",
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: FILTER_INACTIVE_BG,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: "500",
  },
  filterBtnTextActive: {},
  listContent: {
    paddingBottom: 16,
    gap: 8,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardBody: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(61, 51, 112, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  clientName: {
    fontSize: 16,
    fontWeight: "600",
  },
  serviceName: {
    fontSize: 14,
    color: "#A78BFA",
    marginTop: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: "#22C55E",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  address: {
    flex: 1,
    fontSize: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  timeLabel: {
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  footerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  footerBtnBorder: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.05)",
  },
  footerBtnText: {
    fontSize: 14,
    fontWeight: "500",
  },
  footerBtnTextAccent: {},
});
