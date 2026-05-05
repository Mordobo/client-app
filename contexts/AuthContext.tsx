import { t } from '@/i18n';
import { ApiError, refreshTokens, setTokenUpdateCallback, clearTokenState } from '@/services/auth';
import { getProfile } from '@/services/profile';
import { queryClient } from '@/services/queryClient';
import { authEvents } from '@/utils/authEvents';
import { applyCachedUserLanguage } from '@/utils/userLanguagePreference';
import { getTimeUntilExpiryMs, isTokenExpiringSoon } from '@/utils/tokenUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

let isLoggingOut = false;

const REFRESH_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes before expiry
const REFRESH_SAFETY_MARGIN = 0.80; // refresh at 80% of token lifetime

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  country?: string;
  gender?: 'male' | 'female';
  dateOfBirth?: string;
  provider?: 'email' | 'google' | 'facebook' | 'apple';
  authToken?: string;
  refreshToken?: string;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  completedOrdersCount?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(t('errors.useAuthHookError'));
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  useEffect(() => {
    // Register token update callback for automatic refresh.
    // Read user from AsyncStorage so we persist new tokens even during initial load
    // when React state "user" may not be updated yet (stale closure).
    setTokenUpdateCallback(async (tokens) => {
      try {
        const userData = await AsyncStorage.getItem('user');
        const current = userData ? (JSON.parse(userData) as User) : user;
        const base = current ?? user;
        if (base) {
          const updatedUser = { ...base, authToken: tokens.accessToken, refreshToken: tokens.refreshToken } as User;
          setUser(updatedUser);
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } catch (e) {
        console.warn('[AuthContext] Failed to persist refreshed tokens:', e);
      }
    });
  }, [user]);

  const loadUserFromStorage = async () => {
    try {
      console.log('AuthContext - Loading user from storage...');
      // Add timeout to prevent blocking if AsyncStorage is slow
      const userData = await Promise.race([
        AsyncStorage.getItem('user'),
        new Promise<string | null>((resolve) => 
          setTimeout(() => {
            console.warn('AuthContext - Storage read timeout, continuing without user data');
            resolve(null);
          }, 2000)
        ),
      ]);
      
      console.log('AuthContext - User data from storage:', userData ? 'found' : 'not found');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log('AuthContext - Parsed user:', parsedUser);
        setUser(parsedUser);

        if (parsedUser.authToken) {
          await applyCachedUserLanguage();
        }

        // If user has auth token, sync profile from backend to get latest data (including country)
        // Add timeout to prevent blocking if backend is unavailable
        if (parsedUser.authToken) {
          try {
            const profileResponse = await Promise.race([
              getProfile(),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Profile sync timeout')), 5000)
              ),
            ]);
            const apiUser = profileResponse.user;
            
            // Map backend response to User format
            const fullNameParts = (apiUser.full_name || `${parsedUser.firstName} ${parsedUser.lastName}`).split(/\s+/);
            const firstName = fullNameParts[0] || parsedUser.firstName;
            const lastName = fullNameParts.slice(1).join(' ') || parsedUser.lastName;
            
            const apiCountry = (apiUser as Record<string, unknown>).country as string | undefined;
            const apiPhone = (apiUser as Record<string, unknown>).phone_number as string | undefined;
            const apiAvatar = (apiUser as Record<string, unknown>).profile_image as string | undefined;
            const apiGender = (apiUser as Record<string, unknown>).gender;
            const apiDateOfBirth = (apiUser as Record<string, unknown>).date_of_birth as string | null | undefined;

            // Map gender: only accept 'male' or 'female', otherwise use existing or undefined
            const gender = apiGender === 'male' || apiGender === 'female'
              ? apiGender
              : (parsedUser.gender || undefined);

            // Map dateOfBirth: use API value if present (guard null/undefined before .trim())
            const dateOfBirth =
              apiDateOfBirth != null && typeof apiDateOfBirth === 'string' && apiDateOfBirth.trim() !== ''
                ? apiDateOfBirth.trim()
                : (parsedUser.dateOfBirth || undefined);
            
            const syncedUser: User = {
              ...parsedUser,
              firstName,
              lastName,
              email: apiUser.email ?? parsedUser.email,
              phone: apiPhone !== undefined ? apiPhone : parsedUser.phone,
              avatar: apiAvatar !== undefined ? apiAvatar : parsedUser.avatar,
              country: apiCountry !== undefined ? apiCountry : parsedUser.country,
              gender,
              dateOfBirth,
            };
            
            console.log('AuthContext - Syncing user from backend - apiCountry:', apiCountry, 'syncedUser.country:', syncedUser.country);
            setUser(syncedUser);
            await AsyncStorage.setItem('user', JSON.stringify(syncedUser));
            console.log('AuthContext - User synced from backend');
          } catch (syncError: unknown) {
            const isTokenError = syncError instanceof ApiError &&
              (syncError.status === 401 || syncError.status === 403 || syncError.sessionExpired === true);
            const msg = syncError instanceof Error ? syncError.message.toLowerCase() : '';
            const isInvalidExpiredToken = msg.includes('invalid') && (msg.includes('expired') || msg.includes('token'));
            if (isTokenError || isInvalidExpiredToken) {
              console.warn('AuthContext - Token invalid or expired on profile sync, clearing session');
              setUser(null);
              await AsyncStorage.removeItem('user');
              clearTokenState();
            } else {
              console.warn('AuthContext - Failed to sync user from backend, using stored data:', syncError);
            }
          }
        }
      } else {
        console.log('AuthContext - No user data found, setting to null');
        setUser(null);
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User) => {
    try {
      console.log('AuthContext - Login called with:', userData);
      isLoggingOut = false;
      authEvents.reset();
      setUser(userData);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await applyCachedUserLanguage();
      console.log('AuthContext - User set and saved to storage');
    } catch (error) {
      console.error('Error saving user to storage:', error);
      throw error;
    }
  };

  const logout = useCallback(async () => {
    if (isLoggingOut) return;
    isLoggingOut = true;

    try {
      console.log('[AuthContext] ========== LOGOUT INITIATED ==========');
      console.log('[AuthContext] Current user before logout:', user ? 'exists' : 'null');
      
      // Clear token state FIRST to prevent any new API calls
      clearTokenState();

      try {
        queryClient.clear();
      } catch {
        /* ignore */
      }
      
      // Clear token update callback to prevent any pending token updates
      setTokenUpdateCallback(async () => {
        // No-op callback to clear any existing callback
      });
      
      
      // Clear user state - this will trigger isAuthenticated to become false
      console.log('[AuthContext] Setting user to null...');
      setUser(null);
      
      
      // Verify state was updated
      console.log('[AuthContext] User state set to null, isAuthenticated should now be false');
      
      // Clear all stored user data and tokens
      try {
        console.log('[AuthContext] Removing user from AsyncStorage...');
        await AsyncStorage.removeItem('user');
        console.log('[AuthContext] User removed from AsyncStorage');
      } catch (removeError) {
        console.warn('[AuthContext] Failed to remove user from storage:', removeError);
      }
      
      // Clear any other auth-related data that might be stored
      // (e.g., refresh tokens, session data, etc.)
      try {
        console.log('[AuthContext] Removing additional auth tokens...');
        // Clear any additional auth keys if they exist
        // Note: We keep theme preference as it's not auth-related
        await AsyncStorage.multiRemove([
          'user',
          'authToken',
          'refreshToken',
        ]);
        console.log('[AuthContext] Additional tokens removed');
      } catch (multiRemoveError) {
        // If multiRemove fails, try individual removes
        console.warn('[AuthContext] MultiRemove failed, trying individual removes:', multiRemoveError);
        try {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('refreshToken');
        } catch (individualError) {
          console.warn('[AuthContext] Individual token removal failed (may not exist):', individualError);
        }
      }
      
      // Double-check: Ensure user state is null (in case something went wrong)
      setUser(null);
      
      // Verify final state
      const finalUserCheck = await AsyncStorage.getItem('user');
      console.log('[AuthContext] Final verification - user in storage:', finalUserCheck ? 'STILL EXISTS (ERROR!)' : 'cleared ✓');
      console.log('[AuthContext] ========== LOGOUT COMPLETED ==========');
      console.log('[AuthContext] User state is now null, isAuthenticated should be false');
      
    } catch (error) {
      
      console.error('[AuthContext] ========== LOGOUT ERROR ==========');
      console.error('[AuthContext] Error during logout:', error);
      // Even if clearing fails, ensure user state is cleared
      clearTokenState();
      setUser(null);
      throw error;
    }
  }, [user]);

  // Listen for session expired events from services
  useEffect(() => {
    const unsubscribe = authEvents.onSessionExpired(async () => {
      console.log('[AuthContext] Session expired event received, logging out and redirecting to Welcome...');
      // Logout will clear user state, which will trigger navigation to Welcome via RootLayoutNav
      // The (auth)/index.tsx will automatically redirect to /(auth)/welcome
      await logout();
    });

    return () => unsubscribe();
  }, [logout]);

  const updateUser = async (userData: Partial<User>) => {
    try {
      const updatedUser = { ...user, ...userData } as User;
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const refreshUserTokens = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) return false;
    isRefreshingRef.current = true;
    try {
      const stored = await AsyncStorage.getItem('user');
      const currentToken = stored ? (JSON.parse(stored) as User).refreshToken : undefined;
      if (!currentToken) {
        console.log('[AuthContext] No refresh token in storage');
        return false;
      }

      const refreshResponse = await refreshTokens(currentToken);
      const updatedUser = stored ? { ...(JSON.parse(stored) as User), authToken: refreshResponse.accessToken, refreshToken: refreshResponse.refreshToken } as User : null;
      if (updatedUser) {
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
      console.log('[AuthContext] Silent refresh successful');
      return true;
    } catch (error) {
      const isRefreshTokenInvalid = error instanceof ApiError && (error.status === 401 || error.status === 403);
      if (isRefreshTokenInvalid) {
        console.warn('[AuthContext] Refresh token rejected (401/403), session will expire');
      } else {
        console.warn('[AuthContext] Proactive refresh failed (network?), will retry later');
      }
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  const scheduleProactiveRefresh = useCallback((authToken: string | undefined) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (!authToken) return;

    const remaining = getTimeUntilExpiryMs(authToken);
    if (remaining === null || remaining <= 0) return;

    const delay = Math.max(remaining * REFRESH_SAFETY_MARGIN, 10_000);
    console.log(`[AuthContext] Proactive refresh scheduled in ${Math.round(delay / 1000)}s`);

    refreshTimerRef.current = setTimeout(async () => {
      if (isRefreshingRef.current) return;
      console.log('[AuthContext] Proactive refresh triggered');
      await refreshUserTokens();
    }, delay);
  }, [refreshUserTokens]);

  // Schedule proactive refresh whenever the token changes
  useEffect(() => {
    scheduleProactiveRefresh(user?.authToken);
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [user?.authToken, scheduleProactiveRefresh]);

  // Refresh token when app comes to foreground
  useEffect(() => {
    const handleAppState = async (next: AppStateStatus) => {
      if (next !== 'active') return;
      if (isRefreshingRef.current) return;

      try {
        const stored = await AsyncStorage.getItem('user');
        const currentAuth = stored ? (JSON.parse(stored) as User).authToken : undefined;
        if (!currentAuth) return;

        if (isTokenExpiringSoon(currentAuth, REFRESH_THRESHOLD_MS)) {
          console.log('[AuthContext] App foregrounded with expiring token, refreshing...');
          await refreshUserTokens();
        }
      } catch {
        // Ignore storage read errors
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [refreshUserTokens]);

  // Calculate isAuthenticated - ensure it's always a boolean
  const isAuthenticated = !!user;
  
  // Log authentication state changes for debugging
  useEffect(() => {
    
    console.log('[AuthContext] Authentication state changed:', {
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id,
    });
  }, [isAuthenticated, user]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
