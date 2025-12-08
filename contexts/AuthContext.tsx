import { refreshTokens, setTokenUpdateCallback } from '@/services/auth';
import { getGoogleSignin } from '@/utils/googleSignIn';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
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
    throw new Error('useAuth must be used within an AuthProvider');
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
      const userData = await AsyncStorage.getItem('user');
      console.log('AuthContext - User data from storage:', userData);
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log('AuthContext - Parsed user:', parsedUser);
        setUser(parsedUser);
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

  const logout = async () => {
    try {
      const currentUser = user;
      if (currentUser?.provider === 'google') {
        const GoogleSignin = getGoogleSignin();
        try {
          if (GoogleSignin) {
            await GoogleSignin.signOut();
          } else {
            console.warn('[Auth] Google Sign-In module not available during logout. Skipping native sign-out.');
          }
        } catch (googleError) {
          console.warn('Error signing out from Google:', googleError);
        }
      }
      setUser(null);
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('Error removing user from storage:', error);
      throw error;
    }
  };

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
