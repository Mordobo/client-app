import { Toast } from '@/components/Toast';
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import { getSettings, updateSettings } from '@/services/settings';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const I18N = 'providerDashboard.providerSettings.themeScreen';

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
  const colors = useThemeColors();
  const { theme: currentTheme, setTheme: setThemeContext } = useTheme();
  const currentThemeRef = useRef(currentTheme);
  currentThemeRef.current = currentTheme;

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
      setSelectedTheme(currentThemeRef.current);
    } finally {
      setLoading(false);
    }
  }, []);

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 20, backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t(`${I18N}.title`)}</Text>
        {updating ? <ActivityIndicator size="small" color={colors.primary} style={{ width: 32 }} /> : <View style={styles.headerPlaceholder} />}
      </View>

      <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{t(`${I18N}.subtitle`)}</Text>

      <View style={styles.optionsList}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          THEMES.map((option) => {
            const isSelected = option.value === selectedTheme;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.optionCard, isSelected && styles.optionCardSelected, { backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.08)' : colors.card, borderColor: isSelected ? colors.primary : colors.cardBorder }]}
                activeOpacity={0.8}
                onPress={() => handleSelect(option.value)}
                disabled={updating}
              >
                <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
                  <Ionicons name={option.icon} size={22} color={isSelected ? colors.primary : colors.textTertiary} />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{t(option.labelKey)}</Text>
                  <Text style={[styles.optionDesc, { color: colors.textTertiary }]}>{t(option.descKey)}</Text>
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
  optionCardSelected: {},
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  iconBoxSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 16, fontWeight: '500' },
  optionDesc: { fontSize: 13, marginTop: 2 },
  currentBadge: {
    fontSize: 12, fontWeight: '600', marginTop: 4,
  },
});
