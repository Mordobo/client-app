import { useMode } from '@/contexts/ModeContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { t } from '@/i18n';
import { ApiError } from '@/services/auth';
import { submitOnboardingStep } from '@/services/providers';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SubmitState = 'idle' | 'submitting' | 'submitted' | 'error';

export default function ProviderOnboardingVerificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setMode } = useMode();
  const colors = useThemeColors();
  const themed = useMemo(
    () => ({
      screen: colors.screenBackground,
      submitting: colors.textSecondary,
      title: colors.textPrimary,
      subtitle: colors.textSecondary,
      stepRowBg: colors.surfaceSecondary,
      stepText: colors.textPrimary,
      stepTextPending: colors.textTertiary,
      notificationBg: colors.surfaceSecondary,
      notificationBorder: colors.border,
      notificationText: colors.textSecondary,
      backBtnBg: colors.surfaceSecondary,
      backBtnText: colors.textPrimary,
    }),
    [colors],
  );
  const [submitState, setSubmitState] = useState<SubmitState>('submitting');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const step7Sent = useRef(false);

  const sendStep7 = useCallback(async () => {
    setSubmitState('submitting');
    setErrorDetail(null);
    try {
      await submitOnboardingStep(7, {});
      setSubmitState('submitted');
    } catch (e) {
      console.error('[Verification] submitOnboardingStep(7) failed:', e);
      const message =
        e instanceof ApiError && e.message.trim().length > 0
          ? e.message
          : t('providerOnboarding.verification.submitError');
      setErrorDetail(message);
      setSubmitState('error');
    }
  }, []);

  useEffect(() => {
    if (step7Sent.current) return;
    step7Sent.current = true;
    sendStep7();
  }, [sendStep7]);

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
    { label: t('providerOnboarding.verification.step1'), status: 'done' as const },
    { label: t('providerOnboarding.verification.step2'), status: 'progress' as const },
    { label: t('providerOnboarding.verification.step3'), status: 'pending' as const },
  ];

  const isSubmitting = submitState === 'submitting';
  const isSubmitted = submitState === 'submitted';
  const isError = submitState === 'error';

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themed.screen }]}>
      <View style={styles.content}>
        {isSubmitting && (
          <>
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            <Text style={[styles.submittingText, { color: themed.submitting }]}>
              {t('providerOnboarding.verification.submitting')}
            </Text>
          </>
        )}

        {isError && (
          <>
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, styles.iconCircleError]}>
                <Ionicons name="alert-circle" size={40} color="#F87171" />
              </View>
            </View>
            <Text style={[styles.errorText, { color: themed.title }]}>
              {errorDetail ?? t('providerOnboarding.verification.submitError')}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => sendStep7()}
              activeOpacity={0.7}
            >
              <Text style={styles.retryButtonText}>
                {t('providerOnboarding.verification.retry')}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {isSubmitted && (
          <>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={40} color="#A78BFA" />
              </View>
            </View>

            <Text style={[styles.title, { color: themed.title }]}>
              {t('providerOnboarding.verification.title')}
            </Text>
            <Text style={[styles.subtitle, { color: themed.subtitle }]}>
              {t('providerOnboarding.verification.subtitle')}
            </Text>

            <View style={styles.stepsContainer}>
              {steps.map((step, index) => (
                <View key={index} style={[styles.stepItem, { backgroundColor: themed.stepRowBg }]}>
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
                      { color: themed.stepText },
                      step.status === 'pending' && { color: themed.stepTextPending },
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.notificationCard, { backgroundColor: themed.notificationBg, borderColor: themed.notificationBorder }]}>
              <Text style={[styles.notificationText, { color: themed.notificationText }]}>
                {t('providerOnboarding.verification.notification')}
              </Text>
            </View>
          </>
        )}

      </View>

      {isSubmitted && (
        <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: themed.backBtnBg }]}
            onPress={handleBackToHome}
            activeOpacity={0.7}
          >
            <Text style={[styles.backButtonText, { color: themed.backBtnText }]}>
              {t('providerOnboarding.verification.backToHome')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    alignItems: 'center',
  },
  loader: {
    marginBottom: 16,
  },
  submittingText: {
    fontSize: 14,
    textAlign: 'center',
  },
  iconCircleError: {
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
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
  },
  notificationCard: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  notificationText: {
    fontSize: 12,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
