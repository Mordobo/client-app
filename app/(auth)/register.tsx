import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
// import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { saveUser, findUserByEmail } from '@/utils/userStorage';
import { t } from '@/i18n';

const valueHasContent = (text: string) => text.trim().length > 0;

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
  const { login } = useAuth();
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const placeholderColor = 'rgba(55, 65, 81, 0.45)';
  const isFieldFocused = (field: string) => focusedField === field;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: string) => {
    setFocusedField(prev => (prev === field ? null : prev));
  };

  const handleRegister = async () => {
    const { firstName, lastName, email, password, confirmPassword, phone } = formData;
    
    if (!firstName || !lastName || !email || !password || !confirmPassword || !phone) {
      Alert.alert(t('common.error'), t('errors.fillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('errors.passwordsDontMatch'));
      return;
    }

    if (password.length < 8) {
      Alert.alert(t('common.error'), t('errors.passwordMin'));
      return;
    }

    // Validate basic email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert(t('common.error'), t('errors.invalidEmail'));
      return;
    }
    
    setLoading(true);
    try {
      // Check if the user already exists
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        Alert.alert(t('common.error'), t('errors.emailExists'));
        setLoading(false);
        return;
      }

      // Create a new user
      const newUser = {
        id: Date.now().toString(),
        email: email.toLowerCase(),
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        password: password, // In a real app, this should be hashed
        provider: 'email' as const,
        createdAt: new Date().toISOString(),
      };
      
      // Save the user to storage
      await saveUser(newUser);
      
      Alert.alert(
        t('common.ok'), 
        t('auth.successRegister'),
        [
          {
            text: t('common.ok'),
            onPress: () => router.push('/(auth)/login')
          }
        ]
      );
    } catch (error) {
      console.error('Register error:', error);
      Alert.alert(t('common.error'), t('errors.registerGeneric'));
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

  const handleGithubRegister = async () => {
    try {
      setLoading(true);
      // Implement the GitHub registration logic here
      const userData = {
        id: '1',
        email: 'usuario@github.com',
        firstName: 'Usuario',
        lastName: 'GitHub',
        provider: 'github' as const,
      };
      
      await login(userData);
    } catch (error) {
      console.error('GitHub Register Error:', error);
      Alert.alert('Error', 'Error al registrarse con GitHub');
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
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
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
              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Nombre</Text>
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
                  <Text style={styles.inputLabel}>Apellido</Text>
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
                  style={styles.input}
                  placeholder={!isFieldFocused('password') && !valueHasContent(formData.password) ? '••••••••' : ''}
                  placeholderTextColor={placeholderColor}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => handleBlur('password')}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('auth.confirmPassword')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={!isFieldFocused('confirmPassword') && !valueHasContent(formData.confirmPassword) ? '••••••••' : ''}
                  placeholderTextColor={placeholderColor}
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  secureTextEntry
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => handleBlur('confirmPassword')}
                />
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

              <TouchableOpacity style={styles.socialButton} onPress={handleGithubRegister}>
                <Ionicons name="logo-github" size={24} color="#333" />
                <Text style={styles.socialButtonText}>{t('auth.github')}</Text>
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
});
