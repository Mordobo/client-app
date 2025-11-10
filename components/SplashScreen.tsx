import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

// Keep the native splash screen visible while we load the app
SplashScreen.preventAutoHideAsync();

interface SplashScreenProps {
  onFinish: () => void;
}

export default function CustomSplashScreen({ onFinish }: SplashScreenProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const { width } = Dimensions.get('window');
  
  // Responsive sizing based on screen dimensions - increased sizes
  const logoTextSize = Math.min(width * 0.12, 48);
  const taglineSize = Math.min(width * 0.08, 28);

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
        <Text style={[styles.logoText, { fontSize: logoTextSize }]}>Mordobo</Text>

        {/* Tagline */}
        <View style={styles.taglineContainer}>
          <Text style={[styles.tagline, { fontSize: taglineSize }]}>At-home</Text>
          <Text style={[styles.tagline, { fontSize: taglineSize }]}>services made</Text>
          <Text style={[styles.tagline, { fontSize: taglineSize }]}>easy</Text>
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
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoText: {
    fontWeight: 'bold',
    color: '#2563EB', // Blue color
    fontFamily: 'System',
    marginBottom: 24,
  },
  taglineContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontWeight: 'bold', // Bold weight
    color: '#1F2937', // Dark gray color
    marginBottom: 4,
    fontFamily: 'System',
  },
});

