import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
// Note: We no longer use markWelcomeScreenAsSeen - login_count is managed by backend
import { registerGoogleAccountOrFallback, type GoogleAuthTokens } from '@/utils/googleAuth';
import { type GoogleProfile } from '@/utils/authMapping';
import {
  consumePendingGoogleWebResult,
  getGoogleStatusCodes,
  isGoogleWebAvailable,
  signInWithGoogleWeb,
  signInWithGoogleMobile,
  WEB_RESULT_STORAGE_KEY,
} from '@/utils/googleSignIn';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MordoboLogo from '@/components/MordoboLogo';
import { ApiError } from '@/services/auth';

export default function WelcomeScreen() {
  const { login, isAuthenticated } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const webGoogleSupported = isGoogleWebAvailable();
  const isGoogleSupported = webGoogleSupported;

  const handleSignIn = async () => {
    if (isAuthenticated) {
      // If already authenticated, go to home
      router.replace('/(tabs)/home');
    } else {
      // If not authenticated, go to login
      router.push('/(auth)/login');
    }
  };

  const handleCreateAccount = async () => {
    if (isAuthenticated) {
      // If already authenticated, go to home
      router.replace('/(tabs)/home');
    } else {
      // If not authenticated, go to register
      router.push('/(auth)/register');
    }
  };

  const handleContinue = async () => {
    // Continue to home (login_count is already incremented by backend)
    router.replace('/(tabs)/home');
  };

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
      console.log('[WelcomeScreen][GoogleLogin] Finalizing Google login', {
        email: profile.email,
        hasIdToken: !!tokens.idToken,
        hasAccessToken: !!tokens.accessToken,
      });
      // Note: login_count is managed by backend, no need to mark welcome screen
      const userData = await registerGoogleAccountOrFallback(profile, tokens);
      console.log('[WelcomeScreen][GoogleLogin] registerGoogleAccountOrFallback resolved', {
        userId: userData.id,
        provider: userData.provider,
      });
      await login(userData);
      // Navigate to home after successful login
      router.replace('/(tabs)/home');
    },
    [login]
  );

  useEffect(() => {
    if (Platform.OS !== 'web') {
      console.log('[WelcomeScreen][GoogleLogin] Skipping pending web result because platform is', Platform.OS);
      return;
    }

    let isMounted = true;

    const maybeConsumePendingLogin = async () => {
      try {
        const pendingResult = await consumePendingGoogleWebResult();
        console.log('[WelcomeScreen][GoogleLogin] Pending result from redirect:', pendingResult);
        if (!pendingResult || !isMounted) {
          if (!pendingResult) {
            console.log('[WelcomeScreen][GoogleLogin] No pending Google result detected in URL hash.');
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
        console.log('[WelcomeScreen][GoogleLogin] Storage event detected for Google OAuth result. Retrying consumption.');
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

  const handleGoogleLogin = async () => {
    console.log('[WelcomeScreen][GoogleLogin] Platform:', Platform.OS, 'isGoogleWebAvailable:', webGoogleSupported);
    
    setGoogleLoading(true);
    try {
      let result;
      
      if (Platform.OS === 'web') {
        result = await signInWithGoogleWeb();
        console.log('[WelcomeScreen][GoogleLogin] signInWithGoogleWeb result:', result);
        if (!result) {
          console.log('[WelcomeScreen][GoogleLogin] Web flow initiated; waiting for storage event.');
          return;
        }
      } else {
        // Móvil: usar expo-auth-session
        result = await signInWithGoogleMobile();
        console.log('[WelcomeScreen][GoogleLogin] signInWithGoogleMobile result:', result);
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
      <View style={styles.content}>
        {/* Logo with gradient */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={['#3B82F6', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <MordoboLogo size={60} />
          </LinearGradient>
        </View>

        {/* Title and Subtitle */}
        <Text style={styles.title}>{t('auth.welcomeTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.welcomeSubtitle')}</Text>

        {isAuthenticated ? (
          // If user is already authenticated (first login), show Continue button
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleContinue}
          >
            <Text style={styles.primaryButtonText}>{t('auth.getStarted')}</Text>
          </TouchableOpacity>
        ) : (
          // If user is not authenticated, show Sign In and Create Account buttons
          <>
            {/* Primary Button - Sign In */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSignIn}
            >
              <Text style={styles.primaryButtonText}>{t('auth.signIn')}</Text>
            </TouchableOpacity>

            {/* Secondary Button - Create Account */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleCreateAccount}
            >
              <Text style={styles.secondaryButtonText}>{t('auth.createAccount')}</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Auth Buttons */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleLogin}
                disabled={googleLoading || !isGoogleSupported}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#4285F4" />
                ) : (
                  <View style={styles.socialButtonContent}>
                    <Ionicons name="logo-google" size={20} color="#4285F4" />
                    <Text style={styles.socialButtonText}>{t('auth.google')}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton} onPress={handleAppleLogin}>
                <View style={styles.socialButtonContent}>
                  <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>{t('auth.apple')}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 120,
    height: 120,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 40,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  secondaryButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#374151',
  },
  dividerText: {
    color: '#9CA3AF',
    fontSize: 14,
    paddingHorizontal: 16,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  socialButton: {
    flex: 1,
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
    gap: 8,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
  },
});
