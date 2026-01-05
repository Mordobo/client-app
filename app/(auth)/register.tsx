import { CountryPicker, type Country } from '@/components/CountryPicker';
import { PhoneInput } from '@/components/PhoneInput';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { ApiError, registerUser } from '@/services/auth';
import { type GoogleProfile } from '@/utils/authMapping';
import { registerGoogleAccountOrFallback, type GoogleAuthTokens } from '@/utils/googleAuth';
import {
  consumePendingGoogleWebResult,
  getGoogleStatusCodes,
  isGoogleWebAvailable,
  signInWithGoogleMobile,
  signInWithGoogleWeb,
  WEB_RESULT_STORAGE_KEY,
} from '@/utils/googleSignIn';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const valueHasContent = (text: string) => text.trim().length > 0;

type DuplicateField = 'email' | 'phone';

const digitsOnly = (value: string) => value.replace(/\D/g, '');

const normalizeFieldName = (value: string) => value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '').toLowerCase();

const parseApiErrorPayload = (payload: unknown) => {
  const messages: string[] = [];
  const fields: string[] = [];

  if (!payload || typeof payload !== 'object') {
    return { messages, fields };
  }

  const candidate = payload as Record<string, unknown>;

  if (typeof candidate.message === 'string') {
    messages.push(candidate.message);
  }

  if (typeof candidate.error === 'string') {
    messages.push(candidate.error);
  }

  if (candidate.errors) {
    const errorSection = candidate.errors;

    if (typeof errorSection === 'string') {
      messages.push(errorSection);
    } else if (Array.isArray(errorSection)) {
      errorSection.forEach(item => {
        if (typeof item === 'string') {
          messages.push(item);
        }
      });
    } else if (typeof errorSection === 'object') {
      Object.entries(errorSection as Record<string, unknown>).forEach(([field, value]) => {
        fields.push(field);
        if (typeof value === 'string') {
          messages.push(value);
        } else if (Array.isArray(value)) {
          value.forEach(entry => {
            if (typeof entry === 'string') {
              messages.push(entry);
            }
          });
        }
      });
    }
  }

  return { messages, fields };
};

const detectDuplicateField = ({ messages, fields }: { messages: string[]; fields: string[] }): DuplicateField | null => {
  const normalizedFields = fields.map(normalizeFieldName);

  if (normalizedFields.some(field => field.includes('phone') || field.includes('telefono') || field.includes('teléfono'))) {
    return 'phone';
  }

  if (normalizedFields.some(field => field.includes('email') || field.includes('correo'))) {
    return 'email';
  }

  const normalizedMessages = messages.map(message => message.toLowerCase());

  const phoneIndicators = ['phone', 'teléfono', 'telefono', 'phone number', 'número de teléfono'];
  if (normalizedMessages.some(message => phoneIndicators.some(indicator => message.includes(indicator)))) {
    return 'phone';
  }

  const emailIndicators = ['email', 'correo', 'mail', 'e-mail'];
  if (normalizedMessages.some(message => emailIndicators.some(indicator => message.includes(indicator)))) {
    return 'email';
  }

  return null;
};

const resolveApiErrorMessage = (error: ApiError, translate: typeof t): string => {
  const parsedPayload = parseApiErrorPayload(error.data);
  const duplicateField = detectDuplicateField(parsedPayload);

  if (duplicateField === 'phone') {
    return translate('errors.phoneExists');
  }

  if (duplicateField === 'email') {
    return translate('errors.emailExists');
  }

  if (parsedPayload.messages.length > 0) {
    return parsedPayload.messages.join(' ');
  }

  if (error.message) {
    return error.message;
  }

  return translate('errors.registerGeneric');
};

