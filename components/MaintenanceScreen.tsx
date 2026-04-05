import MordoboLogo from '@/components/MordoboLogo';
import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MaintenanceScreenProps {
  onRetry: () => void;
  isChecking?: boolean;
}

export function MaintenanceScreen({ onRetry, isChecking = false }: MaintenanceScreenProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          backgroundColor: colors.background,
        },
      ]}
    >
      <MordoboLogo size={72} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('maintenance.title')}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{t('maintenance.message')}</Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={onRetry}
        disabled={isChecking}
        accessibilityRole="button"
        accessibilityLabel={t('maintenance.checkAgain')}
      >
        {isChecking ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonLabel}>{t('maintenance.checkAgain')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    marginTop: 28,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  button: {
    marginTop: 32,
    minWidth: 200,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
