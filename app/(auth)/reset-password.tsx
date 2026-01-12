import { resetPassword } from '@/services/auth';
import { ApiError } from '@/services/auth';
import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const token = params.token;

  useEffect(() => {
    if (!token) {
      Alert.alert(
        t('common.error'),
        t('auth.invalidResetToken'),
        [
          {
            text: t('common.ok'),
            onPress: () => router.replace('/(auth)/forgot-password'),
          },
        ]
      );
    }
  }, [token]);

  const canSubmit = 
    newPassword.length >= 8 && 
    confirmPassword.length >= 8 && 
    newPassword === confirmPassword && 
    !loading &&
    !!token;

  const handleResetPassword = async () => {
    if (!token) {
      setErrorMessage(t('auth.invalidResetToken'));
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage(t('errors.passwordMin'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t('errors.passwordsDontMatch'));
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await resetPassword({
        token,
        newPassword,
      });

      Alert.alert(
        t('common.ok'),
        t('auth.resetPasswordSuccess'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              router.replace('/(auth)/login');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Reset password error:', error);
      
      if (error instanceof ApiError) {
        const errorData = error.data as Record<string, unknown> | undefined;
        const errorCode = errorData?.code as string | undefined;
        
        if (errorCode === 'invalid_token' || error.status === 401) {
          const errorMessage = error.message || t('auth.invalidResetToken');
          setErrorMessage(errorMessage);
          Alert.alert(
            t('common.error'),
            errorMessage,
            [
              {
                text: t('common.ok'),
                onPress: () => router.replace('/(auth)/forgot-password'),
              },
            ]
          );
        } else {
          const errorMessage = error.message || t('errors.resetPasswordFailed');
          setErrorMessage(errorMessage);
          Alert.alert(t('common.error'), errorMessage);
        }
      } else {
        const errorMessage = t('errors.resetPasswordFailed');
        setErrorMessage(errorMessage);
        Alert.alert(t('common.error'), errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return null; // Will redirect via useEffect
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={48} color="#3B82F6" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('auth.resetPasswordTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.resetPasswordSubtitle')}</Text>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('auth.newPassword')}</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput, errorMessage ? styles.inputError : undefined]}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(156, 163, 175, 0.5)"
                  value={newPassword}
                  onChangeText={(value) => {
                    setNewPassword(value);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                  }}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  onFocus={() => setNewPasswordFocused(true)}
                  onBlur={() => setNewPasswordFocused(false)}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Ionicons 
                    name={showNewPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#9CA3AF" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('auth.confirmNewPassword')}</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput, errorMessage ? styles.inputError : undefined]}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(156, 163, 175, 0.5)"
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  onFocus={() => setConfirmPasswordFocused(true)}
                  onBlur={() => setConfirmPasswordFocused(false)}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#9CA3AF" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {errorMessage && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Reset Button */}
            <TouchableOpacity
              style={[styles.resetButton, !canSubmit ? styles.resetButtonDisabled : undefined]}
              onPress={handleResetPassword}
              disabled={!canSubmit}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.resetButtonText}>{t('auth.resetPassword')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  passwordInputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#252542',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
    color: '#FFFFFF',
  },
  passwordInput: {
    paddingRight: 48,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
    padding: 4,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#2d1a1a',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -12,
    marginBottom: 12,
  },
  errorIcon: {
    marginRight: 6,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  resetButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonDisabled: {
    opacity: 0.5,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
