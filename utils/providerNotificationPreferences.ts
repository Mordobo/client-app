import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSettings, updateSettings, type UpdateSettingsPayload } from '@/services/settings';

const STORAGE_KEY = 'NOTIFICATION_PREFS_PROVIDER';

export interface ProviderNotificationPreferences {
  pushNewRequests: boolean;
  pushMessages: boolean;
  pushPaymentsReceived: boolean;
  pushReminders: boolean;
  pushReviews: boolean;
  pushPromotions: boolean;
  sound: boolean;
  vibration: boolean;
  showOnLockScreen: boolean;
  doNotDisturb: boolean;
  quietHoursFrom: string;
  quietHoursTo: string;
  emailWeeklySummary: boolean;
  emailPaymentConfirmations: boolean;
  emailNewsAndTips: boolean;
}

const DEFAULT_PREFS: ProviderNotificationPreferences = {
  pushNewRequests: true,
  pushMessages: true,
  pushPaymentsReceived: true,
  pushReminders: true,
  pushReviews: false,
  pushPromotions: false,
  sound: true,
  vibration: true,
  showOnLockScreen: true,
  doNotDisturb: true,
  quietHoursFrom: '22:00',
  quietHoursTo: '07:00',
  emailWeeklySummary: true,
  emailPaymentConfirmations: true,
  emailNewsAndTips: false,
};

function toUpdateSettingsPayload(prefs: ProviderNotificationPreferences): UpdateSettingsPayload {
  const anyPush =
    prefs.pushNewRequests ||
    prefs.pushMessages ||
    prefs.pushPaymentsReceived ||
    prefs.pushReminders ||
    prefs.pushReviews ||
    prefs.pushPromotions;
  const anyEmail =
    prefs.emailWeeklySummary || prefs.emailPaymentConfirmations || prefs.emailNewsAndTips;
  return {
    push_notifications: anyPush,
    chat_messages: prefs.pushMessages,
    payment_receipts: prefs.pushPaymentsReceived,
    booking_reminders: prefs.pushReminders,
    promotions: prefs.pushPromotions,
    email_notifications: anyEmail,
  };
}

export async function loadProviderNotificationPreferences(): Promise<ProviderNotificationPreferences> {
  try {
    const [apiSettings, stored] = await Promise.all([
      getSettings().catch(() => null),
      AsyncStorage.getItem(STORAGE_KEY),
    ]);

    const merged: ProviderNotificationPreferences = {
      ...DEFAULT_PREFS,
      ...(apiSettings?.settings && {
        pushNewRequests: apiSettings.settings.push_notifications,
        pushMessages: apiSettings.settings.chat_messages,
        pushPaymentsReceived: apiSettings.settings.payment_receipts,
        pushReminders: apiSettings.settings.booking_reminders,
        pushPromotions: apiSettings.settings.promotions,
        emailWeeklySummary: apiSettings.settings.email_notifications,
        emailPaymentConfirmations: apiSettings.settings.email_notifications,
        emailNewsAndTips: apiSettings.settings.email_notifications,
      }),
    };

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<ProviderNotificationPreferences>;
        Object.assign(merged, parsed);
      } catch {
        // ignore invalid stored json
      }
    }
    return merged;
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function saveProviderNotificationPreferences(
  prefs: ProviderNotificationPreferences
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  const payload = toUpdateSettingsPayload(prefs);
  await updateSettings(payload);
}
