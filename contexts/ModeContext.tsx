import { getSettings, updateSettings } from '@/services/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

export type UserMode = 'client' | 'provider';

interface ModeContextType {
  mode: UserMode;
  setMode: (mode: UserMode) => Promise<void>;
  isLoading: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

const MODE_STORAGE_KEY = '@mordobo_user_mode';

export const useMode = () => {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within ModeProvider');
  }
  return context;
};

interface ModeProviderProps {
  children: ReactNode;
  isAuthenticated: boolean;
}

export const ModeProvider: React.FC<ModeProviderProps> = ({ children, isAuthenticated }) => {
  const [mode, setModeState] = useState<UserMode>('client');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadModeFromSettings();
    } else {
      // Load from storage for unauthenticated users
      loadModeFromStorage();
    }
  }, [isAuthenticated]);

  const loadModeFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(MODE_STORAGE_KEY);
      if (stored) {
        const parsed = stored as UserMode;
        if (parsed === 'client' || parsed === 'provider') {
          setModeState(parsed);
        }
      }
    } catch (error) {
      console.error('[ModeContext] Failed to load mode from storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadModeFromSettings = async () => {
    try {
      setIsLoading(true);
      const response = await getSettings();
      const userMode = response.settings.user_mode;
      if (userMode === 'client' || userMode === 'provider') {
        setModeState(userMode);
        // Also save to storage for quick access
        await AsyncStorage.setItem(MODE_STORAGE_KEY, userMode);
      } else {
        // Default to client if not set
        await loadModeFromStorage();
      }
    } catch (error: unknown) {
      // Silently handle token expiration errors - mode loading is not critical
      // Only log non-authentication errors
      const errorObj = error as { status?: number };
      if (errorObj?.status !== 401 && errorObj?.status !== 403) {
        console.error('[ModeContext] Failed to load mode from settings:', error);
      }
      // Fallback to storage
      await loadModeFromStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const setMode = useCallback(async (newMode: UserMode) => {
    const previousMode = mode;
    try {
      // Update local state optimistically
      setModeState(newMode);
      await AsyncStorage.setItem(MODE_STORAGE_KEY, newMode);
      
      // Sync with backend if authenticated
      if (isAuthenticated) {
        try {
          await updateSettings({ user_mode: newMode });
        } catch (error) {
          console.error('[ModeContext] Failed to sync mode to backend:', error);
          // Revert local state on backend error
          setModeState(previousMode);
          await AsyncStorage.setItem(MODE_STORAGE_KEY, previousMode);
          // Re-throw error so caller can handle it
          throw error;
        }
      }
    } catch (error) {
      console.error('[ModeContext] Failed to save mode:', error);
      // Re-throw error so caller can handle it
      throw error;
    }
  }, [isAuthenticated, mode]);

  return (
    <ModeContext.Provider value={{ mode, setMode, isLoading }}>
      {children}
    </ModeContext.Provider>
  );
};
