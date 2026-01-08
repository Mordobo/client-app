/**
 * Utility functions for creating theme-aware styles
 */

export const getThemeColors = (isDark: boolean) => ({
  // Backgrounds
  background: isDark ? '#151718' : '#F9FAFB',
  surface: isDark ? '#1F2937' : '#FFFFFF',
  surfaceSecondary: isDark ? '#374151' : '#F3F4F6',
  
  // Text
  textPrimary: isDark ? '#ECEDEE' : '#1F2937',
  textSecondary: isDark ? '#9BA1A6' : '#6B7280',
  textTertiary: isDark ? '#6B7280' : '#9CA3AF',
  
  // Borders
  border: isDark ? '#374151' : '#E5E7EB',
  borderLight: isDark ? '#4B5563' : '#F3F4F6',
  
  // Icons
  icon: isDark ? '#9BA1A6' : '#374151',
  iconSecondary: isDark ? '#6B7280' : '#9CA3AF',
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
