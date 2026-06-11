import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import {
  loadProviderNotificationPreferences,
  saveProviderNotificationPreferences,
  type ProviderNotificationPreferences,
} from '@/utils/providerNotificationPreferences';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
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
import { Toast } from '@/components/Toast';

function parseHHMM(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

function formatToHHMM(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatToDisplay(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const isPM = h >= 12;
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
}

type PrefsKey = keyof ProviderNotificationPreferences;

export default function ProviderNotificationPreferencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const [prefs, setPrefs] = useState<ProviderNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timePicker, setTimePicker] = useState<'from' | 'to' | null>(null);
  const [timePickerTemp, setTimePickerTemp] = useState<Date>(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadProviderNotificationPreferences();
      setPrefs(data);
    } catch {
      setToast({ message: t('providerDashboard.providerNotificationPreferences.saveFailed'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateAndSync = useCallback(
    async (updates: Partial<ProviderNotificationPreferences>) => {
      if (!prefs) return;
      const next = { ...prefs, ...updates };
      setPrefs(next);
      setSaving(true);
      try {
        await saveProviderNotificationPreferences(next);
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch {
        setToast({ message: t('providerDashboard.providerNotificationPreferences.saveFailed'), type: 'error' });
        setPrefs(prefs);
      } finally {
        setSaving(false);
      }
    },
    [prefs]
  );

  const setBool = useCallback(
    (key: PrefsKey, value: boolean) => {
      if (key === 'quietHoursFrom' || key === 'quietHoursTo') return;
      updateAndSync({ [key]: value });
    },
    [updateAndSync]
  );

  const setQuietHours = useCallback(
    (field: 'quietHoursFrom' | 'quietHoursTo', date: Date) => {
      if (!prefs) return;
      const hhmm = formatToHHMM(date);
      updateAndSync({ [field]: hhmm });
      setTimePicker(null);
    },
    [prefs, updateAndSync]
  );

  if (loading || !prefs) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
            accessibilityLabel={t('providerDashboard.providerNotificationPreferences.back')}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('providerDashboard.providerNotificationPreferences.title')}</Text>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityLabel={t('providerDashboard.providerNotificationPreferences.back')}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('providerDashboard.providerNotificationPreferences.title')}</Text>
        {saving && (
          <View style={styles.savingBadge}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Push Notifications */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
          {t('providerDashboard.providerNotificationPreferences.sectionPush')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {[
            {
              key: 'pushNewRequests' as const,
              labelKey: 'providerDashboard.providerNotificationPreferences.pushNewRequests',
              descKey: 'providerDashboard.providerNotificationPreferences.pushNewRequestsDesc',
            },
            {
              key: 'pushMessages' as const,
              labelKey: 'providerDashboard.providerNotificationPreferences.pushMessages',
              descKey: 'providerDashboard.providerNotificationPreferences.pushMessagesDesc',
            },
            {
              key: 'pushPaymentsReceived' as const,
              labelKey: 'providerDashboard.providerNotificationPreferences.pushPaymentsReceived',
              descKey: 'providerDashboard.providerNotificationPreferences.pushPaymentsReceivedDesc',
            },
            {
              key: 'pushReminders' as const,
              labelKey: 'providerDashboard.providerNotificationPreferences.pushReminders',
              descKey: 'providerDashboard.providerNotificationPreferences.pushRemindersDesc',
            },
            {
              key: 'pushReviews' as const,
              labelKey: 'providerDashboard.providerNotificationPreferences.pushReviews',
              descKey: 'providerDashboard.providerNotificationPreferences.pushReviewsDesc',
            },
            {
              key: 'pushPromotions' as const,
              labelKey: 'providerDashboard.providerNotificationPreferences.pushPromotions',
              descKey: 'providerDashboard.providerNotificationPreferences.pushPromotionsDesc',
            },
          ].map((item, idx) => (
            <View
              key={item.key}
              style={[styles.toggleRow, idx < 5 && styles.toggleRowBorder, { borderBottomColor: colors.cardBorder }]}
            >
              <View style={styles.toggleLabelWrap}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{t(item.labelKey)}</Text>
                <Text style={[styles.toggleDesc, { color: colors.textTertiary }]}>{t(item.descKey)}</Text>
              </View>
              <Switch
                value={prefs[item.key]}
                onValueChange={(v) => setBool(item.key, v)}
                trackColor={{ false: colors.cardBorder, true: 'rgba(34, 197, 94, 0.4)' }}
                thumbColor={prefs[item.key] ? '#4ADE80' : colors.textTertiary}
                accessibilityLabel={t(item.labelKey)}
              />
            </View>
          ))}
        </View>

        {/* Sound and Vibration */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
          {t('providerDashboard.providerNotificationPreferences.sectionSoundVibration')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {[
            { key: 'sound' as const, labelKey: 'providerDashboard.providerNotificationPreferences.sound' },
            { key: 'vibration' as const, labelKey: 'providerDashboard.providerNotificationPreferences.vibration' },
            {
              key: 'showOnLockScreen' as const,
              labelKey: 'providerDashboard.providerNotificationPreferences.showOnLockScreen',
            },
          ].map((item, idx) => (
            <View
              key={item.key}
              style={[styles.toggleRow, styles.toggleRowSimple, idx < 2 && styles.toggleRowBorder, { borderBottomColor: colors.cardBorder }]}
            >
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{t(item.labelKey)}</Text>
              <Switch
                value={prefs[item.key]}
                onValueChange={(v) => setBool(item.key, v)}
                trackColor={{ false: colors.cardBorder, true: 'rgba(34, 197, 94, 0.4)' }}
                thumbColor={prefs[item.key] ? '#4ADE80' : colors.textTertiary}
                accessibilityLabel={t(item.labelKey)}
              />
            </View>
          ))}
        </View>

        {/* Quiet Hours */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
          {t('providerDashboard.providerNotificationPreferences.sectionQuietHours')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.toggleRow, styles.toggleRowSimple, styles.toggleRowBorder, { borderBottomColor: colors.cardBorder }]}>
            <View>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                {t('providerDashboard.providerNotificationPreferences.doNotDisturb')}
              </Text>
              <Text style={[styles.toggleDesc, { color: colors.textTertiary }]}>
                {t('providerDashboard.providerNotificationPreferences.doNotDisturbDesc')}
              </Text>
            </View>
            <Switch
              value={prefs.doNotDisturb}
              onValueChange={(v) => setBool('doNotDisturb', v)}
              trackColor={{ false: colors.cardBorder, true: 'rgba(34, 197, 94, 0.4)' }}
              thumbColor={prefs.doNotDisturb ? '#4ADE80' : colors.textTertiary}
              accessibilityLabel={t('providerDashboard.providerNotificationPreferences.doNotDisturb')}
            />
          </View>
          <View style={styles.quietHoursRow}>
            <TouchableOpacity
              style={[styles.timeSlot, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
              onPress={() => {
                setTimePickerTemp(parseHHMM(prefs.quietHoursFrom));
                setTimePicker('from');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.timeSlotLabel, { color: colors.textTertiary }]}>
                {t('providerDashboard.providerNotificationPreferences.quietHoursFrom')}
              </Text>
              <Text style={[styles.timeSlotValue, { color: colors.textPrimary }]}>{formatToDisplay(prefs.quietHoursFrom)}</Text>
            </TouchableOpacity>
            <Text style={[styles.timeArrow, { color: colors.textTertiary }]}>→</Text>
            <TouchableOpacity
              style={[styles.timeSlot, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
              onPress={() => {
                setTimePickerTemp(parseHHMM(prefs.quietHoursTo));
                setTimePicker('to');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.timeSlotLabel, { color: colors.textTertiary }]}>
                {t('providerDashboard.providerNotificationPreferences.quietHoursTo')}
              </Text>
              <Text style={[styles.timeSlotValue, { color: colors.textPrimary }]}>{formatToDisplay(prefs.quietHoursTo)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Email */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
          {t('providerDashboard.providerNotificationPreferences.sectionEmail')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {[
            {
              key: 'emailWeeklySummary' as const,
              labelKey: 'providerDashboard.providerNotificationPreferences.emailWeeklySummary',
            },
            {
              key: 'emailPaymentConfirmations' as const,
              labelKey: 'providerDashboard.providerNotificationPreferences.emailPaymentConfirmations',
            },
            {
              key: 'emailNewsAndTips' as const,
              labelKey: 'providerDashboard.providerNotificationPreferences.emailNewsAndTips',
            },
          ].map((item, idx) => (
            <View
              key={item.key}
              style={[styles.toggleRow, styles.toggleRowSimple, idx < 2 && styles.toggleRowBorder, { borderBottomColor: colors.cardBorder }]}
            >
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{t(item.labelKey)}</Text>
              <Switch
                value={prefs[item.key]}
                onValueChange={(v) => setBool(item.key, v)}
                trackColor={{ false: colors.cardBorder, true: 'rgba(34, 197, 94, 0.4)' }}
                thumbColor={prefs[item.key] ? '#4ADE80' : colors.textTertiary}
                accessibilityLabel={t(item.labelKey)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {timePicker && (
        <>
          {Platform.OS === 'ios' ? (
            <View style={[styles.timePickerModal, { backgroundColor: colors.card }]}>
              <View style={[styles.timePickerActions, { borderBottomColor: colors.cardBorder }]}>
                <TouchableOpacity onPress={() => setTimePicker(null)}>
                  <Text style={[styles.timePickerCancel, { color: colors.textSecondary }]}>{t('providerDashboard.providerEditProfile.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setQuietHours(
                      timePicker === 'from' ? 'quietHoursFrom' : 'quietHoursTo',
                      timePickerTemp
                    );
                  }}
                >
                  <Text style={[styles.timePickerDone, { color: colors.primary }]}>OK</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={timePickerTemp}
                mode="time"
                display="spinner"
                onChange={(_, date) => {
                  if (date) setTimePickerTemp(date);
                }}
              />
            </View>
          ) : (
            <DateTimePicker
              value={
                timePicker === 'from'
                  ? parseHHMM(prefs.quietHoursFrom)
                  : parseHHMM(prefs.quietHoursTo)
              }
              mode="time"
              display="default"
              onChange={(_, date) => {
                if (date) {
                  setQuietHours(
                    timePicker === 'from' ? 'quietHoursFrom' : 'quietHoursTo',
                    date
                  );
                }
                setTimePicker(null);
              }}
            />
          )}
        </>
      )}

      {toast && (
        <Toast
          message={toast.message}
          visible={true}
          onHide={() => setToast(null)}
          type={toast.type ?? 'error'}
          duration={3000}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  savingBadge: {
    marginLeft: 8,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  toggleRowBorder: {
    borderBottomWidth: 1,
  },
  toggleRowSimple: {
    paddingVertical: 4,
  },
  toggleLabelWrap: {
    flex: 1,
    paddingRight: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  quietHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  timeSlot: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeSlotLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  timeSlotValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeArrow: {
    marginTop: 20,
  },
  timePickerModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  timePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  timePickerCancel: {
    fontSize: 16,
  },
  timePickerDone: {
    fontSize: 16,
    fontWeight: '600',
  },
});
