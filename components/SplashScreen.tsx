import { t } from '@/i18n';
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
    let isMounted = true;
    let timer: NodeJS.Timeout;
    
    const finishSplash = async () => {
      if (!isMounted) return;
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('Error hiding splash screen:', error);
        // Continue even if hideAsync fails
      }
      if (isMounted) {
        onFinish();
      }
    };
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Hide after 1.5 seconds - ensure it always finishes
    timer = setTimeout(() => {
      if (!isMounted) return;
      
      // Fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        finishSplash();
      });
    }, 1500);

    return () => {
      isMounted = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [fadeAnim, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        {/* Brand Name */}
        <Text style={[styles.logoText, { fontSize: logoTextSize }]}>Mordobo</Text>

        {/* Tagline */}
        <View style={styles.taglineContainer}>
          <Text style={[styles.tagline, { fontSize: taglineSize }]}>
            {(() => {
              try {
                return t('splash.tagline1');
              } catch {
                return 'At-home';
              }
            })()}
          </Text>
          <Text style={[styles.tagline, { fontSize: taglineSize }]}>
            {(() => {
              try {
                return t('splash.tagline2');
              } catch {
                return 'services made';
              }
            })()}
          </Text>
          <Text style={[styles.tagline, { fontSize: taglineSize }]}>
            {(() => {
              try {
                return t('splash.tagline3');
              } catch {
                return 'easy';
              }
            })()}
          </Text>
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

