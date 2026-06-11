import { ProviderAvatar } from '@/components/ProviderAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Conversation, deleteConversation, fetchConversations } from '@/services/conversations';
import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ThemeColors } from '@/utils/themeStyles';

const PURPLE_GRADIENT = ['#6366F1', '#8B5CF6'];
const STATUS_COLORS: Record<string, string> = {
  in_progress: '#8B5CF6',
  scheduled: '#22C55E',
  completed: '#6B7280',
  inquiry: '#F59E0B',
  quote: '#EC4899',
  paid_confirm: '#22C55E',
};

type FilterType = 'all' | 'unread' | 'active' | 'archived';

/** Display status key for badge; null = no active order, do not show tag. */
function getConversationStatus(conversation: Conversation): string | null {
  const status = conversation.active_order_status;
  if (!status) return null;
  if (status === 'pending_for_provider' && conversation.active_order_has_client_payment) {
    return 'paid_confirm';
  }
  switch (status) {
    case 'in_progress':
    case 'pending_review':
      return 'in_progress';
    case 'accepted':
      return 'scheduled';
    case 'pending_for_provider':
    case 'pending_for_client':
    case 'pending_payment':
      return 'quote';
    default:
      return 'inquiry';
  }
}

function formatTime(dateString: string | null): string {
  if (!dateString) return t('providerDashboard.inbox.now');
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return t('providerDashboard.inbox.now');
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMins < 1) return t('providerDashboard.inbox.now');
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) {
    const locale = t('providerDashboard.inbox.title') === 'Mensajes' ? 'es' : 'en';
    return locale === 'es' ? 'Ayer' : 'Yesterday';
  }
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function createProviderInboxStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.screenBackground,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: c.textPrimary,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 44,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: c.surfaceSecondary,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: c.textPrimary,
      paddingVertical: 0,
    },
    filters: {
      flexDirection: 'row',
      gap: 8,
    },
    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    filterPillActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: c.textSecondary,
    },
    filterLabelActive: {
      color: '#FFFFFF',
    },
    filterCount: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: c.border,
    },
    filterCountActive: {
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    filterCountText: {
      fontSize: 10,
      color: c.textSecondary,
    },
    filterCountTextActive: {
      color: '#FFFFFF',
    },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 8,
    },
    cardTouchable: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    menuButton: {
      padding: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardUnread: {},
    cardLast: {
      marginBottom: 0,
    },
    avatarWrap: {
      position: 'relative',
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    avatarPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarEmoji: {
      fontSize: 20,
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#22C55E',
      borderWidth: 2,
    },
    content: {
      flex: 1,
      minWidth: 0,
    },
    row1: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    name: {
      fontSize: 14,
      fontWeight: '500',
      flex: 1,
      color: c.textPrimary,
    },
    nameUnread: {},
    time: {
      fontSize: 12,
      color: c.textTertiary,
    },
    timeUnread: {
      color: c.primary,
    },
    row2: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    preview: {
      fontSize: 12,
      flex: 1,
      marginRight: 8,
      color: c.textSecondary,
    },
    previewUnread: {
      color: c.textPrimary,
      fontWeight: '500',
    },
    badges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '500',
    },
    unreadBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    unreadText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: c.textPrimary,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: 24,
    },
    errorText: {
      fontSize: 16,
      color: '#EF4444',
      textAlign: 'center',
      marginBottom: 16,
    },
    retryButton: {
      backgroundColor: c.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    optionsOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    optionsBox: {
      borderRadius: 12,
      paddingVertical: 8,
      minWidth: 220,
      borderWidth: 1,
      backgroundColor: c.card,
      borderColor: c.cardBorder,
    },
    optionsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textPrimary,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    optionsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    optionsButtonText: {
      fontSize: 16,
      color: c.textSecondary,
    },
    optionsButtonTextDestructive: {
      fontSize: 16,
      color: '#EF4444',
      fontWeight: '500',
    },
  });
}

