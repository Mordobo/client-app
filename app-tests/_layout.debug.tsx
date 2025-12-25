import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';

export const unstable_settings = {
  anchor: '(auth)',
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF0000' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 20, marginBottom: 10 }}>LOADING AUTH...</Text>
        <ActivityIndicator size="large" color="#FFFFFF" />
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
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const steps = [
      () => {
        console.log('[DEBUG] Step 1: RootLayout mounted');
        setStep(1);
      },
      () => {
        console.log('[DEBUG] Step 2: Testing i18n');
        try {
          const { t } = require('@/i18n');
          t('common.ok');
          console.log('[DEBUG] Step 2: i18n OK');
          setStep(2);
        } catch (e) {
          console.error('[DEBUG] Step 2: i18n FAILED', e);
          setError('i18n failed');
          setStep(2);
        }
      },
      () => {
        console.log('[DEBUG] Step 3: Testing AsyncStorage');
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        AsyncStorage.getItem('test')
          .then(() => {
            console.log('[DEBUG] Step 3: AsyncStorage OK');
            setStep(3);
          })
          .catch((e: Error) => {
            console.error('[DEBUG] Step 3: AsyncStorage FAILED', e);
            setError('AsyncStorage failed');
            setStep(3);
          });
      },
      () => {
        console.log('[DEBUG] Step 4: Testing Google Sign-In init');
        try {
          const { initializeGoogleSignIn } = require('@/config/google-signin');
          initializeGoogleSignIn();
          console.log('[DEBUG] Step 4: Google Sign-In init OK');
          setStep(4);
        } catch (e) {
          console.error('[DEBUG] Step 4: Google Sign-In init FAILED', e);
          setError('Google Sign-In init failed');
          setStep(4);
        }
      },
    ];

    let currentStep = 0;
    const runSteps = () => {
      if (currentStep < steps.length) {
        steps[currentStep]();
        currentStep++;
        setTimeout(runSteps, 500);
      } else {
        console.log('[DEBUG] All steps completed');
        setStep(5);
      }
    };

    runSteps();
  }, []);

  if (step < 5) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0000FF' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 24, marginBottom: 20 }}>DEBUG MODE</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 18, marginBottom: 10 }}>Step: {step}/5</Text>
        {error && (
          <Text style={{ color: '#FF0000', fontSize: 16, marginTop: 10 }}>Error: {error}</Text>
        )}
        <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#00FF00' }}>
      <View style={{ padding: 20, backgroundColor: '#FFFFFF' }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>✅ All checks passed!</Text>
        <Text style={{ marginTop: 10 }}>Step: {step}</Text>
        {error && <Text style={{ color: '#FF0000', marginTop: 10 }}>Error: {error}</Text>}
      </View>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </View>
  );
}

