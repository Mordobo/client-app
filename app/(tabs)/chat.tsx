import { ProviderAvatar } from "@/components/ProviderAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { t } from "@/i18n";
import { Conversation, deleteConversation, fetchConversations } from "@/services/conversations";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, ActivityIndicator, Alert, FlatList, Image, Modal, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ConversationsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optionsConversation, setOptionsConversation] = useState<Conversation | null>(null);

  const POLLING_INTERVAL_MS = 2000;
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => { isAuthenticatedRef.current = isAuthenticated; }, [isAuthenticated]);

  const loadConversations = useCallback(async (showLoading = true) => {
    if (!isAuthenticatedRef.current) return;
    try {
      setError(null);
      if (showLoading) setLoading(true);
      const data = await fetchConversations('client');
      const sortedData = [...data].sort((a, b) => {
        if (!a.last_message_at && !b.last_message_at) return 0;
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        const dateA = new Date(a.last_message_at).getTime();
        const dateB = new Date(b.last_message_at).getTime();
        if (isNaN(dateA) || isNaN(dateB)) return 0;
        return dateB - dateA;
      });
      setConversations(sortedData);
    } catch (err) {
      const isAuthError = err instanceof Error &&
        (err.message.includes("Session") || err.message.includes("token") ||
         err.message.includes("401") || err.message.includes("403") ||
         err.message.includes("expired") || err.message.includes("log in"));

      if (isAuthError) {
        console.log("[Chat] Auth error during fetch, stopping polling");
        return;
      }

      console.error("[Chat] Error loading conversations:", err);

      let errorMessage = t("chat.failedToLoad");
      if (err instanceof Error) {
        if (err.message.includes("Network") || err.message.includes("connection")) {
          errorMessage = t("errors.connectionFailed") || "Connection failed. Please check your internet.";
        } else if (err.message.includes("timeout") || err.message.includes("Timeout")) {
          errorMessage = t("errors.requestTimeout") || "Request timed out. Please try again.";
        } else {
          errorMessage = err.message || errorMessage;
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => loadConversations(false), POLLING_INTERVAL_MS);
  }, [loadConversations]);

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations(true);
    } else {
      stopPolling();
      setConversations([]);
    }
  }, [isAuthenticated, loadConversations, stopPolling]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        loadConversations(false);
        startPolling();
      } else {
        stopPolling();
      }
    });
    startPolling();
    return () => {
      sub.remove();
      stopPolling();
    };
  }, [isAuthenticated, loadConversations, startPolling, stopPolling]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) loadConversations(false);
    }, [isAuthenticated, loadConversations])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConversations(true);
  }, [loadConversations]);

  const handleConversationPress = (conversationId: string) => {
    try {
      if (!conversationId || typeof conversationId !== "string") {
        console.error("[Chat] Invalid conversation ID:", conversationId);
        return;
      }
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      console.error("[Chat] Error in handleConversationPress:", error);
    }
  };

  const showDeleteConfirm = useCallback((item: Conversation) => {
    Alert.alert(
      t("chat.deleteChat"),
      t("chat.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("chat.deleteChat"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteConversation(item.id);
              setConversations((prev) => prev.filter((c) => c.id !== item.id));
            } catch (err) {
              console.error("[Chat] Error deleting conversation:", err);
              const message = err instanceof Error ? err.message : t("chat.deleteFailed");
              Alert.alert(t("chat.deleteChat"), message);
            }
          },
        },
      ]
    );
  }, []);

  const handleLongPressConversation = useCallback((item: Conversation) => {
    showDeleteConfirm(item);
  }, [showDeleteConfirm]);

  const handleMenuPress = useCallback((item: Conversation) => {
    setOptionsConversation(item);
  }, []);

  const closeOptionsMenu = useCallback(() => {
    setOptionsConversation(null);
  }, []);

  const handleOptionDeleteChat = useCallback(async () => {
    const item = optionsConversation;
    closeOptionsMenu();
    if (!item) return;
    if (Platform.OS === "web") {
      const ok = window.confirm(t("chat.deleteConfirm"));
      if (!ok) return;
      try {
        await deleteConversation(item.id);
        setConversations((prev) => prev.filter((c) => c.id !== item.id));
      } catch (err) {
        console.error("[Chat] Error deleting conversation:", err);
        const message = err instanceof Error ? err.message : t("chat.deleteFailed");
        window.alert(message);
      }
      return;
    }
    showDeleteConfirm(item);
  }, [optionsConversation, closeOptionsMenu, showDeleteConfirm]);

  const formatTime = (dateString: string | null) => {
    // Handle null or invalid dates
    if (!dateString) {
      const locale = t("chat.messages") === "Mensajes" ? "es" : "en";
      return locale === "es" ? "Nuevo" : "New";
    }

    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      const locale = t("chat.messages") === "Mensajes" ? "es" : "en";
      return locale === "es" ? "Nuevo" : "New";
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      if (diffMins < 1) {
        return t("orders.today");
      }
      const locale = t("chat.messages") === "Mensajes" ? "es" : "en";
      return locale === "es" ? `Hace ${diffMins} min` : `${diffMins} min ago`;
    } else if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      const locale = t("chat.messages") === "Mensajes" ? "es" : "en";
      return locale === "es" ? "Ayer" : "Yesterday";
    } else if (diffDays < 7) {
      const locale = t("chat.messages") === "Mensajes" ? "es" : "en";
      return locale === "es" ? `Hace ${diffDays} días` : `${diffDays} days ago`;
    } else if (diffDays < 14) {
      const locale = t("chat.messages") === "Mensajes" ? "es" : "en";
      return locale === "es" ? "Hace 1 semana" : "1 week ago";
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const renderConversation = ({ item, index }: { item: Conversation; index: number }) => {
    // Validate conversation data before rendering
    if (!item || !item.id) {
      return null;
    }

    try {
      const isOnline = false; // TODO: Get from backend when available
      // Border only on first 4 items (i < 4) as per JSX
      const showBorder = index < 4;

      return (
        <View style={[styles.conversationItem, !showBorder && styles.conversationItemNoBorder, { backgroundColor: colors.background, borderBottomColor: colors.cardBorder }]}>
          <TouchableOpacity style={styles.conversationRowTouchable} onPress={() => handleConversationPress(item.id)} onLongPress={() => handleLongPressConversation(item)} activeOpacity={0.7}>
            <View style={styles.avatarContainer}>
              <ProviderAvatar
                profileImage={item.other_user_image}
                size={56}
                rounded
                style={styles.avatar}
              />
              {isOnline && <View style={styles.onlineIndicator} />}
            </View>
            <View style={styles.conversationContent}>
              <View style={styles.conversationHeader}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>{item.other_user_name}</Text>
                <Text style={[styles.timeText, { color: item.unread_count > 0 ? colors.primary : colors.textTertiary }]}>{formatTime(item.last_message_at)}</Text>
              </View>
              <View style={styles.lastMessageRow}>
                <Text style={[styles.lastMessage, { color: item.unread_count > 0 ? colors.textPrimary : colors.textTertiary }, item.unread_count > 0 && { fontWeight: "500" }]} numberOfLines={1}>
                  {item.last_message || t("chat.noMessages")}
                </Text>
                {item.unread_count > 0 && (
                  <View style={[styles.unreadBadge, item.unread_count < 10 && styles.unreadBadgeCircular]}>
                    <Text style={styles.unreadText}>{item.unread_count > 9 ? "9+" : item.unread_count}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={() => handleMenuPress(item)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel={t("chat.options")}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      );
    } catch (error) {
      console.error("[Chat] Error rendering conversation:", error);
      return null;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 20,
              backgroundColor: colors.card,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t("chat.messages")}</Text>
        </View>
        <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header - Exact match to JSX: padding: '50px 20px 20px', backgroundColor: colors.bgCard */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 20,
            backgroundColor: colors.card,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t("chat.messages")}</Text>
      </View>

      {error ?
        <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.errorText, { color: "#EF4444" }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadConversations}>
            <Text style={styles.retryText}>{t("chat.retry")}</Text>
          </TouchableOpacity>
        </View>
      : conversations.length === 0 ?
        <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="chatbubbles-outline" size={64} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t("chat.noMessages")}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>{t("chat.noMessagesDesc")}</Text>
        </View>
      : <View style={{ flex: 1, backgroundColor: colors.background }}>
          <FlatList
            data={conversations}
            keyExtractor={(item) => item?.id || `conversation-${Math.random()}`}
            renderItem={renderConversation}
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 100 + insets.bottom, backgroundColor: colors.background }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          />
        </View>
      }

      <Modal visible={optionsConversation !== null} transparent animationType="fade" onRequestClose={closeOptionsMenu}>
        <TouchableOpacity style={styles.optionsOverlay} activeOpacity={1} onPress={closeOptionsMenu}>
          <View style={styles.optionsBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.optionsTitle}>{t("chat.options")}</Text>
            <TouchableOpacity style={styles.optionsButton} onPress={handleOptionDeleteChat}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={styles.optionsButtonTextDestructive}>{t("chat.deleteChat")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionsButton} onPress={closeOptionsMenu}>
              <Text style={styles.optionsButtonText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e", // Hardcode dark background like Home
  },
  // Header: padding: '50px 20px 20px' from JSX (50px top, 20px horizontal, 20px bottom)
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#252542", // Hardcode dark header
    // paddingTop will be set dynamically with safe area
  },
  // Title: fontSize: '28px', fontWeight: '700' from JSX
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF", // Hardcode white text
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#1a1a2e", // Hardcode dark background
  },
  listWrapper: {
    flex: 1,
    backgroundColor: "#1a1a2e", // Hardcode dark background wrapper for FlashList
  },
  listContainer: {
    flex: 1,
    backgroundColor: "#1a1a2e", // Hardcode dark background for FlashList style prop
  },
  // List: padding: '20px' from JSX
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#1a1a2e", // Hardcode dark background
  },
  // Item: gap: '14px', padding: '14px 0' from JSX - gap must be exact
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14, // Exact gap from JSX
    paddingVertical: 14,
    paddingHorizontal: 0, // No horizontal padding on item itself
    borderBottomWidth: 1,
    borderBottomColor: "#374151", // Hardcode dark border
    backgroundColor: "#1a1a2e", // Hardcode dark background for each item
  },
  conversationRowTouchable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  menuButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  conversationItemNoBorder: {
    borderBottomWidth: 0,
  },
  avatarContainer: {
    position: "relative",
  },
  // Avatar: width: '56px', height: '56px', borderRadius: '50%' from JSX
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#252542", // Hardcode dark header background
  },
  avatarEmoji: {
    fontSize: 24,
  },
  // Online indicator: width: '14px', height: '14px', bottom: '2px', right: '2px', border: '3px solid' from JSX
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    backgroundColor: "#10b981", // Hardcode secondary color
    borderColor: "#1a1a2e", // Hardcode dark background
  },
  // Badge: minWidth: '20px', height: '20px', borderRadius: '50%', fontSize: '11px', fontWeight: '600' from JSX
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    backgroundColor: "#3b82f6", // Hardcode primary color
  },
  unreadBadgeCircular: {
    width: 20,
    minWidth: 20,
    paddingHorizontal: 0,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  conversationContent: {
    flex: 1,
    justifyContent: "center",
  },
  // Header row: marginBottom: '4px' from JSX
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  // Name: fontSize: '16px', fontWeight: '600' from JSX
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF", // Hardcode white text
  },
  // Time: fontSize: '12px' from JSX
  timeText: {
    fontSize: 12,
    color: "#9ca3af", // Hardcode secondary text
  },
  timeTextUnread: {
    color: "#3b82f6", // Hardcode primary color for unread
  },
  lastMessageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  // Message: fontSize: '14px', maxWidth: '200px' from JSX
  lastMessage: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
    maxWidth: 200,
    color: "#9ca3af", // Hardcode secondary text
  },
  lastMessageUnread: {
    color: "#FFFFFF", // Hardcode white text for unread
    fontWeight: "500",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    color: "#FFFFFF", // Hardcode white text
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
    color: "#9ca3af", // Hardcode secondary text
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
    color: "#EF4444", // Hardcode error color
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  optionsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  optionsBox: {
    backgroundColor: "#252542",
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 220,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionsButtonText: {
    fontSize: 16,
    color: "#9ca3af",
  },
  optionsButtonTextDestructive: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "500",
  },
});