function getStatusLabel(statusKey: string): string {
  switch (statusKey) {
    case 'in_progress':
      return t('providerDashboard.inbox.statusInProgress');
    case 'scheduled':
      return t('providerDashboard.inbox.statusScheduled');
    case 'completed':
      return t('providerDashboard.inbox.statusCompleted');
    case 'inquiry':
      return t('providerDashboard.inbox.statusInquiry');
    case 'quote':
      return t('providerDashboard.inbox.statusQuote');
    case 'paid_confirm':
      return t('providerDashboard.inbox.statusPaidConfirm');
    default:
      return t('providerDashboard.inbox.statusInquiry');
  }
}

export default function ProviderInboxScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createProviderInboxStyles(colors), [colors]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optionsConversation, setOptionsConversation] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isAuthenticated = !!user;
  const POLLING_INTERVAL_MS = 2000;
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConversations = useCallback(async (showLoading = true) => {
    if (!isAuthenticated) {
      setConversations([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }
    try {
      setError(null);
      if (showLoading) setLoading(true);
      // Only show conversations where current user is the provider (supplier)
      const data = await fetchConversations('provider');
      const sorted = [...data].sort((a, b) => {
        if (!a.last_message_at && !b.last_message_at) return 0;
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
      setConversations(sorted);
    } catch {
      setError(t('providerDashboard.inbox.failedToLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations(true);
    } else {
      setConversations([]);
      setLoading(false);
      setError(null);
    }
  }, [isAuthenticated, loadConversations]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const startPolling = () => {
      if (pollingRef.current) return;
      pollingRef.current = setInterval(() => loadConversations(false), POLLING_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') startPolling();
      else stopPolling();
    });
    startPolling();
    return () => {
      sub.remove();
      stopPolling();
    };
  }, [isAuthenticated, loadConversations]);

  // Refetch when returning from chat so unread count and list stay in sync (MDB-160 / MDB-244)
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) loadConversations(false);
    }, [isAuthenticated, loadConversations])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConversations(true);
  }, [loadConversations]);

  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (filter === 'unread') list = list.filter((c) => c.unread_count > 0);
    if (filter === 'active') list = list.filter((c) => !!c.active_order_status);
    if (filter === 'archived') list = []; // No API support yet
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.other_user_name?.toLowerCase().includes(q) ||
          (c.last_message ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [conversations, filter, searchQuery]);

  const counts = useMemo(
    () => ({
      all: conversations.length,
      unread: conversations.filter((c) => c.unread_count > 0).length,
      active: conversations.filter((c) => !!c.active_order_status).length,
      archived: 0,
    }),
    [conversations]
  );

  const handleConversationPress = useCallback(
    (conversationId: string) => {
      router.push(`/chat/${conversationId}`);
    },
    [router]
  );

  const showDeleteConfirm = useCallback((item: Conversation) => {
    Alert.alert(
      t('chat.deleteChat'),
      t('chat.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.deleteChat'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConversation(item.id);
              setConversations((prev) => prev.filter((c) => c.id !== item.id));
            } catch (err) {
              console.error('[Messages] Error deleting conversation:', err);
              const message = err instanceof Error ? err.message : t('chat.deleteFailed');
              Alert.alert(t('chat.deleteChat'), message);
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
    if (Platform.OS === 'web') {
      const ok = window.confirm(t('chat.deleteConfirm'));
      if (!ok) return;
      try {
        await deleteConversation(item.id);
        setConversations((prev) => prev.filter((c) => c.id !== item.id));
      } catch (err) {
        console.error('[Messages] Error deleting conversation:', err);
        const message = err instanceof Error ? err.message : t('chat.deleteFailed');
        window.alert(message);
      }
      return;
    }
    showDeleteConfirm(item);
  }, [optionsConversation, closeOptionsMenu, showDeleteConfirm]);

  const renderConversation = useCallback(
    ({ item, index }: { item: Conversation; index: number }) => {
      const unread = item.unread_count > 0;
      const statusKey = getConversationStatus(item);
      const statusColor = statusKey ? (STATUS_COLORS[statusKey] ?? STATUS_COLORS.inquiry) : '';
      const statusLabel = statusKey ? getStatusLabel(statusKey) : '';
      const isOnline = false; // TODO: from backend when available
      const cardStyle = {
        backgroundColor: unread ? `${colors.primary}14` : colors.card,
        borderColor: unread ? `${colors.primary}38` : colors.cardBorder,
      };

      return (
        <View
          style={[
            styles.card,
            unread && styles.cardUnread,
            index === filteredConversations.length - 1 && styles.cardLast,
            cardStyle,
          ]}
        >
          <TouchableOpacity
            style={styles.cardTouchable}
            onPress={() => handleConversationPress(item.id)}
            onLongPress={() => handleLongPressConversation(item)}
            activeOpacity={0.7}
          >
            <View style={styles.avatarWrap}>
              <ProviderAvatar
                profileImage={item.other_user_image}
                size={48}
                rounded
                style={styles.avatar}
              />
              {isOnline && <View style={[styles.onlineIndicator, { borderColor: colors.card }]} />}
            </View>
            <View style={styles.content}>
              <View style={styles.row1}>
                <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>
                  {item.other_user_name}
                </Text>
                <Text style={[styles.time, unread && styles.timeUnread]}>
                  {formatTime(item.last_message_at)}
                </Text>
              </View>
              <View style={styles.row2}>
                <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
                  {item.last_message || t('chat.noMessages')}
                </Text>
                <View style={styles.badges}>
                  {statusKey ? (
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                  ) : null}
                  {unread && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>
                        {item.unread_count > 9 ? '9+' : item.unread_count}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => handleMenuPress(item)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={t('chat.options')}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      );
    },
    [
      filteredConversations.length,
      handleConversationPress,
      handleLongPressConversation,
      handleMenuPress,
      colors,
      styles,
    ],
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('providerDashboard.inbox.title')}</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{t('providerDashboard.inbox.title')}</Text>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setSearchVisible((v) => !v)}
          >
            <Ionicons name="search" size={20} color={colors.icon} />
          </TouchableOpacity>
        </View>
        {searchVisible && (
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={colors.iconSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('providerDashboard.inbox.searchPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        )}
        <View style={styles.filters}>
          {(
            [
              { key: 'all' as const, label: t('providerDashboard.inbox.filterAll'), count: counts.all },
              { key: 'unread' as const, label: t('providerDashboard.inbox.filterUnread'), count: counts.unread },
              { key: 'active' as const, label: t('providerDashboard.inbox.filterActive'), count: counts.active },
            ] as const
          ).map(({ key, label, count }) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterPill, filter === key && styles.filterPillActive]}
              onPress={() => setFilter(key)}
            >
              <Text style={[styles.filterLabel, filter === key && styles.filterLabelActive]}>
                {label}
              </Text>
              <View style={[styles.filterCount, filter === key && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, filter === key && styles.filterCountTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadConversations}>
            <Text style={styles.retryText}>{t('providerDashboard.inbox.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>{t('providerDashboard.inbox.emptyTitle')}</Text>
          <Text style={styles.emptySubtitle}>{t('providerDashboard.inbox.emptySubtitle')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 24 + insets.bottom },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={PURPLE_GRADIENT}
              tintColor={colors.primary}
            />
          }
        />
      )}

      <Modal visible={optionsConversation !== null} transparent animationType="fade" onRequestClose={closeOptionsMenu}>
        <TouchableOpacity style={styles.optionsOverlay} activeOpacity={1} onPress={closeOptionsMenu}>
          <View style={styles.optionsBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.optionsTitle}>{t('chat.options')}</Text>
            <TouchableOpacity style={styles.optionsButton} onPress={handleOptionDeleteChat}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={styles.optionsButtonTextDestructive}>{t('chat.deleteChat')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionsButton} onPress={closeOptionsMenu}>
              <Text style={styles.optionsButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
