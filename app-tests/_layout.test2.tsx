// TEST 2: Sin AuthContext
// Usa splash simple para aislar el problema del AuthContext
import CustomSplashScreen from '@/components/SplashScreen.simple';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Text, View } from 'react-native';

export default function RootLayout() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  if (isSplashVisible) {
    return <CustomSplashScreen onFinish={() => setIsSplashVisible(false)} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0000FF' }}>
      <Text style={{ fontSize: 24, padding: 20, color: '#FFFFFF' }}>
        ✅ TEST 2: Sin AuthContext - Si ves esto, el problema es AuthContext
      </Text>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </View>
  );
}


