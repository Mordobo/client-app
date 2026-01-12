import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
// import 'react-native-reanimated'; // Removido temporalmente para compatibilidad de build
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { initializeGoogleSignIn } from '@/config/google-signin';
import { useEffect } from 'react';

export const unstable_settings = {
  anchor: '(auth)',
};

function RootLayoutNav() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const colorScheme = useColorScheme();

  // Force re-render when authentication state changes
  // This ensures navigation updates immediately
  // IMPORTANT: useEffect must be called before any conditional returns
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'_layout.tsx:25',message:'RootLayoutNav - isAuthenticated changed in useEffect',data:{isAuthenticated,hasUser:!!user,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    console.log('[RootLayoutNav] Authentication state changed - isAuthenticated:', isAuthenticated, 'user:', user ? 'exists' : 'null');
  }, [isAuthenticated, user]);

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'_layout.tsx:29',message:'RootLayoutNav render',data:{isAuthenticated,isLoading,hasUser:!!user,stackKey:isAuthenticated?'authenticated':'unauthenticated'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  
  console.log('[RootLayoutNav] Render - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', user ? 'exists' : 'null');

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // StatusBar colors matching theme
  const statusBarBackgroundColor = colorScheme === 'dark' ? '#1a1a2e' : '#F9FAFB';

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
        key={isAuthenticated ? 'authenticated' : 'unauthenticated'}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="chat" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </>
        )}
      </Stack>
      <StatusBar 
        style={colorScheme === 'dark' ? 'light' : 'dark'}
        backgroundColor={statusBarBackgroundColor}
        translucent={Platform.OS === 'android'}
      />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    initializeGoogleSignIn();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProviderWrapper />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function ThemeProviderWrapper() {
  const { isAuthenticated } = useAuth();
  return (
    <ThemeProvider isAuthenticated={isAuthenticated}>
      <RootLayoutNav />
    </ThemeProvider>
  );
}
