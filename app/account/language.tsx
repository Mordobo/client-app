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

export default function ClientLanguageScreen() {
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 20, backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t(`${I18N}.title`)}</Text>
        {updating ? <ActivityIndicator size="small" color={colors.primary} style={{ width: 32 }} /> : <View style={styles.headerPlaceholder} />}
      </View>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t(`${I18N}.subtitle`)}</Text>

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
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  isSelected && { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
                ]}
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
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 20,
  },
  backButton: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '600', textAlign: 'center' },
  headerPlaceholder: { width: 32 },
  subtitle: {
    fontSize: 14,
    paddingHorizontal: 20, marginBottom: 20,
  },
  optionsList: { paddingHorizontal: 20, gap: 10 },
  centered: { paddingVertical: 40, alignItems: 'center' },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionFlag: { fontSize: 28, marginRight: 14 },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 16, fontWeight: '500' },
  currentBadge: {
    fontSize: 12, fontWeight: '600', marginTop: 2,
  },
});
