import { getSettings } from '@/services/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemePreference;
  colorScheme: 'light' | 'dark';
  setTheme: (theme: ThemePreference) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@mordobo_theme_preference';

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
  isAuthenticated: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, isAuthenticated }) => {
  const systemColorScheme = useSystemColorScheme();
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Calculate effective color scheme based on theme preference
  // This will automatically update when systemColorScheme changes
  const colorScheme: 'light' | 'dark' = 
    theme === 'system' 
      ? (systemColorScheme ?? 'light')
      : theme;

  useEffect(() => {
    if (isAuthenticated) {
      loadThemeFromSettings();
    } else {
      // Load from storage for unauthenticated users
      loadThemeFromStorage();
    }
  }, [isAuthenticated]);

  const loadThemeFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ThemePreference;
        if (['light', 'dark', 'system'].includes(parsed)) {
          setThemeState(parsed);
        }
      }
    } catch (error) {
      console.error('[ThemeContext] Failed to load theme from storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadThemeFromSettings = async () => {
    try {
      setIsLoading(true);
      const response = await getSettings();
      const userTheme = response.settings.theme;
      if (['light', 'dark', 'system'].includes(userTheme)) {
        setThemeState(userTheme);
        // Also save to storage for quick access
        await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(userTheme));
      }
    } catch (error: any) {
      // Silently handle token expiration errors - theme loading is not critical
      // Only log non-authentication errors
      if (error?.status !== 401 && error?.status !== 403) {
        console.error('[ThemeContext] Failed to load theme from settings:', error);
      }
      // Fallback to storage
      await loadThemeFromStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = async (newTheme: ThemePreference) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(newTheme));
    } catch (error) {
      console.error('[ThemeContext] Failed to save theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, colorScheme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};
