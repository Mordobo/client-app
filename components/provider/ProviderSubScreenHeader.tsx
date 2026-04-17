import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProviderSubScreenHeaderProps {
  title: string;
  onBack: () => void;
  accessibilityLabelBack: string;
}

export function ProviderSubScreenHeader({
  title,
  onBack,
  accessibilityLabelBack,
}: ProviderSubScreenHeaderProps) {
  const colors = useThemeColors();
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
        onPress={onBack}
        activeOpacity={0.8}
        accessibilityLabel={accessibilityLabelBack}
        accessibilityRole="button"
      >
        <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
});
