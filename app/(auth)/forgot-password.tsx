import { forgotPassword } from '@/services/auth';
import { t } from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
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

const valueHasContent = (text: string) => text.trim().length > 0;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [success, setSuccess] = useState(false);

  const trimmedEmail = email.trim();
  const isValidEmail = trimmedEmail.includes('@') && trimmedEmail.includes('.');
  const canSubmit = isValidEmail && !loading;

  const handleSendInstructions = async () => {
    if (!trimmedEmail) {
      setErrorMessage(t('errors.fillAllFields'));
      return;
    }

    if (!isValidEmail) {
      setErrorMessage(t('errors.invalidEmail'));
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccess(false);

    try {
      const response = await forgotPassword({
        email: trimmedEmail,
      });

      setSuccess(true);
      // Show success message immediately - always show success to prevent email enumeration
      // Use the message from the response or the translation
      const successMessage = response?.message || t('auth.forgotPasswordSuccess');
      
      Alert.alert(
        t('common.ok'),
        successMessage,
        [
          {
            text: t('common.ok'),
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Forgot password error:', error);
      
      if (error instanceof Error) {
        const errorMessage = error.message || t('errors.forgotPasswordFailed');
        setErrorMessage(errorMessage);
        Alert.alert(t('common.error'), errorMessage);
      } else {
        const errorMessage = t('errors.forgotPasswordFailed');
        setErrorMessage(errorMessage);
        Alert.alert(t('common.error'), errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

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
              <Ionicons name="lock-closed" size={48} color="#F59E0B" />
              <View style={styles.questionMarkBadge}>
                <Text style={styles.questionMark}>?</Text>
              </View>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('auth.forgotPasswordTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.forgotPasswordSubtitle')}</Text>

          {/* Email Input */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('auth.email')}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name="mail-outline" 
                  size={18} 
                  color="#9CA3AF" 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, errorMessage ? styles.inputError : undefined]}
                  placeholder="tu@email.com"
                  placeholderTextColor="rgba(156, 163, 175, 0.5)"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                    if (success) {
                      setSuccess(false);
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
            </View>

            {errorMessage && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Send Instructions Button */}
            <TouchableOpacity
              style={[styles.sendButton, !canSubmit ? styles.sendButtonDisabled : undefined]}
              onPress={handleSendInstructions}
              disabled={!canSubmit}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.sendButtonText}>{t('auth.sendInstructions')}</Text>
              )}
            </TouchableOpacity>

            {/* Help Card */}
            <View style={styles.helpCard}>
              <Ionicons name="bulb-outline" size={20} color="#FFFFFF" style={styles.helpIcon} />
              <View style={styles.helpContent}>
                <Text style={styles.helpTitle}>{t('auth.noEmailReceived')}</Text>
                <Text style={styles.helpText}>{t('auth.noEmailReceivedHelp')}</Text>
              </View>
            </View>
          </View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Remember Password Link */}
          <View style={styles.rememberContainer}>
            <Text style={styles.rememberText}>{t('auth.rememberPassword')}{' '}</Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.rememberLink}>{t('auth.signIn')}</Text>
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
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  questionMarkBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F59E0B',
    borderWidth: 3,
    borderColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionMark: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
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
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    flex: 1,
    backgroundColor: '#252542',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingLeft: 48,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
    color: '#FFFFFF',
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
  sendButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  helpCard: {
    backgroundColor: '#252542',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  helpIcon: {
    marginTop: 2,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  helpText: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 19.5,
  },
  spacer: {
    flex: 1,
  },
  rememberContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  rememberText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  rememberLink: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
});
