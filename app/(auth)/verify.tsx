import { VerificationCodeModal } from '@/components/VerificationCodeModal';
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
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 45; // 45 seconds
const CODE_INPUT_GAP = 12;
const CODE_INPUT_PADDING = 24 * 2; // padding horizontal del contenedor

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleBack = () => {
    // Since we use router.replace() to get here, there's no history
    // Navigate explicitly to login screen
    router.replace('/(auth)/login');
  };

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Debug effect to monitor state changes
  useEffect(() => {
    console.log('[Verify] State changed', { canResend, resendCooldown });
  }, [canResend, resendCooldown]);

  // Calculate code input width dynamically
  // Each input should be 48x56px according to specs, but we'll make it responsive
  const CODE_INPUT_TOTAL_GAP = CODE_INPUT_GAP * (CODE_LENGTH - 1);
  const CODE_INPUT_WIDTH = Math.max(
    48,
    Math.min(56, (screenWidth - CODE_INPUT_PADDING - CODE_INPUT_TOTAL_GAP) / CODE_LENGTH)
  );
  const CODE_INPUT_HEIGHT = 56; // Fixed height as per specs

  useEffect(() => {
    // Clear any existing interval first
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }

    // If cooldown is 0, enable resend immediately
    if (resendCooldown === 0) {
      setCanResend(true);
      console.log('[Verify] Cooldown is 0, canResend set to true');
      return;
    }

    // Start cooldown timer if cooldown is greater than 0
    if (resendCooldown > 0) {
      setCanResend(false); // Ensure canResend is false when cooldown is active
      console.log('[Verify] Starting cooldown timer', { resendCooldown });
      
      cooldownIntervalRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            // Clear interval when cooldown reaches 0
            if (cooldownIntervalRef.current) {
              clearInterval(cooldownIntervalRef.current);
              cooldownIntervalRef.current = null;
            }
            
            // Enable resend
            setCanResend(true);
            console.log('[Verify] Cooldown finished, canResend set to true');
            
            return 0;
          }
          
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'verify.tsx:134',message:'handleVerify entry',data:{codeLength:code.join('').length,hasEmail:!!params.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    const verificationCode = code.join('');
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'verify.tsx:137',message:'Verification code joined',data:{verificationCode,codeLength:verificationCode.length,expectedLength:CODE_LENGTH},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    if (verificationCode.length !== CODE_LENGTH) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'verify.tsx:138',message:'Code length validation failed',data:{codeLength:verificationCode.length,expectedLength:CODE_LENGTH},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      Alert.alert(t('common.error'), t('errors.fillAllFields'));
      return;
    }

    const email = params.email;
    if (!email) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'verify.tsx:144',message:'Email missing from params',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      Alert.alert(t('common.error'), t('errors.verificationFailed'));
      router.back();
      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'verify.tsx:149',message:'Before setLoading(true) and API call',data:{email,codeLength:verificationCode.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    setLoading(true);
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'verify.tsx:152',message:'Before verifyCode API call',data:{email,code:verificationCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Call API to verify code
      const apiResponse = await verifyCode({
        email,
        code: verificationCode,
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'verify.tsx:156',message:'verifyCode API call succeeded',data:{hasUser:!!apiResponse.user,hasToken:!!apiResponse.accessToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

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

      // Check if this is the first login using login_count from backend
      const loginCount = (apiUser as Record<string, unknown>).login_count as number | undefined;
      const isFirstLogin = loginCount === 1 || loginCount === undefined;
      
      if (isFirstLogin) {
        // Navigate to onboarding screens for first-time users
        router.replace('/(auth)/onboarding');
      } else {
        // Navigate to home on success
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'verify.tsx:197',message:'handleVerify error caught',data:{errorType:error instanceof Error?'Error':'Unknown',errorMessage:error instanceof Error?error.message:String(error),isApiError:error instanceof ApiError,status:error instanceof ApiError?error.status:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
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
    console.log('[Verify] handleResend called', { canResend, resendCooldown });
    
    // Double check: verify both canResend state and cooldown value
    if (!canResend || resendCooldown > 0) {
      console.log('[Verify] Resend blocked', { canResend, resendCooldown });
      return;
    }

    const email = params.email;
    if (!email) {
      console.log('[Verify] Resend blocked - no email in params');
      Alert.alert(t('common.error'), t('errors.verificationFailed'));
      return;
    }

    try {
      console.log('[Verify] Starting resend process for:', email);
      
      // Get stored password from AsyncStorage
      const password = await AsyncStorage.getItem('pending_verification_password');
      
      if (!password) {
        console.log('[Verify] Resend blocked - no password in storage');
        Alert.alert(
          t('common.error'),
          t('errors.unableToResendCode')
        );
        router.back();
        return;
      }

      console.log('[Verify] Calling resendCode API...');
      
      // Call API to resend code
      await resendCode({
        email,
        password,
      });
      
      console.log('[Verify] Resend API call successful');
      
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
        const errorData = error.data as Record<string, unknown> | undefined;
        const errorCode = errorData?.code as string | undefined;
        const errorMessage = error.message || t('errors.resendCodeFailed');
        
        // Show detailed error for SMTP failures
        if (errorCode === 'smtp_not_configured' || 
            errorCode === 'email_send_timeout' || 
            errorCode === 'email_send_failed') {
          // Check if backend returned the code as workaround
          const code = errorData?.verificationCode as string | undefined;
          
          if (code) {
            // Reset cooldown even when SMTP fails (code was generated)
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
            setCanResend(false);
            
            // Clear current code
            setCode(Array(CODE_LENGTH).fill(''));
            
            // Show modal with code
            setVerificationCode(code);
            setShowCodeModal(true);
            return;
          } else {
            // No code provided, show error but don't reset cooldown
            const detailedMessage = errorData?.message 
              ? String(errorData.message)
              : errorMessage;
            
            Alert.alert(
              t('common.error'),
              `${t('errors.emailSendFailed')}\n\n${detailedMessage}`
            );
            return;
          }
        }
        
        // Handle authentication errors
        if (error.status === 401) {
          Alert.alert(t('common.error'), t('errors.loginFailed'));
          return;
        }
        
        // For other errors, show the error message
        Alert.alert(t('common.error'), errorMessage);
      } else {
        Alert.alert(t('common.error'), t('errors.resendCodeFailed'));
      }
    }
  };

  const isCodeComplete = code.every((digit) => digit !== '');

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'verify.tsx:334',message:'isCodeComplete state changed',data:{isCodeComplete,code:code.join(''),codeLength:code.join('').length,loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  }, [isCodeComplete, code, loading]);
  // #endregion

  // Get email from params (this is where the verification code is sent)
  const displayEmail = params.email || '';

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
          {/* Back Button */}
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={handleBack}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Text style={styles.backButtonText}>←</Text>
          </Pressable>

          {/* Icon and Title Section */}
          <View style={styles.iconTitleContainer}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconEmoji}>📱</Text>
            </View>
            <Text style={styles.title}>{t('auth.verificationTitle')}</Text>
            <Text style={styles.subtitle}>
              {t('auth.verificationSubtitle')}{'\n'}
              <Text style={styles.emailText}>{displayEmail}</Text>
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
                    height: CODE_INPUT_HEIGHT,
                    fontSize: Math.min(24, CODE_INPUT_WIDTH * 0.4),
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
            onPress={() => {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/0bf175bf-b05a-422e-87c8-7c4bfaecaeeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'verify.tsx:401',message:'Verify button onPress triggered',data:{isCodeComplete,loading,codeLength:code.join('').length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
              // #endregion
              handleVerify();
            }}
            disabled={!isCodeComplete || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.verifyButtonText}>{t('auth.verify')}</Text>
            )}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendQuestion}>{t('auth.didntReceiveCode')}</Text>
            <TouchableOpacity
              onPress={() => {
                console.log('[Verify] Resend button pressed', { canResend, resendCooldown });
                if (canResend && resendCooldown === 0) {
                  handleResend();
                } else {
                  console.log('[Verify] Resend blocked by button check', { canResend, resendCooldown });
                }
              }}
              disabled={!canResend || resendCooldown > 0}
              style={styles.resendButton}
              activeOpacity={canResend && resendCooldown === 0 ? 0.7 : 1}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.resendLink, !canResend && styles.resendLinkDisabled]}>
                {canResend 
                  ? t('auth.resendCode')
                  : `${t('auth.resendCode')} (${formatTime(resendCooldown)})`
                }
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      {/* Verification Code Modal */}
      <VerificationCodeModal
        visible={showCodeModal}
        code={verificationCode}
        onClose={() => {
          setShowCodeModal(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Dark background from preview
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 40,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
  },
  iconTitleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.2)', // primary color with 20% opacity
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#9ca3af', // textSecondary from preview
    textAlign: 'center',
    lineHeight: 22.5, // 1.5 line height
  },
  emailText: {
    color: '#fff',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: CODE_INPUT_GAP,
  },
  codeInput: {
    backgroundColor: '#252542', // bgCard from preview
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151', // border from preview
    fontWeight: '600',
    textAlign: 'center',
    color: '#fff',
    padding: 0,
  },
  codeInputFilled: {
    borderWidth: 2,
    borderColor: '#3b82f6', // primary from preview
    backgroundColor: 'rgba(59, 130, 246, 0.2)', // primary with 20% opacity
  },
  verifyButton: {
    backgroundColor: '#3b82f6', // primary from preview
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendQuestion: {
    textAlign: 'center',
    color: '#9ca3af', // textSecondary from preview
    fontSize: 14,
    marginBottom: 8,
  },
  resendButton: {
    padding: 4,
  },
  resendLink: {
    textAlign: 'center',
    color: '#3b82f6', // primary from preview
    fontSize: 14,
  },
  resendLinkDisabled: {
    color: '#3b82f6', // Still primary color even when disabled (shows timer)
  },
});

