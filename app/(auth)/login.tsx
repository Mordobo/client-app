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
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  const [consumedRegistrationParam, setConsumedRegistrationParam] = useState(false);
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
    if (!trimmedIdentifier || !password) {
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
      const isEmail = trimmedIdentifier.includes('@');
      
      if (isEmail) {
        // For email login, use verification flow (same as registration)
        // Call validate-email endpoint to generate and send verification code
        const validateResponse = await validateEmail({
          email: trimmedIdentifier,
          password,
        });

        // Store email and password temporarily for resend code and verification
        await AsyncStorage.setItem('pending_verification_email', trimmedIdentifier.trim().toLowerCase());
        await AsyncStorage.setItem('pending_verification_password', password);

        // Redirect to verification screen
        router.replace({
          pathname: '/(auth)/verify',
          params: { 
            email: trimmedIdentifier.trim().toLowerCase(),
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
        // Handle API errors
        if (error.status === 401 || error.status === 404) {
          setErrorMessage(t('errors.loginFailed'));
        } else {
          const errorMessage = error.message || t('errors.loginGeneric');
          setErrorMessage(errorMessage);
          Alert.alert(t('common.error'), errorMessage);
        }
      } else {
        Alert.alert(t('common.error'), t('errors.loginGeneric'));
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
          {/* Title */}
          <Text style={styles.title}>{t('auth.loginTitle')}</Text>

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
                placeholder=""
                placeholderTextColor="rgba(55, 65, 81, 0.45)"
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
              <TextInput
                style={[styles.input, errorMessage ? styles.inputError : undefined]}
                placeholder=""
                placeholderTextColor="rgba(55, 65, 81, 0.45)"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errorMessage) {
                    setErrorMessage(null);
                  }
                }}
                secureTextEntry
                autoCapitalize="none"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    marginBottom: 32,
  },
  successToast: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  successIcon: {
    marginRight: 8,
  },
  successText: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#000000',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
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
  },
  forgotPassword: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 24,
    marginLeft: 4,
  },
  forgotPasswordText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '400',
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  socialContainer: {
    gap: 12,
    marginBottom: 32,
  },
  socialButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
  },
  registerContainer: {
    alignItems: 'center',
    gap: 4,
  },
  registerText: {
    color: '#000000',
    fontSize: 14,
  },
  registerLink: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '400',
  },
});
