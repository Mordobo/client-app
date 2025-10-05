import { router } from 'expo-router';
import React, { useState } from 'react';
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
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
// import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { t } from '@/i18n';
import { ApiError, registerUser } from '@/services/auth';
import { Ionicons } from '@expo/vector-icons';

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
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const placeholderColor = 'rgba(55, 65, 81, 0.45)';
  const isFieldFocused = (field: string) => focusedField === field;

  const handleInputChange = (field: string, value: string) => {
    const nextValue = field === 'phone' ? digitsOnly(value) : value;

    setFormData(prev => ({ ...prev, [field]: nextValue }));
    setFormErrors(prev => {
      if (!(field in prev)) {
        return prev;
      }
      const updated = { ...prev };
      delete updated[field as keyof typeof prev];
      return updated;
    });
  };

  const handleBlur = (field: string) => {
    setFocusedField(prev => (prev === field ? null : prev));
  };

  const handleRegister = async () => {
    const { firstName, lastName, email, password, confirmPassword, phone } = formData;
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    setApiErrorMessage(null);
    setFormErrors({});

    if (
      !trimmedFirstName ||
      !trimmedLastName ||
      !trimmedEmail ||
      !password ||
      !confirmPassword ||
      !trimmedPhone
    ) {
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

      await registerUser({
        fullName: normalizedFullName,
        email: trimmedEmail.toLowerCase(),
        phoneNumber: trimmedPhone,
        password,
      });

      setApiErrorMessage(null);
      router.push({ pathname: '/(auth)/login', params: { registered: '1' } });
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
    Alert.alert(t('common.ok'), t('auth.soonGoogle'));
  };

  const handleFacebookRegister = async () => {
    Alert.alert(t('common.ok'), t('auth.soonFacebook'));
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
                <Text style={styles.inputLabel}>{t('auth.phone')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={!isFieldFocused('phone') && !valueHasContent(formData.phone) ? '+1 234 567 8900' : ''}
                  placeholderTextColor={placeholderColor}
                  value={formData.phone}
                  onChangeText={(value) => handleInputChange('phone', value)}
                  keyboardType="phone-pad"
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => handleBlur('phone')}
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
                  secureTextEntry
                  autoCapitalize="none"
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
                  secureTextEntry
                  autoCapitalize="none"
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
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleRegister}>
                <Ionicons name="logo-google" size={24} color="#DB4437" />
                <Text style={styles.socialButtonText}>{t('auth.google')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton} onPress={handleFacebookRegister}>
                <Ionicons name="logo-facebook" size={24} color="#4267B2" />
                <Text style={styles.socialButtonText}>{t('auth.facebook')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton} onPress={handleAppleRegister}>
                <Ionicons name="logo-apple" size={24} color="#111827" />
                <Text style={styles.socialButtonText}>{t('auth.apple')}</Text>
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
