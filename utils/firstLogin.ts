import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_LOGIN_KEY = 'has_seen_welcome_screen';

/**
 * Checks if the user has seen the welcome screen before
 * @returns Promise<boolean> - true if user has seen welcome screen, false if it's their first time
 */
export const hasSeenWelcomeScreen = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(FIRST_LOGIN_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking welcome screen status:', error);
    // Default to showing welcome screen if there's an error
    return false;
  }
};

/**
 * Marks that the user has seen the welcome screen
 */
export const markWelcomeScreenAsSeen = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(FIRST_LOGIN_KEY, 'true');
  } catch (error) {
    console.error('Error marking welcome screen as seen:', error);
  }
};

/**
 * Resets the welcome screen status (useful for testing or logout)
 */
export const resetWelcomeScreenStatus = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(FIRST_LOGIN_KEY);
  } catch (error) {
    console.error('Error resetting welcome screen status:', error);
  }
};
