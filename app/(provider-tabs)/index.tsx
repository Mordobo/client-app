import { useAuth } from "@/contexts/AuthContext";
import { useAvailability } from "@/contexts/AvailabilityContext";
import { t } from "@/i18n";
import { ApiError } from "@/services/auth";
import { acceptOrder, getDashboardRequests, getDashboardSchedule, getDashboardStats, rejectOrder, type ProviderDashboardRequest, type ProviderDashboardScheduleItem, type ProviderDashboardStats } from "@/services/providerDashboard";
import { getProviderProfile } from "@/services/providers";
import { getProfileImageUrl } from "@/utils/profileImage";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CARD_BG = "#1E1B2E";
const CARD_BORDER = "rgba(61, 51, 112, 0.3)";
const SCREEN_BG = "#12121A";

function formatCurrency(value: number | null | undefined): string {
  const num = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  const str = num % 1 === 0 ? String(num) : num.toFixed(2);
  return "$" + str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatScheduleTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${am ? "AM" : "PM"}`;
}

function GreenDotPulse() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }), Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true })]));
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return <Animated.View style={[styles.greenDot, { opacity }]} />;
}

function AvailabilityToggle({ value, onValueChange, disabled }: { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }) {
  const translateX = useRef(new Animated.Value(value ? 20 : 0)).current;
  useEffect(() => {
    Animated.timing(translateX, { toValue: value ? 20 : 0, duration: 200, useNativeDriver: true }).start();
  }, [value, translateX]);
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.toggleTrack, value ? styles.toggleTrackActive : styles.toggleTrackInactive]}>
        <TouchableOpacity activeOpacity={1} onPress={() => !disabled && onValueChange(!value)} style={styles.toggleTrackTouch}>
          <Animated.View style={[styles.toggleThumb, value ? styles.toggleThumbActive : styles.toggleThumbInactive, { transform: [{ translateX }] }]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ProviderDashboardScreen() {
  const { isAvailable, setAvailability } = useAvailability();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAuthenticated = !!user;
  const [stats, setStats] = useState<ProviderDashboardStats | null>(null);
  const [requests, setRequests] = useState<ProviderDashboardRequest[]>([]);
  const [schedule, setSchedule] = useState<ProviderDashboardScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const { data: providerProfile } = useQuery({
    queryKey: ["providerProfile"],
    queryFn: getProviderProfile,
    staleTime: 60_000,
    enabled: isAuthenticated,
  });
  const displayName = (providerProfile?.displayName ?? "").trim() || "—";
  const providerAvatarUrl = getProfileImageUrl(providerProfile?.avatarUrl ?? null) ?? null;

  const loadAll = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [statsRes, requestsRes, scheduleRes] = await Promise.all([getDashboardStats(), getDashboardRequests(), getDashboardSchedule()]);
      setStats(statsRes);
      setRequests(requestsRes.requests);
      setSchedule(scheduleRes.schedule);
    } catch (e) {
      console.error("[ProviderDashboard] loadAll error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) loadAll();
      else {
        setStats(null);
        setRequests([]);
        setSchedule([]);
        setLoading(false);
      }
    }, [loadAll, isAuthenticated]),
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      getDashboardRequests().then((r) => setRequests(r.requests));
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll();
  }, [loadAll]);

  const handleAccept = useCallback(async (id: string) => {
    setActionLoadingId(id);
    try {
      await acceptOrder(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      const message = e instanceof ApiError ? e.message : t("providerDashboard.errors.acceptFailed");
      Alert.alert(t("common.error"), message);
    } finally {
      setActionLoadingId(null);
    }
  }, []);

  const handleReject = useCallback(async (id: string) => {
    setActionLoadingId(id);
    try {
      await rejectOrder(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      const message = e instanceof ApiError ? e.message : t("providerDashboard.errors.rejectFailed");
      Alert.alert(t("common.error"), message);
    } finally {
      setActionLoadingId(null);
    }
  }, []);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 80 }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#25A870" />} showsVerticalScrollIndicator={false}>
        {/* Header: green gradient matching preview (linear-gradient 135deg #1B8B5E → #25A870) */}
        <LinearGradient colors={["#1B8B5E", "#25A870"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeLabel}>{t("providerDashboard.welcome")}</Text>
              <Text style={styles.welcomeName}>{displayName || "—"}</Text>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.bellIcon} onPress={() => router.push("/(provider-tabs)/notifications")} activeOpacity={0.8} accessibilityLabel={t("providerDashboard.providerNotifications.title")}>
                <Ionicons name="notifications-outline" size={24} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileIcon} onPress={() => router.push("/(provider-tabs)/profile")} activeOpacity={0.8} accessibilityLabel={t("providerDashboard.providerProfile.screenTitle")}>
                {providerAvatarUrl ?
                  <Image source={{ uri: providerAvatarUrl }} style={styles.profileAvatar} contentFit="contain" />
                : <Ionicons name="person" size={24} color="rgba(255,255,255,0.5)" />}
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.availabilityCard, !isAvailable && styles.availabilityCardOff]}>
            <View style={styles.availabilityLeft}>
              {isAvailable && <GreenDotPulse />}
              <Text style={[styles.availabilityText, !isAvailable && styles.availabilityTextOff]}>{t(isAvailable ? "providerDashboard.youAreAvailable" : "providerDashboard.youAreUnavailable")}</Text>
            </View>
            <AvailabilityToggle value={isAvailable} onValueChange={setAvailability} />
          </View>
        </LinearGradient>

        {loading ?
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#25A870" />
          </View>
        : <View style={styles.body}>
            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardFirst]}>
                <Text style={styles.statLabel}>{t("providerDashboard.today")}</Text>
                <Text style={[styles.statValue, { color: "#F59E0B" }]}>{stats ? formatCurrency(stats.todayEarnings) : "$0"}</Text>
                <Text style={styles.statSub}>{stats?.todayJobs === 1 ? t("providerDashboard.job", { count: stats.todayJobs }) : t("providerDashboard.jobs", { count: stats?.todayJobs ?? 0 })}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>{t("providerDashboard.thisWeek")}</Text>
                <Text style={[styles.statValue, { color: "#22C55E" }]}>{stats ? formatCurrency(stats.weekEarnings) : "$0"}</Text>
                <Text style={styles.statSub}>{stats?.weekJobs === 1 ? t("providerDashboard.job", { count: stats.weekJobs }) : t("providerDashboard.jobs", { count: stats?.weekJobs ?? 0 })}</Text>
              </View>
              <View style={[styles.statCard, styles.statCardLast]}>
                <Text style={styles.statLabel}>{t("providerDashboard.rating")}</Text>
                <Text style={[styles.statValue, { color: "#FFFFFF" }]}>{stats?.averageRating?.toFixed(1) ?? "0.0"}</Text>
                <Text style={styles.statSub}>⭐ {t("providerDashboard.reviews", { count: stats?.reviewCount ?? 0 })}</Text>
              </View>
            </View>

            {/* New requests */}
            <View style={styles.sectionHead}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>{t("providerDashboard.newRequests")}</Text>
                {requests.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t("providerDashboard.newCount", { count: requests.length })}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.seeAllLink} onPress={() => router.push("/(provider-tabs)/requests")} activeOpacity={0.7}>
                <Text style={styles.seeAllLinkText}>{t("providerDashboard.requestsScreenTitle")}</Text>
                <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
            {requests.length === 0 ?
              <View style={styles.card}>
                <Text style={styles.emptyText}>{t("providerDashboard.emptyRequests")}</Text>
              </View>
            : requests.slice(0, 3).map((req) => (
                <View key={req.id} style={styles.requestCard}>
                  <View style={styles.requestRow}>
                    <View style={styles.requestLeft}>
                      <Text style={styles.requestClient}>{req.clientName}</Text>
                      <Text style={styles.requestService}>{req.serviceName}</Text>
                      <Text style={styles.requestMeta}>📍 {req.address ? req.address.slice(0, 30) + (req.address.length > 30 ? "…" : "") : "—"}</Text>
                    </View>
                    <View style={styles.requestRight}>
                      <Text style={styles.requestPrice}>{req.quoteTotal != null ? formatCurrency(req.quoteTotal) : "—"}</Text>
                      <Text style={styles.requestTime}>{req.scheduledAt ? formatScheduleTime(req.scheduledAt) : "—"}</Text>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(req.id)} disabled={actionLoadingId === req.id}>
                      {actionLoadingId === req.id ?
                        <ActivityIndicator size="small" color="#F87171" />
                      : <Text style={styles.rejectBtnText}>{t("providerDashboard.reject")}</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(req.id)} disabled={actionLoadingId === req.id}>
                      {actionLoadingId === req.id ?
                        <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.acceptBtnText}>{t("providerDashboard.accept")}</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            }

            {/* Today's schedule */}
            <Text style={[styles.sectionTitle, styles.scheduleTitle]}>{t("providerDashboard.todaySchedule")}</Text>
            {schedule.length === 0 ?
              <View style={styles.card}>
                <Text style={styles.emptyText}>{t("providerDashboard.emptySchedule")}</Text>
              </View>
            : schedule.map((item) => (
                <View key={item.id} style={styles.scheduleCard}>
                  <View style={styles.scheduleTimeBlock}>
                    <Text style={styles.scheduleTime}>{item.scheduledAt ? formatScheduleTime(item.scheduledAt).replace(/\s*(AM|PM)$/, "") : "—"}</Text>
                    <Text style={styles.scheduleAmPm}>
                      {item.scheduledAt ?
                        new Date(item.scheduledAt).getHours() < 12 ?
                          "AM"
                        : "PM"
                      : ""}
                    </Text>
                  </View>
                  <View style={styles.scheduleInfo}>
                    <Text style={styles.scheduleService}>{item.serviceName}</Text>
                    <Text style={styles.scheduleClient}>{item.clientName}</Text>
                    <Text style={styles.scheduleAddress}>📍 {item.address || "—"}</Text>
                  </View>
                  <View style={styles.scheduleBadge}>
                    <Text style={styles.scheduleBadgeText}>{t("providerDashboard.inTime", { time: "2h" })}</Text>
                  </View>
                </View>
              ))
            }
          </View>
        }
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  welcomeLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  welcomeName: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bellIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  availabilityCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  availabilityCardOff: {
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  availabilityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  greenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4ADE80",
  },
  availabilityText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  availabilityTextOff: {
    color: "rgba(255,255,255,0.7)",
  },
  toggleRow: {
    marginLeft: 8,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: "#4ADE80",
  },
  toggleTrackInactive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  toggleTrackTouch: {
    flex: 1,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  toggleThumbActive: {
    backgroundColor: "#FFFFFF",
  },
  toggleThumbInactive: {
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
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
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    marginTop: 4,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  seeAllLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllLinkText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8B5CF6",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  badge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 20,
  },
  emptyText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingVertical: 4,
  },
  requestCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 20,
  },
  requestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  requestLeft: { flex: 1 },
  requestRight: { alignItems: "flex-end" },
  requestClient: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  requestService: {
    color: "#22C55E",
    fontSize: 14,
  },
  requestMeta: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 4,
  },
  requestPrice: {
    color: "#FACC15",
    fontSize: 18,
    fontWeight: "700",
  },
  requestTime: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
  },
  requestActions: {
    flexDirection: "row",
    gap: 12,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  rejectBtnText: {
    color: "#F87171",
    fontSize: 14,
    fontWeight: "500",
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  acceptBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  scheduleTitle: {
    marginBottom: 12,
  },
  scheduleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 12,
    gap: 16,
  },
  scheduleTimeBlock: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(61, 51, 112, 0.3)",
    alignItems: "center",
    minWidth: 56,
  },
  scheduleTime: {
    color: "#60A5FA",
    fontSize: 18,
    fontWeight: "700",
  },
  scheduleAmPm: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleService: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  scheduleClient: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  scheduleAddress: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
  },
  scheduleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(251, 146, 60, 0.15)",
  },
  scheduleBadgeText: {
    color: "#FB923C",
    fontSize: 12,
    fontWeight: "500",
  },
});
