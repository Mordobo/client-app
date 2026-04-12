import { useColorScheme } from '@/hooks/use-color-scheme';
import { getThemeColors } from '@/utils/themeStyles';

/**
 * Returns theme color tokens for the current color scheme (light/dark).
 * Use this in components instead of hardcoded hex values so theme switching works.
 */
export function useThemeColors() {
  const colorScheme = useColorScheme();
  return getThemeColors(colorScheme === 'dark');
}
