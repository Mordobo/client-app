import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { ApiError, validate2FACode } from '@/services/auth';
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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CODE_LENGTH = 6;
const PENDING_2FA_TOKEN_KEY = 'pending_2fa_token';

export default function Verify2FAScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string | null>(params.email ?? null);

  useEffect(() => {
    if (params.email?.trim()) {
      setEmail(params.email.trim().toLowerCase());
    }
  }, [params.email]);

  const handleVerify = useCallback(async () => {
    const trimmedCode = code.trim();
    if (trimmedCode.length !== CODE_LENGTH) {
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
      const response = await validate2FACode({ twoFaToken, code: trimmedCode });
      await AsyncStorage.removeItem(PENDING_2FA_TOKEN_KEY);

      const userData = mapApiUserToUser(
        response.user,
        'email',
        response.accessToken || response.token,
        response.refreshToken
      );
      await login(userData);

      const clientOnboardingCompleted = (response.user as Record<string, unknown>).client_onboarding_completed === true;
      if (clientOnboardingCompleted) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/onboarding');
      }
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
  }, [code, login]);

  const handleBack = useCallback(() => {
    AsyncStorage.removeItem(PENDING_2FA_TOKEN_KEY);
    router.replace('/(auth)/login');
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom }]}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>

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
          onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, CODE_LENGTH))}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          placeholder="000000"
          placeholderTextColor="rgba(156, 163, 175, 0.5)"
          editable={!loading}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, (code.length !== CODE_LENGTH || loading) && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={code.length !== CODE_LENGTH || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('auth.verify')}</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 24,
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
    flex: 1,
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
});
