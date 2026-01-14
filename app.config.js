// app.config.js - Expo configuration with environment variables support
const IS_DEV = process.env.EXPO_PUBLIC_ENV === 'development';
const IS_STAGING = process.env.EXPO_PUBLIC_ENV === 'staging';
const IS_PRODUCTION = process.env.EXPO_PUBLIC_ENV === 'production';

// Determine app name suffix based on environment
const getAppName = () => {
  if (IS_DEV) return 'Mordobo (Dev)';
  if (IS_STAGING) return 'Mordobo (Staging)';
  return 'Mordobo';
};

// Get build number from environment or use timestamp
const getBuildNumber = () => {
  return process.env.EAS_BUILD_NUMBER || process.env.BUILD_NUMBER || '1';
};

export default {
  expo: {
    name: getAppName(),
    slug: 'mordobo',
    version: '1.0.6',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'mordobo',
    userInterfaceStyle: 'automatic',
    newArchEnabled: false, // Deshabilitado - reanimated removido temporalmente
    ios: {
      bundleIdentifier: 'com.mordobo.client',
      supportsTablet: true,
      config: {
        usesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.mordobo.client',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-router',
      'expo-localization',
      'expo-web-browser',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      // expo-build-properties removido temporalmente para evitar errores de Kotlin compiler
      // Google Sign-In ahora usa expo-auth-session (compatible con Expo Go)
    ],
    experiments: {
      typedRoutes: true,
      // reactCompiler: true, // TEST: Deshabilitado para debugging pantalla negra
    },
    extra: {
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
      googleIosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME || '',
      expoPublicApiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
      environment: process.env.EXPO_PUBLIC_ENV || 'development',
      buildNumber: getBuildNumber(),
      buildDate: new Date().toISOString(),
      commitHash: process.env.GITHUB_SHA || process.env.EAS_BUILD_GIT_COMMIT_HASH || 'unknown',
      eas: {
        projectId: '21e61254-7e8d-4586-b2e1-6e31f2003675',
      },
    },
  },
};
