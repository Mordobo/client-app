import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import { type Notification, type NotificationCategory, deleteAllNotifications, deleteNotification, fetchNotifications, getNotificationCategory, markAllNotificationsAsRead, markNotificationAsRead } from "@/services/notifications";
import { fetchOrderDetail } from "@/services/orders";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const UNREAD_BG = "rgba(139, 92, 246, 0.1)";
const UNREAD_BORDER = "rgba(139, 92, 246, 0.3)";

// Icon colors by category (spec: Jobs=Purple, Payments=Green, Reviews=Yellow, System=Blue)
const CATEGORY_COLORS: Record<NotificationCategory, string> = {
  jobs: "#8B5CF6",
  payments: "#22C55E",
  reviews: "#EAB308",
  system: "#3B82F6",
};

const CATEGORY_ICONS: Record<NotificationCategory, keyof typeof Ionicons.glyphMap> = {
  jobs: "briefcase",
  payments: "wallet",
  reviews: "star",
  system: "notifications",
};

type FilterTab = NotificationCategory | "all";

interface NotificationCardProps {
  notification: Notification;
  onPress: () => void;
  onDelete: () => void;
}

function NotificationCard({ notification, onPress, onDelete }: NotificationCardProps) {
  const colors = useThemeColors();
  const category = getNotificationCategory(notification.type);
  const color = CATEGORY_COLORS[category];
  const iconName = CATEGORY_ICONS[category];

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 1) return t("providerDashboard.providerNotifications.now");
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return t("providerDashboard.providerNotifications.yesterday");
    if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "short" });
    return date.toLocaleDateString();
  }, []);

  return (
    <View style={styles.cardWrapper}>
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: notification.read ? colors.card : UNREAD_BG, borderColor: notification.read ? colors.cardBorder : UNREAD_BORDER },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${color}26` }]}>
          <Ionicons name={iconName} size={22} color={color} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardRow}>
            <Text style={[styles.cardTitle, !notification.read && styles.cardTitleUnread, { color: colors.textPrimary }]} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={[styles.cardTime, { color: colors.textTertiary }]}>{formatTime(notification.created_at)}</Text>
          </View>
          <Text style={[styles.cardMessage, { color: colors.textSecondary }]} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>
        {!notification.read && <View style={[styles.unreadDot, { backgroundColor: color }]} />}
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.cardDeleteBtn}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

interface NotificationGroup {
  label: string;
  notifications: Notification[];
}

const FILTER_TABS: { key: FilterTab; labelKey: string }[] = [
  { key: "all", labelKey: "providerDashboard.providerNotifications.filterAll" },
  { key: "jobs", labelKey: "providerDashboard.providerNotifications.filterJobs" },
  { key: "payments", labelKey: "providerDashboard.providerNotifications.filterPayments" },
  { key: "reviews", labelKey: "providerDashboard.providerNotifications.filterReviews" },
  { key: "system", labelKey: "providerDashboard.providerNotifications.filterSystem" },
];

export default function ProviderNotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const isAuthenticated = !!user;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [clearAllModalVisible, setClearAllModalVisible] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (e) {
      console.error("[ProviderNotifications] Load failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) loadNotifications();
    else {
      setNotifications([]);
      setLoading(false);
    }
  }, [loadNotifications, isAuthenticated]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n) => getNotificationCategory(n.type) === filter);
  }, [notifications, filter]);

  const groupedNotifications = useMemo((): NotificationGroup[] => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const thisWeek: Notification[] = [];

    filteredNotifications.forEach((n) => {
      const d = new Date(n.created_at);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (dayStart.getTime() >= todayStart.getTime()) {
        today.push(n);
      } else if (dayStart.getTime() >= yesterdayStart.getTime()) {
        yesterday.push(n);
      } else if (dayStart.getTime() >= weekStart.getTime()) {
        thisWeek.push(n);
      }
    });

    const groups: NotificationGroup[] = [];
    if (today.length) groups.push({ label: t("providerDashboard.providerNotifications.today").toUpperCase(), notifications: today });
    if (yesterday.length) groups.push({ label: t("providerDashboard.providerNotifications.yesterday").toUpperCase(), notifications: yesterday });
    if (thisWeek.length) groups.push({ label: t("providerDashboard.providerNotifications.thisWeek").toUpperCase(), notifications: thisWeek });
    return groups;
  }, [filteredNotifications]);

  const hasUnread = useMemo(() => notifications.some((n) => !n.read), [notifications]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error("[ProviderNotifications] Mark all read failed:", e);
    }
  }, []);

  const handleNotificationPress = useCallback(
    async (notification: Notification) => {
      if (!notification.read) {
        try {
          await markNotificationAsRead(notification.id);
          setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
        } catch (e) {
          console.error("[ProviderNotifications] Mark read failed:", e);
        }
      }

      const meta = notification.metadata || {};
      const type = notification.type;

      switch (type) {
        case "booking_confirmed":
        case "booking_cancelled":
        case "provider_on_way":
        case "quote_approved":
          if (meta.orderId) router.push(`/(provider-tabs)/jobs/${meta.orderId}`);
          break;
        case "new_booking_request":
          router.push("/(provider-tabs)/requests");
          break;
        case "new_message":
          if (meta.conversationId) {
            router.push(`/chat/${meta.conversationId}`);
          } else if (meta.orderId) {
            fetchOrderDetail(meta.orderId)
              .then((detail) => {
                if (detail.conversation_id) router.push(`/chat/${detail.conversation_id}`);
              })
              .catch(() => {});
          }
          break;
        case "payment_processed":
        case "payment_received":
        case "refund_issued":
          router.push("/(provider-tabs)/earnings");
          break;
        case "rate_service":
        case "new_review":
          router.push("/(provider-tabs)/profile/reviews");
          break;
        case "quote_received":
          if (meta.orderId) router.push(`/(provider-tabs)/jobs/${meta.orderId}`);
          break;
        case "offer":
          router.push("/(provider-tabs)");
          break;
        default:
          break;
      }
    },
    [router],
  );

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error("[ProviderNotifications] Delete failed:", e);
    }
  }, []);

  const handleClearAllConfirm = useCallback(() => {
    setClearAllModalVisible(false);
    (async () => {
      try {
        await deleteAllNotifications();
        setNotifications([]);
      } catch (e) {
        console.error("[ProviderNotifications] Clear all failed:", e);
      }
    })();
  }, []);

  const openClearAllModal = useCallback(() => {
    if (notifications.length === 0) return;
    setClearAllModalVisible(true);
  }, [notifications.length]);

  const safePadding = {
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  return (
    <View style={[styles.container, safePadding, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t("providerDashboard.providerNotifications.title")}</Text>
        <View style={styles.headerActions}>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={openClearAllModal} style={styles.headerButton}>
              <Text style={styles.clearAllText}>{t("providerDashboard.providerNotifications.clearAll")}</Text>
            </TouchableOpacity>
          )}
          {hasUnread ?
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerButton}>
              <Text style={styles.markAllText}>{t("providerDashboard.providerNotifications.markAllRead")}</Text>
            </TouchableOpacity>
          : null}
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersWrap} style={styles.filtersScroll}>
        {FILTER_TABS.map(({ key, labelKey }) => (
          <TouchableOpacity key={key} style={[styles.filterChip, filter === key && styles.filterChipActive]} onPress={() => setFilter(key)} activeOpacity={0.8}>
            <Text style={[styles.filterChipText, filter === key && styles.filterChipTextActive]}>{t(labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading ?
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      : filteredNotifications.length === 0 ?
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="notifications-outline" size={48} color="rgba(255,255,255,0.3)" />
          </View>
          <Text style={styles.emptyText}>{t("providerDashboard.providerNotifications.empty")}</Text>
        </View>
      : <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}>
          {groupedNotifications.map((group, idx) => (
            <View key={idx} style={styles.group}>
              <Text style={styles.sectionLabel}>{group.label}</Text>
              {group.notifications.map((n) => (
                <NotificationCard key={n.id} notification={n} onPress={() => handleNotificationPress(n)} onDelete={() => handleDelete(n.id)} />
              ))}
            </View>
          ))}

          <TouchableOpacity style={styles.settingsButton} onPress={() => router.push("/account/configuration")} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.5)" />
            <Text style={styles.settingsButtonText}>{t("providerDashboard.providerNotifications.settings")}</Text>
          </TouchableOpacity>
        </ScrollView>
      }

      {/* Clear all confirmation modal */}
      <Modal visible={clearAllModalVisible} transparent animationType="fade" onRequestClose={() => setClearAllModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setClearAllModalVisible(false)}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t("providerDashboard.providerNotifications.clearAllConfirmTitle")}</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>{t("providerDashboard.providerNotifications.clearAllConfirmMessage")}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setClearAllModalVisible(false)}>
                <Text style={styles.modalButtonSecondaryText}>{t("providerDashboard.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleClearAllConfirm}>
                <Text style={styles.modalButtonPrimaryText}>{t("providerDashboard.providerNotifications.clearAll")}</Text>
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#A78BFA",
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
  },
  filtersScroll: {
    maxHeight: 44,
    marginBottom: 8,
  },
  filtersWrap: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: "row",
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  filterChipActive: {
    backgroundColor: "#8B5CF6",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
  },
  filterChipTextActive: {
    color: "#FFF",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  group: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 12,
  },
  cardWrapper: {
    marginBottom: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardUnread: {},
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    flex: 1,
    marginRight: 8,
  },
  cardTitleUnread: {
    color: "#FFF",
  },
  cardTime: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
  },
  cardMessage: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 8,
  },
  cardDeleteBtn: {
    paddingLeft: 8,
    justifyContent: "center",
    marginTop: 2,
  },
  deleteAction: {
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 8,
  },
  deleteActionText: {
    color: "#FFF",
    fontSize: 10,
    marginTop: 4,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginTop: 8,
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  modalButtonSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  modalButtonSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  modalButtonPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#8B5CF6",
  },
  modalButtonPrimaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
});
