import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { ApiError as AuthApiError } from '@/services/auth';
import { translatedAuthRestrictionMessage } from '@/utils/authRestrictionMessage';
// Note: We no longer use markWelcomeScreenAsSeen - login_count is managed by backend
import { registerGoogleAccountOrFallback, type GoogleAuthTokens } from '@/utils/googleAuth';
import { type GoogleProfile } from '@/utils/authMapping';
import {
  consumePendingGoogleWebResult,
  isGoogleConfigured,
  signInWithGoogleWeb,
  signInWithGoogleMobile,
  WEB_RESULT_STORAGE_KEY,
} from '@/utils/googleSignIn';
import { isAppleSignInAvailable, loginOrRegisterWithApple, signInWithApple } from '@/utils/appleAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MordoboLogo from '@/components/MordoboLogo';
import { PaymentComplianceBadges } from '@/components/payment/PaymentComplianceBadges';

export default function WelcomeScreen() {
  const { login, isAuthenticated } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const isGoogleSupported = isGoogleConfigured();

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated]);

  const handleSignIn = () => {
    console.log('[WelcomeScreen] handleSignIn - navigating to login, isAuthenticated:', isAuthenticated);
    router.push('/(auth)/login');
  };

  const handleCreateAccount = () => {
    // Sign-up now starts with the account-type selection (provider/client) — MDB-444.
    router.push('/(auth)/account-type');
  };


  const handleGoogleError = useCallback((error: unknown) => {
    if (error instanceof AuthApiError) {
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
    console.log('[WelcomeScreen][GoogleLogin] Platform:', Platform.OS, 'isGoogleSupported:', isGoogleSupported);
    
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

      if (error instanceof AuthApiError) {
        const restrictionMessage = translatedAuthRestrictionMessage(error);
        const message =
          restrictionMessage ??
          (error.message?.length ? error.message : t('errors.googleLoginGeneric'));
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
    if (!appleAvailable) {
      Alert.alert(t('common.ok'), t('auth.soonApple'));
      return;
    }
    setAppleLoading(true);
    try {
      const creds = await signInWithApple();
      if (!creds) return;
      const userData = await loginOrRegisterWithApple(creds);
      await login(userData);
      router.replace('/(tabs)/home');
    } catch (error) {
      if (error instanceof AuthApiError) {
        const restrictionMessage = translatedAuthRestrictionMessage(error);
        Alert.alert(
          t('common.error'),
          restrictionMessage ?? (error.message || t('errors.appleLoginGeneric'))
        );
      } else {
        Alert.alert(t('common.error'), t('errors.appleLoginGeneric'));
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Centered section with logo, title and subtitle */}
        <View style={styles.centeredSection}>
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
        </View>

        {/* Action buttons section */}
        <View style={styles.actionsSection}>
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
              style={[styles.socialButton, appleLoading && styles.socialButtonDisabled]}
              onPress={handleAppleLogin}
              disabled={appleLoading}
            >
              {appleLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.socialButtonEmoji}>🍎</Text>
                  <Text style={styles.socialButtonText}>{t('auth.apple')}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, (googleLoading || !isGoogleSupported) && styles.socialButtonDisabled]}
              onPress={handleGoogleLogin}
              disabled={googleLoading || !isGoogleSupported}
            >
              {googleLoading ? (
                <ActivityIndicator color="#4285F4" />
              ) : (
                <>
                  <Text style={styles.socialButtonEmoji}>🔵</Text>
                  <Text style={styles.socialButtonText}>{t('auth.google')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.businessDescription}>
            {t('compliance.businessDescription')}
          </Text>
          <Text style={styles.currencyBanner}>{t('compliance.currencyBanner')}</Text>
          <View style={styles.legalLinks}>
            <Text style={styles.legalLink} onPress={() => router.push('/service-catalog')}>
              {t('compliance.linkServices')}
            </Text>
            <Text style={styles.legalSeparator}>•</Text>
            <Text style={styles.legalLink} onPress={() => router.push('/terms')}>
              {t('compliance.linkTerms')}
            </Text>
            <Text style={styles.legalSeparator}>•</Text>
            <Text style={styles.legalLink} onPress={() => router.push('/privacy')}>
              {t('compliance.linkPrivacy')}
            </Text>
            <Text style={styles.legalSeparator}>•</Text>
            <Text style={styles.legalLink} onPress={() => router.push('/refunds')}>
              {t('compliance.linkRefunds')}
            </Text>
            <Text style={styles.legalSeparator}>•</Text>
            <Text style={styles.legalLink} onPress={() => router.push('/delivery')}>
              {t('compliance.linkDelivery')}
            </Text>
            <Text style={styles.legalSeparator}>•</Text>
            <Text style={styles.legalLink} onPress={() => router.push('/payment-security')}>
              {t('compliance.linkSecurity')}
            </Text>
            <Text style={styles.legalSeparator}>•</Text>
            <Text style={styles.legalLink} onPress={() => router.push('/receipt-sample')}>
              {t('compliance.linkReceiptSample')}
            </Text>
          </View>
          <View style={styles.complianceBlock}>
            <PaymentComplianceBadges
              appearance="dark"
              showContact
              compact
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 48,
    paddingBottom: 32,
    flexDirection: 'column',
  },
  centeredSection: {
    minHeight: 220,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
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
      height: 0,
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
    textAlign: 'center',
    margin: 0,
  },
  actionsSection: {
    width: '100%',
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
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#374151',
  },
  dividerText: {
    color: '#9CA3AF',
    fontSize: 14,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialButtonEmoji: {
    fontSize: 20,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  socialButtonDisabled: {
    opacity: 0.6,
  },
  businessDescription: {
    color: '#9CA3AF',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 18,
  },
  currencyBanner: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 10,
  },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginTop: 9,
  },
  legalLink: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '600',
  },
  legalSeparator: {
    color: '#6B7280',
    fontSize: 10,
  },
  complianceBlock: {
    marginTop: 14,
    width: '100%',
  },
});
