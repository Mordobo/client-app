import { Platform } from 'react-native';

/**
 * Centralized API configuration
 * 
 * Determines the API base URL based on environment and platform.
 * 
 * Priority for LOCAL DEVELOPMENT (web/emulator):
 * 1. Always use localhost (ignores EXPO_PUBLIC_API_URL if set to QA/production)
 * 
 * Priority for APK/BUILD:
 * 1. EXPO_PUBLIC_API_URL environment variable (from eas.json build profile)
 * 2. For Android emulator: converts localhost to 10.0.2.2
 * 3. Fallback: localhost for development
 * 
 * IMPORTANT:
 * - In local development (web/emulator): Always uses localhost:3000
 * - In APK builds: Uses EXPO_PUBLIC_API_URL from eas.json (QA for preview profile)
 */
const sanitizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

/**
 * Detects if we're running in local development (not a built APK)
 * 
 * In local development:
 * - Web: Always local development (ignores all env vars)
 * - Expo Go: Always local development
 * - Development builds: Local development
 * 
 * In APK builds:
 * - EAS_BUILD_ID is set (most reliable indicator)
 * - Running in a built APK (not Expo Go)
 */
const isLocalDevelopment = (): boolean => {
  // Check if we're in web (ALWAYS local development, ignore all env vars)
  if (Platform.OS === 'web') {
    return true;
  }
  
  // If we're in a built APK (EAS build), EAS_BUILD_ID will be set
  // This is the most reliable indicator of a production build
  if (process.env.EAS_BUILD_ID) {
    return false;
  }
  
  // Check if we're in Expo Go or development build
  // In production builds, __DEV__ is false
  // This is a reliable indicator for React Native
  if (typeof __DEV__ !== 'undefined') {
    // If __DEV__ is true, we're in development
    if (__DEV__) {
      return true;
    }
    // If __DEV__ is false, we're likely in a production build
    // But check EAS_BUILD_ID first to be sure
    return false;
  }
  
  // If EXPO_PUBLIC_ENV is explicitly set to staging/qa/production AND we have EAS_BUILD_ID,
  // we're in a build. Otherwise, assume local development.
  const env = process.env.EXPO_PUBLIC_ENV;
  if (env && (env === 'staging' || env === 'qa' || env === 'production')) {
    // Only trust this if we also have EAS_BUILD_ID (meaning it's from a real build)
    // Otherwise, it might be a leftover env var from testing
    if (process.env.EAS_BUILD_ID) {
      return false;
    }
    // If no EAS_BUILD_ID, assume it's a leftover env var and use localhost
    return true;
  }
  
  // Default to local development if uncertain (safer for development)
  return true;
};

const getHost = (): string => {
  const isLocal = isLocalDevelopment();
  
  // In local development, always use localhost (ignore EXPO_PUBLIC_API_URL)
  if (isLocal) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }
  
  // In APK builds, use EXPO_PUBLIC_API_URL from eas.json
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  
  if (envUrl?.length) {
    // Only convert localhost to 10.0.2.2 for Android (emulator detection)
    if (Platform.OS === 'android' && /localhost/i.test(envUrl)) {
      return envUrl.replace(/localhost/gi, '10.0.2.2');
    }
    // For physical devices or non-localhost URLs, use as-is
    return envUrl;
  }
  
  // Fallback: development defaults (shouldn't happen in APK, but just in case)
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
};

export const API_BASE = sanitizeBaseUrl(getHost());

// Export function to get current API URL for debugging
export const getApiBaseUrl = () => API_BASE;

// Log API_BASE on module load for debugging
if (typeof console !== 'undefined') {
  const isLocal = isLocalDevelopment();
  console.log('[API Config] ========================================');
  console.log('[API Config] API_BASE initialized:', API_BASE);
  console.log('[API Config] Platform:', Platform.OS);
  console.log('[API Config] Is Local Development:', isLocal);
  console.log('[API Config] EXPO_PUBLIC_API_URL env:', process.env.EXPO_PUBLIC_API_URL || 'NOT SET');
  console.log('[API Config] EXPO_PUBLIC_ENV env:', process.env.EXPO_PUBLIC_ENV || 'NOT SET');
  console.log('[API Config] EAS_BUILD_ID:', process.env.EAS_BUILD_ID || 'NOT SET');
  console.log('[API Config] ========================================');
}

