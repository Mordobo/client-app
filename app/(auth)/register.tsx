import { CountryPicker, COUNTRIES, type Country } from '@/components/CountryPicker';
import { PhoneInput } from '@/components/PhoneInput';
import { VerificationCodeModal } from '@/components/VerificationCodeModal';
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
  Linking,
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
  // Initialize with a default country (Dominican Republic - +1)
  const defaultCountry = COUNTRIES.find(c => c.phoneExtension === '+1') || COUNTRIES[0];
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phoneExtension: defaultCountry?.phoneExtension || '',
    phoneNumber: '',
    country: defaultCountry || null,
    acceptTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ password?: string; country?: string; terms?: string }>({});
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const googleStatusCodes = getGoogleStatusCodes();
  const webGoogleSupported = isGoogleWebAvailable();
  const isGoogleSupported = webGoogleSupported;

  const placeholderColor = 'rgba(156, 163, 175, 0.5)';
  const isFieldFocused = (field: string) => focusedField === field;

  // Calculate if form is valid and button should be enabled
  const isFormValid = React.useMemo(() => {
    const { firstName, lastName, email, password, phoneExtension, phoneNumber, acceptTerms } = formData;
    
    // Trim all string values
    const trimmedFirstName = (firstName || '').trim();
    const trimmedLastName = (lastName || '').trim();
    const trimmedEmail = (email || '').trim();
    const trimmedPhoneExtension = (phoneExtension || '').trim();
    const trimmedPhoneNumber = (phoneNumber || '').trim();
    
    // Validate each field
    const hasValidFirstName = trimmedFirstName.length >= 2;
    const hasValidLastName = trimmedLastName.length >= 2;
    const hasValidEmail = trimmedEmail.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    // Password validation: min 8 chars, at least 1 uppercase, at least 1 number
    const passwordLength = (password || '').length;
    const hasPasswordLength = passwordLength >= 8;
    const hasPasswordUppercase = /[A-Z]/.test(password || '');
    const hasPasswordNumber = /[0-9]/.test(password || '');
    const hasValidPassword = hasPasswordLength && hasPasswordUppercase && hasPasswordNumber;
    const hasValidPhoneExtension = trimmedPhoneExtension.length > 0;
    const hasValidPhoneNumber = trimmedPhoneNumber.length > 0;
    const hasAcceptedTerms = acceptTerms === true;
    
    const isValid = (
      hasValidFirstName &&
      hasValidLastName &&
      hasValidEmail &&
      hasValidPassword &&
      hasValidPhoneExtension &&
      hasValidPhoneNumber &&
      hasAcceptedTerms &&
      !loading
    );
    
    return isValid;
  }, [formData, loading]);

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
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      return updated;
    });
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

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return t('errors.passwordMin');
    }
    if (!/[A-Z]/.test(pwd)) {
      return t('errors.passwordRequirements');
    }
    if (!/[0-9]/.test(pwd)) {
      return t('errors.passwordRequirements');
    }
    return null;
  };

  const handleOpenTerms = () => {
    Linking.openURL('https://mordobo.com/terms').catch(() => {
      Alert.alert(t('common.error'), 'Could not open Terms and Conditions');
    });
  };

  const handleOpenPrivacy = () => {
    Linking.openURL('https://mordobo.com/privacy').catch(() => {
      Alert.alert(t('common.error'), 'Could not open Privacy Policy');
    });
  };

  const handleRegister = async () => {
    const { firstName, lastName, email, password, phoneExtension, phoneNumber, country, acceptTerms } = formData;
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhoneExtension = phoneExtension.trim();
    const trimmedPhoneNumber = phoneNumber.trim();

    setApiErrorMessage(null);
    setFormErrors({});

    // Validate all required fields
    if (
      !trimmedFirstName ||
      !trimmedLastName ||
      !trimmedEmail ||
      !password ||
      !trimmedPhoneExtension ||
      !trimmedPhoneNumber
    ) {
      Alert.alert(t('common.error'), t('errors.fillAllFields'));
      return;
    }

    // Validate name length
    if (trimmedFirstName.length < 2) {
      Alert.alert(t('common.error'), t('errors.fillAllFields'));
      return;
    }
    if (trimmedLastName.length < 2) {
      Alert.alert(t('common.error'), t('errors.fillAllFields'));
      return;
    }

    // Validate password requirements
    const passwordError = validatePassword(password);
    if (passwordError) {
      setFormErrors(prev => ({ ...prev, password: passwordError }));
      Alert.alert(t('common.error'), passwordError);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert(t('common.error'), t('errors.invalidEmail'));
      return;
    }

    // Validate terms acceptance
    if (!acceptTerms) {
      setFormErrors(prev => ({ ...prev, terms: t('errors.termsRequired') }));
      Alert.alert(t('common.error'), t('errors.termsRequired'));
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
        country: country?.name || 'Unknown',
      });

      // After successful registration, send verification code
      const { validateEmail } = await import('@/services/auth');
      try {
        console.log('[Register] Attempting to send verification code...');
        const validateResponse = await validateEmail({
          email: trimmedEmail.toLowerCase(),
          password,
        });
        console.log('[Register] ✅ Verification code request successful:', validateResponse);

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
        console.error('[Register] ❌ Error sending verification code:', validateError);
        console.error('[Register] Error type:', validateError instanceof ApiError ? 'ApiError' : typeof validateError);
        if (validateError instanceof ApiError) {
          console.error('[Register] Error status:', validateError.status);
          console.error('[Register] Error data:', validateError.data);
        }
        
        // Check if it's an SMTP/email error
        if (validateError instanceof ApiError) {
          const errorData = validateError.data as Record<string, unknown> | undefined;
          const errorCode = errorData?.code as string | undefined;
          const errorMessage = validateError.message || t('errors.verificationFailed');
          
          // Show detailed error for SMTP failures
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
              await AsyncStorage.setItem('pending_verification_email', trimmedEmail.toLowerCase());
              await AsyncStorage.setItem('pending_verification_password', password);
              
              // Navigate to verification screen after modal is closed
              return;
            } else {
              // No code provided, show error and redirect
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
                      router.push({ pathname: '/(auth)/login', params: { registered: '1' } });
                    }
                  }
                ]
              );
              return;
            }
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
        <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Header */}
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.title}>{t('auth.createAccount')}</Text>
            <Text style={styles.subtitle}>{t('auth.completeDataToRegister')}</Text>

            {/* Register Form */}
            <View style={styles.form}>
              {apiErrorMessage && (
                <View style={styles.apiErrorContainer}>
                  <Ionicons name="alert-circle" size={18} color="#B91C1C" style={styles.apiErrorIcon} />
                  <Text style={styles.apiErrorText}>{apiErrorMessage}</Text>
                </View>
              )}

              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 6 }]}>
                  <Text style={styles.inputLabel}>{t('auth.firstName')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="John"
                    placeholderTextColor={placeholderColor}
                    value={formData.firstName}
                    onChangeText={(value) => handleInputChange('firstName', value)}
                    autoCapitalize="words"
                    onFocus={() => setFocusedField('firstName')}
                    onBlur={() => handleBlur('firstName')}
                  />
                </View>
                
                <View style={[styles.inputContainer, { flex: 1, marginLeft: 6 }]}>
                  <Text style={styles.inputLabel}>{t('auth.lastName')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Doe"
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
                  placeholder="tu@email.com"
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
                <Text style={styles.inputLabel}>{t('auth.phone')}</Text>
                <PhoneInput
                  selectedCountry={formData.country}
                  phoneExtension={formData.phoneExtension}
                  phoneNumber={formData.phoneNumber}
                  onExtensionChange={(extension) => {
                    // Try to find country by extension
                    const foundCountry = COUNTRIES.find((c: Country) => c.phoneExtension === extension);
                    // Update both extension and country in a single state update
                    setFormData(prev => ({
                      ...prev,
                      phoneExtension: extension,
                      country: foundCountry || prev.country,
                    }));
                    // Clear any phone-related errors
                    setFormErrors(prev => {
                      const updated = { ...prev };
                      delete updated.country;
                      return updated;
                    });
                  }}
                  onPhoneNumberChange={(number) => handleInputChange('phoneNumber', number)}
                  placeholder="+1 809 555 1234"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('auth.password')}</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={[styles.input, styles.passwordInput, formErrors.password ? styles.inputError : undefined]}
                    placeholder={t('auth.passwordRequirements')}
                    placeholderTextColor={placeholderColor}
                    value={formData.password}
                    onChangeText={(value) => handleInputChange('password', value)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => handleBlur('password')}
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
                {formErrors.password && <Text style={styles.inputErrorText}>{formErrors.password}</Text>}
              </View>

              {/* Terms and Conditions Checkbox */}
              <View style={styles.termsContainer}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, acceptTerms: !prev.acceptTerms }));
                    setFormErrors(prev => {
                      const updated = { ...prev };
                      delete updated.terms;
                      return updated;
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, formData.acceptTerms && styles.checkboxChecked]}>
                    {formData.acceptTerms && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>
                <View style={styles.termsTextContainer}>
                  <Text style={styles.termsText}>
                    {t('auth.acceptTermsPrefix')}{' '}
                    <Text style={styles.termsLink} onPress={handleOpenTerms}>
                      {t('auth.termsAndConditions')}
                    </Text>
                    {' '}{t('auth.acceptTermsSuffix')}{' '}
                    <Text style={styles.termsLink} onPress={handleOpenPrivacy}>
                      {t('auth.privacyPolicy')}
                    </Text>
                  </Text>
                </View>
              </View>
              {formErrors.terms && <Text style={styles.inputErrorText}>{formErrors.terms}</Text>}

              <TouchableOpacity 
                style={[
                  styles.registerButton, 
                  (!isFormValid || loading) && styles.registerButtonDisabled
                ]} 
                onPress={handleRegister}
                disabled={!isFormValid || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.registerButtonText}>{t('auth.createAccount')}</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>{t('auth.alreadyHaveAccount')} </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.loginLink}>{t('auth.signIn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Verification Code Modal */}
      <VerificationCodeModal
        visible={showCodeModal}
        code={verificationCode}
        onClose={() => {
          setShowCodeModal(false);
          // Navigate to verification screen after closing modal
          if (verificationCode) {
            router.replace({
              pathname: '/(auth)/verify',
              params: { 
                email: formData.email.trim().toLowerCase(),
              },
            });
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
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
    marginBottom: 32,
  },
  form: {
    marginBottom: 24,
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 20,
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 32,
  },
  checkboxContainer: {
    paddingTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#374151',
    backgroundColor: '#252542',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 19.5,
  },
  termsLinksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  termsLink: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  registerButtonDisabled: {
    opacity: 0.5,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  loginLink: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '400',
  },
  apiErrorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  apiErrorIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  apiErrorText: {
    color: '#EF4444',
    fontSize: 14,
    flex: 1,
  },
  inputErrorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
});
