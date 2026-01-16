import { t, getLocale } from '@/i18n';
import {
  Notification,
  NotificationType,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/services/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
}

function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const getNotificationConfig = (type: NotificationType) => {
    switch (type) {
      case 'booking_confirmed':
        return { icon: '✅', bgColor: '#10B981' }; // green
      case 'new_message':
        return { icon: '💬', bgColor: '#3B82F6' }; // blue
      case 'rate_service':
        return { icon: '⭐', bgColor: '#F59E0B' }; // orange
      case 'offer':
        return { icon: '🎁', bgColor: '#EC4899' }; // pink
      case 'payment_processed':
        return { icon: '💳', bgColor: '#10B981' }; // green
      case 'provider_on_way':
        return { icon: '📍', bgColor: '#8B5CF6' }; // purple
      default:
        return { icon: '🔔', bgColor: '#6B7280' };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const locale = getLocale();

    if (diffMins < 1) {
      return locale === 'es' ? 'Hace menos de 1 min' : 'Less than 1 min ago';
    } else if (diffMins < 60) {
      return locale === 'es' ? `Hace ${diffMins} min` : `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return locale === 'es' ? `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}` : `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      return locale === 'es' 
        ? `Ayer, ${displayHours}:${displayMinutes} ${ampm}`
        : `Yesterday, ${displayHours}:${displayMinutes} ${ampm}`;
    } else {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      const day = date.getDate();
      const month = date.getMonth() + 1;
      return locale === 'es'
        ? `${day}/${month}, ${displayHours}:${displayMinutes} ${ampm}`
        : `${month}/${day}, ${displayHours}:${displayMinutes} ${ampm}`;
    }
  };

  const config = getNotificationConfig(notification.type);

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.read && styles.notificationItemUnread,
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
        <Text style={styles.notificationTitle}>
          {notification.title}
        </Text>
        <Text style={styles.notificationMessage}>
          {notification.message}
        </Text>
        <Text style={styles.notificationTime}>
          {formatTime(notification.created_at)}
        </Text>
      </View>
      {!notification.read && (
        <View style={styles.unreadDot} />
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

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

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

      // Navigate based on notification type
      const metadata = notification.metadata || {};
      switch (notification.type) {
        case 'booking_confirmed':
        case 'payment_processed':
        case 'provider_on_way':
          if (metadata.orderId) {
            router.push(`/orders/${metadata.orderId}`);
          }
          break;
        case 'new_message':
          if (metadata.conversationId) {
            router.push(`/chat/${metadata.conversationId}`);
          } else if (metadata.orderId) {
            router.push(`/booking/chat/${metadata.orderId}`);
          }
          break;
        case 'rate_service':
          if (metadata.orderId) {
            router.push(`/orders/rate/${metadata.orderId}`);
          }
          break;
        case 'offer':
          // Navigate to offers or home
          router.push('/(tabs)/home');
          break;
        default:
          break;
      }
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

    const locale = getLocale();
    if (todayNotifications.length > 0) {
      groups.push({
        label: locale === 'es' ? 'HOY' : 'TODAY',
        notifications: todayNotifications,
      });
    }
    if (yesterdayNotifications.length > 0) {
      groups.push({
        label: locale === 'es' ? 'AYER' : 'YESTERDAY',
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

      olderGroups.forEach((notifs, dateKey) => {
        const date = new Date(notifs[0].created_at);
        const locale = getLocale();
        const months = locale === 'es'
          ? ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
          : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const label = `${date.getDate()} ${months[date.getMonth()]}`;
        groups.push({ label, notifications: notifs });
      });
    }

    return groups;
  }, [notifications]);

  const hasUnread = useMemo(
    () => notifications.some((n) => !n.read),
    [notifications]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('notifications.title')}
        </Text>
        {hasUnread ? (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>{t('notifications.markAll')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerPlaceholder} />
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="notifications-outline" size={64} color="#6B7280" />
          <Text style={styles.emptyText}>
            {t('notifications.empty')}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
            />
          }
        >
          {groupedNotifications.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.group}>
              <Text style={styles.sectionHeader}>
                {group.label}
              </Text>
              {group.notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onPress={() => handleNotificationPress(notification)}
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
