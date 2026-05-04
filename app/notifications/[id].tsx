import { useThemeColors } from '@/hooks/useThemeColors';
import { t, getLocale } from '@/i18n';
import { useMode } from '@/contexts/ModeContext';
import {
  fetchNotifications,
  getNotificationCategory,
  type Notification,
  type NotificationCategory,
  type NotificationType,
} from '@/services/notifications';
import { getLocalizedNotificationDisplay } from '@/utils/notificationDisplay';
import { resolveNotificationRelatedHref, withNotificationNavRefresh } from '@/utils/notificationNavigation';
import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PROVIDER_CATEGORY_COLORS: Record<NotificationCategory, string> = {
  jobs: '#8B5CF6',
  payments: '#22C55E',
  reviews: '#EAB308',
  system: '#3B82F6',
};

const PROVIDER_CATEGORY_ICONS: Record<NotificationCategory, keyof typeof Ionicons.glyphMap> = {
  jobs: 'briefcase',
  payments: 'wallet',
  reviews: 'star',
  system: 'notifications',
};

function getClientEmoji(type: NotificationType): { icon: string; bg: string } {
  switch (type) {
    case 'booking_confirmed':
      return { icon: '✅', bg: '#10B981' };
    case 'booking_cancelled':
      return { icon: '❌', bg: '#EF4444' };
    case 'new_message':
      return { icon: '💬', bg: '#3B82F6' };
    case 'rate_service':
      return { icon: '⭐', bg: '#F59E0B' };
    case 'offer':
      return { icon: '🎁', bg: '#EC4899' };
    case 'payment_processed':
    case 'payment_received':
    case 'new_paid_booking':
      return { icon: '💳', bg: '#10B981' };
    case 'provider_on_way':
    case 'job_started':
      return { icon: '📍', bg: '#8B5CF6' };
    case 'quote_received':
    case 'quote_approved':
      return { icon: '📋', bg: '#6366F1' };
    case 'new_booking_request':
      return { icon: '📩', bg: '#8B5CF6' };
    case 'new_review':
    case 'job_pending_review':
    case 'job_completed':
      return { icon: '⭐', bg: '#F59E0B' };
    case 'refund_issued':
      return { icon: '↩️', bg: '#10B981' };
    default:
      return { icon: '🔔', bg: '#6B7280' };
  }
}

export default function NotificationDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { mode } = useMode();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const notificationId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;

  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openingRelated, setOpeningRelated] = useState(false);

  const audience = mode === 'provider' ? 'provider' : 'client';

  const load = useCallback(async () => {
    if (!notificationId) {
      setLoadError(t('notifications.detail.notFound'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const list = await fetchNotifications();
      const found = list.find((n) => n.id === notificationId) ?? null;
      setNotification(found);
      if (!found) {
        setLoadError(t('notifications.detail.notFound'));
      }
    } catch {
      setLoadError(t('notifications.detail.loadError'));
      setNotification(null);
    } finally {
      setLoading(false);
    }
  }, [notificationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const display = useMemo(() => {
    if (!notification) return null;
    return getLocalizedNotificationDisplay(notification, audience);
  }, [notification, audience]);

  const formattedDate = useMemo(() => {
    if (!notification) return '';
    const locale = getLocale() === 'es' ? 'es-ES' : 'en-US';
    return new Date(notification.created_at).toLocaleString(locale, {
      dateStyle: 'full',
      timeStyle: 'short',
    });
  }, [notification]);

  const providerCategory = useMemo(
    () => (notification && mode === 'provider' ? getNotificationCategory(notification.type) : null),
    [notification, mode]
  );

  const onOpenRelated = useCallback(async () => {
    if (!notification) return;
    setOpeningRelated(true);
    try {
      const href = await resolveNotificationRelatedHref(notification, mode);
      if (href) {
        const hrefWithBust = withNotificationNavRefresh(href);
        router.replace(hrefWithBust as Href);
      } else {
        Alert.alert(t('common.error'), t('notifications.detail.noRelated'));
      }
    } catch {
      Alert.alert(t('common.error'), t('notifications.detail.loadError'));
    } finally {
      setOpeningRelated(false);
    }
  }, [notification, mode, router]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          paddingHorizontal: 16,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        },
        backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
        headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: colors.textPrimary },
        center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
        scroll: { flex: 1 },
        scrollContent: { padding: 24, paddingBottom: 40 + insets.bottom },
        iconWrap: {
          width: 72,
          height: 72,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          alignSelf: 'center',
        },
        emoji: { fontSize: 36 },
        title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
        body: { fontSize: 16, lineHeight: 24, color: colors.textSecondary, marginBottom: 24, textAlign: 'center' },
        dateLabel: { fontSize: 12, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 4 },
        dateValue: { fontSize: 15, color: colors.textSecondary, marginBottom: 20, textAlign: 'center' },
        hint: {
          fontSize: 14,
          lineHeight: 20,
          color: colors.textTertiary,
          textAlign: 'center',
          marginBottom: 16,
          paddingHorizontal: 8,
        },
        primaryBtn: {
          backgroundColor: colors.primary,
          paddingVertical: 16,
          borderRadius: 12,
          alignItems: 'center',
        },
        primaryBtnDisabled: { opacity: 0.6 },
        primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
        muted: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
      }),
    [colors, insets.bottom]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('notifications.detail.screenTitle')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loadError && !notification ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{loadError}</Text>
          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20, paddingHorizontal: 24 }]} onPress={() => void load()}>
            <Text style={styles.primaryBtnText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : notification && display ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {mode === 'provider' && providerCategory ? (
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: `${PROVIDER_CATEGORY_COLORS[providerCategory]}26`,
                },
              ]}
            >
              <Ionicons
                name={PROVIDER_CATEGORY_ICONS[providerCategory]}
                size={36}
                color={PROVIDER_CATEGORY_COLORS[providerCategory]}
              />
            </View>
          ) : (
            <View style={[styles.iconWrap, { backgroundColor: `${getClientEmoji(notification.type).bg}26` }]}>
              <Text style={styles.emoji}>{getClientEmoji(notification.type).icon}</Text>
            </View>
          )}

          <Text style={styles.title}>{display.title}</Text>
          <Text style={styles.body}>{display.message}</Text>

          <Text style={styles.dateLabel}>{t('notifications.detail.dateLabel')}</Text>
          <Text style={styles.dateValue}>{formattedDate}</Text>

          <Text style={styles.hint}>{t('notifications.detail.openRelatedHint')}</Text>

          <TouchableOpacity
            style={[styles.primaryBtn, openingRelated && styles.primaryBtnDisabled]}
            onPress={() => void onOpenRelated()}
            disabled={openingRelated}
            accessibilityRole="button"
            accessibilityLabel={t('notifications.detail.openRelated')}
            accessibilityHint={t('notifications.detail.openRelatedHint')}
          >
            {openingRelated ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>{t('notifications.detail.openRelated')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Text style={styles.muted}>{t('notifications.detail.notFound')}</Text>
        </View>
      )}
    </View>
  );
}
