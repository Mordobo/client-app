import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { useMode } from '@/contexts/ModeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TOTAL_STEPS = 8;

export default function ProviderOnboardingWelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setMode } = useMode();
  const theme = useThemeColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleGetStarted = () => {
    router.push('/provider-onboarding/business');
  };

  // Android hardware back: leave provider onboarding instead of popping to (provider-tabs), which
  // would re-run gate logic and previously could open verification (step 7 submit) by mistake.
  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        void (async () => {
          try {
            await setMode('client');
            router.replace('/(tabs)');
          } catch (e) {
            console.error('[ProviderOnboarding welcome] Exit on back failed:', e);
            router.replace('/(tabs)');
          }
        })();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => sub.remove();
    }, [router, setMode]),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.screenBackground }]}>
      <ProgressBar currentStep={0} totalSteps={TOTAL_STEPS} />
      
      <View style={styles.content}>
        {/* Icon with gradient background */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Ionicons name="flash" size={32} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {t('providerOnboarding.welcome.title')}
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t('providerOnboarding.welcome.subtitle')}
        </Text>

        {/* Benefit cards */}
        <View style={styles.benefitsContainer}>
          {[
            { icon: '💰', text: t('providerOnboarding.welcome.benefit1') },
            { icon: '📅', text: t('providerOnboarding.welcome.benefit2') },
            { icon: '⭐', text: t('providerOnboarding.welcome.benefit3') },
          ].map((benefit, index) => (
            <View
              key={index}
              style={[
                styles.benefitCard,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : theme.surfaceSecondary,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : theme.border,
                },
              ]}
            >
              <Text style={styles.benefitIcon}>{benefit.icon}</Text>
              <Text style={[styles.benefitText, { color: theme.textPrimary }]}>{benefit.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA Button */}
      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>
              {t('providerOnboarding.welcome.getStarted')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  benefitsContainer: {
    gap: 12,
    marginTop: 24,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  benefitIcon: {
    fontSize: 20,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
