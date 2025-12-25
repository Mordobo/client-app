// Versión simplificada del splash screen para debugging
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

SplashScreen.preventAutoHideAsync();

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SimpleSplashScreen({ onFinish }: SplashScreenProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('Error hiding splash:', error);
      }
      setReady(true);
      onFinish();
    }, 1000); // Reducido a 1 segundo para debugging

    return () => clearTimeout(timer);
  }, [onFinish]);

  if (ready) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Mordobo</Text>
      <Text style={styles.subtext}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 16,
    color: '#6B7280',
  },
});

