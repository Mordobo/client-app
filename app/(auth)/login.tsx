import { VerificationCodeModal } from '@/components/VerificationCodeModal';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { ApiError, validateEmail } from '@/services/auth';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [identifierFocused, setIdentifierFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  const [consumedRegistrationParam, setConsumedRegistrationParam] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const { login } = useAuth();
  const params = useLocalSearchParams<{ registered?: string }>();
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmedIdentifier = identifier.trim();
  const canSubmit = valueHasContent(identifier) && password.length >= 8;
  const isButtonEnabled = canSubmit && !loading;


  useEffect(() => {
    if (!consumedRegistrationParam && params?.registered) {
      setShowRegistrationSuccess(true);
      setConsumedRegistrationParam(true);

      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }

      successTimeoutRef.current = setTimeout(() => {
        setShowRegistrationSuccess(false);
        successTimeoutRef.current = null;
      }, 4000);
    }
  }, [consumedRegistrationParam, params]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const handleCredentialsLogin = async () => {
    const currentIdentifier = identifier.trim();
    
    if (!currentIdentifier || !password) {
      Alert.alert(t('common.error'), t('errors.fillAllFields'));
      return;
    }

    if (password.length < 8) {
      setErrorMessage(t('errors.passwordMin'));
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      // Determine if identifier is email or phone
      const isEmail = currentIdentifier.includes('@');
      
      if (isEmail) {
        // For email login, use verification flow (same as registration)
        // Call validate-email endpoint to generate and send verification code
        const validateResponse = await validateEmail({
          email: currentIdentifier,
          password,
        });

        // Store email and password temporarily for resend code and verification
        await AsyncStorage.setItem('pending_verification_email', currentIdentifier.toLowerCase());
        await AsyncStorage.setItem('pending_verification_password', password);

        // Redirect to verification screen
        router.replace({
          pathname: '/(auth)/verify',
          params: { 
            email: currentIdentifier.toLowerCase(),
          },
        });
      } else {
        // Phone login is not supported by backend /auth/login endpoint
        // Backend only accepts email in login endpoint
        setErrorMessage(t('errors.loginWithPhoneNotSupported') || 'Phone login is not supported. Please use your email address.');
        Alert.alert(t('common.error'), t('errors.loginWithPhoneNotSupported') || 'Phone login is not supported. Please use your email address.');
      }
      
      setErrorMessage(null);
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof ApiError) {
        const errorData = error.data as Record<string, unknown> | undefined;
        const errorCode = errorData?.code as string | undefined;
        
        // Handle timeout errors
        if (errorCode === 'request_timeout' || errorData?.isTimeout === true) {
          const timeoutMessage = error.message || t('errors.requestTimeout');
          setErrorMessage(timeoutMessage);
          Alert.alert(t('common.error'), timeoutMessage);
          return;
        }
        
        // Handle network/connection errors
        if (errorCode === 'network_error' || error.status === 0) {
          const connectionMessage = error.message || t('errors.connectionFailed');
          setErrorMessage(connectionMessage);
          Alert.alert(t('common.error'), connectionMessage);
          return;
        }
        
        // Check if it's an SMTP/email error with code
        if (errorCode === 'smtp_not_configured' || 
            errorCode === 'email_send_timeout' || 
            errorCode === 'email_send_failed') {
          // Check if backend returned the code as workaround
          const code = errorData?.verificationCode as string | undefined;
          
          if (code) {
            // Show modal with code
            setVerificationCode(code);
            setShowCodeModal(true);
            
            // Store email and password for verification
            const emailToStore = currentIdentifier.toLowerCase();
            await AsyncStorage.setItem('pending_verification_email', emailToStore);
            await AsyncStorage.setItem('pending_verification_password', password);
            
            // Navigate to verification screen after modal is closed
            return;
          }
        }
        
        // Handle API errors
        if (error.status === 401 || error.status === 404) {
          setErrorMessage(t('errors.loginFailed'));
        } else {
          const errorMessage = error.message || t('errors.loginGeneric');
          setErrorMessage(errorMessage);
          Alert.alert(t('common.error'), errorMessage);
        }
      } else {
        // Handle non-ApiError (e.g., network errors that weren't caught)
        const errorMessage = error instanceof Error && error.message.includes('timeout')
          ? t('errors.requestTimeout')
          : error instanceof Error && error.message.includes('network')
          ? t('errors.connectionFailed')
          : t('errors.loginGeneric');
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

          {/* Title */}
          <Text style={styles.title}>{t('auth.welcome')}</Text>
          <Text style={styles.subtitle}>{t('auth.welcomeSubtitle')}</Text>

          {showRegistrationSuccess && (
            <View style={styles.successToast}>
              <Ionicons name="checkmark-circle" size={18} color="#047857" style={styles.successIcon} />
              <Text style={styles.successText}>{t('auth.registrationSuccessLogin')}</Text>
            </View>
          )}

          {/* Login Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('auth.email')}</Text>
              <TextInput
                style={[styles.input, errorMessage ? styles.inputError : undefined]}
                placeholder="tu@email.com"
                placeholderTextColor="rgba(156, 163, 175, 0.5)"
                value={identifier}
                onChangeText={(value) => {
                  setIdentifier(value);
                  if (errorMessage) {
                    setErrorMessage(null);
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setIdentifierFocused(true)}
                onBlur={() => setIdentifierFocused(false)}
              />
            </View>

            {errorMessage && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('auth.password')}</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput, errorMessage ? styles.inputError : undefined]}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(156, 163, 175, 0.5)"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#9CA3AF" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => {
                // TODO: Navigate to forgot password screen
              }}
            >
              <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, !canSubmit ? styles.loginButtonDisabled : undefined]}
              onPress={handleCredentialsLogin}
              disabled={!isButtonEnabled}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.loginButtonText}>{t('auth.signIn')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>{t('auth.noAccount')}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>{t('auth.signUp')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      {/* Verification Code Modal */}
      <VerificationCodeModal
        visible={showCodeModal}
        code={verificationCode}
        onClose={async () => {
          setShowCodeModal(false);
          // Navigate to verification screen after closing modal
          if (verificationCode) {
            const storedEmail = await AsyncStorage.getItem('pending_verification_email');
            if (storedEmail) {
              router.replace({
                pathname: '/(auth)/verify',
                params: { 
                  email: storedEmail,
                },
              });
            }
          }
        }}
      />
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
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 40,
  },
  form: {
    marginBottom: 32,
  },
  successToast: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  successIcon: {
    marginRight: 8,
  },
  successText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
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
  passwordInputWrapper: {
    position: 'relative',
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 32,
  },
  forgotPasswordText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '400',
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  registerContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  registerText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  registerLink: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '400',
  },
});
