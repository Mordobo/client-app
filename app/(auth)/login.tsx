import { VerificationCodeModal } from '@/components/VerificationCodeModal';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { ApiError, validateEmail } from '@/services/auth';
import { type GoogleProfile } from '@/utils/authMapping';
import { registerGoogleAccountOrFallback, type GoogleAuthTokens } from '@/utils/googleAuth';
import {
    consumePendingGoogleWebResult,
    getGoogleStatusCodes,
    isGoogleWebAvailable,
    signInWithGoogleWeb,
    signInWithGoogleMobile,
    WEB_RESULT_STORAGE_KEY,
} from '@/utils/googleSignIn';
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
  const [googleLoading, setGoogleLoading] = useState(false);
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
  const googleStatusCodes = getGoogleStatusCodes();
  const webGoogleSupported = isGoogleWebAvailable();
  const isGoogleSupported = webGoogleSupported;

  const trimmedIdentifier = identifier.trim();
  const canSubmit = valueHasContent(identifier) && password.length >= 8;
  const isButtonEnabled = canSubmit && !loading;

  const handleGoogleError = useCallback((error: unknown) => {
    if (error instanceof ApiError) {
      const message = error.message?.length ? error.message : t('errors.googleLoginGeneric');
      Alert.alert(t('common.error'), message);
      return;
    }

    if (error instanceof Error) {
      switch (error.message) {
        case 'google-web-signin-cancelled':
          return;
        case 'google-web-missing-id-token':
        case 'google-missing-id-token':
          Alert.alert(t('common.error'), t('errors.googleMissingIdToken'));
          return;
        case 'google-web-state-mismatch':
          Alert.alert(t('common.error'), t('errors.googleLoginGeneric'));
          return;
        case 'google-missing-web-client-id':
        case 'google-web-not-supported':
          Alert.alert(t('common.error'), t('errors.googleUnavailable'));
          return;
        default:
          Alert.alert(t('common.error'), t('errors.googleLoginGeneric'));
          return;
      }
    }

    Alert.alert(t('common.error'), t('errors.googleLoginGeneric'));
  }, []);

  const finalizeGoogleLogin = useCallback(
    async (profile: GoogleProfile, tokens: GoogleAuthTokens) => {
      console.log('[GoogleLogin] Finalizing Google login', {
        email: profile.email,
        hasIdToken: !!tokens.idToken,
        hasAccessToken: !!tokens.accessToken,
      });
      const userData = await registerGoogleAccountOrFallback(profile, tokens);
      console.log('[GoogleLogin] registerGoogleAccountOrFallback resolved', {
        userId: userData.id,
        provider: userData.provider,
      });
      await login(userData);
      router.replace('/(tabs)/home');
    },
    [login]
  );

  useEffect(() => {
    if (Platform.OS !== 'web') {
      console.log('[GoogleLogin] Skipping pending web result because platform is', Platform.OS);
      return;
    }

    let isMounted = true;

    const maybeConsumePendingLogin = async () => {
      try {
        const pendingResult = await consumePendingGoogleWebResult();
        console.log('[GoogleLogin] Pending result from redirect:', pendingResult);
        if (!pendingResult || !isMounted) {
          if (!pendingResult) {
            console.log('[GoogleLogin] No pending Google result detected in URL hash.');
          }
          return;
        }
        setGoogleLoading(true);
        const profile: GoogleProfile = {
          id: pendingResult.user.id,
          email: pendingResult.user.email,
          name: pendingResult.user.name,
          givenName: pendingResult.user.givenName,
          familyName: pendingResult.user.familyName,
          photo: pendingResult.user.photo,
        };
        const tokens: GoogleAuthTokens = {
          idToken: pendingResult.idToken,
          accessToken: pendingResult.accessToken,
        };
        await finalizeGoogleLogin(profile, tokens);
      } catch (error) {
        if (isMounted) {
          handleGoogleError(error);
        }
      } finally {
        if (isMounted) {
          setGoogleLoading(false);
        }
      }
    };

    void maybeConsumePendingLogin();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === WEB_RESULT_STORAGE_KEY && event.newValue) {
        console.log('[GoogleLogin] Storage event detected for Google OAuth result. Retrying consumption.');
        void maybeConsumePendingLogin();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
      }
    };
  }, [finalizeGoogleLogin, handleGoogleError]);

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

  const handleGoogleLogin = async () => {
    console.log('[GoogleLogin] Platform:', Platform.OS, 'isGoogleWebAvailable:', webGoogleSupported);
    
    setGoogleLoading(true);
    try {
      let result;
      
      if (Platform.OS === 'web') {
        result = await signInWithGoogleWeb();
        console.log('[GoogleLogin] signInWithGoogleWeb result:', result);
        if (!result) {
          console.log('[GoogleLogin] Web flow initiated; waiting for storage event.');
          return;
        }
      } else {
        // Móvil: usar expo-auth-session
        result = await signInWithGoogleMobile();
        console.log('[GoogleLogin] signInWithGoogleMobile result:', result);
      }

      const profile: GoogleProfile = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        givenName: result.user.givenName,
        familyName: result.user.familyName,
        photo: result.user.photo,
      };
      const tokens: GoogleAuthTokens = {
        idToken: result.idToken,
        accessToken: result.accessToken,
      };
      await finalizeGoogleLogin(profile, tokens);
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        // Usuario canceló, no mostrar error
        return;
      }

      if (error instanceof ApiError) {
        const message = error.message?.length ? error.message : t('errors.googleLoginGeneric');
        Alert.alert(t('common.error'), message);
        return;
      }

      if (error instanceof Error && error.message === 'google-missing-id-token') {
        Alert.alert(t('common.error'), t('errors.googleMissingIdToken'));
        return;
      }

      console.error('Google login error:', error);
      Alert.alert(t('common.error'), t('errors.googleLoginGeneric'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    Alert.alert(t('common.ok'), t('auth.soonApple'));
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

          {/* Social Login Buttons */}
          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleLogin}
              disabled={googleLoading || !isGoogleSupported}
            >
              {googleLoading ? (
                <ActivityIndicator color="#DB4437" />
              ) : (
                <View style={styles.socialButtonContent}>
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                  <Text style={styles.socialButtonText}>{t('auth.continueWithGoogle')}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} onPress={handleAppleLogin}>
              <View style={styles.socialButtonContent}>
                <Ionicons name="logo-apple" size={20} color="#000000" />
                <Text style={styles.socialButtonText}>{t('auth.continueWithApple')}</Text>
              </View>
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
  socialContainer: {
    gap: 12,
    marginBottom: 32,
  },
  socialButton: {
    backgroundColor: '#252542',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
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
