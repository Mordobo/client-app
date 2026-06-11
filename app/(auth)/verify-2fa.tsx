import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { ApiError, confirm2FAEmailRecovery, request2FAEmailRecovery, validate2FACode } from '@/services/auth';
import { mapApiUserToUser } from '@/utils/authMapping';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TOTP_LENGTH = 6;
const BACKUP_CODE_LENGTH = 8;
const PENDING_2FA_TOKEN_KEY = 'pending_2fa_token';

type Phase = 'totp' | 'email_sent';

/**
 * Normalize user input to match server-accepted shapes: 6 digits (TOTP) or 8 alphanumeric characters (backup code).
 */
const normalize2FAInput = (raw: string): string =>
  raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, BACKUP_CODE_LENGTH);
const is2FAInputReady = (value: string): boolean =>
  value.length === TOTP_LENGTH && /^\d+$/.test(value)
    ? true
    : value.length === BACKUP_CODE_LENGTH && /^[A-Z0-9]+$/.test(value);

const normalizeEmailRecoveryCode = (raw: string): string => raw.replace(/\D/g, '').slice(0, TOTP_LENGTH);
const isEmailRecoveryCodeReady = (value: string): boolean => value.length === TOTP_LENGTH && /^\d+$/.test(value);

export default function Verify2FAScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [phase, setPhase] = useState<Phase>('totp');
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recoverySending, setRecoverySending] = useState(false);
  const [email, setEmail] = useState<string | null>(params.email ?? null);

  useEffect(() => {
    if (params.email?.trim()) {
      setEmail(params.email.trim().toLowerCase());
    }
  }, [params.email]);

  const navigateAfterLogin = useCallback(
    (userPayload: Parameters<typeof mapApiUserToUser>[0], accessToken: string | undefined, refreshToken: string | undefined) => {
      const clientOnboardingCompleted =
        (userPayload as Record<string, unknown>).client_onboarding_completed === true;
      if (clientOnboardingCompleted) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/onboarding');
      }
    },
    []
  );

  const handleVerify = useCallback(async () => {
    const normalizedCode = normalize2FAInput(code);
    if (!is2FAInputReady(normalizedCode)) {
      Alert.alert(t('common.error'), t('auth.2fa.invalidCodeLength'));
      return;
    }

    const twoFaToken = await AsyncStorage.getItem(PENDING_2FA_TOKEN_KEY);
    if (!twoFaToken) {
      Alert.alert(t('common.error'), t('auth.2fa.sessionExpired'));
      router.replace('/(auth)/login');
      return;
    }

    setLoading(true);
    try {
      const response = await validate2FACode({ twoFaToken, code: normalizedCode });
      await AsyncStorage.removeItem(PENDING_2FA_TOKEN_KEY);

      const userData = mapApiUserToUser(
        response.user,
        'email',
        response.accessToken || response.token,
        response.refreshToken
      );
      await login(userData);
      navigateAfterLogin(response.user, response.accessToken || response.token, response.refreshToken);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          Alert.alert(t('common.error'), t('auth.2fa.invalidCode'));
        } else {
          Alert.alert(t('common.error'), error.message || t('errors.verify2FAFailed'));
        }
      } else {
        Alert.alert(t('common.error'), t('errors.verify2FAFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [code, login, navigateAfterLogin]);

  const handleRequestEmailRecovery = useCallback(async () => {
    const twoFaToken = await AsyncStorage.getItem(PENDING_2FA_TOKEN_KEY);
    if (!twoFaToken) {
      Alert.alert(t('common.error'), t('auth.2fa.sessionExpired'));
      router.replace('/(auth)/login');
      return;
    }
    setRecoverySending(true);
    try {
      const res = await request2FAEmailRecovery({ twoFaToken });
      setMaskedEmail(res.email);
      setPhase('email_sent');
      setRecoveryCode('');
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert(t('common.error'), error.message || t('errors.twoFAEmailRecoveryFailed'));
      } else {
        Alert.alert(t('common.error'), t('errors.twoFAEmailRecoveryFailed'));
      }
    } finally {
      setRecoverySending(false);
    }
  }, []);

  const handleConfirmEmailRecovery = useCallback(async () => {
    const normalized = normalizeEmailRecoveryCode(recoveryCode);
    if (!isEmailRecoveryCodeReady(normalized)) {
      Alert.alert(t('common.error'), t('auth.2fa.recoveryInvalid'));
      return;
    }
    const twoFaToken = await AsyncStorage.getItem(PENDING_2FA_TOKEN_KEY);
    if (!twoFaToken) {
      Alert.alert(t('common.error'), t('auth.2fa.sessionExpired'));
      router.replace('/(auth)/login');
      return;
    }
    setLoading(true);
    try {
      const response = await confirm2FAEmailRecovery({ twoFaToken, code: normalized });
      await AsyncStorage.removeItem(PENDING_2FA_TOKEN_KEY);

      const userData = mapApiUserToUser(
        response.user,
        'email',
        response.accessToken || response.token,
        response.refreshToken
      );
      await login(userData);

      const disabled = response.two_factor_disabled_via_recovery === true;
      if (disabled) {
        Alert.alert(t('common.success'), t('auth.2fa.twoFADisabledInfo'), [
          {
            text: t('common.ok'),
            onPress: () => navigateAfterLogin(response.user, response.accessToken || response.token, response.refreshToken),
          },
        ]);
      } else {
        navigateAfterLogin(response.user, response.accessToken || response.token, response.refreshToken);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          Alert.alert(t('common.error'), t('errors.twoFAEmailRecoveryConfirmFailed'));
        } else {
          Alert.alert(t('common.error'), error.message || t('errors.twoFAEmailRecoveryConfirmFailed'));
        }
      } else {
        Alert.alert(t('common.error'), t('errors.twoFAEmailRecoveryConfirmFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [recoveryCode, login, navigateAfterLogin]);

  const handleBack = useCallback(() => {
    AsyncStorage.removeItem(PENDING_2FA_TOKEN_KEY);
    router.replace('/(auth)/login');
  }, []);

  const handleBackToTotp = useCallback(() => {
    setPhase('totp');
    setRecoveryCode('');
    setMaskedEmail(null);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom }]}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {phase === 'totp' ? (
          <>
            <Text style={styles.title}>{t('auth.2fa.title')}</Text>
            <Text style={styles.subtitle}>
              {t('auth.2fa.subtitle', { email: email || t('auth.email') })}
            </Text>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
            >
              <Text style={styles.label}>{t('auth.2fa.enterCode')}</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={(text) => setCode(normalize2FAInput(text))}
                keyboardType="default"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={BACKUP_CODE_LENGTH}
                placeholder="000000"
                placeholderTextColor="rgba(156, 163, 175, 0.5)"
                editable={!loading}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.button, (!is2FAInputReady(code) || loading) && styles.buttonDisabled]}
                onPress={handleVerify}
                disabled={!is2FAInputReady(code) || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{t('auth.verify')}</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.recoveryHint}>{t('auth.2fa.lostAuthenticatorHint')}</Text>
              <TouchableOpacity
                style={[styles.secondaryButton, recoverySending && styles.buttonDisabled]}
                onPress={handleRequestEmailRecovery}
                disabled={recoverySending || loading}
              >
                {recoverySending ? (
                  <ActivityIndicator color="#93C5FD" />
                ) : (
                  <Text style={styles.secondaryButtonText}>{t('auth.2fa.sendRecoveryEmail')}</Text>
                )}
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </>
        ) : (
          <>
            <Text style={styles.title}>{t('auth.2fa.recoveryEmailSent')}</Text>
            <Text style={styles.subtitle}>
              {t('auth.2fa.recoveryEmailSentBody', { email: maskedEmail || email || '—' })}
            </Text>

            <Text style={styles.label}>{t('auth.2fa.enterEmailCode')}</Text>
            <TextInput
              style={styles.input}
              value={recoveryCode}
              onChangeText={(text) => setRecoveryCode(normalizeEmailRecoveryCode(text))}
              keyboardType="number-pad"
              maxLength={TOTP_LENGTH}
              placeholder="000000"
              placeholderTextColor="rgba(156, 163, 175, 0.5)"
              editable={!loading}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.button, (!isEmailRecoveryCodeReady(recoveryCode) || loading) && styles.buttonDisabled]}
              onPress={handleConfirmEmailRecovery}
              disabled={!isEmailRecoveryCodeReady(recoveryCode) || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t('auth.2fa.confirmRecovery')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkBack} onPress={handleBackToTotp} disabled={loading}>
              <Text style={styles.linkBackText}>{t('auth.2fa.useAuthenticatorInstead')}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  backButton: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 32,
  },
  keyboardView: {
    flexGrow: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#252542',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 24,
    letterSpacing: 8,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  recoveryHint: {
    marginTop: 28,
    marginBottom: 12,
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  secondaryButtonText: {
    color: '#93C5FD',
    fontSize: 15,
    fontWeight: '600',
  },
  linkBack: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkBackText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});
