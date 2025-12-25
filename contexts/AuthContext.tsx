import { t } from '@/i18n';
import { refreshTokens, setTokenUpdateCallback } from '@/services/auth';
import { getProfile } from '@/services/profile';
import { authEvents } from '@/utils/authEvents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  country?: string;
  provider?: 'email' | 'google' | 'facebook' | 'apple';
  authToken?: string;
  refreshToken?: string;
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

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  useEffect(() => {
    // Register token update callback for automatic refresh
    setTokenUpdateCallback(async (tokens) => {
      if (user) {
        const updatedUser = { ...user, authToken: tokens.accessToken, refreshToken: tokens.refreshToken } as User;
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
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
            const syncedUser: User = {
              ...parsedUser,
              firstName,
              lastName,
              email: apiUser.email ?? parsedUser.email,
              phone: apiPhone !== undefined ? apiPhone : parsedUser.phone,
              avatar: apiAvatar !== undefined ? apiAvatar : parsedUser.avatar,
              country: apiCountry !== undefined ? apiCountry : parsedUser.country,
            };
            
            console.log('AuthContext - Syncing user from backend - apiCountry:', apiCountry, 'syncedUser.country:', syncedUser.country);
            setUser(syncedUser);
            await AsyncStorage.setItem('user', JSON.stringify(syncedUser));
            console.log('AuthContext - User synced from backend');
          } catch (syncError) {
            console.warn('AuthContext - Failed to sync user from backend, using stored data:', syncError);
            // Continue with stored user data if sync fails
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
      setUser(userData);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      console.log('AuthContext - User set and saved to storage');
    } catch (error) {
      console.error('Error saving user to storage:', error);
      throw error;
    }
  };

  const logout = useCallback(async () => {
    try {
      // Google Sign-In ahora usa expo-auth-session, no requiere signOut nativo
      // El logout se maneja limpiando los tokens locales
      setUser(null);
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('Error removing user from storage:', error);
      throw error;
    }
  }, []);

  // Listen for session expired events from services
  useEffect(() => {
    const unsubscribe = authEvents.onSessionExpired(async () => {
      console.log('[AuthContext] Session expired event received, logging out...');
      // Logout will clear user state, which will trigger navigation to login via RootLayoutNav
      // No need to show alert - just redirect to login
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

  const refreshUserTokens = async (): Promise<boolean> => {
    try {
      if (!user?.refreshToken) {
        console.log('[AuthContext] No refresh token available');
        return false;
      }

      const refreshResponse = await refreshTokens(user.refreshToken);
      await updateUser({
        authToken: refreshResponse.accessToken,
        refreshToken: refreshResponse.refreshToken,
      });
      return true;
    } catch (error) {
      console.error('[AuthContext] Token refresh failed:', error);
      // If refresh fails, logout user
      await logout();
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
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
