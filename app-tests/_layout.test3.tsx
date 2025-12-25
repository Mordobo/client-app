// TEST 3: Sin Google Sign-In initialization
// Usa splash simple para aislar el problema de Google Sign-In
import CustomSplashScreen from '@/components/SplashScreen.simple';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Text, View } from 'react-native';

function RootLayoutNav() {
  const { isAuthenticated } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: '#FF00FF' }}>
      <Text style={{ fontSize: 24, padding: 20, color: '#FFFFFF' }}>
        ✅ TEST 3: Sin Google Sign-In init - Si ves esto, el problema es initializeGoogleSignIn
      </Text>
      <Text style={{ padding: 20, color: '#FFFFFF' }}>
        Authenticated: {isAuthenticated ? 'Yes' : 'No'}
      </Text>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </View>
  );
}

export default function RootLayout() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  if (isSplashVisible) {
    return <CustomSplashScreen onFinish={() => setIsSplashVisible(false)} />;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}


