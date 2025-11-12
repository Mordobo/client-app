import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { ApiError, loginWithCredentials } from '@/services/auth';
import { type GoogleProfile } from '@/utils/authMapping';
import { registerGoogleAccountOrFallback, type GoogleAuthTokens } from '@/utils/googleAuth';
import {
  consumePendingGoogleWebResult,
  getGoogleSignin,
  getGoogleStatusCodes,
  isGoogleSignInAvailable,
  isGoogleWebAvailable,
  signInWithGoogleWeb,
  WEB_RESULT_STORAGE_KEY,
  type GoogleGetTokensResponse,
} from '@/utils/googleSignIn';
import { Ionicons } from '@expo/vector-icons';
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
  const [showPasswordTooltip, setShowPasswordTooltip] = useState(false);
  const [identifierFocused, setIdentifierFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  const [consumedRegistrationParam, setConsumedRegistrationParam] = useState(false);
  const { login } = useAuth();
  const params = useLocalSearchParams<{ registered?: string }>();
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const googleSignin = getGoogleSignin();
  const googleStatusCodes = getGoogleStatusCodes();
  const nativeGoogleSupported = isGoogleSignInAvailable() && !!googleSignin && !!googleStatusCodes;
  const webGoogleSupported = isGoogleWebAvailable();
  console.log('[GoogleLogin] Computed web support:', {
    platform: Platform.OS,
    webGoogleSupported,
    nativeGoogleSupported,
  });
  const isGoogleSupported = Platform.OS === 'web' ? webGoogleSupported : nativeGoogleSupported;

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
    setShowPasswordTooltip(false);
    try {
      // Determine if identifier is email or phone
      const isEmail = trimmedIdentifier.includes('@');
      
      // Call API to validate credentials
      const loginPayload = isEmail
        ? { email: trimmedIdentifier, password }
        : { phoneNumber: trimmedIdentifier, password };

      const apiResponse = await loginWithCredentials(loginPayload);
      
      // Map API response to user data
      const apiUser = apiResponse.user;
      const fullName = apiUser.full_name || '';
      const nameParts = fullName.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const userData = {
        id: apiUser.id,
        email: apiUser.email,
        firstName,
        lastName,
        phone: (apiUser as Record<string, unknown>).phone_number as string | undefined,
        provider: 'email' as const,
        authToken: apiResponse.token,
        refreshToken: apiResponse.refreshToken,
      };

      await login(userData);
      console.log('Login successful, user data:', userData);
      setErrorMessage(null);
      setShowPasswordTooltip(false);

      // Redirect to verification screen after successful login
      router.replace({
        pathname: '/(auth)/verify',
        params: { email: userData.email },
      });
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
    console.log('[GoogleLogin] Platform:', Platform.OS, 'isGoogleWebAvailable:', webGoogleSupported, 'isGoogleSupported:', isGoogleSupported);
    if (Platform.OS === 'web') {
      setGoogleLoading(true);
      try {
        const result = await signInWithGoogleWeb();
        console.log('[GoogleLogin] signInWithGoogleWeb result:', result);
        if (!result) {
          console.log('[GoogleLogin] Web flow initiated; waiting for storage event.');
          return;
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
        handleGoogleError(error);
      } finally {
        setGoogleLoading(false);
      }
      return;
    }

    if (!googleSignin || !googleStatusCodes) {
      Alert.alert(t('common.error'), t('errors.googleUnavailable'));
      return;
    }

    setGoogleLoading(true);
    try {
      await googleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResponse = await googleSignin.signIn();

      if (signInResponse.type !== 'success') {
        return;
      }

      const googleUser = signInResponse.data.user;
      let tokens: GoogleGetTokensResponse | null = null;
      try {
        tokens = await googleSignin.getTokens();
      } catch (tokenError) {
        console.warn('Google getTokens error:', tokenError);
      }
      const idToken = tokens?.idToken ?? signInResponse.data.idToken ?? undefined;
      const accessToken = tokens?.accessToken;

      if (!idToken) {
        throw new Error('google-missing-id-token');
      }

      const profile: GoogleProfile = {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        givenName: googleUser.givenName,
        familyName: googleUser.familyName,
        photo: googleUser.photo,
      };
      const tokensBundle: GoogleAuthTokens = {
        idToken,
        accessToken,
      };
      await finalizeGoogleLogin(profile, tokensBundle);
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error) {
        const code = String((error as { code?: unknown }).code ?? '');
        if (
          code === googleStatusCodes.SIGN_IN_CANCELLED ||
          code === googleStatusCodes.IN_PROGRESS
        ) {
          return;
        }
        if (code === googleStatusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert(t('common.error'), t('errors.googlePlayServices'));
          return;
        }
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

      //console.error('Google login error:', error);
      Alert.alert(t('common.error'), t('errors.googleLoginGeneric'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    Alert.alert(t('common.ok'), t('auth.soonFacebook'));
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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.appName}>{t('auth.appName')}</Text>
            </View>
          </View>

          {showRegistrationSuccess && (
            <View style={styles.successToast}>
              <Ionicons name="checkmark-circle" size={18} color="#047857" style={styles.successIcon} />
              <Text style={styles.successText}>{t('auth.registrationSuccessLogin')}</Text>
            </View>
          )}

          {/* Login Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('auth.emailOrPhone')}</Text>
              <TextInput
                style={[styles.input, errorMessage ? styles.inputError : undefined]}
                placeholder={identifierFocused ? '' : t('auth.emailOrPhone')}
                placeholderTextColor="rgba(55, 65, 81, 0.45)"
                value={identifier}
                onChangeText={(value) => {
                  setIdentifier(value);
                  if (errorMessage) {
                    setErrorMessage(null);
                  }
                }}
                keyboardType="default"
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
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>{t('auth.password')}</Text>
                <View style={styles.tooltipWrapper}>
                  {showPasswordTooltip && (
                    <View style={styles.tooltipBubble}>
                      <Text style={styles.tooltipText}>{t('errors.passwordMin')}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.tooltipTrigger}
                    activeOpacity={0.7}
                    onPress={() => setShowPasswordTooltip(prev => !prev)}
                  >
                    <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={[styles.input, errorMessage ? styles.inputError : undefined]}
                placeholder={passwordFocused ? '' : 'password'}
                placeholderTextColor="rgba(55, 65, 81, 0.45)"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errorMessage) {
                    setErrorMessage(null);
                  }
                  if (showPasswordTooltip) {
                    setShowPasswordTooltip(false);
                  }
                }}
                secureTextEntry
                autoCapitalize="none"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </View>

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

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
            <View style={styles.dividerLine} />
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
                  <Ionicons name="logo-google" size={24} color="#DB4437" />
                  <Text style={styles.socialButtonText}>{t('auth.google')}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} onPress={handleFacebookLogin}>
              <View style={styles.socialButtonContent}>
                <Ionicons name="logo-facebook" size={24} color="#4267B2" />
                <Text style={styles.socialButtonText}>{t('auth.facebook')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} onPress={handleAppleLogin}>
              <View style={styles.socialButtonContent}>
                <Ionicons name="logo-apple" size={24} color="#111827" />
                <Text style={styles.socialButtonText}>{t('auth.apple')}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>{t('auth.noAccount')}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>{t('auth.registerCta')}</Text>
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
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    marginRight: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
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
    color: '#374151',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tooltipWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    flexShrink: 0,
  },
  tooltipTrigger: {
    padding: 4,
    marginLeft: 6,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  tooltipBubble: {
    backgroundColor: '#1F2937',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  tooltipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#6B7280',
    fontSize: 14,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  socialButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  socialButtonContent: {
    alignItems: 'center',
  },
  socialButtonText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  registerLink: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
});
