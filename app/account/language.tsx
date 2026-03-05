import { Toast } from '@/components/Toast';
import { t, setLocale, getLocale } from '@/i18n';
import { getSettings, updateSettings } from '@/services/settings';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const I18N = 'providerDashboard.providerSettings.languageScreen';
const BACKGROUND = '#1a1a2e';
const HEADER_BG = '#252542';
const CARD_BG = '#252542';
const CARD_BORDER = '#374151';
const ACCENT = '#3b82f6';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#9ca3af';

type Language = 'en' | 'es';

interface LanguageOption {
  code: Language;
  labelKey: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', labelKey: `${I18N}.english`, flag: '🇺🇸' },
  { code: 'es', labelKey: `${I18N}.spanish`, flag: '🇪🇸' },
];

export default function ClientLanguageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentLanguage, setCurrentLanguage] = useState<Language>(getLocale() as Language);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadLanguage = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getSettings();
      setCurrentLanguage(response.settings.language);
    } catch {
      // Fallback to local locale
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLanguage();
  }, [loadLanguage]);

  const handleSelect = useCallback(async (lang: Language) => {
    if (lang === currentLanguage) return;

    const previous = currentLanguage;
    try {
      setUpdating(true);
      setCurrentLanguage(lang);
      setLocale(lang);
      await updateSettings({ language: lang });
      setToast({ message: t(`${I18N}.languageUpdated`), type: 'success' });
    } catch {
      setCurrentLanguage(previous);
      setLocale(previous);
      setToast({ message: t('errors.updateSettingsFailed'), type: 'error' });
    } finally {
      setUpdating(false);
    }
  }, [currentLanguage]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 20 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>{t(`${I18N}.title`)}</Text>
        {updating ? <ActivityIndicator size="small" color={ACCENT} style={{ width: 32 }} /> : <View style={styles.headerPlaceholder} />}
      </View>

      <Text style={styles.subtitle}>{t(`${I18N}.subtitle`)}</Text>

      <View style={styles.optionsList}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : (
          LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLanguage;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                activeOpacity={0.8}
                onPress={() => handleSelect(lang.code)}
                disabled={updating}
              >
                <Text style={styles.optionFlag}>{lang.flag}</Text>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{t(lang.labelKey)}</Text>
                  {isSelected && (
                    <Text style={styles.currentBadge}>{t(`${I18N}.current`)}</Text>
                  )}
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={ACCENT} />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <Toast
        message={toast?.message ?? ''}
        visible={toast !== null}
        onHide={() => setToast(null)}
        type={toast?.type ?? 'success'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 20, backgroundColor: HEADER_BG,
  },
  backButton: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '600', textAlign: 'center', color: TEXT_PRIMARY },
  headerPlaceholder: { width: 32 },
  subtitle: {
    color: TEXT_SECONDARY, fontSize: 14,
    paddingHorizontal: 20, marginBottom: 20,
  },
  optionsList: { paddingHorizontal: 20, gap: 10 },
  centered: { paddingVertical: 40, alignItems: 'center' },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 12, backgroundColor: CARD_BG,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  optionCardSelected: {
    borderColor: ACCENT, backgroundColor: '#3b82f620',
  },
  optionFlag: { fontSize: 28, marginRight: 14 },
  optionText: { flex: 1 },
  optionLabel: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '500' },
  currentBadge: {
    color: ACCENT, fontSize: 12, fontWeight: '600', marginTop: 2,
  },
});
