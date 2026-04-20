/**
 * Utility functions for creating theme-aware styles
 */

export type ThemeColors = ReturnType<typeof getThemeColors>;

export const getThemeColors = (isDark: boolean) => ({
  // Backgrounds (screen and cards — match app dark palette, light equivalents)
  background: isDark ? '#12121A' : '#F9FAFB',
  screenBackground: isDark ? '#12121A' : '#F9FAFB',
  surface: isDark ? '#1F2937' : '#FFFFFF',
  surfaceSecondary: isDark ? '#374151' : '#F3F4F6',
  card: isDark ? '#1E1B2E' : '#FFFFFF',
  cardBorder: isDark ? 'rgba(61, 51, 112, 0.3)' : 'rgba(0, 0, 0, 0.08)',

  // Text
  textPrimary: isDark ? '#ECEDEE' : '#1F2937',
  textSecondary: isDark ? '#9BA1A6' : '#6B7280',
  textTertiary: isDark ? '#6B7280' : '#9CA3AF',
  textOnDark: isDark ? 'rgba(255,255,255,0.8)' : '#1F2937',

  // Borders
  border: isDark ? '#374151' : '#E5E7EB',
  borderLight: isDark ? '#4B5563' : '#F3F4F6',

  // Icons & accents
  icon: isDark ? '#9BA1A6' : '#374151',
  iconSecondary: isDark ? '#6B7280' : '#9CA3AF',
  primary: '#8B5CF6',
  /** Solid fill for primary buttons (modals, CTAs) — darker in light mode for WCAG contrast with white label text */
  buttonPrimaryBg: isDark ? '#8B5CF6' : '#5B21B6',
  tabBarActive: '#FB923C',
  tabBarBg: isDark ? 'rgba(30, 27, 46, 0.95)' : '#FFFFFF',
  tabBarBorder: isDark ? 'rgba(61, 51, 112, 0.5)' : 'rgba(0, 0, 0, 0.08)',
  tabBarInactive: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.55)',
});

export const createThemeStyles = (isDark: boolean) => {
  const colors = getThemeColors(isDark);
  
  return {
    container: {
      backgroundColor: colors.background,
    },
    surface: {
      backgroundColor: colors.surface,
    },
    textPrimary: {
      color: colors.textPrimary,
    },
    textSecondary: {
      color: colors.textSecondary,
    },
    textTertiary: {
      color: colors.textTertiary,
    },
    border: {
      borderColor: colors.border,
    },
    borderLight: {
      borderColor: colors.borderLight,
    },
    icon: {
      color: colors.icon,
    },
    iconSecondary: {
      color: colors.iconSecondary,
    },
  };
};
