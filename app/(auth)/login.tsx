import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { ApiError, loginWithCredentials, validateEmail } from '@/services/auth';
import { mapApiUserToUser } from '@/utils/authMapping';
import { type GoogleProfile } from '@/utils/authMapping';
import { registerGoogleAccountOrFallback, type GoogleAuthTokens } from '@/utils/googleAuth';
import {
  consumePendingGoogleWebResult,
  isGoogleConfigured,
  signInWithGoogleMobile,
  signInWithGoogleWeb,
} from '@/utils/googleSignIn';
import { isAppleSignInAvailable, loginOrRegisterWithApple, signInWithApple } from '@/utils/appleAuth';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);
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
      const isEmail = currentIdentifier.includes('@');
      const loginPayload = isEmail
        ? { email: currentIdentifier.trim().toLowerCase(), password }
        : { phoneNumber: currentIdentifier, password };

      const loginResponse = await loginWithCredentials(loginPayload);

      // If 2FA is enabled, go directly to 2FA code screen (no email verification step)
      if (loginResponse.requires_2fa && loginResponse.twoFaToken) {
        await AsyncStorage.setItem('pending_2fa_token', loginResponse.twoFaToken);
        router.push({
          pathname: '/(auth)/verify-2fa',
          params: { email: loginResponse.email ?? (isEmail ? currentIdentifier : '') },
        });
        setErrorMessage(null);
        return;
      }

      // Success: login with tokens
      const userData = mapApiUserToUser(
        loginResponse.user,
        'email',
        loginResponse.accessToken || loginResponse.token,
        loginResponse.refreshToken
      );
      await login(userData);
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
        
        // Email/send errors: show message only (no modal with code)
        if (errorCode === 'smtp_not_configured' ||
            errorCode === 'email_send_timeout' ||
            errorCode === 'email_send_failed') {
          const detailedMessage = errorData?.message ? String(errorData.message) : error.message;
          setErrorMessage(detailedMessage || t('errors.emailSendFailed'));
          Alert.alert(t('common.error'), detailedMessage || t('errors.emailSendFailed'));
          return;
        }
        
        // Email not verified: go to email verification flow (send code, then verify screen)
        if (errorCode === 'email_not_verified') {
          try {
            await validateEmail({
              email: identifier.trim().toLowerCase(),
              password,
            });
            const emailToStore = identifier.trim().toLowerCase();
            await AsyncStorage.setItem('pending_verification_email', emailToStore);
            await AsyncStorage.setItem('pending_verification_password', password);
            router.push({
              pathname: '/verify',
              params: { email: emailToStore },
            });
            setErrorMessage(null);
          } catch (validateErr) {
            setErrorMessage(t('errors.loginFailed'));
          }
          return;
        }

        // Handle other API errors
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

  const handleGoogleLogin = useCallback(async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    try {
      let result;
      if (Platform.OS === 'web') {
        const pending = await consumePendingGoogleWebResult();
        result = pending ?? (await signInWithGoogleWeb());
        if (!result) return;
      } else {
        result = await signInWithGoogleMobile();
      }
      const googleProfile: GoogleProfile = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        givenName: result.user.givenName,
        familyName: result.user.familyName,
        photo: result.user.photo,
      };
      const tokens: GoogleAuthTokens = { idToken: result.idToken, accessToken: result.accessToken };
      const userData = await registerGoogleAccountOrFallback(googleProfile, tokens);
      await login(userData);
      router.replace('/(tabs)/home');
    } catch (error) {
      if (error instanceof Error && (error.message.includes('cancelled') || error.message.includes('canceled'))) return;
      const msg = error instanceof ApiError ? error.message : t('errors.googleLoginGeneric');
      setErrorMessage(msg);
      Alert.alert(t('common.error'), msg);
    } finally {
      setGoogleLoading(false);
    }
  }, [login]);

  const handleAppleLogin = useCallback(async () => {
    setAppleLoading(true);
    setErrorMessage(null);
    try {
      const creds = await signInWithApple();
      if (!creds) return;
      const userData = await loginOrRegisterWithApple(creds);
      await login(userData);
      router.replace('/(tabs)/home');
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : t('errors.appleLoginGeneric');
      setErrorMessage(msg);
      Alert.alert(t('common.error'), msg);
    } finally {
      setAppleLoading(false);
    }
  }, [login]);

  const isGoogleSupported = isGoogleConfigured();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
              onPress={() => router.push('/(auth)/forgot-password')}
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

          {(isGoogleSupported || appleAvailable) && (
            <View style={styles.socialSection} pointerEvents="box-none">
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
                <View style={styles.dividerLine} />
              </View>
              {isGoogleSupported && (
                <Pressable
                  style={({ pressed }) => [
                    styles.socialButton,
                    googleLoading && styles.socialButtonDisabled,
                    pressed && !googleLoading && styles.socialButtonPressed,
                  ]}
                  onPress={handleGoogleLogin}
                  disabled={googleLoading}
                  accessibilityRole="button"
                  accessibilityLabel={t('auth.continueWithGoogle')}
                >
                  {googleLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color="#FFFFFF" style={styles.socialIcon} />
                      <Text style={styles.socialButtonText}>{t('auth.continueWithGoogle')}</Text>
                    </>
                  )}
                </Pressable>
              )}
              {appleAvailable && (
                <Pressable
                  style={({ pressed }) => [
                    styles.socialButton,
                    styles.socialButtonApple,
                    appleLoading && styles.socialButtonDisabled,
                    pressed && !appleLoading && styles.socialButtonPressed,
                  ]}
                  onPress={handleAppleLogin}
                  disabled={appleLoading}
                  accessibilityRole="button"
                  accessibilityLabel={t('auth.continueWithApple')}
                >
                  {appleLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="logo-apple" size={22} color="#FFFFFF" style={styles.socialIcon} />
                      <Text style={styles.socialButtonText}>{t('auth.continueWithApple')}</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          )}

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>{t('auth.noAccount')}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>{t('auth.signUp')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
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
  socialSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#374151',
  },
  dividerText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252542',
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 52,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  socialButtonApple: {
    marginBottom: 0,
  },
  socialButtonPressed: {
    opacity: 0.7,
  },
  socialButtonDisabled: {
    opacity: 0.6,
  },
  socialIcon: {
    marginRight: 10,
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
