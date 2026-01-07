import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
// import 'react-native-reanimated'; // Removido temporalmente para compatibilidad de build
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { initializeGoogleSignIn } from '@/config/google-signin';
import { useEffect, useState } from 'react';
import CustomSplashScreen from '@/components/SplashScreen';

export const unstable_settings = {
  anchor: '(auth)',
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('RootLayoutNav - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', user);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </>
        )}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  useEffect(() => {
    initializeGoogleSignIn();
  }, []);

  if (isSplashVisible) {
    return <CustomSplashScreen onFinish={() => setIsSplashVisible(false)} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
