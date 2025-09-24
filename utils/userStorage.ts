import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StoredUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  password: string; // In a real app, this should be hashed
  provider: 'email' | 'google' | 'facebook' | 'github';
  createdAt: string;
}

const USERS_KEY = 'stored_users';

export const saveUser = async (user: StoredUser): Promise<void> => {
  try {
    const existingUsers = await getUsers();
    const updatedUsers = [...existingUsers, user];
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
  } catch (error) {
    console.error('Error saving user:', error);
    throw error;
  }
};

export const getUsers = async (): Promise<StoredUser[]> => {
  try {
    const users = await AsyncStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

export const findUserByEmail = async (email: string): Promise<StoredUser | null> => {
  try {
    const users = await getUsers();
    return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
};

export const validateUser = async (email: string, password: string): Promise<StoredUser | null> => {
  try {
    const user = await findUserByEmail(email);
    if (user && user.password === password) {
      return user;
    }
    return null;
  } catch (error) {
    console.error('Error validating user:', error);
    return null;
  }
};
