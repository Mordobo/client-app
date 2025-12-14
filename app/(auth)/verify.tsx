import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n';
import { ApiError, resendCode, verifyCode } from '@/services/auth';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const CODE_LENGTH = 4;
const RESEND_COOLDOWN_SECONDS = 120; // 2 minutes
const CODE_INPUT_GAP = 12;
const CODE_INPUT_PADDING = 24 * 2; // padding horizontal del contenedor

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { login } = useAuth();
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Calculate code input width dynamically
  const CODE_INPUT_TOTAL_GAP = CODE_INPUT_GAP * (CODE_LENGTH - 1);
  const CODE_INPUT_WIDTH = Math.max(
    50,
    Math.min(80, (screenWidth - CODE_INPUT_PADDING - CODE_INPUT_TOTAL_GAP) / CODE_LENGTH)
  );

  useEffect(() => {
    // Start cooldown timer
    if (resendCooldown > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, [resendCooldown]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '');
    
    if (digit.length > 1) {
      // Handle paste: fill multiple fields
      const digits = digit.slice(0, CODE_LENGTH);
      const newCode = [...code];
      digits.split('').forEach((d, i) => {
        if (index + i < CODE_LENGTH) {
          newCode[index + i] = d;
        }
      });
      setCode(newCode);
      
      // Focus the next empty field or the last field
      const nextEmptyIndex = newCode.findIndex((c, i) => i >= index && !c);
      const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : CODE_LENGTH - 1;
      inputRefs.current[focusIndex]?.focus();
    } else {
      // Single digit input
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);

      // Auto-focus next field if digit entered
      if (digit && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      // Move to previous field on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const verificationCode = code.join('');
    
    if (verificationCode.length !== CODE_LENGTH) {
      Alert.alert(t('common.error'), t('errors.fillAllFields'));
      return;
    }

    const email = params.email;
    if (!email) {
      Alert.alert(t('common.error'), t('errors.verificationFailed'));
      router.back();
      return;
    }

    setLoading(true);
    try {
      // Call API to verify code
      const apiResponse = await verifyCode({
        email,
        code: verificationCode,
      });

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
        avatar: (apiUser as Record<string, unknown>).profile_image as string | undefined,
        country: (apiUser as Record<string, unknown>).country as string | undefined,
        provider: 'email' as const,
        authToken: apiResponse.accessToken || apiResponse.token,
        refreshToken: apiResponse.refreshToken,
      };

      // Login user
      await login(userData);

      // Clear temporary verification data
      await AsyncStorage.multiRemove([
        'pending_verification_email', 
        'pending_verification_password',
      ]);

      // Navigate to home on success
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Verification error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        status: error instanceof ApiError ? error.status : undefined,
        data: error instanceof ApiError ? error.data : undefined,
      });
      
      if (error instanceof ApiError) {
        if (error.status === 401) {
          Alert.alert(
            t('common.error'), 
            t('errors.invalidVerificationCode'),
            [
              {
                text: t('common.ok'),
                onPress: () => {
                  setCode(Array(CODE_LENGTH).fill(''));
                  inputRefs.current[0]?.focus();
                },
              },
            ]
          );
        } else if (error.status === 404) {
          Alert.alert(
            t('common.error'),
            t('errors.userNotFound'),
            [
              {
                text: t('common.ok'),
                onPress: () => router.back(),
              },
            ]
          );
        } else {
          const errorMessage = error.message || t('errors.verificationFailed');
          Alert.alert(t('common.error'), errorMessage);
          setCode(Array(CODE_LENGTH).fill(''));
          inputRefs.current[0]?.focus();
        }
      } else {
        Alert.alert(t('common.error'), t('errors.verificationFailed'));
        setCode(Array(CODE_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) {
      return;
    }

    const email = params.email;
    if (!email) {
      Alert.alert(t('common.error'), t('errors.verificationFailed'));
      return;
    }

    try {
      // Get stored password from AsyncStorage
      const password = await AsyncStorage.getItem('pending_verification_password');
      
      if (!password) {
        Alert.alert(
          t('common.error'),
          t('errors.unableToResendCode')
        );
        router.back();
        return;
      }

      // Call API to resend code
      await resendCode({
        email,
        password,
      });
      
      // Reset cooldown
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setCanResend(false);
      
      // Clear current code
      setCode(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      
      Alert.alert(t('common.ok'), t('auth.verificationCodeSent'));
    } catch (error) {
      console.error('Resend error:', error);
      
      if (error instanceof ApiError) {
        if (error.status === 401) {
          Alert.alert(t('common.error'), t('errors.loginFailed'));
        } else {
          Alert.alert(t('common.error'), error.message || t('errors.resendCodeFailed'));
        }
      } else {
        Alert.alert(t('common.error'), t('errors.resendCodeFailed'));
      }
    }
  };

  const isCodeComplete = code.every((digit) => digit !== '');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Title and Subtitle */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{t('auth.enterVerificationCode')}</Text>
            <Text style={styles.subtitle}>
              {params.email 
                ? `${t('auth.verificationCodeSent')} ${params.email}`
                : t('auth.verificationCodeSent')
              }
            </Text>
          </View>

          {/* Code Input Fields */}
          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.codeInput,
                  {
                    width: CODE_INPUT_WIDTH,
                    height: CODE_INPUT_WIDTH,
                    fontSize: Math.min(24, CODE_INPUT_WIDTH * 0.35),
                  },
                  digit ? styles.codeInputFilled : null,
                ]}
                value={digit}
                onChangeText={(value) => handleCodeChange(index, value)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={index === 0}
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.verifyButton, (!isCodeComplete || loading) && styles.verifyButtonDisabled]}
            onPress={handleVerify}
            disabled={!isCodeComplete || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.verifyButtonText}>{t('auth.verifyAccount')}</Text>
            )}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <TouchableOpacity
              onPress={handleResend}
              disabled={!canResend}
              style={styles.resendButton}
            >
              <Text style={[styles.resendText, canResend && styles.resendTextActive]}>
                {t('auth.resendCode')}
              </Text>
            </TouchableOpacity>
            {!canResend && (
              <Text style={styles.resendCooldown}>
                {t('auth.resendIn')} {formatTime(resendCooldown)}
              </Text>
            )}
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
    paddingTop: 20,
  },
  header: {
    marginBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: CODE_INPUT_GAP,
    width: '100%',
  },
  codeInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontWeight: '600',
    textAlign: 'center',
    color: '#1F2937',
    padding: 0,
  },
  codeInputFilled: {
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
  },
  verifyButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  resendButton: {
    padding: 4,
  },
  resendText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  resendTextActive: {
    color: '#3B82F6',
  },
  resendCooldown: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});

