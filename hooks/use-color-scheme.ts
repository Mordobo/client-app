import { useTheme } from '@/contexts/ThemeContext';
import { useColorScheme as useSystemColorScheme } from 'react-native';

/**
 * Hook to get the current color scheme.
 * Uses the user's theme preference from ThemeContext if available,
 * otherwise falls back to the system color scheme.
 */
export function useColorScheme(): 'light' | 'dark' {
  try {
    const { colorScheme } = useTheme();
    return colorScheme;
  } catch {
    // If ThemeContext is not available, fall back to system
    const systemScheme = useSystemColorScheme();
    return systemScheme ?? 'light';
  }
}
