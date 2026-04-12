import { useContext, useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { ThemeContext } from '@/contexts/ThemeContext';

/**
 * Web: use ThemeContext when available so user theme preference is respected.
 * Fallback to system and hydrate for static rendering.
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  try {
    const ctx = useContext(ThemeContext);
    if (ctx) {
      return ctx.colorScheme;
    }
  } catch {
    // ThemeContext not available
  }

  const systemScheme = useRNColorScheme();
  if (hasHydrated && systemScheme) {
    return systemScheme;
  }
  return 'light';
}
