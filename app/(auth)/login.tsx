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
} from 'react-native';
import { router } from 'expo-router';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
// import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { validateUser } from '@/utils/userStorage';
import { t } from '@/i18n';

const valueHasContent = (text: string) => text.trim().length > 0;

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPasswordTooltip, setShowPasswordTooltip] = useState(false);
  const [identifierFocused, setIdentifierFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { login } = useAuth();

  const trimmedIdentifier = identifier.trim();
  const canSubmit = valueHasContent(identifier) && password.length >= 8;
  const isButtonEnabled = canSubmit && !loading;

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
      // Validate credentials against registered users
      const user = await validateUser(trimmedIdentifier, password);

      if (!user) {
        setErrorMessage(t('errors.loginFailed'));
        return;
      }
      
      // Log in with the user data
      const userData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        provider: user.provider,
      };

      await login(userData);
      console.log('Login successful, user data:', userData);
      setErrorMessage(null);
      setShowPasswordTooltip(false);

      // Explicit redirect to the main screen
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(t('common.error'), t('errors.loginGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    Alert.alert(t('common.ok'), t('auth.soonGoogle'));
  };

  const handleFacebookLogin = async () => {
    Alert.alert(t('common.ok'), t('auth.soonFacebook'));
  };

  const handleGithubLogin = async () => {
    try {
      setLoading(true);
      // Implement the GitHub login logic here
      // For now we simulate the login
      const userData = {
        id: '1',
        email: 'usuario@github.com',
        firstName: 'Usuario',
        lastName: 'GitHub',
        provider: 'github' as const,
      };
      
      await login(userData);
      // Explicit redirect to the main screen
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('GitHub Login Error:', error);
      Alert.alert(t('common.error'), t('errors.loginGeneric'));
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
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.appName}>{t('auth.appName')}</Text>
            </View>
          </View>

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
            <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
              <Ionicons name="logo-google" size={24} color="#DB4437" />
              <Text style={styles.socialButtonText}>{t('auth.google')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} onPress={handleFacebookLogin}>
              <Ionicons name="logo-facebook" size={24} color="#4267B2" />
              <Text style={styles.socialButtonText}>{t('auth.facebook')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} onPress={handleGithubLogin}>
              <Ionicons name="logo-github" size={24} color="#333" />
              <Text style={styles.socialButtonText}>{t('auth.github')}</Text>
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
