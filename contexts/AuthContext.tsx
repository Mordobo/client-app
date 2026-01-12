import { t } from '@/i18n';
import { refreshTokens, setTokenUpdateCallback, clearTokenState } from '@/services/auth';
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
  gender?: 'male' | 'female';
  dateOfBirth?: string; // ISO date string (YYYY-MM-DD)
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:63',message:'loadUserFromStorage entry',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
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
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:77',message:'loadUserFromStorage - userData retrieved',data:{hasUserData:!!userData,userDataLength:userData?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:145',message:'logout() function entry',data:{hasUser:!!user,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    try {
      console.log('[AuthContext] ========== LOGOUT INITIATED ==========');
      console.log('[AuthContext] Current user before logout:', user ? 'exists' : 'null');
      
      // Clear token state FIRST to prevent any new API calls
      clearTokenState();
      
      // Clear token update callback to prevent any pending token updates
      setTokenUpdateCallback(async () => {
        // No-op callback to clear any existing callback
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:160',message:'Before setUser(null)',data:{currentUser:user?user.id:'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Clear user state - this will trigger isAuthenticated to become false
      console.log('[AuthContext] Setting user to null...');
      setUser(null);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:162',message:'After setUser(null)',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
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
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:204',message:'logout() function exit - success',data:{storageCleared:!finalUserCheck},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:206',message:'logout() function exit - error',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
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

  // Calculate isAuthenticated - ensure it's always a boolean
  const isAuthenticated = !!user;
  
  // Log authentication state changes for debugging
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:244',message:'isAuthenticated state changed',data:{isAuthenticated,hasUser:!!user,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
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
