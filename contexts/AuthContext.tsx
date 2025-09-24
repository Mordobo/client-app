import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  provider?: 'email' | 'google' | 'facebook' | 'github';
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
