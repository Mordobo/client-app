import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/i18n";
import {
    acceptOrder,
    getDashboardRequestCounts,
    getDashboardRequests,
    rejectOrder,
    type ProviderDashboardRequest,
    type ProviderRequestStatusFilter,
} from "@/services/providerDashboard";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_BG = "#12121A";
const CARD_BG = "#1E1B2E";
const CARD_BORDER = "rgba(61, 51, 112, 0.3)";
const CARD_BORDER_URGENT = "rgba(251, 146, 60, 0.3)";
const TAB_ACTIVE_GRADIENT = { start: "#6366F1", end: "#8B5CF6" };
const TAB_INACTIVE_BG = "rgba(255,255,255,0.05)";

function formatCurrency(value: number | null | undefined): string {
  const num = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  const str = num % 1 === 0 ? String(num) : num.toFixed(2);
  return "$" + str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatTimeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return "—";
  if (diffMin < 60) return t("providerDashboard.timeAgoMinutes", { count: diffMin });
  if (diffH < 24) return t("providerDashboard.timeAgoHours", { count: diffH });
  return t("providerDashboard.timeAgoDays", { count: diffD });
}

type TabKey = ProviderRequestStatusFilter;

const TABS: { key: TabKey; labelKey: string; labelWithCountKey?: string }[] = [
  { key: "new", labelKey: "providerDashboard.tabNew", labelWithCountKey: "providerDashboard.tabNewWithCount" },
  { key: "pending", labelKey: "providerDashboard.tabPending" },
  { key: "all", labelKey: "providerDashboard.tabAll" },
];

function RequestCard({
  item,
  onAccept,
  onDecline,
  loading,
}: {
  item: ProviderDashboardRequest;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  loading: boolean;
}) {
  const canAcceptDecline = item.status === "pending";
  const showActions = canAcceptDecline && item.id;
  const borderColor = item.isUrgent ? CARD_BORDER_URGENT : CARD_BORDER;
  const distanceText = item.address ? `${item.address.slice(0, 25)}${item.address.length > 25 ? "…" : ""}` : "—";

  return (
    <View style={[styles.card, { borderColor }]}>
      <View style={styles.cardRow}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={22} color="rgba(255,255,255,0.6)" />
        </View>
        <View style={styles.cardMain}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.clientName} numberOfLines={1}>
              {item.clientName || "—"}
            </Text>
            {item.isUrgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>{t("providerDashboard.urgent")}</Text>
              </View>
            )}
          </View>
          <Text style={styles.serviceName}>{item.serviceName || "—"}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>📍 {distanceText}</Text>
            <Text style={styles.metaText}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </View>
        <Text style={styles.price}>{item.quoteTotal != null ? formatCurrency(item.quoteTotal) : "—"}</Text>
      </View>
      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={() => onDecline(item.id)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#F87171" />
            ) : (
              <Text style={styles.declineBtnText}>{t("providerDashboard.reject")}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => onAccept(item.id)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.acceptBtnText}>{t("providerDashboard.accept")}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function ProviderRequestsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isAuthenticated = !!user;
  const [activeTab, setActiveTab] = useState<TabKey>("new");
  const [requests, setRequests] = useState<ProviderDashboardRequest[]>([]);
  const [counts, setCounts] = useState({ newCount: 0, pendingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [declineModalId, setDeclineModalId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!isAuthenticated) {
      setRequests([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await getDashboardRequests(activeTab);
      setRequests(res.requests);
    } catch (e) {
      console.error("[ProviderRequests] loadRequests error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, isAuthenticated]);

  const loadCounts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const c = await getDashboardRequestCounts();
      setCounts(c);
    } catch (e) {
      console.error("[ProviderRequests] loadCounts error:", e);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        setLoading(true);
        loadRequests();
        loadCounts();
      } else {
        setRequests([]);
        setCounts({ newCount: 0, pendingCount: 0 });
        setLoading(false);
      }
    }, [loadRequests, loadCounts, isAuthenticated]),
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      loadCounts();
      if (activeTab === "new") loadRequests();
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab, loadCounts, loadRequests, isAuthenticated]);

  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRequests();
    loadCounts();
  }, [loadRequests, loadCounts]);

  const handleAccept = useCallback(async (id: string) => {
    setActionId(id);
    try {
      await acceptOrder(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      await loadCounts();
    } catch (e) {
      console.error("[ProviderRequests] accept error:", e);
      Alert.alert(t("common.error"), t("providerDashboard.errors.acceptFailed"));
    } finally {
      setActionId(null);
    }
  }, [loadCounts]);

  const handleDeclinePress = useCallback((id: string) => {
    setDeclineModalId(id);
  }, []);

  const handleDeclineConfirm = useCallback(async () => {
    const id = declineModalId;
    setDeclineModalId(null);
    if (!id) return;
    setActionId(id);
    try {
      await rejectOrder(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      await loadCounts();
    } catch (e) {
      console.error("[ProviderRequests] reject error:", e);
      Alert.alert(t("common.error"), t("providerDashboard.errors.rejectFailed"));
    } finally {
      setActionId(null);
    }
  }, [declineModalId, loadCounts]);

  const handleDeclineCancel = useCallback(() => {
    setDeclineModalId(null);
  }, []);

  const newCount = counts.newCount;
  const listContentContainerStyle = useMemo(
    () => [styles.listContent, { paddingBottom: insets.bottom + 80 }],
    [insets.bottom],
  );

  const renderItem = useCallback(
    ({ item }: { item: ProviderDashboardRequest }) => (
      <RequestCard
        item={item}
        onAccept={handleAccept}
        onDecline={handleDeclinePress}
        loading={actionId === item.id}
      />
    ),
    [handleAccept, handleDeclinePress, actionId],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("providerDashboard.requestsScreenTitle")}</Text>
        <View style={styles.tabs}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const label =
              tab.key === "new" && newCount > 0 && tab.labelWithCountKey
                ? t(tab.labelWithCountKey, { count: newCount })
                : t(tab.labelKey);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                {isActive ? (
                  <LinearGradient
                    colors={[TAB_ACTIVE_GRADIENT.start, TAB_ACTIVE_GRADIENT.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, styles.tabGradient]}
                  />
                ) : null}
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading && requests.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <FlashList
          data={requests}
          renderItem={renderItem}
          estimatedItemSize={140}
          keyExtractor={(item) => item.id}
          contentContainerStyle={listContentContainerStyle}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>{t("providerDashboard.emptyRequests")}</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={!!declineModalId}
        transparent
        animationType="fade"
        onRequestClose={handleDeclineCancel}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleDeclineCancel}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("providerDashboard.confirmDeclineTitle")}</Text>
            <Text style={styles.modalMessage}>{t("providerDashboard.confirmDeclineMessage")}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={handleDeclineCancel}>
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleDeclineConfirm}>
                <Text style={styles.modalConfirmText}>{t("providerDashboard.reject")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: TAB_INACTIVE_BG,
    overflow: "hidden",
  },
  tabActive: {
    backgroundColor: "transparent",
  },
  tabGradient: {
    borderRadius: 999,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
  },
  tabLabelActive: {
    color: "#FFFFFF",
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(61, 51, 112, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardMain: {
    flex: 1,
    minWidth: 0,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    flex: 1,
  },
  urgentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(251, 146, 60, 0.15)",
  },
  urgentText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FB923C",
  },
  serviceName: {
    fontSize: 14,
    color: "#22C55E",
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FACC15",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#F87171",
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
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: TAB_INACTIVE_BG,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    alignItems: "center",
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#F87171",
  },
});
