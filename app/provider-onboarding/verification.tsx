import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/i18n';
import { useMode } from '@/contexts/ModeContext';

export default function ProviderOnboardingVerificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setMode } = useMode();

  const handleBackToHome = async () => {
    try {
      // Change mode back to client since provider is not yet verified
      await setMode('client');
      // Navigate to home
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('[Verification] Failed to change mode to client:', error);
      // Navigate anyway even if mode change fails
      router.replace('/(tabs)/home');
    }
  };

  const steps = [
    { label: t('providerOnboarding.verification.step1'), status: 'done' },
    { label: t('providerOnboarding.verification.step2'), status: 'progress' },
    { label: t('providerOnboarding.verification.step3'), status: 'pending' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={40} color="#A78BFA" />
          </View>
        </View>

        <Text style={styles.title}>
          {t('providerOnboarding.verification.title')}
        </Text>
        <Text style={styles.subtitle}>
          {t('providerOnboarding.verification.subtitle')}
        </Text>

        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View
                style={[
                  styles.stepIcon,
                  step.status === 'done' && styles.stepIconDone,
                  step.status === 'progress' && styles.stepIconProgress,
                ]}
              >
                {step.status === 'done' && (
                  <Ionicons name="checkmark" size={14} color="#22C55E" />
                )}
                {step.status === 'progress' && (
                  <View style={styles.progressDot} />
                )}
                {step.status === 'pending' && (
                  <View style={styles.pendingDot} />
                )}
              </View>
              <Text
                style={[
                  styles.stepText,
                  step.status === 'pending' && styles.stepTextPending,
                ]}
              >
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.notificationCard}>
          <Text style={styles.notificationText}>
            {t('providerOnboarding.verification.notification')}
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToHome}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>
            {t('providerOnboarding.verification.backToHome')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12121A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 220,
  },
  stepsContainer: {
    width: '100%',
    gap: 8,
    marginBottom: 24,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIconDone: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  stepIconProgress: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#A78BFA',
  },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  stepTextPending: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  notificationCard: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  notificationText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