export default function RegisterScreen() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneExtension: '',
    phoneNumber: '',
    country: null as Country | null,
  });
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ password?: string; confirmPassword?: string; country?: string }>({});
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleStatusCodes = getGoogleStatusCodes();
  const webGoogleSupported = isGoogleWebAvailable();
  const isGoogleSupported = webGoogleSupported;

  const placeholderColor = 'rgba(55, 65, 81, 0.45)';
  const isFieldFocused = (field: string) => focusedField === field;

  const handleGoogleRegisterError = useCallback((error: unknown) => {
    if (error instanceof ApiError) {
      const message = error.message?.length ? error.message : t('errors.googleLoginGeneric');
      Alert.alert(t('common.error'), message);
      return;
    }

    const messageKey = (() => {
      if (error instanceof Error) {
        switch (error.message) {
          case 'google-web-signin-cancelled':
            return null;
          case 'google-web-missing-id-token':
          case 'google-missing-id-token':
            return 'errors.googleMissingIdToken';
          case 'google-web-state-mismatch':
            return 'errors.googleLoginGeneric';
          case 'google-missing-web-client-id':
          case 'google-web-not-supported':
            return 'errors.googleUnavailable';
          default:
            return 'errors.googleLoginGeneric';
        }
      }
      return 'errors.googleLoginGeneric';
    })();

    if (!messageKey) {
      return;
    }

    Alert.alert(t('common.error'), t(messageKey));
  }, [t]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    let isMounted = true;

    const maybeConsumePendingRegister = async () => {
      try {
        const pendingResult = await consumePendingGoogleWebResult();
        console.log('[GoogleRegister] Pending result from redirect:', pendingResult);
        if (!pendingResult || !isMounted) {
          if (!pendingResult) {
            console.log('[GoogleRegister] No pending Google result detected in URL hash.');
          }
          return;
        }

        setGoogleLoading(true);

        const googleProfile: GoogleProfile = {
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

        const userData = await registerGoogleAccountOrFallback(googleProfile, tokens);
        await login(userData);
        router.replace('/(tabs)/home');
      } catch (error) {
        if (isMounted) {
          handleGoogleRegisterError(error);
        }
      } finally {
        if (isMounted) {
          setGoogleLoading(false);
        }
      }
    };

    void maybeConsumePendingRegister();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === WEB_RESULT_STORAGE_KEY && event.newValue) {
        console.log('[GoogleRegister] Storage event detected for Google OAuth result. Retrying consumption.');
        void maybeConsumePendingRegister();
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
  }, [handleGoogleRegisterError, login, router]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => {
      if (!(field in prev)) {
        return prev;
      }
      const updated = { ...prev };
      delete updated[field as keyof typeof prev];
      return updated;
    });
  };

  const handleCountrySelect = (country: Country) => {
    setFormData(prev => ({ ...prev, country }));
    setFormErrors(prev => {
      const updated = { ...prev };
      delete updated.country;
      return updated;
    });
  };

  const handleBlur = (field: string) => {
    setFocusedField(prev => (prev === field ? null : prev));
  };

  const handleRegister = async () => {
    const { firstName, lastName, email, password, confirmPassword, phoneExtension, phoneNumber, country } = formData;
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhoneExtension = phoneExtension.trim();
    const trimmedPhoneNumber = phoneNumber.trim();

    setApiErrorMessage(null);
    setFormErrors({});

    if (
      !trimmedFirstName ||
      !trimmedLastName ||
      !trimmedEmail ||
      !password ||
      !confirmPassword ||
      !trimmedPhoneExtension ||
      !trimmedPhoneNumber ||
      !country
    ) {
      if (!country) {
        setFormErrors(prev => ({ ...prev, country: t('errors.countryRequired') }));
      }
      Alert.alert(t('common.error'), t('errors.fillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      setFormErrors(prev => ({ ...prev, confirmPassword: t('errors.passwordsDontMatch') }));
      Alert.alert(t('common.error'), t('errors.passwordsDontMatch'));
      return;
    }

    if (password.length < 8) {
      setFormErrors(prev => ({ ...prev, password: t('errors.passwordMin') }));
      Alert.alert(t('common.error'), t('errors.passwordMin'));
      return;
    }

    // Validate basic email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert(t('common.error'), t('errors.invalidEmail'));
      return;
    }

    setLoading(true);
    try {
      const normalizedFullName = `${trimmedFirstName} ${trimmedLastName}`
        .replace(/\s+/g, ' ')
        .trim();

      // Send extension and number separately to backend (new format)
      await registerUser({
        fullName: normalizedFullName,
        email: trimmedEmail.toLowerCase(),
        phoneExtension: trimmedPhoneExtension,
        phoneNumberOnly: trimmedPhoneNumber,
        password,
        country: country.name,
      });

      // After successful registration, send verification code
      const { validateEmail } = await import('@/services/auth');
      try {
        await validateEmail({
          email: trimmedEmail.toLowerCase(),
          password,
        });

        // Store email and password temporarily for resend code and verification
        await AsyncStorage.setItem('pending_verification_email', trimmedEmail.toLowerCase());
        await AsyncStorage.setItem('pending_verification_password', password);

        setApiErrorMessage(null);
        // Navigate directly to verification screen
        router.replace({
          pathname: '/(auth)/verify',
          params: { 
            email: trimmedEmail.toLowerCase(),
          },
        });
      } catch (validateError) {
        console.error('Error sending verification code:', validateError);
        
        // Check if it's an SMTP/email error
        if (validateError instanceof ApiError) {
          const errorData = validateError.data as Record<string, unknown> | undefined;
          const errorCode = errorData?.code as string | undefined;
          const errorMessage = validateError.message || t('errors.verificationFailed');
          
          // Show detailed error for SMTP failures
          if (errorCode === 'smtp_not_configured' || 
              errorCode === 'email_send_timeout' || 
              errorCode === 'email_send_failed') {
            const detailedMessage = errorData?.message 
              ? String(errorData.message)
              : errorMessage;
            
            Alert.alert(
              t('common.error'),
              `${t('errors.emailSendFailed')}\n\n${detailedMessage}`,
              [
                {
                  text: t('common.ok'),
                  onPress: () => {
                    // Still redirect to login
                    router.push({ pathname: '/(auth)/login', params: { registered: '1' } });
                  }
                }
              ]
            );
            return;
          }
          
          // For other errors, show generic message
          Alert.alert(
            t('common.error'),
            errorMessage,
            [
              {
                text: t('common.ok'),
                onPress: () => {
                  router.push({ pathname: '/(auth)/login', params: { registered: '1' } });
                }
              }
            ]
          );
          return;
        }
        
        // If validation fails with unknown error, still redirect to login with message
        setApiErrorMessage(null);
        Alert.alert(
          t('common.error'),
          t('errors.verificationFailed'),
          [
            {
              text: t('common.ok'),
              onPress: () => {
                router.push({ pathname: '/(auth)/login', params: { registered: '1' } });
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Register error:', error);

      if (error instanceof ApiError) {
        const message = resolveApiErrorMessage(error, t);
        setApiErrorMessage(message);
        Alert.alert(t('common.error'), message);
        return;
      }

      const fallbackMessage =
        error instanceof Error && error.message
          ? error.message
          : t('errors.registerGeneric');

      setApiErrorMessage(fallbackMessage);
      Alert.alert(t('common.error'), fallbackMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    try {
      let result;
      
      if (Platform.OS === 'web') {
        result = await signInWithGoogleWeb();
        if (!result) {
          console.log('[GoogleRegister] Web flow initiated; waiting for storage event.');
          return;
        }
      } else {
        // Móvil: usar expo-auth-session
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

      const tokens: GoogleAuthTokens = {
        idToken: result.idToken,
        accessToken: result.accessToken,
      };
      const userData = await registerGoogleAccountOrFallback(googleProfile, tokens);
      await login(userData);
      router.replace('/(tabs)/home');
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

      console.error('Google register error:', error);
      Alert.alert(t('common.error'), t('errors.googleLoginGeneric'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleRegister = async () => {
    Alert.alert(t('common.ok'), t('auth.soonApple'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.push('/(auth)/login')}
              >
                <Ionicons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
              
              <View style={styles.logoContainer}>
                <Text style={styles.appName}>{t('auth.appName')}</Text>
              </View>
              
              <Text style={styles.welcomeText}>{t('auth.createYourAccount')}</Text>
              <Text style={styles.subtitle}>{t('auth.joinCommunity')}</Text>
            </View>

            {/* Register Form */}
            <View style={styles.form}>
              {apiErrorMessage && (
                <View style={styles.apiErrorContainer}>
                  <Ionicons name="alert-circle" size={18} color="#B91C1C" style={styles.apiErrorIcon} />
                  <Text style={styles.apiErrorText}>{apiErrorMessage}</Text>
                </View>
              )}

              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>{t('auth.firstName')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={!isFieldFocused('firstName') && !valueHasContent(formData.firstName) ? 'John' : ''}
                    placeholderTextColor={placeholderColor}
                    value={formData.firstName}
                    onChangeText={(value) => handleInputChange('firstName', value)}
                    autoCapitalize="words"
                    onFocus={() => setFocusedField('firstName')}
                    onBlur={() => handleBlur('firstName')}
                  />
                </View>
                
                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>{t('auth.lastName')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={!isFieldFocused('lastName') && !valueHasContent(formData.lastName) ? 'Smith' : ''}
                    placeholderTextColor={placeholderColor}
                    value={formData.lastName}
                    onChangeText={(value) => handleInputChange('lastName', value)}
                    autoCapitalize="words"
                    onFocus={() => setFocusedField('lastName')}
                    onBlur={() => handleBlur('lastName')}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('auth.email')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={!isFieldFocused('email') && !valueHasContent(formData.email) ? 'tu@email.com' : ''}
                  placeholderTextColor={placeholderColor}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => handleBlur('email')}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('auth.country')}</Text>
                <CountryPicker
                  selectedCountry={formData.country}
                  onSelectCountry={handleCountrySelect}
                  error={formErrors.country}
                  placeholder={t('auth.selectCountry')}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('auth.phone')}</Text>
                <PhoneInput
                  selectedCountry={formData.country}
                  phoneExtension={formData.phoneExtension}
                  phoneNumber={formData.phoneNumber}
                  onExtensionChange={(extension) => handleInputChange('phoneExtension', extension)}
                  onPhoneNumberChange={(number) => handleInputChange('phoneNumber', number)}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('auth.password')}</Text>
                <TextInput
                  style={[styles.input, formErrors.password ? styles.inputError : undefined]}
                  placeholder={!isFieldFocused('password') && !valueHasContent(formData.password) ? '••••••••' : ''}
                  placeholderTextColor={placeholderColor}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry={true}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => handleBlur('password')}
                />
                {formErrors.password && <Text style={styles.inputErrorText}>{formErrors.password}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('auth.confirmPassword')}</Text>
                <TextInput
                  style={[styles.input, formErrors.confirmPassword ? styles.inputError : undefined]}
                  placeholder={!isFieldFocused('confirmPassword') && !valueHasContent(formData.confirmPassword) ? '••••••••' : ''}
                  placeholderTextColor={placeholderColor}
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  secureTextEntry={true}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => handleBlur('confirmPassword')}
                />
                {formErrors.confirmPassword && <Text style={styles.inputErrorText}>{formErrors.confirmPassword}</Text>}
              </View>

              <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.registerButtonText}>{t('auth.signUp')}</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.orSignUpWith')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Register Buttons */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleRegister}
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

              <TouchableOpacity style={styles.socialButton} onPress={handleAppleRegister}>
                <View style={styles.socialButtonContent}>
                  <Ionicons name="logo-apple" size={24} color="#111827" />
                  <Text style={styles.socialButtonText}>{t('auth.apple')}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>{t('auth.haveAccount')}</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.loginLink}>{t('auth.loginCta')}</Text>
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
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
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
  nameRow: {
    flexDirection: 'row',
    marginBottom: 20,
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
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#1F2937',
  },
  inputError: {
    borderColor: '#F87171',
  },
  registerButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginText: {
    color: '#6B7280',
    fontSize: 14,
  },
  loginLink: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  apiErrorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  apiErrorIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  apiErrorText: {
    color: '#B91C1C',
    fontSize: 14,
    flex: 1,
  },
  inputErrorText: {
    color: '#B91C1C',
    fontSize: 12,
    marginTop: 6,
  },
});
