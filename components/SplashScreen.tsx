import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep the native splash screen visible while we load the app
SplashScreen.preventAutoHideAsync();

interface SplashScreenProps {
  onFinish: () => void;
}

export default function CustomSplashScreen({ onFinish }: SplashScreenProps) {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Hide after 1.5 seconds
    const timer = setTimeout(async () => {
      // Fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(async () => {
        await SplashScreen.hideAsync();
        onFinish();
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        {/* Brand Name */}
        <Text style={styles.logoText}>Mordobo</Text>

        {/* Tagline */}
        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>At-home</Text>
          <Text style={styles.tagline}>services made</Text>
          <Text style={styles.tagline}>easy</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2563EB',
    fontFamily: 'System',
    marginBottom: 24,
  },
  taglineContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 18,
    fontWeight: '400', // Regular weight, not bold
    color: '#1F2937', // Dark gray/black
    marginBottom: 4,
    fontFamily: 'System',
  },
});

