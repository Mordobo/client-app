import { Toast } from '@/components/Toast';
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext';
import { t } from '@/i18n';
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

const I18N = 'providerDashboard.providerSettings.themeScreen';
const BACKGROUND = '#1a1a2e';
const HEADER_BG = '#252542';
const CARD_BG = '#252542';
const CARD_BORDER = '#374151';
const ACCENT = '#3b82f6';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#9ca3af';

interface ThemeOption {
  value: ThemePreference;
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  descKey: string;
}

const THEMES: ThemeOption[] = [
  { value: 'dark', icon: 'moon', labelKey: `${I18N}.dark`, descKey: `${I18N}.darkDesc` },
  { value: 'light', icon: 'sunny', labelKey: `${I18N}.light`, descKey: `${I18N}.lightDesc` },
  { value: 'system', icon: 'phone-portrait-outline', labelKey: `${I18N}.system`, descKey: `${I18N}.systemDesc` },
];

export default function ClientThemeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: currentTheme, setTheme: setThemeContext } = useTheme();

  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>(currentTheme);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadTheme = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getSettings();
      setSelectedTheme(response.settings.theme);
    } catch {
      setSelectedTheme(currentTheme);
    } finally {
      setLoading(false);
    }
  }, [currentTheme]);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const handleSelect = useCallback(async (newTheme: ThemePreference) => {
    if (newTheme === selectedTheme) return;

    const previous = selectedTheme;
    try {
      setUpdating(true);
      setSelectedTheme(newTheme);
      await setThemeContext(newTheme);
      await updateSettings({ theme: newTheme });
      setToast({ message: t(`${I18N}.themeUpdated`), type: 'success' });
    } catch {
      setSelectedTheme(previous);
      await setThemeContext(previous);
      setToast({ message: t('errors.updateSettingsFailed'), type: 'error' });
    } finally {
      setUpdating(false);
    }
  }, [selectedTheme, setThemeContext]);

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
          THEMES.map((option) => {
            const isSelected = option.value === selectedTheme;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                activeOpacity={0.8}
                onPress={() => handleSelect(option.value)}
                disabled={updating}
              >
                <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
                  <Ionicons name={option.icon} size={22} color={isSelected ? ACCENT : TEXT_SECONDARY} />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{t(option.labelKey)}</Text>
                  <Text style={styles.optionDesc}>{t(option.descKey)}</Text>
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
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  iconBoxSelected: {
    backgroundColor: '#3b82f620',
  },
  optionText: { flex: 1 },
  optionLabel: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '500' },
  optionDesc: { color: TEXT_SECONDARY, fontSize: 13, marginTop: 2 },
  currentBadge: {
    color: ACCENT, fontSize: 12, fontWeight: '600', marginTop: 4,
  },
});
