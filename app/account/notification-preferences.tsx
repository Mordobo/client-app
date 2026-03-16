import { Toast } from '@/components/Toast';
import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import { getSettings, updateSettings, type UserSettings, type UpdateSettingsPayload } from '@/services/settings';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SettingKey = keyof Pick<
  UserSettings,
  | 'push_notifications'
  | 'email_notifications'
  | 'sms_notifications'
  | 'booking_reminders'
  | 'promotions'
  | 'chat_messages'
  | 'payment_receipts'
>;

const TOGGLE_ITEMS: { key: SettingKey; labelKey: string }[] = [
  { key: 'push_notifications', labelKey: 'settings.pushNotifications' },
  { key: 'email_notifications', labelKey: 'settings.emailNotifications' },
  { key: 'sms_notifications', labelKey: 'settings.smsNotifications' },
  { key: 'booking_reminders', labelKey: 'settings.bookingReminders' },
  { key: 'promotions', labelKey: 'settings.promotions' },
  { key: 'chat_messages', labelKey: 'settings.chatMessages' },
  { key: 'payment_receipts', labelKey: 'settings.paymentReceipts' },
];

export default function ClientNotificationPreferencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getSettings();
      setSettings(response.settings);
    } catch {
      setToast({ message: t('errors.getSettingsFailed'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateOne = useCallback(
    async (key: SettingKey, value: boolean) => {
      if (!settings) return;
      const payload: UpdateSettingsPayload = { [key]: value };
      const next = { ...settings, [key]: value };
      setSettings(next);
      setSaving(true);
      try {
        await updateSettings(payload);
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch {
        setToast({ message: t('errors.updateSettingsFailed'), type: 'error' });
        setSettings(settings);
      } finally {
        setSaving(false);
      }
    },
    [settings]
  );

  if (loading || !settings) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 20, backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('settings.notifications')}</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 20, backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('settings.notifications')}</Text>
        {saving ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ width: 32 }} />
        ) : (
          <View style={styles.headerPlaceholder} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t('settings.notifications')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {TOGGLE_ITEMS.map((item, idx) => (
            <View
              key={item.key}
              style={[styles.toggleRow, idx < TOGGLE_ITEMS.length - 1 && styles.toggleRowBorder, idx < TOGGLE_ITEMS.length - 1 && { borderBottomColor: colors.cardBorder }]}
            >
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{t(item.labelKey)}</Text>
              <Switch
                value={settings[item.key]}
                onValueChange={(v) => updateOne(item.key, v)}
                trackColor={{ false: colors.cardBorder, true: '#22C55E' }}
                thumbColor="#fff"
                accessibilityLabel={t(item.labelKey)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {toast && (
        <Toast
          message={toast.message}
          visible={true}
          onHide={() => setToast(null)}
          type={toast.type}
          duration={3000}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 32,
    justifyContent: 'center',
    padding: 4,
  },
  title: { flex: 1, fontSize: 20, fontWeight: '600', textAlign: 'center' },
  headerPlaceholder: { width: 32 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleRowBorder: {
    borderBottomWidth: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
});
