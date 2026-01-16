import { Toast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { t } from '@/i18n';
import {
  changePassword,
  deleteAccount,
  disable2FA,
  enable2FA,
  getSessions,
  getSettings,
  requestDataExport,
  revokeSession,
  updateSettings,
  validatePassword,
  verify2FA,
  type UserSession,
  type UserSettings,
} from '@/services/settings';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

interface SettingsItem {
  type: 'toggle' | 'navigation' | 'action';
  label: string;
  value?: boolean | string;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  rightComponent?: React.ReactNode;
  destructive?: boolean;
}

interface PasswordModalState {
  visible: boolean;
  title: string;
  message: string;
  placeholder: string;
  secureTextEntry: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { setTheme: setThemeContext, colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [passwordModal, setPasswordModal] = useState<PasswordModalState | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [selectionModal, setSelectionModal] = useState<{
    title: string;
    options: Array<{ label: string; value: string; onPress: () => void }>;
  } | null>(null);

  // Helper function to show Alert that works on web
  const showAlert = (
    title: string,
    message: string,
    buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>,
    options?: { cancelable?: boolean }
  ) => {
    if (Platform.OS === 'web' && buttons.length > 2) {
      // On web with multiple options, use custom modal
      const cancelButton = buttons.find(b => b.style === 'cancel');
      const actionButtons = buttons.filter(b => b.style !== 'cancel');
      
      setSelectionModal({
        title,
        options: actionButtons.map(btn => ({
          label: btn.text,
          value: btn.text,
          onPress: () => {
            setSelectionModal(null);
            btn.onPress?.();
          },
        })),
      });
    } else if (Platform.OS === 'web') {
      // On web, use window.confirm for simple alerts
      if (buttons.length === 1) {
        window.alert(`${title}\n\n${message}`);
        buttons[0]?.onPress?.();
      } else if (buttons.length === 2 && buttons[1]?.style === 'cancel') {
        const result = window.confirm(`${title}\n\n${message}`);
        if (result) {
          buttons[0]?.onPress?.();
        } else {
          buttons[1]?.onPress?.();
        }
      } else {
        Alert.alert(title, message, buttons, options);
      }
    } else {
      // On mobile, use native Alert
      Alert.alert(title, message, buttons, options);
    }
  };

  useEffect(() => {
    loadSettings();
    loadSessions();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await getSettings();
      setSettings(response.settings);
    } catch (error) {
      console.error('[Settings] Failed to load settings:', error);
      Alert.alert(t('common.error'), t('errors.getSettingsFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await getSessions();
      setSessions(response.sessions);
    } catch (error: any) {
      // Silently handle token expiration errors - sessions are not critical
      // Only log non-authentication errors
      if (error?.status !== 401 && error?.status !== 403) {
        console.error('[Settings] Failed to load sessions:', error);
      }
      // Set empty sessions array on any error to prevent UI issues
      setSessions([]);
    }
  };

  const showPasswordModal = (
    title: string,
    message: string,
    placeholder: string,
    secureTextEntry: boolean,
    onConfirm: (value: string) => void
  ) => {
    setPasswordInput('');
    setPasswordModal({
      visible: true,
      title,
      message,
      placeholder,
      secureTextEntry,
      onConfirm,
      onCancel: () => {
        setPasswordModal(null);
      },
    });
  };

  const handlePasswordModalConfirm = () => {
    if (passwordModal && passwordInput.trim()) {
      const inputValue = passwordInput.trim();
      const onConfirmCallback = passwordModal.onConfirm;
      // Close modal immediately
      setPasswordModal(null);
      setPasswordInput('');
      // Call the callback immediately - Alert.alert works even if modal is closing
      // The modal closing animation won't block the Alert
      onConfirmCallback(inputValue);
    }
  };

  const validateCurrentPassword = async (currentPassword: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      // Use dedicated password validation endpoint
      await validatePassword({ password: currentPassword });
      return { valid: true };
    } catch (error: any) {
      console.log('[Settings] Password validation error:', error);
      console.log('[Settings] Error status:', error?.status);
      console.log('[Settings] Error data:', error?.data);
      
      // ApiError has a 'data' property that contains the response body
      let errorData: any = error?.data;
      let errorCode: string | undefined;
      let errorMessage: string | undefined;
      
      // Try to extract code and message from different possible structures
      if (errorData && typeof errorData === 'object') {
        errorCode = errorData.code;
        errorMessage = errorData.message;
      }
      
      // Also check if error.message contains useful info
      if (!errorMessage && error?.message) {
        errorMessage = error.message;
      }
      
      console.log('[Settings] Extracted error code:', errorCode);
      console.log('[Settings] Extracted error message:', errorMessage);
      
      // Check if error is due to invalid current password
      if (error?.status === 401 || errorCode === 'invalid_password') {
        const message = errorMessage || t('errors.invalidPassword');
        console.log('[Settings] Invalid password detected, returning error:', message);
        return { valid: false, error: message };
      }
      
      // Handle rate limiting (429)
      if (error?.status === 429) {
        const message = errorMessage || t('errors.tooManyPasswordAttempts');
        console.log('[Settings] Rate limit error:', message);
        return { valid: false, error: message };
      }
      
      // Other errors - show descriptive error message
      const message = errorMessage || error?.message || t('errors.changePasswordFailed');
      console.log('[Settings] Other error:', message);
      return { valid: false, error: message };
    }
  };

  const handleChangePassword = () => {
    showPasswordModal(
      t('settings.changePassword'),
      t('settings.currentPassword'),
      t('settings.currentPassword'),
      true,
      async (currentPassword) => {
        if (!currentPassword) return;

        // Validate current password first
        try {
          setUpdating('password');
          const validationResult = await validateCurrentPassword(currentPassword);
          setUpdating(null);
          
          if (!validationResult.valid) {
            const errorMessage = validationResult.error || t('errors.invalidPassword');
            console.log('[Settings] Password validation failed, showing error:', errorMessage);
            // Close modal first
            setPasswordModal(null);
            setPasswordInput('');
            // Show error toast like in edit profile
            setToastMessage(errorMessage);
            setToastType('error');
            setToastVisible(true);
            return;
          }

          // Current password is valid, show second modal for new password
          setTimeout(() => {
            showPasswordModal(
              t('settings.newPassword'),
              '',
              t('settings.newPassword'),
              true,
              (newPassword) => {
                if (!newPassword || newPassword.length < 8) {
                  setPasswordModal(null);
                  setPasswordInput('');
                  setToastMessage(t('errors.passwordMin'));
                  setToastType('error');
                  setToastVisible(true);
                  return;
                }

                // Validate that new password is different from current password
                if (newPassword === currentPassword) {
                  setPasswordModal(null);
                  setPasswordInput('');
                  setToastMessage(t('errors.passwordSameAsCurrent'));
                  setToastType('error');
                  setToastVisible(true);
                  return;
                }

                // Show third modal to confirm new password
                setTimeout(() => {
                  showPasswordModal(
                    t('settings.confirmNewPassword'),
                    '',
                    t('settings.confirmNewPassword'),
                    true,
                  async (confirmPassword) => {
                    if (newPassword !== confirmPassword) {
                      setPasswordModal(null);
                      setPasswordInput('');
                      setToastMessage(t('errors.passwordsDontMatch'));
                      setToastType('error');
                      setToastVisible(true);
                      return;
                    }

                    // Double-check that new password is different from current
                    if (newPassword === currentPassword) {
                      setPasswordModal(null);
                      setPasswordInput('');
                      setToastMessage(t('errors.passwordSameAsCurrent'));
                      setToastType('error');
                      setToastVisible(true);
                      return;
                    }

                    try {
                      setUpdating('password');
                      await changePassword({ currentPassword, newPassword });
                      // Close modal
                      setPasswordModal(null);
                      setPasswordInput('');
                      // Show success toast
                      setToastMessage(t('settings.passwordChanged'));
                      setToastType('success');
                      setToastVisible(true);
                      // Logout after showing success message
                      setTimeout(async () => {
                        try {
                          await logout();
                          router.replace('/(auth)');
                        } catch (logoutError) {
                          console.error('[Settings] Logout error:', logoutError);
                          // Even if logout fails, redirect to auth
                          router.replace('/(auth)');
                        }
                      }, 2000);
                    } catch (error: any) {
                      setUpdating(null);
                      // Handle errors from backend with descriptive messages
                      let message = t('errors.changePasswordFailed');
                      const errorData = error?.data || {};
                      const errorCode = errorData?.code;
                      const errorMessage = errorData?.message;
                      
                      if (error?.status === 429) {
                        message = errorMessage || t('errors.tooManyPasswordAttempts');
                      } else if (error?.status === 401 || errorCode === 'invalid_password') {
                        message = errorMessage || t('errors.invalidPassword');
                      } else if (errorCode === 'validation_error') {
                        message = errorMessage || t('errors.changePasswordFailed');
                      } else if (errorMessage) {
                        message = errorMessage;
                      } else if (error?.message && !error.message.includes('Request failed with status')) {
                        message = error.message;
                      }
                      
                      // Close modal and show error toast
                      setPasswordModal(null);
                      setPasswordInput('');
                      setToastMessage(message);
                      setToastType('error');
                      setToastVisible(true);
                    }
                    }
                  );
                }, 150);
              }
            );
          }, 150);
        } catch (error: any) {
          setUpdating(null);
          Alert.alert(t('common.error'), t('errors.changePasswordFailed'));
        }
      }
    );
  };

  const handleEnable2FA = () => {
    showPasswordModal(
      t('settings.enable2FA'),
      t('settings.currentPassword'),
      t('settings.currentPassword'),
      true,
      async (password) => {
        if (!password) return;

        try {
          setUpdating('2fa');
          const response = await enable2FA({ password });
          // Show QR code and backup codes
          Alert.alert(
            t('settings.scanQRCode'),
            `${t('settings.saveBackupCodes')}\n\n${response.backupCodes.join('\n')}`,
            [
              {
                text: t('settings.verify2FA'),
                onPress: () => {
                  handleVerify2FA();
                },
              },
              { text: t('common.ok') },
            ]
          );
        } catch (error: any) {
          const message = error?.data?.message || t('errors.enable2FAFailed');
          Alert.alert(t('common.error'), message);
        } finally {
          setUpdating(null);
        }
      }
    );
  };

  const handleVerify2FA = () => {
    showPasswordModal(
      t('settings.verify2FA'),
      t('settings.enter2FACode'),
      t('settings.enter2FACode'),
      false,
      async (token) => {
        if (!token || token.length !== 6) {
          Alert.alert(t('common.error'), t('settings.invalid2FACode'));
          return;
        }

        try {
          setUpdating('2fa');
          await verify2FA({ token });
          Alert.alert(t('common.ok'), t('settings.twoFactorEnabled'));
          await loadSettings();
        } catch (error: any) {
          const message = error?.data?.message || t('errors.verify2FAFailed');
          Alert.alert(t('common.error'), message);
        } finally {
          setUpdating(null);
        }
      }
    );
  };

  const handleDisable2FA = () => {
    showPasswordModal(
      t('settings.disable2FA'),
      t('settings.currentPassword'),
      t('settings.currentPassword'),
      true,
      async (password) => {
        if (!password) return;

        try {
          setUpdating('2fa');
          await disable2FA({ password });
          Alert.alert(t('common.ok'), t('settings.twoFactorDisabled'));
          await loadSettings();
        } catch (error: any) {
          const message = error?.data?.message || t('errors.disable2FAFailed');
          Alert.alert(t('common.error'), message);
        } finally {
          setUpdating(null);
        }
      }
    );
  };

  const handleRevokeSession = (sessionId: string) => {
    Alert.alert(
      t('settings.revokeSession'),
      t('settings.revokeSession'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.ok'),
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeSession(sessionId);
              Alert.alert(t('common.ok'), t('settings.sessionRevoked'));
              await loadSessions();
            } catch (error) {
              Alert.alert(t('common.error'), t('errors.revokeSessionFailed'));
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccountConfirm'),
      t('settings.deleteAccountMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccountConfirm'),
          style: 'destructive',
          onPress: () => {
            showPasswordModal(
              t('settings.enterPasswordToDelete'),
              '',
              t('settings.currentPassword'),
              true,
              async (password) => {
                if (!password) return;

                try {
                  setUpdating('delete');
                  await deleteAccount({ password });
                  Alert.alert(t('common.ok'), t('settings.accountDeleted'));
                  await logout();
                  router.replace('/(auth)');
                } catch (error: any) {
                  const message = error?.data?.message || t('errors.deleteAccountFailed');
                  Alert.alert(t('common.error'), message);
                } finally {
                  setUpdating(null);
                }
              }
            );
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      setUpdating('export');
      await requestDataExport();
      Alert.alert(t('settings.dataExportRequested'), t('settings.dataExportMessage'));
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.dataExportFailed'));
    } finally {
      setUpdating(null);
    }
  };

  const handleLanguageChange = async (language: 'en' | 'es') => {
    if (!settings) return;
    try {
      setUpdating('language');
      await updateSettings({ language });
      setSettings({ ...settings, language });
    } catch (error) {
      console.error('[Settings] Failed to update language:', error);
      Alert.alert(t('common.error'), t('errors.updateSettingsFailed'));
    } finally {
      setUpdating(null);
    }
  };

  const handleToggle = async (key: keyof UserSettings, value: boolean) => {
    if (!settings) return;
    
    try {
      setUpdating(key);
      const updatedSettings = { ...settings, [key]: value };
      await updateSettings(updatedSettings);
      setSettings(updatedSettings);
      setToastMessage(t('settings.settingsUpdated'));
      setToastType('success');
      setToastVisible(true);
    } catch (error) {
      console.error('[Settings] Failed to update setting:', error);
      setToastMessage(t('errors.updateSettingsFailed'));
      setToastType('error');
      setToastVisible(true);
    } finally {
      setUpdating(null);
    }
  };

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    if (!settings) return;
    try {
      setUpdating('theme');
      // Update context immediately for instant UI feedback
      await setThemeContext(theme);
      // Then save to backend
      await updateSettings({ theme });
      setSettings({ ...settings, theme });
    } catch (error) {
      console.error('[Settings] Failed to update theme:', error);
      Alert.alert(t('common.error'), t('errors.updateSettingsFailed'));
      // Revert context on error
      await setThemeContext(settings.theme);
    } finally {
      setUpdating(null);
    }
  };

  if (loading || !settings) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </View>
    );
  }

  const sections: SettingsSection[] = [
    {
      title: t('settings.notifications'),
      items: [
        {
          type: 'toggle',
          label: t('settings.pushNotifications'),
          value: settings.push_notifications,
          onToggle: (value) => handleToggle('push_notifications', value),
          icon: 'notifications-outline',
        },
        {
          type: 'toggle',
          label: t('settings.emailNotifications'),
          value: settings.email_notifications,
          onToggle: (value) => handleToggle('email_notifications', value),
          icon: 'mail-outline',
        },
        {
          type: 'toggle',
          label: t('settings.smsNotifications'),
          value: settings.sms_notifications,
          onToggle: (value) => handleToggle('sms_notifications', value),
          icon: 'chatbubble-outline',
        },
        {
          type: 'toggle',
          label: t('settings.bookingReminders'),
          value: settings.booking_reminders,
          onToggle: (value) => handleToggle('booking_reminders', value),
          icon: 'calendar-outline',
        },
        {
          type: 'toggle',
          label: t('settings.promotions'),
          value: settings.promotions,
          onToggle: (value) => handleToggle('promotions', value),
          icon: 'gift-outline',
        },
        {
          type: 'toggle',
          label: t('settings.chatMessages'),
          value: settings.chat_messages,
          onToggle: (value) => handleToggle('chat_messages', value),
          icon: 'chatbubbles-outline',
        },
        {
          type: 'toggle',
          label: t('settings.paymentReceipts'),
          value: settings.payment_receipts,
          onToggle: (value) => handleToggle('payment_receipts', value),
          icon: 'receipt-outline',
        },
      ],
    },
    {
      title: t('settings.privacySecurity'),
      items: [
        {
          type: 'action',
          label: t('settings.changePassword'),
          onPress: handleChangePassword,
          icon: 'lock-closed-outline',
        },
        {
          type: 'toggle',
          label: t('settings.twoFactorAuth'),
          value: settings.two_factor_enabled,
          onToggle: (value) => {
            if (value) {
              handleEnable2FA();
            } else {
              handleDisable2FA();
            }
          },
          icon: 'shield-checkmark-outline',
        },
        {
          type: 'toggle',
          label: t('settings.biometricLogin'),
          value: settings.biometric_enabled,
          onToggle: (value) => handleToggle('biometric_enabled', value),
          icon: 'finger-print-outline',
        },
        {
          type: 'navigation',
          label: t('settings.activeSessions'),
          value: `${sessions.length} ${t('settings.sessions')}`,
          onPress: () => {
            // Show sessions modal
            Alert.alert(
              t('settings.sessions'),
              sessions.map((s) => `${s.device_info?.platform || 'Unknown'} - ${s.last_active_at}`).join('\n'),
              [{ text: t('common.ok') }]
            );
          },
          icon: 'phone-portrait-outline',
        },
      ],
    },
    {
      title: t('settings.preferences'),
      items: [
        {
          type: 'action',
          label: t('settings.language'),
          value: settings.language === 'en' ? t('settings.english') : t('settings.spanish'),
          onPress: () => {
            console.log('[Settings] Language onPress called');
            showAlert(
              t('settings.language'),
              '',
              [
                {
                  text: t('settings.english'),
                  onPress: () => {
                    console.log('[Settings] English selected');
                    setTimeout(() => handleLanguageChange('en'), 100);
                  },
                },
                {
                  text: t('settings.spanish'),
                  onPress: () => {
                    console.log('[Settings] Spanish selected');
                    setTimeout(() => handleLanguageChange('es'), 100);
                  },
                },
                { text: t('common.cancel'), style: 'cancel', onPress: () => {} },
              ],
              { cancelable: true }
            );
          },
          icon: 'language-outline',
        },
        {
          type: 'action',
          label: t('settings.currency'),
          value: settings.currency,
          onPress: () => {
            console.log('[Settings] Currency onPress called');
            showAlert(t('settings.currency'), 'Currency selection coming soon', [{ text: t('common.ok') }]);
          },
          icon: 'cash-outline',
        },
        {
          type: 'toggle',
          label: t('settings.locationServices'),
          value: settings.location_services,
          onToggle: (value) => handleToggle('location_services', value),
          icon: 'location-outline',
        },
        {
          type: 'action',
          label: t('settings.theme'),
          value:
            settings.theme === 'light'
              ? t('settings.light')
              : settings.theme === 'dark'
              ? t('settings.dark')
              : t('settings.system'),
          onPress: () => {
            console.log('[Settings] Theme onPress called');
            showAlert(
              t('settings.theme'),
              '',
              [
                {
                  text: t('settings.light'),
                  onPress: () => {
                    console.log('[Settings] Light theme selected');
                    setTimeout(() => handleThemeChange('light'), 100);
                  },
                },
                {
                  text: t('settings.dark'),
                  onPress: () => {
                    console.log('[Settings] Dark theme selected');
                    setTimeout(() => handleThemeChange('dark'), 100);
                  },
                },
                {
                  text: t('settings.system'),
                  onPress: () => {
                    console.log('[Settings] System theme selected');
                    setTimeout(() => handleThemeChange('system'), 100);
                  },
                },
                { text: t('common.cancel'), style: 'cancel', onPress: () => {} },
              ],
              { cancelable: true }
            );
          },
          icon: 'color-palette-outline',
        },
      ],
    },
    {
      title: t('settings.account'),
      items: [
        {
          type: 'navigation',
          label: t('settings.linkedAccounts'),
          value: 'Google',
          onPress: () => {
            Alert.alert(t('settings.linkedAccounts'), 'Linked accounts management coming soon');
          },
          icon: 'link-outline',
        },
        {
          type: 'action',
          label: t('settings.exportData'),
          onPress: handleExportData,
          icon: 'download-outline',
        },
        {
          type: 'action',
          label: t('settings.deleteAccount'),
          onPress: handleDeleteAccount,
          icon: 'trash-outline',
          destructive: true,
        },
      ],
    },
    {
      title: t('settings.about'),
      items: [
        {
          type: 'navigation',
          label: t('settings.appVersion'),
          value: '1.0.0',
          icon: 'information-circle-outline',
        },
        {
          type: 'navigation',
          label: t('settings.termsOfService'),
          onPress: () => {
            Linking.openURL('https://mordobo.com/terms');
          },
          icon: 'document-text-outline',
        },
        {
          type: 'navigation',
          label: t('settings.privacyPolicy'),
          onPress: () => {
            Linking.openURL('https://mordobo.com/privacy');
          },
          icon: 'shield-outline',
        },
        {
          type: 'navigation',
          label: t('settings.licenses'),
          onPress: () => {
            Alert.alert(t('settings.licenses'), 'Licenses information coming soon');
          },
          icon: 'library-outline',
        },
      ],
    },
  ];

  const dynamicStyles = getDynamicStyles(isDark);

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#ECEDEE' : '#1F2937'} />
        </TouchableOpacity>
        <Text style={[styles.title, dynamicStyles.title]}>{t('settings.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>{section.title}</Text>
            <View style={[styles.sectionContainer, dynamicStyles.sectionContainer]}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.item,
                    dynamicStyles.item,
                    itemIndex === section.items.length - 1 && styles.itemLast,
                    item.destructive && styles.itemDestructive,
                  ]}
                  onPress={() => {
                    if (item.type === 'toggle') return;
                    if (updating !== null) {
                      Alert.alert(t('common.error'), 'Please wait for the current update to complete');
                      return;
                    }
                    if (item.onPress) {
                      console.log('[Settings] Item pressed:', item.label, 'onPress exists:', !!item.onPress);
                      try {
                        item.onPress();
                      } catch (error) {
                        console.error('[Settings] Error executing onPress:', error);
                      }
                    } else {
                      console.log('[Settings] Item pressed but no onPress:', item.label);
                    }
                  }}
                  disabled={item.type === 'toggle'}
                >
                  {item.icon && (
                    <Ionicons
                      name={item.icon}
                      size={24}
                      color={item.destructive ? '#EF4444' : (isDark ? '#9BA1A6' : '#374151')}
                      style={styles.itemIcon}
                    />
                  )}
                  <Text
                    style={[
                      styles.itemLabel,
                      dynamicStyles.itemLabel,
                      item.destructive && styles.itemLabelDestructive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.type === 'toggle' ? (
                    <Switch
                      value={item.value as boolean}
                      onValueChange={item.onToggle}
                      disabled={updating === item.label}
                      trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#10B981' }}
                      thumbColor="#FFFFFF"
                    />
                  ) : item.value ? (
                    <View style={styles.itemRight}>
                      <Text style={[styles.itemValue, dynamicStyles.itemValue]}>{item.value}</Text>
                      <Ionicons name="chevron-forward" size={20} color={isDark ? '#6B7280' : '#9CA3AF'} />
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={isDark ? '#6B7280' : '#9CA3AF'} />
                  )}
                  {updating === item.label && (
                    <ActivityIndicator
                      size="small"
                      color="#10B981"
                      style={styles.itemLoading}
                    />
                  )}
                  {updating === 'language' && item.label === t('settings.language') && (
                    <ActivityIndicator
                      size="small"
                      color="#10B981"
                      style={styles.itemLoading}
                    />
                  )}
                  {updating === 'theme' && item.label === t('settings.theme') && (
                    <ActivityIndicator
                      size="small"
                      color="#10B981"
                      style={styles.itemLoading}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Selection Modal for web (Language, Theme, etc) */}
      <Modal
        visible={selectionModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectionModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectionModal(null)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalContent, dynamicStyles.modalContent]}>
                <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>
                  {selectionModal?.title}
                </Text>
                {selectionModal?.options.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.modalOption,
                      { borderBottomColor: isDark ? '#374151' : '#F3F4F6' },
                      index === 0 && styles.modalOptionFirst,
                      index === (selectionModal?.options.length || 0) - 1 && styles.modalOptionLast,
                    ]}
                    onPress={option.onPress}
                  >
                    <Text style={[styles.modalOptionText, dynamicStyles.modalOptionText]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel, dynamicStyles.modalButtonCancel]}
                  onPress={() => setSelectionModal(null)}
                >
                  <Text style={[styles.modalButtonTextCancel, dynamicStyles.modalButtonTextCancel]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Toast for success/error messages */}
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
        type={toastType}
        duration={toastType === 'error' ? 4000 : 3000}
      />

      {/* Password Input Modal */}
      {passwordModal && (
        <Modal
          visible={passwordModal.visible}
          transparent
          animationType="fade"
          onRequestClose={passwordModal.onCancel}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContainer}
            >
              <View style={[styles.modalContent, dynamicStyles.modalContent]}>
                <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>{passwordModal.title}</Text>
                {passwordModal.message ? (
                  <Text style={[styles.modalMessage, dynamicStyles.modalMessage]}>{passwordModal.message}</Text>
                ) : null}
                <TextInput
                  style={[styles.modalInput, dynamicStyles.modalInput]}
                  placeholder={passwordModal.placeholder}
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                  secureTextEntry={passwordModal.secureTextEntry}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel, dynamicStyles.modalButtonCancel]}
                    onPress={passwordModal.onCancel}
                  >
                    <Text style={[styles.modalButtonTextCancel, dynamicStyles.modalButtonTextCancel]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonConfirm]}
                    onPress={handlePasswordModalConfirm}
                    disabled={!passwordInput.trim()}
                  >
                    <Text
                      style={[
                        styles.modalButtonTextConfirm,
                        !passwordInput.trim() && styles.modalButtonTextDisabled,
                      ]}
                    >
                      {t('common.ok')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    minHeight: 56,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  itemDestructive: {
    borderBottomColor: '#FEE2E2',
  },
  itemIcon: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
  },
  itemLabel: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '400',
  },
  itemLabelDestructive: {
    color: '#EF4444',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemValue: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 8,
  },
  itemLoading: {
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOptionBorder: {
    borderBottomColor: '#F3F4F6',
  },
  modalOptionFirst: {
    marginTop: 8,
  },
  modalOptionLast: {
    borderBottomWidth: 0,
    marginBottom: 8,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonConfirm: {
    backgroundColor: '#10B981',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonTextDisabled: {
    opacity: 0.5,
  },
});

const getDynamicStyles = (isDark: boolean) => ({
  container: {
    backgroundColor: isDark ? '#151718' : '#F9FAFB',
  },
  header: {
    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
    borderBottomColor: isDark ? '#374151' : '#E5E7EB',
  },
  title: {
    color: isDark ? '#ECEDEE' : '#1F2937',
  },
  sectionTitle: {
    color: isDark ? '#9BA1A6' : '#6B7280',
  },
  sectionContainer: {
    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
  },
  item: {
    borderBottomColor: isDark ? '#374151' : '#F3F4F6',
  },
  itemLabel: {
    color: isDark ? '#ECEDEE' : '#1F2937',
  },
  itemValue: {
    color: isDark ? '#9BA1A6' : '#6B7280',
  },
  modalContent: {
    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
  },
  modalTitle: {
    color: isDark ? '#ECEDEE' : '#1F2937',
  },
  modalMessage: {
    color: isDark ? '#9BA1A6' : '#6B7280',
  },
  modalInput: {
    borderColor: isDark ? '#374151' : '#D1D5DB',
    color: isDark ? '#ECEDEE' : '#1F2937',
    backgroundColor: isDark ? '#151718' : '#FFFFFF',
  },
  modalButtonCancel: {
    backgroundColor: isDark ? '#374151' : '#F3F4F6',
  },
  modalButtonTextCancel: {
    color: isDark ? '#ECEDEE' : '#374151',
  },
  modalOptionText: {
    color: isDark ? '#ECEDEE' : '#1F2937',
  },
});
