import { useThemeColors } from '@/hooks/useThemeColors';
import { getLocaleSnapshot, t } from '@/i18n';
import {
  Notification,
  NotificationType,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/services/notifications';
import {
  formatNotificationRelativeTime,
  formatNotificationSectionDateLabel,
  getLocalizedNotificationDisplay,
} from '@/utils/notificationDisplay';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NotificationItemProps {
  notification: Notification;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}

function NotificationItem({ notification, onPress, colors }: NotificationItemProps) {
  const getNotificationConfig = (type: NotificationType) => {
    switch (type) {
      case 'booking_confirmed':
        return { icon: '✅', bgColor: '#10B981' };
      case 'booking_cancelled':
        return { icon: '❌', bgColor: '#EF4444' };
      case 'new_message':
        return { icon: '💬', bgColor: '#3B82F6' };
      case 'rate_service':
        return { icon: '⭐', bgColor: '#F59E0B' };
      case 'offer':
        return { icon: '🎁', bgColor: '#EC4899' };
      case 'payment_processed':
        return { icon: '💳', bgColor: '#10B981' };
      case 'provider_on_way':
        return { icon: '📍', bgColor: '#8B5CF6' };
      case 'quote_received':
        return { icon: '📋', bgColor: '#6366F1' };
      case 'new_booking_request':
        return { icon: '📩', bgColor: '#8B5CF6' };
      case 'quote_approved':
        return { icon: '✅', bgColor: '#10B981' };
      case 'payment_received':
      case 'new_paid_booking':
        return { icon: '💰', bgColor: '#10B981' };
      case 'new_review':
      case 'job_pending_review':
      case 'job_completed':
        return { icon: '⭐', bgColor: '#F59E0B' };
      case 'refund_issued':
        return { icon: '↩️', bgColor: '#10B981' };
      default:
        return { icon: '🔔', bgColor: '#6B7280' };
    }
  };

  const config = getNotificationConfig(notification.type);
  const display = getLocalizedNotificationDisplay(notification, 'client');

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.read && [styles.notificationItemUnread, { backgroundColor: colors.card }],
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${config.bgColor}20` },
        ]}
      >
        <Text style={styles.iconText}>{config.icon}</Text>
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { color: colors.textPrimary }]}>
          {display.title}
        </Text>
        <Text style={[styles.notificationMessage, { color: colors.textSecondary }]}>
          {display.message}
        </Text>
        <Text style={[styles.notificationTime, { color: colors.textTertiary }]}>
          {formatNotificationRelativeTime(notification.created_at, 'full')}
        </Text>
      </View>
      {!notification.read && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
}

interface NotificationGroup {
  label: string;
  notifications: Notification[];
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('[Notifications] Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Tab screens often stay mounted; reload when user opens Alertas so new items (e.g. refunds) appear.
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('[Notifications] Failed to mark all as read:', error);
    }
  }, []);

  const handleNotificationPress = useCallback(
    async (notification: Notification) => {
      // Mark as read if unread
      if (!notification.read) {
        try {
          await markNotificationAsRead(notification.id);
          // Update local state
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id ? { ...n, read: true } : n
            )
          );
        } catch (error) {
          console.error('[Notifications] Failed to mark as read:', error);
        }
      }

      router.push(`/notifications/${notification.id}`);
    },
    [router]
  );

  const groupedNotifications = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: NotificationGroup[] = [];
    const todayNotifications: Notification[] = [];
    const yesterdayNotifications: Notification[] = [];
    const olderNotifications: Notification[] = [];

    notifications.forEach((notification) => {
      const notificationDate = new Date(notification.created_at);
      const notificationDay = new Date(
        notificationDate.getFullYear(),
        notificationDate.getMonth(),
        notificationDate.getDate()
      );

      if (notificationDay.getTime() === today.getTime()) {
        todayNotifications.push(notification);
      } else if (notificationDay.getTime() === yesterday.getTime()) {
        yesterdayNotifications.push(notification);
      } else {
        olderNotifications.push(notification);
      }
    });

    if (todayNotifications.length > 0) {
      groups.push({
        label: t('notifications.today'),
        notifications: todayNotifications,
      });
    }
    if (yesterdayNotifications.length > 0) {
      groups.push({
        label: t('notifications.yesterday'),
        notifications: yesterdayNotifications,
      });
    }
    if (olderNotifications.length > 0) {
      // Group older notifications by date
      const olderGroups = new Map<string, Notification[]>();
      olderNotifications.forEach((notification) => {
        const date = new Date(notification.created_at);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        if (!olderGroups.has(dateKey)) {
          olderGroups.set(dateKey, []);
        }
        olderGroups.get(dateKey)!.push(notification);
      });

      olderGroups.forEach((notifs) => {
        const date = new Date(notifs[0].created_at);
        const label = formatNotificationSectionDateLabel(date);
        groups.push({ label, notifications: notifs });
      });
    }

    return groups;
  }, [notifications, getLocaleSnapshot()]);

  const hasUnread = useMemo(
    () => notifications.some((n) => !n.read),
    [notifications]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('notifications.title')}
        </Text>
        {hasUnread ? (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={[styles.markAllText, { color: colors.primary }]}>{t('notifications.markAll')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerPlaceholder} />
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="notifications-outline" size={64} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('notifications.empty')}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={[styles.scrollView, { backgroundColor: colors.background }]}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {groupedNotifications.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.group}>
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                {group.label}
              </Text>
              {group.notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onPress={() => handleNotificationPress(notification)}
                  colors={colors}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Hardcode dark background like Home
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#252542', // Hardcode dark header
    borderBottomWidth: 1,
    borderBottomColor: '#374151', // Hardcode dark border
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
    color: '#FFFFFF', // Hardcode white text
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  headerPlaceholder: {
    width: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#9CA3AF', // Hardcode secondary text color
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for bottom navbar
  },
  group: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    color: '#9CA3AF', // Hardcode secondary text color
  },
  notificationItem: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'transparent', // Default: read notifications
  },
  notificationItemUnread: {
    backgroundColor: '#252542', // Hardcode dark background for unread
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconText: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    color: '#FFFFFF', // Hardcode white text
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
    color: '#9CA3AF', // Hardcode secondary text
  },
  notificationTime: {
    fontSize: 11,
    marginTop: 6,
    color: '#9CA3AF', // Hardcode secondary text
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    marginTop: 4,
    flexShrink: 0,
  },
});
