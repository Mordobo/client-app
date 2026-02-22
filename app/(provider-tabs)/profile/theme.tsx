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
const BACKGROUND = '#12121A';
const CARD_BG = '#1E1B2E';
const CARD_BORDER = 'rgba(61, 51, 112, 0.2)';
const ACCENT = '#8B5CF6';

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

export default function ProviderThemeScreen() {
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.title}>{t(`${I18N}.title`)}</Text>
        {updating && <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 'auto' }} />}
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
                  <Ionicons name={option.icon} size={22} color={isSelected ? ACCENT : 'rgba(255,255,255,0.5)'} />
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
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 8,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  subtitle: {
    color: 'rgba(255,255,255,0.4)', fontSize: 14,
    paddingHorizontal: 20, marginBottom: 20,
  },
  optionsList: { paddingHorizontal: 20, gap: 10 },
  centered: { paddingVertical: 40, alignItems: 'center' },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 14, backgroundColor: CARD_BG,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  optionCardSelected: {
    borderColor: ACCENT, backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  iconBoxSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  optionText: { flex: 1 },
  optionLabel: { color: '#fff', fontSize: 16, fontWeight: '500' },
  optionDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
  currentBadge: {
    color: ACCENT, fontSize: 12, fontWeight: '600', marginTop: 4,
  },
});
