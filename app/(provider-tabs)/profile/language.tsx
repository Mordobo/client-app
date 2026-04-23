import { Toast } from '@/components/Toast';
import { useThemeColors } from '@/hooks/useThemeColors';
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

export default function ProviderLanguageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const [currentLanguage, setCurrentLanguage] = useState<Language>(getLocale() as Language);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadLanguage = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getSettings();
      const lang = response.settings.language;
      setCurrentLanguage(lang);
      if (lang === 'es' || lang === 'en') {
        setLocale(lang);
      }
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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t(`${I18N}.title`)}</Text>
        {updating && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 'auto' }} />}
      </View>

      <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{t(`${I18N}.subtitle`)}</Text>

      <View style={styles.optionsList}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLanguage;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.optionCard, isSelected && styles.optionCardSelected, { backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.08)' : colors.card, borderColor: isSelected ? colors.primary : colors.cardBorder }]}
                activeOpacity={0.8}
                onPress={() => handleSelect(lang.code)}
                disabled={updating}
              >
                <Text style={styles.optionFlag}>{lang.flag}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{t(lang.labelKey)}</Text>
                  {isSelected && (
                    <Text style={[styles.currentBadge, { color: colors.primary }]}>{t(`${I18N}.current`)}</Text>
                  )}
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 8,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: {
    fontSize: 14,
    paddingHorizontal: 20, marginBottom: 20,
  },
  optionsList: { paddingHorizontal: 20, gap: 10 },
  centered: { paddingVertical: 40, alignItems: 'center' },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionCardSelected: {},
  optionFlag: { fontSize: 28, marginRight: 14 },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 16, fontWeight: '500' },
  currentBadge: {
    fontSize: 12, fontWeight: '600', marginTop: 2,
  },
});
