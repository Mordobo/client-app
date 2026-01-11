import { t } from '@/i18n';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const ONBOARDING_SCREENS = 3;

export default function OnboardingScreen() {
  const [currentScreen, setCurrentScreen] = useState(1);

  const handleNext = () => {
    if (currentScreen < ONBOARDING_SCREENS) {
      setCurrentScreen(currentScreen + 1);
    } else {
      // Last screen - go to home
      router.replace('/(tabs)/home');
    }
  };

  const handleSkip = () => {
    // Skip all onboarding screens and go to home
    router.replace('/(tabs)/home');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 1:
        return (
          <View style={styles.screenContent}>
            {/* Icon Container */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.3)', 'rgba(16, 185, 129, 0.3)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Text style={styles.iconEmoji}>🏠</Text>
              </LinearGradient>
            </View>

            {/* Title and Description */}
            <Text style={styles.title}>{t('auth.onboarding.screen1.title')}</Text>
            <Text style={styles.description}>
              {t('auth.onboarding.screen1.description')}
            </Text>

            {/* Pagination Dots */}
            <View style={styles.pagination}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>

            {/* Button */}
            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleNext}>
              <Text style={styles.primaryButtonText}>{t('auth.onboarding.screen1.next')}</Text>
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View style={styles.screenContent}>
            {/* Icon Container */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.3)', 'rgba(245, 158, 11, 0.3)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Text style={styles.iconEmoji}>⭐</Text>
                {/* Verification checkmark */}
                <View style={[styles.iconBadge, styles.iconBadgeSmall, { top: 40, right: 40, backgroundColor: 'rgba(16, 185, 129, 0.4)' }]}>
                  <Text style={styles.badgeEmojiSmall}>✓</Text>
                </View>
                {/* Shield icon */}
                <View style={[styles.iconBadge, styles.iconBadgeMedium, { bottom: 50, left: 30, backgroundColor: 'rgba(245, 158, 11, 0.4)' }]}>
                  <Text style={styles.badgeEmojiMedium}>🛡️</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Title and Description */}
            <Text style={styles.title}>{t('auth.onboarding.screen2.title')}</Text>
            <Text style={styles.description}>
              {t('auth.onboarding.screen2.description')}
            </Text>

            {/* Pagination Dots */}
            <View style={styles.pagination}>
              <View style={styles.dot} />
              <View style={[styles.dot, styles.dotActive, { backgroundColor: '#10B981' }]} />
              <View style={styles.dot} />
            </View>

            {/* Button */}
            <TouchableOpacity style={[styles.button, { backgroundColor: '#10B981' }]} onPress={handleNext}>
              <Text style={styles.primaryButtonText}>{t('auth.onboarding.screen2.next')}</Text>
            </TouchableOpacity>
          </View>
        );

      case 3:
        return (
          <View style={styles.screenContent}>
            {/* Icon Container */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['rgba(245, 158, 11, 0.3)', 'rgba(236, 72, 153, 0.3)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Text style={styles.iconEmoji}>💳</Text>
                {/* Lock icon */}
                <View style={[styles.iconBadge, styles.iconBadgeSmall, { top: 30, left: 50, backgroundColor: 'rgba(245, 158, 11, 0.4)' }]}>
                  <Text style={styles.badgeEmojiSmall}>🔒</Text>
                </View>
                {/* Money bag icon */}
                <View style={[styles.iconBadge, styles.iconBadgeMedium, { bottom: 40, right: 40, backgroundColor: 'rgba(236, 72, 153, 0.4)' }]}>
                  <Text style={styles.badgeEmojiMedium}>💰</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Title and Description */}
            <Text style={styles.title}>{t('auth.onboarding.screen3.title')}</Text>
            <Text style={styles.description}>
              {t('auth.onboarding.screen3.description')}
            </Text>

            {/* Pagination Dots */}
            <View style={styles.pagination}>
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={[styles.dot, styles.dotActive, { backgroundColor: '#F59E0B' }]} />
            </View>

            {/* Button - Only "Get Started" on last screen */}
            <TouchableOpacity style={[styles.button, { backgroundColor: '#F59E0B' }]} onPress={handleNext}>
              <Text style={styles.primaryButtonText}>{t('auth.onboarding.screen3.getStarted')}</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip button in top right corner - only show on screens 1 and 2 */}
      {currentScreen < ONBOARDING_SCREENS && (
        <TouchableOpacity style={styles.skipButtonTop} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>{t('auth.onboarding.screen1.skip')}</Text>
        </TouchableOpacity>
      )}
      {renderScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  screenContent: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  iconContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  iconGradient: {
    width: 280,
    height: 280,
    borderRadius: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconEmoji: {
    fontSize: 120,
  },
  iconBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeSmall: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  iconBadgeMedium: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  badgeEmojiSmall: {
    fontSize: 24,
  },
  badgeEmojiMedium: {
    fontSize: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 40,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#252542',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#3B82F6',
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButtonTop: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});
